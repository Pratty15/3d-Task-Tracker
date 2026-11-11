import { Hono } from 'hono'
import { serve } from 'bun'
import { pocketbaseMiddleware, requireAuth } from './middleware/auth'
import type { AppEnv } from './middleware/auth'
import { renderLogin, renderSignup } from './views/auth'
import { renderDashboard, renderTaskItem, renderEditForm } from './views/dashboard'
import { renderGroupDashboard } from './views/groupDashboard'
import { renderMemberDashboard } from './views/memberDashboard'
import type { Task } from './views/dashboard'
import { generateSubtasks, generateProjectSummary, parseNaturalLanguageTask, checkDuplicateTask, generateDailyStandup } from './services/ai'

const app = new Hono<AppEnv>()

// 1. Attach Request-Scoped PocketBase Client
app.use('*', pocketbaseMiddleware())

// 2. Serve Static Assets using Bun.file
app.get('/three-app.js', (c) => {
  return new Response(Bun.file('./src/public/app.js'))
})

app.get('/dashboard.css', (c) => {
  return new Response(Bun.file('./src/public/dashboard.css'), {
    headers: { 'Content-Type': 'text/css' }
  })
})

// 3. Auth Routes
app.get('/login', (c) => {
  return c.html(renderLogin())
})

app.post('/login', async (c) => {
  const pb = c.get('pb')
  const body = await c.req.parseBody()
  const email = String(body.email || '')
  const password = String(body.password || '')

  try {
    await pb.collection('users').authWithPassword(email, password)
    return c.redirect('/')
  } catch (err: any) {
    return c.html(renderLogin('Invalid email or password. Please try again.'))
  }
})

app.get('/signup', (c) => {
  return c.html(renderSignup())
})

app.post('/signup', async (c) => {
  const pb = c.get('pb')
  const body = await c.req.parseBody()
  const email = String(body.email || '')
  const password = String(body.password || '')
  const passwordConfirm = String(body.passwordConfirm || '')

  if (password !== passwordConfirm) {
    return c.html(renderSignup('Passwords do not match.'))
  }

  try {
    await pb.collection('users').create({
      email,
      password,
      passwordConfirm,
      emailVisibility: true
    })
    
    // Auto-login
    await pb.collection('users').authWithPassword(email, password)
    return c.redirect('/')
  } catch (err: any) {
    const detail = err.response?.data ? JSON.stringify(err.response.data) : 'Signup failed.'
    return c.html(renderSignup(`Registration failed: ${detail}`))
  }
})

app.get('/logout', (c) => {
  const pb = c.get('pb')
  pb.authStore.clear()
  return c.redirect('/login')
})

// 4. Group Workspace Endpoints
app.post('/groups', requireAuth(), async (c) => {
  const pb = c.get('pb')
  const body = await c.req.parseBody()
  const name = String(body.name || 'New Team')
  const myId = pb.authStore.model?.id

  try {
    const group = await pb.collection('groups').create({
      name,
      owner: myId,
      members: [myId] // creator is automatically a member
    })
    return c.redirect(`/groups/${group.id}`)
  } catch (err) {
    console.error("Failed to create group:", err)
    return c.redirect('/')
  }
})

app.post('/groups/join', requireAuth(), async (c) => {
  const pb = c.get('pb')
  const body = await c.req.parseBody()
  const groupId = String(body.groupId || '').trim()
  const myId = pb.authStore.model?.id

  try {
    const group = await pb.collection('groups').getOne(groupId)
    const members = group.members || []
    
    if (myId && !members.includes(myId)) {
      await pb.collection('groups').update(groupId, {
        members: [...members, myId]
      })
    }
    return c.redirect(`/groups/${groupId}`)
  } catch (err) {
    console.error("Failed to join group:", err)
    return c.redirect('/')
  }
})

