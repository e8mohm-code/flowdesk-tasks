/* =====================================================================
   Shared shell — single topbar, no sidebar.
   Each page calls: LAYOUT.render('tasks');
   ===================================================================== */

window.LAYOUT = (function () {

  const PAGES = {
    tasks:         { file: 'index.html',         label: 'المهام',     icon: 'tasks' },
    team:          { file: 'team.html',          label: 'الفِرق',      icon: 'team' },
    calendar:      { file: 'calendar.html',      label: 'التقويم',    icon: 'cal'  },
    reports:       { file: 'reports.html',       label: 'التقارير',   icon: 'reports'},
    checklists:    { file: 'checklists.html',    label: 'الشك ليست',  icon: 'check' },
    favorites:     { file: 'favorites.html',     label: 'المفضلة',    icon: 'star' },
    notifications: { file: 'notifications.html', label: 'التنبيهات',  icon: 'bell' },
  };

  const ICON_STAR   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 8.5 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 9 8.5 12 2"/></svg>`;
  const ICON_BELL   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M14 21a2 2 0 01-4 0"/></svg>`;
  const ICON_SEARCH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`;
  const ICON_PLUS   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`;

  function buildSidebar() { return ''; /* sidebar removed */ }

  function buildTopbar(activeKey) {
    const tab = key => `<a href="${PAGES[key].file}" class="tab ${activeKey === key ? 'active' : ''}">${PAGES[key].label}</a>`;
    const D = window.APP_DATA;
    const user = D ? D.getCurrentUser() : null;
    const canCreate = D && D.canCreateTasks();
    const userColor = user ? user.color : '#94a3b8';
    const userAvatar = user ? D.avatarUrl(user, 64) : 'https://i.pravatar.cc/64?img=47';
    const ROLE_LABEL = { manager: 'مدير', supervisor: 'مشرف', employee: 'موظف' };

    return `
      <header class="topbar">
        <a href="index.html" class="brand-mark" aria-label="الرئيسية">
          <span class="brand-logo"></span>
          <span class="brand-name">flowdesk</span>
        </a>

        <nav class="tabs" role="tablist">
          ${tab('team')}
          ${tab('reports')}
          ${D && D.canManageChecklists() ? tab('checklists') : ''}
          ${tab('tasks')}
          ${tab('calendar')}
        </nav>

        <div class="top-actions">
          ${canCreate ? `
            <button type="button" class="cta-mini" id="topbarNewTask" aria-label="مهمة جديدة">
              ${ICON_PLUS}
              <span>مهمة جديدة</span>
            </button>
          ` : ''}

          <div class="search">
            ${ICON_SEARCH}
            <input id="searchInput" type="search" placeholder="ابحث..." />
          </div>

          <a class="icon-btn ${activeKey==='favorites' ? 'active' : ''}" href="favorites.html" aria-label="المفضلة">
            ${ICON_STAR}
          </a>

          <a class="icon-btn ${activeKey==='notifications' ? 'active' : ''}" href="notifications.html" aria-label="التنبيهات">
            ${ICON_BELL}
            <span class="badge-dot"></span>
          </a>

          <div class="avatar-menu" id="avatarMenu">
            <button type="button" class="avatar-btn" id="avatarBtn" aria-label="حسابي" style="--emp-color:${userColor}">
              <img src="${userAvatar}" alt="" />
            </button>
            <div class="avatar-dropdown" id="avatarDropdown">
              <div class="avatar-dd-head" style="--emp-color:${userColor}">
                <span class="avatar-dd-img"><img src="${userAvatar}" alt=""/></span>
                <div>
                  <b>${user ? user.name : 'ضيف'}</b>
                  <span class="muted">${user ? `${ROLE_LABEL[user.permRole] || ''} • ${user.role}` : '—'}</span>
                </div>
              </div>
              <button type="button" class="avatar-dd-item" id="avatarLogoutBtn">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      </header>
    `;
  }

  // Auth guard — redirects to login.html if no user, or to my-tasks.html for employees
  // on desktop pages. Returns true if rendering should continue.
  function authGuard(activeKey) {
    const D = window.APP_DATA;
    if (!D) return true;
    const u = D.getCurrentUser();
    if (!u) {
      location.replace('login.html');
      return false;
    }
    // Employees only get the mobile app — never the desktop pages
    if (u.permRole === 'employee') {
      // (`my-tasks` page passes a different activeKey; skip guard there.)
      if (activeKey !== 'my-tasks') {
        location.replace('my-tasks.html');
        return false;
      }
    }
    return true;
  }

  function render(activeKey) {
    if (!authGuard(activeKey)) return;

    const side = document.getElementById('sidebarSlot');
    const top  = document.getElementById('topbarSlot');
    if (side) side.outerHTML = buildSidebar(activeKey);
    if (top)  top.outerHTML  = buildTopbar(activeKey);

    setTimeout(() => {
      // "+ مهمة جديدة" button (only present for managers/supervisors)
      const newBtn = document.getElementById('topbarNewTask');
      if (newBtn) newBtn.addEventListener('click', () => {
        if (window.TaskModal) window.TaskModal.open();
      });

      // Avatar dropdown
      const avBtn = document.getElementById('avatarBtn');
      const dd    = document.getElementById('avatarDropdown');
      const logoutBtn = document.getElementById('avatarLogoutBtn');
      if (avBtn && dd) {
        avBtn.addEventListener('click', e => {
          e.stopPropagation();
          dd.classList.toggle('open');
        });
        document.addEventListener('click', () => dd.classList.remove('open'));
      }
      if (logoutBtn) logoutBtn.addEventListener('click', () => {
        const D = window.APP_DATA; if (D) D.logout();
      });
    }, 0);
  }

  return { render, PAGES };

})();
