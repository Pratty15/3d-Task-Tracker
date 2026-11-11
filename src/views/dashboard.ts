import { renderLayout } from './layout'

export interface Task {
  id: string
  title: string
  startDate?: string
  endDate?: string
  deadline?: string
  priority?: 'Low' | 'Medium' | 'High'
  category?: string
  completed: boolean
  group?: string
  assignedTo?: string
  parent?: string
  expand?: {
    assignedTo?: {
      email: string
    }
  }
}

export function renderDashboard(
  tasks: Task[], 
  email: string, 
  groups: any[], 
  activeWorkspaceId: string
) {
  const total = tasks.length
  const completed = tasks.filter(t => t.completed).length
  const pending = total - completed

  // Render the list to a string
  const taskListHtml = tasks.map(t => renderTaskItem(t, false)).join('')

  // Renders the group list inside sidebar
  const groupLinksHtml = groups.map(g => {
    return `
      <a href="/groups/${g.id}" class="sidebar-item">
        <i class="fa-solid fa-users"></i>
        <div class="sidebar-item-info">
          <span class="group-name">${g.name}</span>
          <span class="group-id-code" onclick="event.preventDefault(); navigator.clipboard.writeText('${g.id}'); alert('Share Code Copied!');" title="Click to copy join code">Code: ${g.id.substring(0, 6)}... <i class="fa-regular fa-copy"></i></span>
        </div>
      </a>
    `
  }).join('')

  const content = `
  <!-- Inject active workspace ID globally for Three.js -->
  <script>
    window.activeWorkspaceId = '${activeWorkspaceId}';
    window.activeMemberId = '';
  </script>

  <!-- Navbar -->
  <nav class="navbar">
    <div class="nav-left">
      <i class="fa-solid fa-circle-nodes nav-logo"></i>
      <span class="nav-title">Task Constellation</span>
      <span class="workspace-badge"><i class="fa-solid fa-rocket"></i> Private Space</span>
    </div>
    <div class="nav-right">
      <button onclick="toggleTheme()" class="btn-theme-toggle btn-icon" title="Toggle Light/Dark Theme">
        <i class="fa-solid fa-circle-half-stroke"></i>
      </button>
      <span class="user-badge"><i class="fa-regular fa-user"></i> ${email}</span>
      <a href="/logout" class="logout-link"><i class="fa-solid fa-arrow-right-from-bracket"></i> Logout</a>
    </div>
  </nav>

  <!-- Sidebar & Grid Layout -->
  <div class="dashboard-container">
    
    <!-- Sidebar: Workspaces -->
    <div class="glass-panel workspace-sidebar">
      <div class="sidebar-header">
        <h3><i class="fa-solid fa-folder-tree"></i> Workspaces</h3>
      </div>
      
      <div class="sidebar-list">
        <a href="/" class="sidebar-item active">
          <i class="fa-solid fa-lock"></i>
          <span>Private Space</span>
        </a>
        
        <div class="sidebar-section-title">Team Spaces</div>
        ${groupLinksHtml ? groupLinksHtml : '<div class="sidebar-empty">No active teams.</div>'}
      </div>

      <div class="sidebar-actions">
        <div class="sidebar-action-box">
          <h4>Create Team</h4>
          <form hx-post="/groups" hx-target="body">
            <input type="text" name="name" placeholder="Team name..." required />
            <button class="btn btn-secondary" type="submit">
              <i class="fa-solid fa-plus"></i> Create
            </button>
          </form>
        </div>

        <div class="sidebar-action-box">
          <h4>Join Team</h4>
          <form hx-post="/groups/join" hx-target="body">
            <input type="text" name="groupId" placeholder="Share Code..." required />
            <button class="btn btn-secondary" type="submit">
              <i class="fa-solid fa-right-to-bracket"></i> Join
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- Main Grid Dashboard -->
    <div class="dashboard-grid">
      
      <!-- Tasks & Controls -->
      <div class="glass-panel main-panel">
        <div class="panel-header">
          <div class="panel-title-row">
            <h2><i class="fa-solid fa-list-check"></i> Private Tasks</h2>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-ai-standup" hx-get="/ai-standup?workspaceId=private" hx-target="#ai-summary-container" hx-swap="innerHTML">
                <i class="fa-solid fa-calendar-check"></i> Daily Standup
              </button>
              <button class="btn btn-ai-summary" hx-get="/ai-summary?workspaceId=private" hx-target="#ai-summary-container" hx-swap="innerHTML">
                <i class="fa-solid fa-brain"></i> AI Summary
              </button>
            </div>
          </div>
          <p class="panel-subtitle">Collaborate, organize, and inspect tasks in 3D clusters</p>
        </div>

        <!-- AI Command Bar & Voice Copilot -->
        <div class="ai-command-bar-wrapper">
          <form hx-post="/tasks/ai-create" hx-target="body" class="ai-command-bar">
            <input type="hidden" name="workspaceId" value="private" />
            <i class="fa-solid fa-wand-magic-sparkles ai-command-icon"></i>
            <input 
              type="text" 
              name="prompt" 
              id="ai-command-input" 
              placeholder="AI Command Bar: e.g. 'Fix login navbar CSS bug by tomorrow high priority category Design'..." 
              required
              hx-post="/tasks/check-duplicates"
              hx-trigger="keyup changed delay:350ms"
              hx-target="#duplicate-warning-container"
              hx-include="[name='workspaceId']"
            />
            <button type="button" class="btn-voice-copilot" onclick="toggleVoiceRecognition('ai-command-input')" title="Voice Copilot (Click to Speak)">
              <i class="fa-solid fa-microphone" id="voice-mic-icon"></i>
            </button>
            <button class="btn btn-primary btn-ai-add" type="submit">
              <i class="fa-solid fa-paper-plane"></i> AI Create
            </button>
          </form>
          <div id="duplicate-warning-container"></div>
        </div>

        <!-- AI Summary Container -->
        <div id="ai-summary-container"></div>

        <!-- Quick Stats Cards -->
        <div class="stats-row">
          <div class="stat-card stat-total">
            <span class="stat-label">Total Tasks</span>
            <span class="stat-value">${total}</span>
          </div>
          <div class="stat-card stat-pending">
            <span class="stat-label">Pending</span>
            <span class="stat-value">${pending}</span>
          </div>
          <div class="stat-card stat-completed">
            <span class="stat-label">Completed</span>
            <span class="stat-value">${completed}</span>
          </div>
        </div>

        <!-- Search & Filters -->
        <div class="search-filter-bar">
          <div class="search-input-wrapper">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input 
              type="text"
              name="search"
              placeholder="Search tasks by title..."
              hx-get="/search"
              hx-trigger="keyup changed delay:250ms"
              hx-target="#task-list"
            />
          </div>
        </div>

        <!-- Add Task Form -->
        <form class="add-task-form" hx-post="/tasks" hx-target="#task-list" hx-swap="afterbegin" hx-on::after-request="this.reset()">
          <input type="hidden" name="group" value="${activeWorkspaceId}" />

          <div class="form-row main-inputs">
            <input type="text" name="title" placeholder="New task title..." required />
            
            <select name="category" required>
              <option value="Dev" selected>💻 Dev</option>
              <option value="Design">🎨 Design</option>
              <option value="Research">🔍 Research</option>
              <option value="Testing">🧪 Testing</option>
              <option value="Ops">🚀 Ops</option>
            </select>
            
            <select name="priority" required>
              <option value="Low">Low Priority</option>
              <option value="Medium" selected>Medium Priority</option>
              <option value="High">High Priority</option>
            </select>
          </div>
          
          <div class="form-row dates-inputs">
            <div class="input-date-wrapper">
              <label>Start Date</label>
              <input type="date" name="startDate" required />
            </div>
            
            <div class="input-date-wrapper">
              <label>End/Deadline</label>
              <input type="date" name="endDate" required />
            </div>

            <button class="btn btn-add" type="submit">
              <i class="fa-solid fa-plus"></i> Add
            </button>
          </div>
        </form>

        <!-- Task List Container -->
        <div id="task-list" class="task-list-container">
          ${taskListHtml ? taskListHtml : `<div class="empty-state"><i class="fa-solid fa-cloud-sun"></i><p>No tasks yet. Create one above to spawn a 3D node!</p></div>`}
        </div>
      </div>
    </div>
  </div>

  <script>
    function toggleTheme() {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      window.dispatchEvent(new CustomEvent('theme-changed', { detail: newTheme }));
    }
  </script>
  `
  return renderLayout('Dashboard', content, true)
}

