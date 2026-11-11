import { renderLayout } from './layout'
import { renderTaskItem } from './dashboard'
import type { Task } from './dashboard'

export function renderMemberDashboard(
  tasks: Task[], 
  email: string, 
  groups: any[], 
  activeWorkspaceId: string, 
  activeMemberId: string,
  groupMembers: any[] = []
) {
  const total = tasks.length
  const completed = tasks.filter(t => t.completed).length
  const pending = total - completed

  // Render the list to a string
  const taskListHtml = tasks.map(t => renderTaskItem(t, true)).join('')

  // Renders the group list inside sidebar
  const groupLinksHtml = groups.map(g => {
    const isActive = g.id === activeWorkspaceId
    return `
      <a href="/groups/${g.id}" class="sidebar-item ${isActive ? 'active' : ''}">
        <i class="fa-solid fa-users"></i>
        <div class="sidebar-item-info">
          <span class="group-name">${g.name}</span>
          <span class="group-id-code" onclick="event.preventDefault(); navigator.clipboard.writeText('${g.id}'); alert('Share Code Copied!');" title="Click to copy join code">Code: ${g.id.substring(0, 6)}... <i class="fa-regular fa-copy"></i></span>
        </div>
      </a>
    `
  }).join('')

  const activeGroupName = groups.find(g => g.id === activeWorkspaceId)?.name || 'Team Workspace'
  const activeMemberObj = groupMembers.find(m => m.id === activeMemberId)
  const activeMemberEmail = activeMemberObj?.email || 'Member'
  const activeMemberName = activeMemberEmail.split('@')[0]

  // Workspace members sidebar listing
  const membersListHtml = groupMembers.map(m => {
    const isMemberActive = m.id === activeMemberId
    return `
      <a href="/groups/${activeWorkspaceId}/member/${m.id}" class="sidebar-item ${isMemberActive ? 'active' : ''}">
        <span class="avatar-circle-sm">${m.email.charAt(0).toUpperCase()}</span>
        <span>${m.email.split('@')[0]}</span>
      </a>
    `
  }).join('')

  const content = `
  <!-- Inject active workspace ID globally for Three.js -->
  <script>
    window.activeWorkspaceId = '${activeWorkspaceId}';
    window.activeMemberId = '${activeMemberId}';
  </script>

  <!-- Navbar -->
  <nav class="navbar">
    <div class="nav-left">
      <i class="fa-solid fa-circle-nodes nav-logo"></i>
      <span class="nav-title">Task Constellation</span>
      <span class="workspace-badge"><i class="fa-solid fa-rocket"></i> ${activeGroupName} / ${activeMemberName}</span>
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
        <a href="/" class="sidebar-item">
          <i class="fa-solid fa-lock"></i>
          <span>Private Space</span>
        </a>
        
        <div class="sidebar-section-title">Team Spaces</div>
        ${groupLinksHtml ? groupLinksHtml : '<div class="sidebar-empty">No active teams.</div>'}
        
        <div class="sidebar-section-title">Workspace Members</div>
        <a href="/groups/${activeWorkspaceId}" class="sidebar-item">
          <i class="fa-solid fa-list"></i>
          <span>All Team Tasks</span>
        </a>
        ${membersListHtml ? membersListHtml : '<div class="sidebar-empty">No members found.</div>'}
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
            <h2><i class="fa-regular fa-user"></i> ${activeMemberName}'s Tasks</h2>
            <button class="btn btn-ai-summary" hx-get="/ai-summary?workspaceId=${activeWorkspaceId}&memberId=${activeMemberId}" hx-target="#ai-summary-container" hx-swap="innerHTML">
              <i class="fa-solid fa-brain"></i> AI Summary
            </button>
          </div>
          <p class="panel-subtitle">Individual member tasks tracker inside ${activeGroupName}</p>
        </div>

        <!-- AI Summary Container -->
        <div id="ai-summary-container"></div>

        <!-- Quick Stats Cards -->
        <div class="stats-row">
          <div class="stat-card stat-total">
            <span class="stat-label">Total Assigned</span>
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

        <!-- Task List Container -->
        <div id="task-list" class="task-list-container">
          ${taskListHtml ? taskListHtml : `<div class="empty-state"><i class="fa-solid fa-clipboard-check"></i><p>No tasks assigned to ${activeMemberName} yet.</p></div>`}
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
  return renderLayout(`${activeMemberName}'s Tracker - ${activeGroupName}`, content, true)
}
