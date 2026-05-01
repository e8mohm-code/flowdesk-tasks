/* =====================================================================
   Tasks page — drag/drop assignment + delete + overdue indicator.
   Reads shared data from window.APP_DATA (data.js).
   ===================================================================== */

LAYOUT.render('tasks');

(function () {

  const D = window.APP_DATA;
  if (!D) return;
  // Stop here if guard already redirected (employees go to my-tasks.html)
  if (!D.getCurrentUser() || D.isEmployee()) return;

  let tasks = D.tasks; // mutated via assignment / delete
  const employees = D.getVisibleEmployees(); // scoped to current user's role/dept
  const { isOverdue, formatDue, escapeHtml, findEmployee } = D;

  let nextId = 9000;
  const makeId = () => 't-' + (++nextId);

  /* ---------- TOAST ---------- */
  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  /* ---------- ELEMENTS ---------- */
  const empGrid        = document.getElementById('employeesGrid');
  const unassignedList = document.getElementById('unassignedList');
  const overviewList   = document.getElementById('overviewList');
  const filterInput    = document.getElementById('searchInput');

  const getFilter = () => (filterInput?.value || '').trim().toLowerCase();
  function matchesFilter(task, q, emp) {
    if (!q) return true;
    if (task.title.toLowerCase().includes(q)) return true;
    if (task.tag.toLowerCase().includes(q)) return true;
    if (emp && emp.name.toLowerCase().includes(q)) return true;
    return false;
  }

  /* ---------- RENDER ---------- */
  function taskCardHTML(task, compact = false) {
    const overdue = isOverdue(task);
    const tagColor = D.getTagColor(task.tagKey);
    const brandKeys = task.brandKeys || [];
    const brandStrip = brandKeys.length ? `
      <div class="task-brands">
        ${brandKeys.map(k => {
          const b = D.findBrand(k); if (!b) return '';
          const logo = b.logoFile ? `<span class="brand-chip-logo"><img src="${b.logoFile}" alt=""/></span>` : '';
          return `<span class="brand-chip sm" style="--brand-color:${b.color}">${logo}${escapeHtml(b.label)}</span>`;
        }).join('')}
      </div>` : '';
    const primaryBrandColor = brandKeys.length ? (D.findBrand(brandKeys[0])?.color || '') : '';
    return `
      <article class="task ${compact ? 'compact' : ''}" data-task="${task.id}" data-priority="${task.priority}" draggable="true" ${overdue ? 'data-overdue="true"' : ''} ${primaryBrandColor ? `style="--task-brand:${primaryBrandColor}" data-has-brand="true"` : ''}>
        <div class="task-row">
          <span class="task-prio ${task.priority}"></span>
          <h4 class="task-title">${escapeHtml(task.title)}</h4>
          ${overdue ? '<span class="overdue-pill">متأخرة</span>' : '<span class="task-handle" aria-label="المزيد">⋮</span>'}
        </div>
        ${brandStrip}
        ${compact ? '' : `
          <div class="task-foot">
            <span class="tag" style="--tag-color:${tagColor}">${escapeHtml(task.tag)}</span>
            <span class="due">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
              ${formatDue(task.due)}
            </span>
          </div>
        `}
      </article>
    `;
  }

  function visibleTasks() { return D.getVisibleTasks(); }

  function renderEmployees() {
    const q = getFilter();
    const vt = visibleTasks();
    empGrid.innerHTML = employees.map(emp => {
      const list = vt.filter(t => !t.done && D.isAssignedTo(t, emp.id) && matchesFilter(t, q, emp));
      const overdue = list.filter(isOverdue).length;
      const active  = list.length - overdue;

      return `
        <article class="emp-card" data-zone="emp" data-emp="${emp.id}" style="--emp-color:${emp.color}">
          <header class="emp-head">
            <a class="emp-avatar" href="employee.html?id=${emp.id}" aria-label="ملف ${escapeHtml(emp.name)}">
              <img src="${D.avatarUrl(emp, 96)}" alt=""/>
            </a>
            <div class="emp-info">
              <h3 class="emp-name"><a href="employee.html?id=${emp.id}">${escapeHtml(emp.name)}</a></h3>
              <span class="emp-role">${escapeHtml(emp.role)}</span>
            </div>
            <div class="emp-stats">
              <span class="stat"><i style="background:${emp.color}"></i> ${active}</span>
              ${overdue > 0 ? `<span class="stat warn"><i style="background:var(--red)"></i> ${overdue}</span>` : ''}
            </div>
          </header>
          <div class="emp-box">
            <div class="emp-tasks">
              ${list.map(t => taskCardHTML(t, true)).join('')}
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderUnassigned() {
    const q = getFilter();
    const list = visibleTasks().filter(t => !t.done && !t.assignee && matchesFilter(t, q));
    unassignedList.innerHTML = list.map(taskCardHTML).join('');
    document.getElementById('unassignedCount').textContent = list.length;
  }

  function renderKpis() {
    const open = visibleTasks().filter(t => !t.done);
    const assigned   = open.filter(t => t.assignee).length;
    const overdue    = open.filter(isOverdue).length;
    const unassigned = open.filter(t => !t.assignee).length;
    const total      = open.length;

    document.getElementById('totalAssigned').textContent   = assigned;
    document.getElementById('totalOverdue').textContent    = overdue;
    document.getElementById('totalUnassigned').textContent = unassigned;
    document.getElementById('totalEmployees').textContent  = employees.length;
    document.getElementById('donutAssignedNum').textContent = assigned;
    document.getElementById('donutOverdueNum').textContent  = overdue;

    const C = 314;
    const assignedDash = total ? (assigned / total) * C : 0;
    const overdueDash  = total ? (overdue / total) * C : 0;
    document.getElementById('donutAssigned').setAttribute('stroke-dasharray', `${assignedDash} ${C}`);
    document.getElementById('donutOverdue').setAttribute('stroke-dasharray',  `${overdueDash} ${C}`);

    const assignRate = total ? Math.round((assigned/total)*100) : 0;
    const onTime     = total ? Math.round(((total - overdue)/total)*100) : 0;
    document.getElementById('kpiAssignRate').textContent = assignRate + '%';
    document.getElementById('kpiOnTime').textContent     = onTime + '%';
    document.getElementById('kpiAssignBar').style.width  = assignRate + '%';
    document.getElementById('kpiOnTimeBar').style.width  = onTime + '%';
  }

  function renderOverview() {
    const open = visibleTasks().filter(t => !t.done);
    const max = Math.max(1, ...employees.map(e => open.filter(t => D.isAssignedTo(t, e.id)).length));
    overviewList.innerHTML = employees.map(emp => {
      const list = open.filter(t => D.isAssignedTo(t, emp.id));
      const overdue = list.filter(isOverdue).length;
      const pct = (list.length / max) * 100;
      const fill = overdue > 0
        ? 'background: linear-gradient(90deg,#f48a8d,#e25b62)'
        : `background: linear-gradient(90deg, #7aa2ff, ${emp.color})`;
      return `
        <div class="overview-row ${overdue>0?'has-overdue':''}" style="--emp-color:${emp.color}">
          <span class="ov-av"><img src="${D.avatarUrl(emp, 40)}" alt=""/></span>
          <span><b class="ov-name">${escapeHtml(emp.name)}</b><span class="ov-role">${escapeHtml(emp.role)}</span></span>
          <div class="ov-bar"><span style="width:${pct}%; ${fill}"></span></div>
          <span class="ov-num">${list.length}${overdue ? ` <small style="color:var(--red)">(${overdue})</small>` : ''}</span>
        </div>
      `;
    }).join('');
  }

  function pad2(n){ return String(n).padStart(2,'0'); }
  function isoOf(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
  function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = String(val); }

  function renderMiniOverview() {
    /* ----- Compute base sets ----- */
    const total   = tasks.length;
    const done    = tasks.filter(t => t.done).length;
    const open    = tasks.filter(t => !t.done);
    const overdue = open.filter(isOverdue).length;
    const waiting = open.filter(t => !t.assignee).length;
    const active  = open.length - overdue - waiting;

    /* ----- Card 1: Team completion rate ----- */
    const completionPct = total ? Math.round((done / total) * 100) : 0;
    setText('scCompletion', completionPct + '%');
    const bar = document.getElementById('scCompletionBar');
    if (bar) bar.style.width = completionPct + '%';

    // Trend: compare done in last 7 days vs prior 7 days
    const weekAgo = new Date(D.TODAY); weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeekAgo = new Date(D.TODAY); twoWeekAgo.setDate(twoWeekAgo.getDate() - 14);
    const doneRecent = tasks.filter(t => t.done && t.doneAt && new Date(t.doneAt + 'T00:00:00') >= weekAgo).length;
    const donePrior  = tasks.filter(t => t.done && t.doneAt && {
      gte: new Date(t.doneAt + 'T00:00:00') >= twoWeekAgo,
      lt:  new Date(t.doneAt + 'T00:00:00') <  weekAgo,
    }.gte && new Date(t.doneAt + 'T00:00:00') < weekAgo).length;
    const trendEl = document.getElementById('scCompletionTrend');
    if (trendEl) {
      const diff = doneRecent - donePrior;
      const arrow = diff >= 0 ? '↑' : '↓';
      const cls = diff >= 0 ? '' : 'down';
      const sign = diff >= 0 ? '+' : '';
      trendEl.textContent = `${arrow} ${sign}${diff}`;
      trendEl.className = cls;
    }

    /* ----- Card 2: Distribution donut + legend ----- */
    setText('scTotal',   total);
    setText('scActive',  active);
    setText('scOverdue', overdue);
    setText('scWaiting', waiting);
    setText('scDone',    done);

    const C = 251.33;
    const segs = [
      { id: 'scDActive',  val: active  },
      { id: 'scDOverdue', val: overdue },
      { id: 'scDWaiting', val: waiting },
      { id: 'scDDone',    val: done    },
    ];
    const sumAll = segs.reduce((s, x) => s + x.val, 0) || 1;
    let acc = 0;
    segs.forEach(s => {
      const len = (s.val / sumAll) * C;
      const el = document.getElementById(s.id);
      if (el) {
        el.setAttribute('stroke-dasharray', `${len.toFixed(2)} ${C}`);
        el.setAttribute('stroke-dashoffset', (-acc).toFixed(2));
      }
      acc += len;
    });

    /* ----- Card 3: Completed this week + sparkline ----- */
    const weekDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(D.TODAY); d.setDate(d.getDate() - i);
      const iso = isoOf(d);
      const count = tasks.filter(t => t.done && t.doneAt === iso).length;
      weekDays.push(count);
    }
    const weekDoneSum = weekDays.reduce((s, v) => s + v, 0);
    setText('scWeekDone', weekDoneSum);

    const W = 100, H = 28, padTop = 3, padBottom = 2;
    const peak = Math.max(1, ...weekDays);
    const points = weekDays.map((v, i) => {
      const x = (i / (weekDays.length - 1)) * W;
      const y = H - padBottom - (v / peak) * (H - padTop - padBottom);
      return [x, y];
    });
    const lineD = points.map((p, i) =>
      (i === 0 ? `M ${p[0].toFixed(1)} ${p[1].toFixed(1)}` : `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    ).join(' ');
    const fillD = `${lineD} L ${W} ${H} L 0 ${H} Z`;
    const lineEl = document.getElementById('scSparkLine');
    const fillEl = document.getElementById('scSparkFill');
    if (lineEl) lineEl.setAttribute('d', lineD);
    if (fillEl) fillEl.setAttribute('d', fillD);

    /* ----- Card 4: Upcoming deadlines (next 3 days, not overdue) ----- */
    const todayIso = isoOf(D.TODAY);
    const horizonIsos = new Set();
    for (let i = 0; i <= 3; i++) {
      const d = new Date(D.TODAY); d.setDate(d.getDate() + i);
      horizonIsos.add(isoOf(d));
    }
    const upcoming = open.filter(t => !isOverdue(t) && horizonIsos.has(t.due)).length;
    setText('scUpcoming', upcoming);

    /* ----- Card 5: Mini calendar ----- */
    renderMiniCalendar();
  }

  /* ============================================================
     MINI CALENDAR
     ============================================================ */
  let miniCalYear  = D.TODAY.getFullYear();
  let miniCalMonth = D.TODAY.getMonth();

  function renderMiniCalendar() {
    const grid  = document.getElementById('miniCalGrid');
    const label = document.getElementById('miniCalMonth');
    if (!grid || !label) return;

    label.textContent = `${D.AR_MONTHS[miniCalMonth]} ${miniCalYear}`;

    const first = new Date(miniCalYear, miniCalMonth, 1);
    const lastDay = new Date(miniCalYear, miniCalMonth + 1, 0).getDate();
    const startWeekday = first.getDay(); // 0 = Sunday
    const totalCells = Math.ceil((startWeekday + lastDay) / 7) * 7;
    const todayIso = isoOf(D.TODAY);

    let html = '';
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startWeekday + 1;
      const inMonth = dayNum >= 1 && dayNum <= lastDay;
      if (!inMonth) {
        html += '<span class="mc-cell pad"></span>';
        continue;
      }
      const iso = isoOf(new Date(miniCalYear, miniCalMonth, dayNum));
      const dayTasks = tasks.filter(t => !t.done && t.due === iso);
      const overdueTasks = dayTasks.filter(isOverdue);

      let cls = 'mc-cell';
      if (iso === todayIso) cls += ' today';
      if (overdueTasks.length) cls += ' has-overdue';
      else if (dayTasks.length) cls += ' has-tasks';

      const hasDot = dayTasks.length > 0;
      html += `<span class="${cls}" title="${dayTasks.length ? dayTasks.length + ' مهام' : ''}">${dayNum}${hasDot ? '<i class="mc-dot"></i>' : ''}</span>`;
    }
    grid.innerHTML = html;
  }

  // Wire up navigation (only once, on the static buttons)
  const prevBtn = document.getElementById('miniCalPrev');
  const nextBtn = document.getElementById('miniCalNext');
  if (prevBtn) prevBtn.addEventListener('click', () => {
    miniCalMonth--; if (miniCalMonth < 0) { miniCalMonth = 11; miniCalYear--; }
    renderMiniCalendar();
  });
  if (nextBtn) nextBtn.addEventListener('click', () => {
    miniCalMonth++; if (miniCalMonth > 11) { miniCalMonth = 0; miniCalYear++; }
    renderMiniCalendar();
  });

  function renderAll() {
    renderEmployees();
    renderUnassigned();
    renderKpis();
    renderOverview();
    renderMiniOverview();
  }

  /* ============================================================
     DRAG & DROP — full document-level delegation
     All four events (dragstart, dragend, dragover, drop) listen on
     `document`, so they survive any DOM rebuild from renderAll().
     ============================================================ */
  let draggedId = null;
  let lastZoneEl = null;

  function clearAllDropTargets() {
    document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
    lastZoneEl = null;
  }

  function resetDragState() {
    draggedId = null;
    document.body.classList.remove('dragging');
    document.querySelectorAll('.task.dragging').forEach(el => el.classList.remove('dragging'));
    clearAllDropTargets();
  }

  function findZone(node) {
    return node && node.closest ? node.closest('[data-zone]') : null;
  }

  document.addEventListener('dragstart', e => {
    const task = e.target.closest && e.target.closest('.task');
    if (!task) return;
    draggedId = task.dataset.task;
    task.classList.add('dragging');
    document.body.classList.add('dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', draggedId); } catch (_) {}
    }
  });

  document.addEventListener('dragend', () => {
    resetDragState();
  });

  document.addEventListener('dragenter', e => {
    if (!draggedId) return;
    if (findZone(e.target)) e.preventDefault();
  });

  document.addEventListener('dragover', e => {
    if (!draggedId) return;
    const zone = findZone(e.target);
    if (!zone) {
      if (lastZoneEl) clearAllDropTargets();
      return;
    }
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    if (zone !== lastZoneEl) {
      clearAllDropTargets();
      zone.classList.add('drop-target');
      lastZoneEl = zone;
    }
  });

  document.addEventListener('drop', e => {
    if (!draggedId) return;
    const zone = findZone(e.target);
    if (!zone) { resetDragState(); return; }
    e.preventDefault();

    const id = draggedId;
    const task = tasks.find(t => t.id === id);

    // Reset state synchronously — dragend may not fire after renderAll()
    resetDragState();

    if (!task) return;

    const kind = zone.dataset.zone;
    let changed = false;

    if (kind === 'delete') {
      D.deleteTask(id);
      toast('تم حذف المهمة');
      changed = true;
    } else if (kind === 'unassigned') {
      if (task.assignee !== null) {
        D.updateTask(id, { assignee: null });
        toast('أعيدت إلى قائمة الانتظار');
        changed = true;
      }
    } else if (kind === 'emp') {
      const empId = zone.dataset.emp;
      if (task.assignee !== empId) {
        const emp = findEmployee(empId);
        D.updateTask(id, { assignee: empId });
        toast(emp ? `أُسندت إلى ${emp.name}` : 'تم الإسناد');
        changed = true;
      }
    }

    if (changed) renderAll();
  });

  // Safety net for cancelled drags (ESC, focus loss)
  window.addEventListener('blur', () => { if (draggedId) resetDragState(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && draggedId) resetDragState();
  });

  /* ---------- TASK CLICK → open detail modal ---------- */
  document.addEventListener('click', e => {
    if (draggedId) return;                     // ignore clicks during drag
    const taskEl = e.target.closest && e.target.closest('.task');
    if (!taskEl) return;
    if (e.target.closest('.task-handle, .overdue-pill, button')) return;
    const taskId = taskEl.dataset.task;
    if (taskId && window.TaskDetailModal) window.TaskDetailModal.open(taskId);
  });

  /* ---------- ADD TASK (opens modal) ---------- */
  function goNewTask(e) {
    if (e) e.preventDefault();
    if (window.TaskModal) window.TaskModal.open();
    else location.href = 'task-new.html';
  }
  document.getElementById('addTaskBtn')?.addEventListener('click', goNewTask);
  document.getElementById('addTaskBtnPanel')?.addEventListener('click', goNewTask);

  // Allow modal to refresh task display without full page reload
  window.refreshTasks = function () { renderAll(); };

  /* ---------- SEARCH (input is in shared topbar) ---------- */
  document.getElementById('searchInput')?.addEventListener('input', renderAll);

  /* ---------- LIVE CLOCK (TV mode) ---------- */
  function updateClock() {
    const c = document.getElementById('liveClock');
    const d = document.getElementById('liveDate');
    if (!c) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2,'0');
    const mm = String(now.getMinutes()).padStart(2,'0');
    c.textContent = `${hh}:${mm}`;
    if (d) d.textContent = `${now.getDate()} ${D.AR_MONTHS[now.getMonth()]}`;
  }
  updateClock();
  setInterval(updateClock, 30000);

  /* ---------- INIT ---------- */
  renderAll();
})();
