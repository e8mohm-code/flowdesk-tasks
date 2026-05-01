/* =====================================================================
   Reports page — KPIs, daily activity bars, category & priority breakdowns,
   leaderboard, and activity feed.
   ===================================================================== */

LAYOUT.render('reports');

(function () {
  const D = window.APP_DATA;
  if (!D) return;
  if (!D.getCurrentUser() || D.isEmployee()) return;

  const tasks = D.getVisibleTasks();
  const employees = D.getVisibleEmployees();
  const { activities, isOverdue, escapeHtml, AR_MONTHS, findEmployee } = D;

  let rangeDays = 7;

  function pad(n){ return String(n).padStart(2,'0'); }
  function isoOf(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

  function rangeStart() {
    const d = new Date(D.TODAY); d.setDate(d.getDate() - (rangeDays - 1));
    return d;
  }

  /* ---------- KPI ---------- */
  function renderKpis() {
    const start = rangeStart();
    const inRange = t => t.doneAt && new Date(t.doneAt + 'T00:00:00') >= start;
    const total = tasks.length;
    const done = tasks.filter(t => t.done && inRange(t)).length;
    const overdue = tasks.filter(t => !t.done && isOverdue(t)).length;
    const avg = (total / employees.length).toFixed(1);
    document.getElementById('rTotal').textContent   = total;
    document.getElementById('rDone').textContent    = done;
    document.getElementById('rOverdue').textContent = overdue;
    document.getElementById('rAvg').textContent     = avg;
  }

  /* ---------- BAR CHART (daily activity) ---------- */
  function renderBarChart() {
    const days = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(D.TODAY); d.setDate(d.getDate() - i);
      const iso = isoOf(d);
      const count = tasks.filter(t => t.done && t.doneAt === iso).length
                  + tasks.filter(t => !t.done && t.due === iso).length * 0.6; // include scheduled as ghost
      days.push({ d, iso, count });
    }
    const max = Math.max(1, ...days.map(x => x.count));

    document.getElementById('barChart').innerHTML = days.map(x => {
      const h = (x.count / max) * 100;
      const dayLabel = x.d.getDate();
      const isToday = x.iso === isoOf(D.TODAY);
      return `
        <div class="bc-col ${isToday ? 'today' : ''}">
          <div class="bc-bar" style="height:${Math.max(6, h)}%">
            <span class="bc-tip">${Math.round(x.count)} مهمة</span>
          </div>
          <span class="bc-x">${dayLabel}</span>
        </div>
      `;
    }).join('');
  }

  /* ---------- CATEGORY ---------- */
  function renderCategoryLegend() {
    const map = {};
    tasks.forEach(t => { map[t.tagKey] = map[t.tagKey] || { tag: t.tag, key: t.tagKey, n: 0 }; map[t.tagKey].n++; });
    const total = tasks.length;
    const sorted = Object.values(map).sort((a,b) => b.n - a.n);

    document.getElementById('categoryLegend').innerHTML = sorted.map(row => {
      const pct = Math.round((row.n / total) * 100);
      return `
        <div class="lg-row">
          <span class="tag" style="--tag-color:${D.getTagColor(row.key)}">${escapeHtml(row.tag)}</span>
          <div class="lg-bar"><span class="lg-fill" style="width:${pct}%; background:${D.getTagColor(row.key)}"></span></div>
          <b class="lg-num">${row.n}</b>
        </div>
      `;
    }).join('');
  }

  /* ---------- PRIORITY ---------- */
  function renderPriorityBars() {
    const counts = { high: 0, medium: 0, low: 0 };
    tasks.forEach(t => counts[t.priority]++);
    const total = tasks.length;
    const labels = { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };
    const colors = { high: 'var(--red)', medium: 'var(--amber)', low: 'var(--ink-3)' };

    document.getElementById('priorityBars').innerHTML = ['high','medium','low'].map(p => {
      const pct = Math.round((counts[p] / total) * 100) || 0;
      return `
        <div class="prio-row">
          <span class="prio-label"><i class="dot prio-${p === 'high' ? 'high' : p === 'medium' ? 'mid' : 'low'}"></i> ${labels[p]}</span>
          <div class="lg-bar"><span class="lg-fill" style="width:${pct}%; background:${colors[p]}"></span></div>
          <b class="lg-num">${counts[p]}</b>
        </div>
      `;
    }).join('');
  }

  /* ---------- LEADERBOARD ---------- */
  function renderLeaderboard() {
    const start = rangeStart();
    const data = employees.map(emp => {
      const completed = tasks.filter(t => t.done && t.assignee === emp.id && t.doneAt && new Date(t.doneAt + 'T00:00:00') >= start).length;
      const open = tasks.filter(t => !t.done && t.assignee === emp.id).length;
      return { emp, completed, open };
    }).sort((a,b) => b.completed - a.completed);

    document.getElementById('leaderboardR').innerHTML = data.map((row, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`;
      return `
        <div class="leader-row" style="--emp-color:${row.emp.color}">
          <span class="leader-rank">${medal}</span>
          <span class="ov-av"><img src="${D.avatarUrl(row.emp, 40)}" alt=""/></span>
          <div class="leader-info">
            <b class="ov-name">${escapeHtml(row.emp.name)}</b>
            <span class="ov-role">${escapeHtml(row.emp.role)} • ${row.open} مفتوحة</span>
          </div>
          <span class="leader-num">${row.completed}</span>
        </div>
      `;
    }).join('');
  }

  /* ---------- ACTIVITY FEED ---------- */
  function renderActivity() {
    document.getElementById('activityFeed').innerHTML = activities.map(a => {
      const e = findEmployee(a.who);
      if (!e) return '';
      return `
        <div class="act-row" style="--emp-color:${e.color}">
          <span class="ov-av"><img src="${D.avatarUrl(e, 40)}" alt=""/></span>
          <div class="act-text">
            <span><b>${escapeHtml(e.name)}</b> ${escapeHtml(a.what)} <span class="act-target">«${escapeHtml(a.target)}»</span></span>
            <span class="act-when">${escapeHtml(a.when)}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderAll() {
    renderKpis();
    renderBarChart();
    renderCategoryLegend();
    renderPriorityBars();
    renderLeaderboard();
    renderActivity();
  }

  document.getElementById('rangeSeg').addEventListener('click', e => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    document.querySelectorAll('#rangeSeg .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    rangeDays = parseInt(btn.dataset.range, 10);
    renderAll();
  });

  renderAll();
})();
