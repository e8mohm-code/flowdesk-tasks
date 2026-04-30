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

      return `
        <article class="team-card" style="--emp-color:${emp.color}" data-emp-link="${emp.id}">
          <header class="team-card-head">
            <a href="employee.html?id=${emp.id}" class="emp-avatar lg" aria-label="عرض ${escapeHtml(emp.name)}">
              <img src="https://i.pravatar.cc/120?img=${emp.avatar}" alt=""/>
              <span class="lv-badge">Lv ${level}</span>
            </a>
            <div class="emp-info">
              <h3 class="emp-name"><a href="employee.html?id=${emp.id}">${escapeHtml(emp.name)}</a></h3>
              <span class="emp-role">${escapeHtml(emp.role)} • ${escapeHtml(emp.level)}</span>
              <a class="emp-mail" href="mailto:${emp.email}">${escapeHtml(emp.email)}</a>
            </div>
            <span class="status-dot online" title="متصل"></span>
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
          <span class="ov-av"><img src="https://i.pravatar.cc/40?img=${row.emp.avatar}" alt=""/></span>
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
  renderAll();
  // re-bind filterInput once layout injected (small race)
  setTimeout(() => {
    document.getElementById('searchInput')?.addEventListener('input', renderTeam);
  }, 0);
})();