// 5. Protected Dashboard Routes
// Private Space
app.get('/', requireAuth(), async (c) => {
  const pb = c.get('pb')
  const email = pb.authStore.model?.email || ''
  const myId = pb.authStore.model?.id

  let groups: any[] = []
  try {
    // Fetch user groups
    groups = await pb.collection('groups').getFullList({
      filter: `members ~ "${myId}" || owner = "${myId}"`,
      sort: '-created'
    })
  } catch (err) {
    console.warn("Could not load groups list (groups collection might not exist yet):", err)
  }

  let tasks: Task[] = []
  try {
    // Try fetching group-filtered private tasks
    tasks = await pb.collection('tasks').getFullList<Task>({
      filter: 'group = "" || group = null',
      sort: '-created'
    })
  } catch (err) {
    console.warn("Could not filter tasks by group, falling back to full list:", err)
    try {
      // Fallback: load all tasks
      tasks = await pb.collection('tasks').getFullList<Task>({
        sort: '-created'
      })
    } catch (fallbackErr) {
      console.error("Failed to load tasks:", fallbackErr)
    }
  }

  return c.html(renderDashboard(tasks, email, groups, 'private'))
})

// Group Team Space
app.get('/groups/:id', requireAuth(), async (c) => {
  const pb = c.get('pb')
  const groupId = c.req.param('id')
  const email = pb.authStore.model?.email || ''
  const myId = pb.authStore.model?.id

  try {
    // Fetch group details and its expanded members
    const group = await pb.collection('groups').getOne(groupId, {
      expand: 'members'
    })

    // Fetch group tasks
    const tasks = await pb.collection('tasks').getFullList<Task>({
      filter: `group = "${groupId}"`,
      sort: '-created',
      expand: 'assignedTo'
    })

    // Fetch user groups for sidebar
    const groups = await pb.collection('groups').getFullList({
      filter: `members ~ "${myId}" || owner = "${myId}"`,
      sort: '-created'
    })

    const members = group.expand?.members || []

    return c.html(renderGroupDashboard(tasks, email, groups, groupId, members))
  } catch (err) {
    console.error("Group space load failed:", err)
    return c.redirect('/')
  }
})

// Individual Member Tracker Space in Group
app.get('/groups/:id/member/:memberId', requireAuth(), async (c) => {
  const pb = c.get('pb')
  const groupId = c.req.param('id')
  const memberId = c.req.param('memberId')
  const email = pb.authStore.model?.email || ''
  const myId = pb.authStore.model?.id

  try {
    // Fetch group details and its expanded members
    const group = await pb.collection('groups').getOne(groupId, {
      expand: 'members'
    })

    // Fetch tasks in this group assigned to this member
    const tasks = await pb.collection('tasks').getFullList<Task>({
      filter: `group = "${groupId}" && assignedTo = "${memberId}"`,
      sort: '-created',
      expand: 'assignedTo'
    })

    // Fetch user groups for sidebar
    const groups = await pb.collection('groups').getFullList({
      filter: `members ~ "${myId}" || owner = "${myId}"`,
      sort: '-created'
    })

    const members = group.expand?.members || []

    return c.html(renderMemberDashboard(tasks, email, groups, groupId, memberId, members))
  } catch (err) {
    console.error("Member space load failed:", err)
    return c.redirect(`/groups/${groupId}`)
  }
})

// 6. Constellation JSON API
app.get('/api/tasks', requireAuth(), async (c) => {
  const pb = c.get('pb')
  const workspaceId = c.req.query('workspaceId') || 'private'
  const memberId = c.req.query('memberId') || ''

  try {
    let filterString = 'group = "" || group = null'
    if (workspaceId !== 'private') {
      filterString = `group = "${workspaceId}"`
    }
    if (memberId) {
      filterString = `(${filterString}) && assignedTo = "${memberId}"`
    }
    
    const tasks = await pb.collection('tasks').getFullList<Task>({
      filter: filterString,
      sort: '-created',
      expand: 'assignedTo'
    })
    return c.json(tasks)
  } catch (err) {
    // Fallback: load all tasks without group filters
    try {
      let fallbackFilter = ''
      if (memberId) {
        fallbackFilter = `assignedTo = "${memberId}"`
      }
      const tasks = await pb.collection('tasks').getFullList<Task>({
        filter: fallbackFilter ? fallbackFilter : undefined,
        sort: '-created',
        expand: 'assignedTo'
      })
      return c.json(tasks)
    } catch (fallbackErr) {
      return c.json([])
    }
  }
})