export function renderTaskItem(task: Task, isGroupContext: boolean = false) {
  const now = new Date()
  const deadline = task.deadline ? new Date(task.deadline) : (task.endDate ? new Date(task.endDate) : null)

  let statusClass = "normal"
  let statusBadge = `<span class="badge badge-normal"><i class="fa-solid fa-circle-check"></i> On Track</span>`

  if (task.completed) {
    statusClass = "completed"
    statusBadge = `<span class="badge badge-completed"><i class="fa-solid fa-circle-check"></i> Completed</span>`
  } else if (deadline) {
    const diff = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

    if (diff < 0) {
      statusClass = "overdue"
      statusBadge = `<span class="badge badge-overdue"><i class="fa-solid fa-triangle-exclamation"></i> Overdue</span>`
    } else if (diff <= 2) {
      statusClass = "warning"
      statusBadge = `<span class="badge badge-warning"><i class="fa-solid fa-circle-exclamation"></i> Urgent</span>`
    }
  }

  const priorityBadge = `<span class="priority-indicator priority-${task.priority?.toLowerCase() || 'medium'}">${task.priority || 'Medium'}</span>`

  const categoryLabels: Record<string, string> = {
    Dev: '💻 Dev',
    Design: '🎨 Design',
    Research: '🔍 Research',
    Testing: '🧪 Testing',
    Ops: '🚀 Ops'
  }
  const categoryBadge = `<span class="category-indicator">${categoryLabels[task.category || 'Dev'] || '💻 Dev'}</span>`

  // Show Assignee Info
  let assigneeBadge = ""
  if (isGroupContext && task.expand?.assignedTo) {
    const emailStr = task.expand.assignedTo.email
    const initial = emailStr.charAt(0).toUpperCase()
    assigneeBadge = `
      <span class="assignee-badge" title="Assigned to: ${emailStr}">
        <span class="avatar-circle">${initial}</span>
        <span class="avatar-email">${emailStr.split('@')[0]}</span>
      </span>
    `
  }

  // Format date readable
  let dateText = ""
  if (task.startDate && task.endDate) {
    const startStr = task.startDate.split(' ')[0]
    const endStr = task.endDate.split(' ')[0]
    dateText = `<i class="fa-regular fa-calendar"></i> ${startStr} to ${endStr}`
  } else if (task.endDate) {
    dateText = `<i class="fa-regular fa-calendar"></i> Due ${task.endDate.split(' ')[0]}`
  }

  return `
  <div class="task-card ${statusClass} ${task.parent ? 'subtask-card' : ''}" id="task-${task.id}">
    <div class="task-info">
      <div class="task-title-row">
        <h4 class="task-title">
          ${task.parent ? `<span class="subtask-prefix">└─</span>` : ''}
          ${task.title}
        </h4>
        ${categoryBadge}
        ${priorityBadge}
        ${assigneeBadge}
      </div>
      <div class="task-meta">
        ${dateText ? `<span class="task-date">${dateText}</span>` : ''}
        ${statusBadge}
      </div>
    </div>
    <div class="task-actions">
      ${!task.parent ? `
      <button class="action-btn ai-breakdown-btn" hx-post="/tasks/${task.id}/ai-breakdown" title="AI Subtask Breakdown">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
      </button>
      ` : ''}
      <button class="action-btn focus-btn" onclick="window.dispatchEvent(new CustomEvent('focus-node', { detail: '${task.id}' }))" title="Focus in 3D">
        <i class="fa-solid fa-eye"></i>
      </button>
      <button class="action-btn edit-btn" hx-get="/edit/${task.id}" hx-target="#task-${task.id}" hx-swap="outerHTML" title="Edit Task">
        <i class="fa-regular fa-pen-to-square"></i>
      </button>
      <button class="action-btn toggle-btn" hx-get="/toggle/${task.id}" hx-target="#task-${task.id}" hx-swap="outerHTML" title="Toggle Complete">
        <i class="fa-solid fa-check"></i>
      </button>
      <button class="action-btn delete-btn" hx-get="/delete/${task.id}" hx-target="#task-${task.id}" hx-swap="delete" title="Delete Task">
        <i class="fa-regular fa-trash-can"></i>
      </button>
    </div>
  </div>
  `
}

