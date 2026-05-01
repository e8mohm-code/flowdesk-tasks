/* =====================================================================
   Employee profile page — renders details for a single employee.
   URL: employee.html?id=eX
   ===================================================================== */

LAYOUT.render('team');

(function () {
  const D = window.APP_DATA;
  if (!D) return;
  if (!D.getCurrentUser() || D.isEmployee()) return;

  const { escapeHtml: esc, isOverdue, formatDue, getTagColor } = D;

  const params = new URLSearchParams(location.search);
  const empId = params.get('id');
  const emp = D.findEmployee(empId);

  const root = document.getElementById('empProfile');

  if (!emp) {
    root.innerHTML = `
      <div class="empty-state">
        <div class="empty-emoji">😶</div>
        <h3>الموظف غير موجود</h3>
        <p class="muted">رقم الهوية المُمرَّر: ${esc(empId || '—')}</p>
        <a href="team.html" class="ghost-btn" style="margin-top:12px">← العودة للفريق</a>
      </div>
    `;
    return;
  }

  /* ---------- Compute stats ---------- */
  const allTasks = D.tasks.filter(t => D.isAssignedTo(t, emp.id));
  const open = allTasks.filter(t => !t.done);
  const overdueTasks = open.filter(isOverdue);
  const doneTasks = allTasks.filter(t => t.done);
  const watchingTasks = D.tasks.filter(t => (t.watchers || []).includes(emp.id));

  const breakdown = D.getEmployeeXPBreakdown(emp.id);
  const xp = breakdown.net;
  const level = D.levelFromXP(xp);
  const xpToNext = (level * 250) - xp;
  const levelProgressPct = ((xp % 250) / 250) * 100;

  const joinedDate = emp.joined ? new Date(emp.joined + 'T00:00:00') : null;
  const monthsAtCompany = joinedDate ? Math.max(1, Math.floor((D.TODAY - joinedDate) / (1000*60*60*24*30))) : null;

  /* ---------- Render ---------- */
  function taskCardHTML(t) {
    const overdue = isOverdue(t);
    return `
      <article class="task" data-task="${t.id}" data-priority="${t.priority}" ${overdue ? 'data-overdue="true"' : ''}>
        <div class="task-row">
          <span class="task-prio ${t.priority}"></span>
          <h4 class="task-title">${esc(t.title)}</h4>
          ${overdue ? '<span class="overdue-pill">متأخرة</span>' : ''}
        </div>
        <div class="task-foot">
          <span class="tag" style="--tag-color:${getTagColor(t.tagKey)}">${esc(t.tag)}</span>
          <span class="due">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
            ${formatDue(t.due)}
          </span>
        </div>
      </article>
    `;
  }

  function emptyState(text) {
    return `<div class="muted" style="padding:20px;text-align:center;border:1.5px dashed var(--line-2);border-radius:12px">${esc(text)}</div>`;
  }

  root.innerHTML = `
    <!-- Hero -->
    <section class="emp-profile-hero" style="--emp-color:${emp.color}">
      <div class="profile-avatar-block">
        <div class="profile-avatar">
          <img src="${D.avatarUrl(emp, 240)}" alt=""/>
          <span class="profile-lv">Lv ${level}</span>
        </div>
        <div class="profile-online">
          <span class="status-dot online"></span>
          <span>متصل الآن</span>
        </div>
      </div>

      <div class="profile-meta">
        <h1 class="profile-name">${esc(emp.name)}</h1>
        <div class="profile-role">${esc(emp.role)} • ${esc(emp.level)}</div>
        <a class="profile-email" href="mailto:${emp.email}">${esc(emp.email)}</a>
        ${monthsAtCompany ? `<div class="profile-tenure">منذ ${monthsAtCompany} شهر في الفريق</div>` : ''}
      </div>

      <div class="profile-quick-actions">
        <a class="ghost-btn" href="mailto:${emp.email}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
          إيميل
        </a>
        <button class="ghost-btn" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          محادثة
        </button>
      </div>
    </section>

    <!-- KPIs -->
    <section class="kpi-row">
      <div class="kpi-chip">
        <span class="kpi-num">${open.length}</span>
        <span class="kpi-label">نشطة</span>
      </div>
      <div class="kpi-chip warn">
        <span class="kpi-num">${overdueTasks.length}</span>
        <span class="kpi-label">متأخرة</span>
      </div>
      <div class="kpi-chip ok">
        <span class="kpi-num">${doneTasks.length}</span>
        <span class="kpi-label">منجزة</span>
      </div>
      <div class="kpi-chip alt">
        <span class="kpi-num" style="color:var(--violet)">${xp}</span>
        <span class="kpi-label">XP إجمالي</span>
      </div>
    </section>

    <!-- Level progress -->
    <section class="profile-level-card">
      <header class="profile-level-head">
        <div>
          <h3>المستوى ${level}</h3>
          <span class="muted">يحتاج ${xpToNext} XP للترقية للمستوى ${level + 1}</span>
        </div>
        <div class="profile-level-circle">
          <span>Lv ${level}</span>
        </div>
      </header>
      <div class="profile-level-bar">
        <span style="width:${levelProgressPct}%"></span>
      </div>

      <div class="xp-breakdown" style="margin-top:14px;border-top:1px dashed var(--line);padding-top:12px">
        ${breakdown.onTime > 0       ? `<span class="xp-tag plus">+${breakdown.onTime} في الوقت (${breakdown.counts.onTime})</span>` : ''}
        ${breakdown.early > 0        ? `<span class="xp-tag bonus">+${breakdown.early} مكافأة مبكر (${breakdown.counts.early})</span>` : ''}
        ${breakdown.halved > 0       ? `<span class="xp-tag half">+${breakdown.halved} متأخر-نصف (${breakdown.counts.late})</span>` : ''}
        ${breakdown.subtaskBonus > 0 ? `<span class="xp-tag plus">+${breakdown.subtaskBonus} مهام فرعية</span>` : ''}
        ${breakdown.penalty > 0      ? `<span class="xp-tag minus">-${breakdown.penalty} خصم تأخر (${breakdown.counts.overdue})</span>` : ''}
        ${breakdown.total === 0 && breakdown.penalty === 0 ? '<span class="muted">لا نشاط XP بعد</span>' : ''}
      </div>
    </section>

    <!-- Active tasks -->
    <section class="profile-section">
      <header class="area-head">
        <h2 class="area-title">المهام الحالية <span class="td-count">${open.length}</span></h2>
      </header>
      <div class="profile-task-grid">
        ${open.map(taskCardHTML).join('') || emptyState('لا توجد مهام نشطة الآن')}
      </div>
    </section>

    <!-- Done tasks -->
    ${doneTasks.length ? `
      <section class="profile-section">
        <header class="area-head">
          <h2 class="area-title">المهام المنجزة <span class="td-count">${doneTasks.length}</span></h2>
        </header>
        <div class="profile-task-grid">
          ${doneTasks.slice(0, 6).map(taskCardHTML).join('')}
        </div>
      </section>
    ` : ''}

    <!-- Watching as CC -->
    ${watchingTasks.length ? `
      <section class="profile-section">
        <header class="area-head">
          <h2 class="area-title">يتابع كـCC <span class="td-count">${watchingTasks.length}</span></h2>
        </header>
        <div class="profile-task-grid">
          ${watchingTasks.slice(0, 6).map(taskCardHTML).join('')}
        </div>
      </section>
    ` : ''}
  `;

  /* Wire task clicks → open detail modal */
  root.addEventListener('click', e => {
    const taskEl = e.target.closest && e.target.closest('.task[data-task]');
    if (!taskEl) return;
    const taskId = taskEl.dataset.task;
    if (taskId && window.TaskDetailModal) window.TaskDetailModal.open(taskId);
  });

  // Refresh after detail modal changes a task
  window.refreshTasks = () => location.reload();
})();