// Create Task (handles workspace assignments)
app.post('/tasks', requireAuth(), async (c) => {
  const pb = c.get('pb')
  const body = await c.req.parseBody()
  const workspaceId = String(body.group || 'private')
  
  let task: Task
  try {
    task = await pb.collection('tasks').create<Task>({
      title: String(body.title || ''),
      startDate: body.startDate ? String(body.startDate) : null,
      endDate: body.endDate ? String(body.endDate) : null,
      deadline: body.endDate ? String(body.endDate) : null,
      priority: String(body.priority || 'Medium'),
      category: String(body.category || 'Dev'),
      completed: false,
      group: workspaceId === 'private' ? null : workspaceId,
      assignedTo: body.assignedTo ? String(body.assignedTo) : null,
      user: pb.authStore.model?.id
    })
  } catch (err: any) {
    console.warn("Failed to create task with workspace relations. Retrying with basic fields:", err.response?.data || err)
    try {
      task = await pb.collection('tasks').create<Task>({
        title: String(body.title || ''),
        startDate: body.startDate ? String(body.startDate) : null,
        endDate: body.endDate ? String(body.endDate) : null,
        deadline: body.endDate ? String(body.endDate) : null,
        priority: String(body.priority || 'Medium'),
        category: String(body.category || 'Dev'),
        completed: false
      })
    } catch (fallbackErr) {
      console.error("Failed to create task even with basic fields:", fallbackErr)
      return c.text('Error creating task', 500)
    }
  }

  // Fetch expanded assignee details for immediate layout rendering (resilient to failure)
  let expandedTask = task
  try {
    expandedTask = await pb.collection('tasks').getOne<Task>(task.id, {
      expand: 'assignedTo'
    })
  } catch (expandErr) {
    // ignore expand failure (means assignedTo relation doesn't exist)
  }

  return c.html(renderTaskItem(expandedTask, workspaceId !== 'private'))
})

// Fetch single task (cancel fallback)
app.get('/tasks/:id', requireAuth(), async (c) => {
  const pb = c.get('pb')
  const id = c.req.param('id')
  
  try {
    let task: Task
    try {
      task = await pb.collection('tasks').getOne<Task>(id, {
        expand: 'assignedTo'
      })
    } catch {
      task = await pb.collection('tasks').getOne<Task>(id)
    }
    return c.html(renderTaskItem(task, !!task.group))
  } catch (err) {
    return c.text('Not found', 404)
  }
})

// Toggle Complete
app.get('/toggle/:id', requireAuth(), async (c) => {
  const pb = c.get('pb')
  const id = c.req.param('id')

  try {
    const task = await pb.collection('tasks').getOne<Task>(id)
    const updated = await pb.collection('tasks').update<Task>(id, {
      completed: !task.completed
    })
    
    let expanded = updated
    try {
      expanded = await pb.collection('tasks').getOne<Task>(updated.id, {
        expand: 'assignedTo'
      })
    } catch {
      // ignore expand failure
    }
    return c.html(renderTaskItem(expanded, !!expanded.group))
  } catch (err) {
    return c.text('Update failed', 500)
  }
})

// Delete task
app.get('/delete/:id', requireAuth(), async (c) => {
  const pb = c.get('pb')
  const id = c.req.param('id')

  try {
    await pb.collection('tasks').delete(id)
    return c.text('')
  } catch (err) {
    return c.text('Delete failed', 500)
  }
})

// Renders inline task editor (with workspace member listings)
app.get('/edit/:id', requireAuth(), async (c) => {
  const pb = c.get('pb')
  const id = c.req.param('id')

  try {
    const task = await pb.collection('tasks').getOne<Task>(id)
    let members: any[] = []
    
    if (task.group) {
      try {
        const group = await pb.collection('groups').getOne(task.group, {
          expand: 'members'
        })
        members = group.expand?.members || []
      } catch (err) {
        console.warn("Could not load group members for task edit form:", err)
      }
    }
    
    return c.html(renderEditForm(task, members))
  } catch (err) {
    return c.text('Task not found', 404)
  }
})

