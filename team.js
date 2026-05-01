/* =====================================================================
   Team page — full-detail employee cards + leaderboard.
   ===================================================================== */

LAYOUT.render('team');

(function () {
  const D = window.APP_DATA;
  if (!D) return;
  if (!D.getCurrentUser() || D.isEmployee()) return;

  const employees = D.getVisibleEmployees();
  const { tasks, isOverdue, escapeHtml } = D;

  const teamGrid    = document.getElementById('teamGrid');
  const leaderboard = document.getElementById('leaderboard');
  const filterInput = document.getElementById('searchInput');
  const roleFilters = document.getElementById('roleFilters');

  let activeRole = 'all';

  /* Role filters chips */
  const roles = ['all', ...Array.from(new Set(employees.map(e => e.role)))];
  const roleLabels = { all: 'الكل' };

  function renderRoleChips() {
    roleFilters.innerHTML = roles.map(r =>
      `<button class="chip-btn ${activeRole === r ? 'active' : ''}" data-role="${escapeHtml(r)}">${escapeHtml(roleLabels[r] || r)}</button>`
    ).join('');
    roleFilters.querySelectorAll('.chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeRole = btn.dataset.role;
        renderAll();
      });
    });
  }

  function getQuery() { return (filterInput?.value || '').trim().toLowerCase(); }

  function matchEmp(emp) {
    const q = getQuery();
    if (activeRole !== 'all' && emp.role !== activeRole) return false;
    if (q && !emp.name.toLowerCase().includes(q) && !emp.role.toLowerCase().includes(q)) return false;
    return true;
  }

  function renderTeam() {
    const list = employees.filter(matchEmp);
    teamGrid.innerHTML = list.map(emp => {
      const empTasks = tasks.filter(t => t.assignee === emp.id);
      const open = empTasks.filter(t => !t.done);
      const overdue = open.filter(isOverdue).length;
      const done = empTasks.filter(t => t.done).length;
      const load = Math.min(100, open.length * 18);
      const breakdown = D.getEmployeeXPBreakdown(emp.id);
      const xp = breakdown.net;
      const level = D.levelFromXP(xp);
      const xpToNext = (level * 250) - xp;
      const levelProgressPct = ((xp % 250) / 250) * 100;

      const isManager = D.isManager();
      const dept = D.findDepartment(emp.department);
      const inactive = emp.active === false;
      const PERM_LABEL = { manager: '👑 مدير', supervisor: '🛡️ مشرف', employee: '👤 موظف' };
      const waUrl = emp.phone ? `https://wa.me/${emp.phone.replace(/\D/g, '')}` : null;

      return `
        <article class="team-card ${inactive ? 'inactive' : ''}" style="--emp-color:${emp.color}" data-emp-link="${emp.id}">
          <header class="team-card-head">
            <a href="employee.html?id=${emp.id}" class="emp-avatar lg" aria-label="عرض ${escapeHtml(emp.name)}">
              <img src="${D.avatarUrl(emp, 120)}" alt=""/>
              <span class="lv-badge">Lv ${level}</span>
            </a>
            <div class="emp-info">
              <h3 class="emp-name"><a href="employee.html?id=${emp.id}">${escapeHtml(emp.name)}</a></h3>
              <span class="emp-role">${escapeHtml(emp.role)} • ${escapeHtml(emp.level)}</span>
              <div class="emp-tags">
                <span class="emp-perm-pill ${emp.permRole}">${PERM_LABEL[emp.permRole] || ''}</span>
                <span class="emp-dept-pill" style="--dept-color:${dept.color}">${escapeHtml(dept.label)}</span>
                ${inactive ? '<span class="emp-inactive-pill">معطّل</span>' : ''}
              </div>
              <a class="emp-mail" href="mailto:${emp.email}">${escapeHtml(emp.email)}</a>
              ${emp.phone ? `<a class="emp-phone" href="${waUrl}" target="_blank" rel="noopener">📱 ${escapeHtml(emp.phone)}</a>` : '<span class="emp-phone muted">📱 بدون رقم</span>'}
            </div>
            ${isManager ? `
              <div class="emp-admin-actions">
                <button type="button" class="emp-action edit" data-edit="${emp.id}" aria-label="تعديل" title="تعديل">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button type="button" class="emp-action toggle ${inactive ? 'off' : 'on'}" data-toggle="${emp.id}" aria-label="${inactive ? 'تفعيل' : 'تعطيل'}" title="${inactive ? 'تفعيل الحساب' : 'تعطيل الحساب'}">
                  ${inactive
                    ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>'
                    : '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>'}
                </button>
                ${waUrl ? `
                  <a href="${waUrl}" target="_blank" rel="noopener" class="emp-action whatsapp" aria-label="واتساب" title="واتساب">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9s-.5-.1-.7.1c-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.4.1-.6l.5-.6c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.2 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.7.5 3.4 1.3 4.8L2 22l5.3-1.4c1.4.7 3 1.1 4.7 1.1 5.5 0 10-4.5 10-10S17.5 2 12 2z"/></svg>
                  </a>
                ` : ''}
              </div>
            ` : ''}
          </header>

          <div class="team-stats">
            <div class="ts">
              <span class="ts-num">${open.length}</span>
              <span class="ts-label">نشطة</span>
            </div>
            <div class="ts ${overdue ? 'warn' : ''}">
              <span class="ts-num">${overdue}</span>
              <span class="ts-label">متأخرة</span>
            </div>
            <div class="ts ok">
              <span class="ts-num">${done}</span>
              <span class="ts-label">منجزة</span>
            </div>
            <div class="ts xp">
              <span class="ts-num">${xp}</span>
              <span class="ts-label">XP</span>
            </div>
          </div>

          <div class="workload">
            <div class="wl-head">
              <span class="wl-label">المستوى ${level}</span>
              <span class="wl-pct">${xpToNext} XP للترقية</span>
            </div>
            <div class="wl-bar"><span style="width:${levelProgressPct}%; background:linear-gradient(90deg,#a78bfa,#7c5cf0)"></span></div>
            ${breakdown.total > 0 || breakdown.penalty > 0 ? `
              <div class="xp-breakdown">
                ${breakdown.onTime > 0  ? `<span class="xp-tag plus">+${breakdown.onTime} في الوقت</span>` : ''}
                ${breakdown.early > 0   ? `<span class="xp-tag bonus">+${breakdown.early} مكافأة مبكر</span>` : ''}
                ${breakdown.halved > 0  ? `<span class="xp-tag half">+${breakdown.halved} متأخر (نصف)</span>` : ''}
                ${breakdown.subtaskBonus > 0 ? `<span class="xp-tag plus">+${breakdown.subtaskBonus} مهام فرعية</span>` : ''}
                ${breakdown.penalty > 0 ? `<span class="xp-tag minus">-${breakdown.penalty} خصم تأخر (${breakdown.counts.overdue} مهمة)</span>` : ''}
              </div>
            ` : ''}
          </div>

          <div class="workload">
            <div class="wl-head">
              <span class="wl-label">حِمل العمل</span>
              <span class="wl-pct">${load}%</span>
            </div>
            <div class="wl-bar"><span style="width:${load}%; background:linear-gradient(90deg,#7aa2ff,${emp.color})"></span></div>
          </div>

          <footer class="team-card-foot">
            <a class="ghost-btn" href="employee.html?id=${emp.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0116 0v1"/></svg>
              عرض الملف
            </a>
            <button class="ghost-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> دردشة</button>
          </footer>
        </article>
      `;
    }).join('') || `<div class="muted" style="padding:24px;text-align:center">لا يوجد أعضاء يطابقون البحث</div>`;

    // Wire admin action buttons
    teamGrid.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        if (window.EmployeeEditModal) window.EmployeeEditModal.open(btn.dataset.edit);
      });
    });
    teamGrid.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        D.toggleEmployeeActive(btn.dataset.toggle);
        renderAll();
      });
    });
  }

  function renderKpis() {
    const open = tasks.filter(t => !t.done);
    document.getElementById('kpiTotalMembers').textContent  = employees.length;
    document.getElementById('kpiActiveTasks').textContent   = open.length;
    document.getElementById('kpiTeamOverdue').textContent   = open.filter(isOverdue).length;

    // "this week" = doneAt within last 7 days from TODAY
    const weekAgo = new Date(D.TODAY); weekAgo.setDate(weekAgo.getDate() - 7);
    const completedWeek = tasks.filter(t => t.done && t.doneAt && new Date(t.doneAt + 'T00:00:00') >= weekAgo).length;
    document.getElementById('kpiCompletedWeek').textContent = completedWeek;
  }

  function renderLeaders() {
    const weekAgo = new Date(D.TODAY); weekAgo.setDate(weekAgo.getDate() - 7);
    const leaderboardData = employees.map(emp => {
      const completed = tasks.filter(t => t.done && t.assignee === emp.id && t.doneAt && new Date(t.doneAt + 'T00:00:00') >= weekAgo).length;
      return { emp, completed };
    }).sort((a,b) => b.completed - a.completed);

    document.getElementById('leadersCount').textContent = leaderboardData.reduce((a,b) => a + b.completed, 0);

    leaderboard.innerHTML = leaderboardData.map((row, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`;
      return `
        <div class="leader-row" style="--emp-color:${row.emp.color}">
          <span class="leader-rank">${medal}</span>
          <span class="ov-av"><img src="${D.avatarUrl(row.emp, 40)}" alt=""/></span>
          <div class="leader-info">
            <b class="ov-name">${escapeHtml(row.emp.name)}</b>
            <span class="ov-role">${escapeHtml(row.emp.role)}</span>
          </div>
          <span class="leader-num">${row.completed}</span>
        </div>
      `;
    }).join('');
  }

  function renderAll() {
    renderTeam();
    renderKpis();
    renderLeaders();
    renderRoleChips();
  }

  filterInput?.addEventListener('input', renderTeam);

  // Manager-only: wire the "+ إضافة عضو" round button
  setTimeout(() => {
    document.querySelectorAll('.round-btn[aria-label="إضافة عضو"]').forEach(btn => {
      if (D.isManager()) {
        btn.style.display = '';
        btn.addEventListener('click', () => {
          if (window.EmployeeEditModal) window.EmployeeEditModal.open();
        });
      } else {
        btn.style.display = 'none';
      }
    });
    document.getElementById('searchInput')?.addEventListener('input', renderTeam);
  }, 0);

  // Allow modal to refresh team without full page reload
  window.refreshTeam = renderAll;

  renderAll();
})();