export function renderEditForm(task: Task, groupMembers: any[] = []) {
  const startDateStr = task.startDate ? task.startDate.split(' ')[0] : ''
  const endDateStr = task.endDate ? task.endDate.split(' ')[0] : ''
  const isGroupContext = groupMembers.length > 0

  return `
  <div class="task-card edit-mode-card" id="task-${task.id}">
    <form class="inline-edit-form" hx-post="/edit/${task.id}" hx-target="#task-${task.id}" hx-swap="outerHTML">
      <div class="edit-fields">
        <input type="text" name="title" value="${task.title}" required />
        
        <div class="edit-row">
          <select name="category" required>
            <option value="Dev" ${task.category === 'Dev' ? 'selected' : ''}>💻 Dev</option>
            <option value="Design" ${task.category === 'Design' ? 'selected' : ''}>🎨 Design</option>
            <option value="Research" ${task.category === 'Research' ? 'selected' : ''}>🔍 Research</option>
            <option value="Testing" ${task.category === 'Testing' ? 'selected' : ''}>🧪 Testing</option>
            <option value="Ops" ${task.category === 'Ops' ? 'selected' : ''}>🚀 Ops</option>
          </select>
          <select name="priority" required>
            <option value="Low" ${task.priority === 'Low' ? 'selected' : ''}>Low Priority</option>
            <option value="Medium" ${task.priority === 'Medium' || !task.priority ? 'selected' : ''}>Medium Priority</option>
            <option value="High" ${task.priority === 'High' ? 'selected' : ''}>High Priority</option>
          </select>
          <input type="date" name="startDate" value="${startDateStr}" required />
          <input type="date" name="endDate" value="${endDateStr}" required />
          
          ${isGroupContext ? `
          <select name="assignedTo">
            <option value="">Unassigned</option>
            ${groupMembers.map(m => `<option value="${m.id}" ${task.assignedTo === m.id ? 'selected' : ''}>${m.email}</option>`).join('')}
          </select>
          ` : ''}
        </div>
      </div>
      
      <div class="edit-actions">
        <button class="btn btn-save" type="submit">
          <i class="fa-regular fa-floppy-disk"></i> Save
        </button>
        <button class="btn btn-cancel" type="button" hx-get="/tasks/${task.id}" hx-target="#task-${task.id}" hx-swap="outerHTML">
          Cancel
        </button>
      </div>
    </form>
  </div>
  `
}