// Handles inline editor submissions
app.post('/edit/:id', requireAuth(), async (c) => {
  const pb = c.get('pb')
  const id = c.req.param('id')
  const body = await c.req.parseBody()

  try {
    let updated: Task
    try {
      updated = await pb.collection('tasks').update<Task>(id, {
        title: String(body.title || ''),
        startDate: body.startDate ? String(body.startDate) : null,
        endDate: body.endDate ? String(body.endDate) : null,
        deadline: body.endDate ? String(body.endDate) : null,
        priority: String(body.priority || 'Medium'),
        category: String(body.category || 'Dev'),
        assignedTo: body.assignedTo ? String(body.assignedTo) : null
      })
    } catch (err) {
      console.warn("Failed to update task with workspace assignments. Retrying with basic fields:", err)
      updated = await pb.collection('tasks').update<Task>(id, {
        title: String(body.title || ''),
        startDate: body.startDate ? String(body.startDate) : null,
        endDate: body.endDate ? String(body.endDate) : null,
        deadline: body.endDate ? String(body.endDate) : null,
        priority: String(body.priority || 'Medium'),
        category: String(body.category || 'Dev')
      })
    }

    let expanded = updated
    try {
      expanded = await pb.collection('tasks').getOne<Task>(updated.id, {
        expand: 'assignedTo'
      })
    } catch {
      // ignore expand failure
    }
    return c.html(renderTaskItem(expanded, !!expanded.group))
  } catch (err) {
    return c.text('Save failed', 500)
  }
})

// HTMX Task Search (detects active workspace context via HX-Current-URL header)
app.get('/search', requireAuth(), async (c) => {
  const pb = c.get('pb')
  const q = c.req.query('search') || ''
  
  // Detect active workspace context automatically
  const currentUrl = c.req.header('HX-Current-URL') || ''
  let workspaceId = 'private'
  let memberId = ''

  if (currentUrl.includes('/groups/')) {
    const match = currentUrl.match(/\/groups\/([a-zA-Z0-9]+)/)
    if (match) {
      workspaceId = match[1] || 'private'
    }
    if (currentUrl.includes('/member/')) {
      const memMatch = currentUrl.match(/\/member\/([a-zA-Z0-9]+)/)
      if (memMatch) {
        memberId = memMatch[1] || ''
      }
    }
  }

  try {
    let filterString = workspaceId === 'private' ? '(group = "" || group = null)' : `group = "${workspaceId}"`
    if (memberId) {
      filterString = `(${filterString}) && assignedTo = "${memberId}"`
    }
    if (q) {
      filterString += ` && title ~ "${q.toLowerCase()}"`
    }
    
    let tasks: Task[] = []
    try {
      tasks = await pb.collection('tasks').getFullList<Task>({
        filter: filterString,
        sort: '-created',
        expand: 'assignedTo'
      })
    } catch (filterErr) {
      console.warn("Search filter failed, falling back to simple search:", filterErr)
      // Fallback: search ignoring workspace/group filters
      let fallbackFilter = q ? `title ~ "${q.toLowerCase()}"` : ''
      if (memberId) {
        fallbackFilter = fallbackFilter ? `(${fallbackFilter}) && assignedTo = "${memberId}"` : `assignedTo = "${memberId}"`
      }
      tasks = await pb.collection('tasks').getFullList<Task>({
        filter: fallbackFilter ? fallbackFilter : undefined,
        sort: '-created',
        expand: 'assignedTo'
      })
    }
    
    if (tasks.length === 0) {
      return c.html(`<div class="empty-state"><i class="fa-solid fa-face-sad-tear"></i><p>No matching tasks found.</p></div>`)
    }
    
    return c.html(tasks.map(t => renderTaskItem(t, workspaceId !== 'private')).join(''))
  } catch (err) {
    return c.text('Search failed', 500)
  }
})

