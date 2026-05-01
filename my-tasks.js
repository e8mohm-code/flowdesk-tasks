/* =====================================================================
   Mobile employee app — 4 tabs (tasks / watching / profile / alerts)
   ===================================================================== */

(function () {
  const D = window.APP_DATA;
  if (!D) return;

  // Auth guard — must be logged in
  const user = D.getCurrentUser();
  if (!user) { location.replace('login.html'); return; }
  // (Managers / supervisors can also visit; mostly for preview testing)

  const { escapeHtml: esc, isOverdue, formatDue, getTagColor } = D;

  let activeTab = 'tasks';

  /* ---------- HEADER ---------- */
  function renderHead() {
    const breakdown = D.getEmployeeXPBreakdown(user.id);
    const xp = breakdown.net;
    const level = D.levelFromXP(xp);
    const pct = ((xp % 250) / 250) * 100;
    document.getElementById('phoneHead').innerHTML = `
      <div class="ph-head-row">
        <div class="ph-greeting">
          <span class="muted">أهلاً 👋</span>
          <h1>${esc(user.name.split(' ')[0])}</h1>
        </div>
        <span class="ph-avatar" style="--emp-color:${user.color}">
          <img src="${D.avatarUrl(user, 120)}" alt=""/>
          <span class="ph-lv">Lv ${level}</span>
        </span>
      </div>
      <div class="ph-xp-row">
        <span class="ph-xp-label">${xp} XP</span>
        <div class="ph-xp-bar"><span style="width:${pct}%; background:linear-gradient(90deg,#a78bfa,${user.color})"></span></div>
        <span class="ph-xp-next">${(level * 250) - xp} للترقية</span>
      </div>
      <button class="ph-logout" id="phLogout" aria-label="تسجيل خروج">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    `;
    document.getElementById('phLogout').addEventListener('click', () => D.logout());
  }

  /* ---------- TASK CARD ---------- */
  function taskCardHTML(t) {
    const overdue = isOverdue(t);
    const e = D.findEmployee(t.assignee);
    return `
      <article class="ph-task" data-task="${t.id}" ${overdue ? 'data-overdue="true"' : ''} data-priority="${t.priority}">
        <div class="ph-task-row">
          <span class="task-prio ${t.priority}"></span>
          <h4 class="ph-task-title">${esc(t.title)}</h4>
          ${overdue ? '<span class="overdue-pill">متأخرة</span>' : ''}
        </div>
        <div class="ph-task-foot">
          <span class="tag" style="--tag-color:${getTagColor(t.tagKey)}">${esc(t.tag)}</span>
          <span class="due">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
            ${formatDue(t.due)}
          </span>
          ${t.progress ? `<span class="ph-progress">${t.progress}%</span>` : ''}
        </div>
      </article>
    `;
  }

  /* ---------- TAB: مهامي ---------- */
  function renderTasksTab() {
    const list = D.tasks
      .filter(t => t.assignee === user.id && !t.done)
      .sort((a, b) => a.due.localeCompare(b.due));
    const done = D.tasks.filter(t => t.assignee === user.id && t.done);
    const overdue = list.filter(isOverdue).length;

    return `
      <div class="ph-stats">
        <div class="ph-stat">
          <b>${list.length}</b>
          <span>نشطة</span>
        </div>
        <div class="ph-stat warn">
          <b>${overdue}</b>
          <span>متأخرة</span>
        </div>
        <div class="ph-stat ok">
          <b>${done.length}</b>
          <span>منجزة</span>
        </div>
      </div>

      <div class="ph-section">
        <h2>مهامي الحالية</h2>
        <div class="ph-list">
          ${list.length ? list.map(taskCardHTML).join('') : '<div class="ph-empty">لا مهام مفتوحة 🎉</div>'}
        </div>
      </div>

      ${done.length ? `
        <div class="ph-section">
          <h2 class="muted-h">المنجزة مؤخراً</h2>
          <div class="ph-list">${done.slice(0, 5).map(taskCardHTML).join('')}</div>
        </div>
      ` : ''}
    `;
  }

  /* ---------- TAB: متابعتي (CC) ---------- */
  function renderWatchingTab() {
    const list = D.tasks.filter(t => (t.watchers || []).includes(user.id));
    return `
      <div class="ph-section">
        <h2>المهام التي تتابعها</h2>
        <p class="muted">مهام أُضفت إليها كـCC. تستلم تحديثاتها بدون أن تكون مسؤولاً عنها.</p>
        <div class="ph-list">
          ${list.length ? list.map(taskCardHTML).join('') : '<div class="ph-empty">لا تتابع أي مهمة حالياً</div>'}
        </div>
      </div>
    `;
  }

  /* ---------- TAB: ملفي ---------- */
  function renderProfileTab() {
    const breakdown = D.getEmployeeXPBreakdown(user.id);
    const xp = breakdown.net;
    const level = D.levelFromXP(xp);
    const open = D.tasks.filter(t => t.assignee === user.id && !t.done);
    const overdue = open.filter(isOverdue).length;
    const done = D.tasks.filter(t => t.assignee === user.id && t.done).length;
    const pct = ((xp % 250) / 250) * 100;

    return `
      <div class="ph-profile-card" style="--emp-color:${user.color}">
        <div class="ph-profile-avatar">
          <img src="${D.avatarUrl(user, 240)}" alt=""/>
          <span class="ph-lv lg">Lv ${level}</span>
        </div>
        <h2>${esc(user.name)}</h2>
        <div class="muted">${esc(user.role)} • ${esc(user.level)}</div>
        <a href="mailto:${user.email}" class="ph-profile-mail">${esc(user.email)}</a>
      </div>

      <div class="ph-stats">
        <div class="ph-stat"><b>${open.length}</b><span>نشطة</span></div>
        <div class="ph-stat warn"><b>${overdue}</b><span>متأخرة</span></div>
        <div class="ph-stat ok"><b>${done}</b><span>منجزة</span></div>
        <div class="ph-stat alt"><b style="color:var(--violet)">${xp}</b><span>XP</span></div>
      </div>

      <div class="ph-level-card">
        <header>
          <h3>المستوى ${level}</h3>
          <span class="muted">${(level * 250) - xp} XP للترقية</span>
        </header>
        <div class="ph-level-bar"><span style="width:${pct}%"></span></div>
        <div class="xp-breakdown" style="margin-top:10px">
          ${breakdown.onTime > 0       ? `<span class="xp-tag plus">+${breakdown.onTime} في الوقت</span>` : ''}
          ${breakdown.early > 0        ? `<span class="xp-tag bonus">+${breakdown.early} مكافأة مبكر</span>` : ''}
          ${breakdown.halved > 0       ? `<span class="xp-tag half">+${breakdown.halved} متأخر-نصف</span>` : ''}
          ${breakdown.subtaskBonus > 0 ? `<span class="xp-tag plus">+${breakdown.subtaskBonus} مهام فرعية</span>` : ''}
          ${breakdown.penalty > 0      ? `<span class="xp-tag minus">-${breakdown.penalty} خصم تأخر</span>` : ''}
          ${breakdown.total === 0 && breakdown.penalty === 0 ? '<span class="muted">لا نشاط XP بعد</span>' : ''}
        </div>
      </div>
    `;
  }

  /* ---------- TAB: التنبيهات ---------- */
  function renderAlertsTab() {
    const myTasks = D.tasks.filter(t => t.assignee === user.id);
    const events = [];

    // Overdue alerts
    myTasks.filter(t => !t.done && isOverdue(t)).forEach(t => {
      events.push({
        kind: 'overdue',
        text: `<b>${esc(t.title)}</b> متأخرة عن موعدها`,
        when: t.due,
        taskId: t.id,
      });
    });

    // Newly assigned (last 7 days)
    const weekAgo = new Date(D.TODAY); weekAgo.setDate(weekAgo.getDate() - 7);
    myTasks.forEach(t => {
      (t.activity || []).forEach(a => {
        if (a.type === 'assigned' && a.to === user.id) {
          const when = new Date(a.when);
          if (when >= weekAgo) {
            events.push({ kind: 'assigned', text: `أُسندت إليك: <b>${esc(t.title)}</b>`, when: a.when, taskId: t.id });
          }
        }
        if (a.type === 'comment' && a.by !== user.id) {
          const when = new Date(a.when);
          if (when >= weekAgo) {
            events.push({ kind: 'comment', text: `تعليق على <b>${esc(t.title)}</b>: «${esc(a.text)}»`, when: a.when, taskId: t.id });
          }
        }
      });
    });

    events.sort((a, b) => (b.when || '').localeCompare(a.when || ''));

    const ICONS = { overdue: '⚠️', assigned: '📋', comment: '💬' };

    return `
      <div class="ph-section">
        <h2>التنبيهات</h2>
        <div class="ph-alerts">
          ${events.length ? events.map(e => `
            <div class="ph-alert ${e.kind}" data-task="${e.taskId}">
              <span class="ph-alert-icon">${ICONS[e.kind] || '🔔'}</span>
              <div class="ph-alert-text">${e.text}</div>
            </div>
          `).join('') : '<div class="ph-empty">لا تنبيهات حالياً</div>'}
        </div>
      </div>
    `;
  }

  /* ---------- RENDER MAIN ---------- */
  function render() {
    renderHead();
    let content = '';
    if (activeTab === 'tasks')    content = renderTasksTab();
    else if (activeTab === 'watching') content = renderWatchingTab();
    else if (activeTab === 'profile')  content = renderProfileTab();
    else if (activeTab === 'alerts')   content = renderAlertsTab();
    document.getElementById('phoneMain').innerHTML = content;
    document.querySelectorAll('.ph-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === activeTab));
    bindTaskClicks();
  }

  function bindTaskClicks() {
    document.querySelectorAll('[data-task]').forEach(el => {
      el.addEventListener('click', () => {
        if (window.TaskDetailModal) window.TaskDetailModal.open(el.dataset.task);
      });
    });
  }

  document.getElementById('phoneNav').addEventListener('click', e => {
    const btn = e.target.closest('.ph-tab');
    if (!btn) return;
    activeTab = btn.dataset.tab;
    render();
  });

  // Re-render when modal updates a task
  window.refreshTasks = render;

  render();
})();
