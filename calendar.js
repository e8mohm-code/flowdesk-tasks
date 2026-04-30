/* =====================================================================
   Calendar page — month grid with task chips on due dates.
   ===================================================================== */

LAYOUT.render('calendar');

(function () {
  const D = window.APP_DATA;
  if (!D) return;
  if (!D.getCurrentUser() || D.isEmployee()) return;

  const tasks = D.getVisibleTasks();
  const employees = D.getVisibleEmployees();
  const { isOverdue, escapeHtml, AR_MONTHS, findEmployee } = D;

  let viewYear  = D.TODAY.getFullYear();
  let viewMonth = D.TODAY.getMonth();

  const grid        = document.getElementById('calGrid');
  const monthLabel  = document.getElementById('monthLabel');
  const todayList   = document.getElementById('todayList');
  const upcomingList= document.getElementById('upcomingList');
  const todayLabel  = document.getElementById('todayLabel');
  const todayCount  = document.getElementById('todayCount');

  function pad(n){ return String(n).padStart(2,'0'); }
  function isoOf(y,m,d){ return `${y}-${pad(m+1)}-${pad(d)}`; }
  function sameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

  function renderMonth() {
    monthLabel.textContent = `${AR_MONTHS[viewMonth]} ${viewYear}`;

    const first = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startWeekday = first.getDay(); // 0 = Sunday
    const totalCells = Math.ceil((startWeekday + lastDay) / 7) * 7;

    let html = '';
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startWeekday + 1;
      const inMonth = dayNum >= 1 && dayNum <= lastDay;
      const dateObj = new Date(viewYear, viewMonth, dayNum);
      const iso = inMonth ? isoOf(viewYear, viewMonth, dayNum) : null;

      const dayTasks = inMonth ? tasks.filter(t => t.due === iso && !t.done) : [];
      const isToday = inMonth && sameDay(dateObj, D.TODAY);

      html += `
        <div class="cal-cell ${inMonth ? '' : 'pad'} ${isToday ? 'today' : ''}" data-iso="${iso || ''}">
          ${inMonth ? `<span class="cal-day">${dayNum}</span>` : ''}
          <div class="cal-chips">
            ${dayTasks.slice(0, 3).map(t => {
              const e = findEmployee(t.assignee);
              const overdue = isOverdue(t);
              const color = e ? e.color : '#94a3b8';
              return `<div class="cal-chip ${overdue ? 'overdue' : ''}" style="--c:${color}" title="${escapeHtml(t.title)}">
                <i class="cdot"></i><span>${escapeHtml(t.title)}</span>
              </div>`;
            }).join('')}
            ${dayTasks.length > 3 ? `<div class="cal-more">+${dayTasks.length - 3} أخرى</div>` : ''}
          </div>
        </div>
      `;
    }
    grid.innerHTML = html;
  }

  function renderAgenda() {
    const todayIso = isoOf(D.TODAY.getFullYear(), D.TODAY.getMonth(), D.TODAY.getDate());
    todayLabel.textContent = `${D.TODAY.getDate()} ${AR_MONTHS[D.TODAY.getMonth()]}`;

    const todayTasks = tasks.filter(t => !t.done && t.due === todayIso);
    todayCount.textContent = todayTasks.length;

    const renderRow = t => {
      const e = findEmployee(t.assignee);
      const overdue = isOverdue(t);
      return `
        <div class="cal-agenda-row ${overdue ? 'overdue' : ''}" style="--emp-color:${e ? e.color : '#94a3b8'}">
          <span class="adot"></span>
          <div class="ai-text">
            <b>${escapeHtml(t.title)}</b>
            <span class="ai-sub">${e ? escapeHtml(e.name) : 'غير مسندة'} • ${escapeHtml(t.tag)}</span>
          </div>
          ${overdue ? '<span class="overdue-pill" style="display:inline-flex;background:var(--red);color:#fff">متأخرة</span>' : ''}
        </div>
      `;
    };

    todayList.innerHTML = todayTasks.map(renderRow).join('') ||
      `<div class="muted" style="padding:14px;text-align:center">لا مهام لليوم 🎉</div>`;

    // Upcoming = next 7 days (excluding today)
    const upcoming = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(D.TODAY); d.setDate(d.getDate() + i);
      const iso = isoOf(d.getFullYear(), d.getMonth(), d.getDate());
      tasks.filter(t => !t.done && t.due === iso).forEach(t => upcoming.push(t));
    }
    upcomingList.innerHTML = upcoming.length
      ? upcoming.slice(0, 6).map(renderRow).join('')
      : `<div class="muted" style="padding:14px;text-align:center">لا شيء قادم</div>`;
  }

  document.getElementById('prevMonth').addEventListener('click', () => {
    viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderMonth();
  });
  document.getElementById('nextMonth').addEventListener('click', () => {
    viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderMonth();
  });
  document.getElementById('todayBtn').addEventListener('click', () => {
    viewYear = D.TODAY.getFullYear(); viewMonth = D.TODAY.getMonth();
    renderMonth();
  });

  renderMonth();
  renderAgenda();
})();