function parseMarkdown(text: string): string {
  let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.split('\n').map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      return `<li>${trimmed.substring(2)}</li>`;
    }
    if (trimmed.startsWith('* ')) {
      return `<li>${trimmed.substring(2)}</li>`;
    }
    return line ? `<p>${line}</p>` : '';
  }).join('\n');
  return html.replace(/(<li>.*?<\/li>)+/gs, (match) => `<ul>${match}</ul>`);
}

// AI Project Status Summary Endpoint
app.get('/ai-summary', requireAuth(), async (c) => {
  const pb = c.get('pb')
  const workspaceId = c.req.query('workspaceId') || 'private'
  const memberId = c.req.query('memberId') || ''

  try {
    let tasks: Task[] = []
    let workspaceName = 'Private Space'

    if (workspaceId === 'private') {
      tasks = await pb.collection('tasks').getFullList<Task>({
        filter: 'group = "" || group = null',
        sort: '-created',
        expand: 'assignedTo'
      })
    } else {
      try {
        const groupObj = await pb.collection('groups').getOne(workspaceId)
        workspaceName = groupObj.name || 'Team Workspace'
      } catch {
        workspaceName = 'Team Workspace'
      }

      let filterString = `group = "${workspaceId}"`
      if (memberId) {
        filterString += ` && assignedTo = "${memberId}"`
        try {
          const userObj = await pb.collection('users').getOne(memberId)
          workspaceName = `${userObj.email.split('@')[0]}'s tasks inside ${workspaceName}`
        } catch {}
      }

      tasks = await pb.collection('tasks').getFullList<Task>({
        filter: filterString,
        sort: '-created',
        expand: 'assignedTo'
      })
    }

    const aiSummaryText = await generateProjectSummary(tasks, workspaceName)
    const formattedHtml = parseMarkdown(aiSummaryText)

    return c.html(`
      <div class="glass-panel ai-summary-card">
        <div class="ai-summary-header">
          <h3><i class="fa-solid fa-brain"></i> AI Project Analysis</h3>
          <button class="action-btn close-summary-btn" onclick="this.closest('.ai-summary-card').remove()" title="Close Summary">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="ai-summary-body">
          ${formattedHtml}
        </div>
      </div>
    `)
  } catch (err: any) {
    console.error("AI Summary endpoint failed:", err)
    return c.html(`
      <div class="glass-panel ai-summary-card error-card">
        <div class="ai-summary-header">
          <h3><i class="fa-solid fa-triangle-exclamation"></i> AI Analysis Failed</h3>
          <button class="action-btn close-summary-btn" onclick="this.closest('.ai-summary-card').remove()">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="ai-summary-body">
          <p>${err.message || 'Failed to communicate with Ollama server.'}</p>
        </div>
      </div>
    `)
  }
})

// AI Task Breakdown Subtask Generation Endpoint
app.post('/tasks/:id/ai-breakdown', requireAuth(), async (c) => {
  const pb = c.get('pb')
  const id = c.req.param('id')
  const myId = pb.authStore.model?.id

  try {
    const parentTask = await pb.collection('tasks').getOne<Task>(id)
    const subtaskTitles = await generateSubtasks(parentTask.title)

    for (const subTitle of subtaskTitles) {
      try {
        await pb.collection('tasks').create({
          title: subTitle,
          startDate: parentTask.startDate || null,
          endDate: parentTask.endDate || null,
          deadline: parentTask.deadline || null,
          priority: parentTask.priority || 'Medium',
          category: parentTask.category || 'Dev',
          completed: false,
          group: parentTask.group || null,
          parent: parentTask.id,
          user: myId || null
        })
      } catch (createErr) {
        console.warn("Failed to create subtask with relations, retrying with basic fields:", createErr)
        await pb.collection('tasks').create({
          title: subTitle,
          startDate: parentTask.startDate || null,
          endDate: parentTask.endDate || null,
          deadline: parentTask.deadline || null,
          priority: parentTask.priority || 'Medium',
          category: parentTask.category || 'Dev',
          completed: false,
          parent: parentTask.id
        })
      }
    }

    c.header('HX-Refresh', 'true')
    return c.text('Success')
  } catch (err: any) {
    console.error("AI breakdown failed:", err)
    c.header('HX-Trigger', JSON.stringify({ aiError: err.message || "Failed to generate subtasks from Ollama." }))
    return c.text('Failed to generate subtasks: ' + (err.message || ''), 500)
  }
})

