/* =====================================================================
   Favorites page — starred tasks across the team.
   ===================================================================== */

LAYOUT.render('favorites');

(function () {
  const D = window.APP_DATA;
  if (!D) return;
  if (!D.getCurrentUser() || D.isEmployee()) return;

  const tasks = D.getVisibleTasks();
  const { formatDue, isOverdue, escapeHtml, findEmployee } = D;

  let activeFilter = 'all';

  const grid = document.getElementById('favGrid');
  const seg  = document.getElementById('favSeg');

  function getQuery() { return (document.getElementById('searchInput')?.value || '').trim().toLowerCase(); }

  function getList() {
    const q = getQuery();
    return tasks.filter(t => {
      if (!t.starred) return false;
      if (activeFilter === 'open' && t.done) return false;
      if (activeFilter === 'done' && !t.done) return false;
      if (q && !t.title.toLowerCase().includes(q) && !t.tag.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 1500);
  }

  function renderKpis() {
    const all = tasks.filter(t => t.starred);
    const open = all.filter(t => !t.done);
    const overdue = open.filter(isOverdue).length;
    const done = all.filter(t => t.done).length;
    document.getElementById('fTotal').textContent   = all.length;
    document.getElementById('fOpen').textContent    = open.length;
    document.getElementById('fOverdue').textContent = overdue;
    document.getElementById('fDone').textContent    = done;
  }

  function favCardHTML(task) {
    const overdue = isOverdue(task);
    const e = findEmployee(task.assignee);
    return `
      <article class="fav-card ${task.done ? 'done':''}" data-task="${task.id}" ${overdue ? 'data-overdue="true"' : ''}>
        <header class="fav-head">
          <button class="fav-star on" data-id="${task.id}" aria-label="إلغاء المفضلة" title="إزالة من المفضلة">
            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15 8.5 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 9 8.5 12 2"/></svg>
          </button>
          <span class="task-prio ${task.priority}"></span>
          <span class="tag" style="--tag-color:${D.getTagColor(task.tagKey)}">${escapeHtml(task.tag)}</span>
          ${task.done ? '<span class="pill st-active">منجزة</span>' : (overdue ? '<span class="overdue-pill" style="display:inline-flex;background:var(--red);color:#fff">متأخرة</span>' : '')}
        </header>

        <h3 class="fav-title">${escapeHtml(task.title)}</h3>

        <footer class="fav-foot">
          ${e ? `
            <span class="fav-owner" style="--emp-color:${e.color}">
              <span class="ov-av sm"><img src="https://i.pravatar.cc/40?img=${e.avatar}" alt=""/></span>
              <span class="fo-text"><b>${escapeHtml(e.name)}</b><span class="muted" style="font-size:11px">${escapeHtml(e.role)}</span></span>
            </span>` : `<span class="muted" style="display:inline-flex;align-items:center;gap:6px"><span class="ov-av sm" style="background:var(--surface-soft)"></span> غير مسندة</span>`}
          <span class="due">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
            ${formatDue(task.due)}
          </span>
        </footer>
      </article>
    `;
  }

  function renderGrid() {
    const list = getList();
    grid.innerHTML = list.length
      ? list.map(favCardHTML).join('')
      : `<div class="empty-state">
           <div class="empty-emoji">⭐</div>
           <h3>لا توجد مهام في المفضلة</h3>
           <p class="muted">حدّد أي مهمة بنجمة لتظهر هنا</p>
         </div>`;

    grid.querySelectorAll('.fav-star').forEach(btn => {
      btn.addEventListener('click', () => {
        D.updateTask(btn.dataset.id, { starred: false });
        toast('أُزيلت من المفضلة');
        renderAll();
      });
    });
  }

  function renderAll() { renderKpis(); renderGrid(); }

  seg.addEventListener('click', e => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    seg.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b === btn));
    activeFilter = btn.dataset.filter;
    renderGrid();
  });

  setTimeout(() => {
    document.getElementById('searchInput')?.addEventListener('input', renderGrid);
  }, 0);

  renderAll();
})();