// AI Command Bar Natural Language Task Creation
app.post('/tasks/ai-create', requireAuth(), async (c) => {
  const pb = c.get('pb')
  const body = await c.req.parseBody()
  const prompt = String(body.prompt || '').trim()
  const workspaceId = String(body.workspaceId || 'private')
  const myId = pb.authStore.model?.id

  if (!prompt) {
    return c.redirect(workspaceId === 'private' ? '/' : `/groups/${workspaceId}`)
  }

  const parsed = await parseNaturalLanguageTask(prompt)

  try {
    await pb.collection('tasks').create({
      title: parsed.title,
      category: parsed.category,
      priority: parsed.priority,
      deadline: parsed.deadline || null,
      completed: false,
      group: workspaceId === 'private' ? null : workspaceId,
      user: myId || null
    })
  } catch {
    await pb.collection('tasks').create({
      title: parsed.title,
      category: parsed.category,
      priority: parsed.priority,
      deadline: parsed.deadline || null,
      completed: false,
      group: workspaceId === 'private' ? null : workspaceId
    })
  }

  c.header('HX-Refresh', 'true')
  return c.text('Success')
})

// AI Daily Standup Generator Endpoint
app.get('/ai-standup', requireAuth(), async (c) => {
  const pb = c.get('pb')
  const workspaceId = c.req.query('workspaceId') || 'private'
  let workspaceName = 'Private Space'
  let tasks: Task[] = []

  if (workspaceId === 'private') {
    tasks = await pb.collection('tasks').getFullList<Task>({
      filter: 'group = "" || group = null',
      sort: '-created'
    })
  } else {
    try {
      const gObj = await pb.collection('groups').getOne(workspaceId)
      workspaceName = gObj.name || 'Team Workspace'
    } catch {}
    tasks = await pb.collection('tasks').getFullList<Task>({
      filter: `group = "${workspaceId}"`,
      sort: '-created'
    })
  }

  const markdownStandup = await generateDailyStandup(tasks, workspaceName)
  const htmlStandup = parseMarkdown(markdownStandup)

  return c.html(`
    <div class="glass-panel ai-summary-card standup-card">
      <div class="ai-summary-header">
        <h3><i class="fa-solid fa-calendar-check"></i> Daily Standup Digest</h3>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="action-btn" onclick="navigator.clipboard.writeText(this.closest('.standup-card').querySelector('.ai-summary-body').innerText); alert('Standup report copied to clipboard!')" title="Copy Report">
            <i class="fa-solid fa-copy"></i> Copy
          </button>
          <button class="action-btn close-summary-btn" onclick="this.closest('.ai-summary-card').remove()" title="Close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
      <div class="ai-summary-body">
        ${htmlStandup}
      </div>
    </div>
  `)
})

// AI Duplicate Task Checker Endpoint
app.post('/tasks/check-duplicates', requireAuth(), async (c) => {
  const pb = c.get('pb')
  const body = await c.req.parseBody()
  const title = String(body.prompt || body.title || '').trim()
  const workspaceId = String(body.workspaceId || 'private')

  if (!title || title.length < 4) return c.html('')

  let tasks: Task[] = []
  try {
    tasks = await pb.collection('tasks').getFullList<Task>({
      filter: workspaceId === 'private' ? 'group = "" || group = null' : `group = "${workspaceId}"`
    })
  } catch {}

  const duplicateCheck = checkDuplicateTask(title, tasks)
  if (duplicateCheck.isDuplicate) {
    return c.html(`
      <div class="duplicate-warning-banner">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>Similar task exists: <strong>"${duplicateCheck.matchedTitle}"</strong> (${duplicateCheck.similarityScore}% match)</span>
      </div>
    `)
  }
  return c.html('')
})

// Start server
serve({
  fetch: app.fetch,
  port: 3000,
  idleTimeout: 120 // 120 seconds timeout to accommodate slow local LLM generations
})

console.log("🚀 Server running at http://localhost:3000")
