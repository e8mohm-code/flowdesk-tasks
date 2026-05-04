/* =====================================================================
   Notifications page — derived from activities + overdue tasks.
   ===================================================================== */

LAYOUT.render('notifications');

(function () {
  const D = window.APP_DATA;
  if (!D) return;
  if (!D.getCurrentUser() || D.isEmployee()) return;

  const tasks = D.getVisibleTasks();
  const employees = D.getVisibleEmployees();
  const { activities, isOverdue, escapeHtml, AR_MONTHS, findEmployee, formatDue } = D;

  let activeType = 'all';

  // Build a synthetic notifications array from activities + auto-derived alerts
  function buildNotifications() {
    const items = [];

    // 1) From activities feed
    activities.forEach((a, i) => {
      let type = 'comment';
      if (a.what.includes('أكمل') || a.what.includes('وافق')) type = 'completed';
      else if (a.what.includes('بدأ') || a.what.includes('أنشأ')) type = 'assigned';
      else if (a.what.includes('علّق') || a.what.includes('أسند')) type = 'assigned';
      items.push({
        id: 'a' + i,
        type,
        empId: a.who,
        text: `<b>${escapeHtml(D.findEmployee(a.who)?.name || '')}</b> ${escapeHtml(a.what)} <span class="ai-target">«${escapeHtml(a.target)}»</span>`,
        when: a.when,
        unread: i < 4, // first few unread
      });
    });

    // 2) Auto-derived overdue alerts
    tasks.filter(t => !t.done && isOverdue(t)).forEach(t => {
      const e = findEmployee(t.assignee);
      items.push({
        id: 'o' + t.id,
        type: 'overdue',
        empId: t.assignee,
        text: `تأخّر تنفيذ <b>«${escapeHtml(t.title)}»</b>${e ? ` المُسندة إلى <b>${escapeHtml(e.name)}</b>` : ' (غير مسندة)'} — تاريخ الاستحقاق: ${formatDue(t.due)}`,
        when: t.due + ' 09:00',
        unread: true,
      });
    });

    // 3) Pending checklists for today after 5pm — manager/supervisor reminder
    if (D.canManageChecklists && D.canManageChecklists()) {
      const todayISO = D.TODAY.toISOString().slice(0, 10);
      const now = new Date();
      const after5pm = now.getHours() >= 17;
      const tpls = D.getChecklistTemplatesForUser();
      tpls.forEach(tpl => {
        const insts = D.getInstancesForTemplate(tpl.id).filter(i => i.date === todayISO);
        insts.forEach(i => {
          if (i.status !== 'submitted' && after5pm) {
            const e = findEmployee(i.assigneeId);
            items.push({
              id: 'cli-' + i.id,
              type: 'overdue',
              empId: i.assigneeId,
              text: `<b>${escapeHtml(e ? e.name : 'موظف')}</b> لم يسلّم شك ليست <b>«${escapeHtml(tpl.title)}»</b> اليوم`,
              when: todayISO + ' 17:00',
              unread: true,
            });
          }
        });
      });
    }

    return items.sort((a, b) => (b.when || '').localeCompare(a.when || ''));
  }

  const notifications = buildNotifications();

  function getQuery() { return (document.getElementById('searchInput')?.value || '').trim().toLowerCase(); }

  function getFiltered() {
    const q = getQuery();
    return notifications.filter(n => {
      if (activeType !== 'all' && n.type !== activeType) return false;
      if (q && !n.text.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  /* ---------- KPI ---------- */
  function renderKpis() {
    const todayIso = D.TODAY.toISOString().slice(0,10);
    const todayCount = notifications.filter(n => (n.when || '').startsWith(todayIso)).length;
    document.getElementById('nUnread').textContent  = notifications.filter(n => n.unread).length;
    document.getElementById('nTotal').textContent   = todayCount || notifications.length;
    document.getElementById('nOverdue').textContent = notifications.filter(n => n.type === 'overdue').length;
    document.getElementById('nDone').textContent    = notifications.filter(n => n.type === 'completed').length;
  }

  /* ---------- LIST ---------- */
  const ICONS = {
    overdue:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    completed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l4 4L13 8"/><path d="M9 12l4 4 8-10"/></svg>',
    assigned:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>',
    comment:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
  };

  function renderList() {
    const list = getFiltered();
    const out = document.getElementById('notifList');
    out.innerHTML = list.length ? list.map(n => {
      const e = findEmployee(n.empId);
      return `
        <div class="notif-row ${n.unread ? 'unread' : ''} type-${n.type}" data-id="${n.id}">
          <span class="notif-icon">${ICONS[n.type] || ICONS.comment}</span>
          <div class="notif-text">
            <span>${n.text}</span>
            <span class="muted notif-when">${escapeHtml(n.when)}</span>
          </div>
          ${e ? `<span class="ov-av sm" style="--emp-color:${e.color}"><img src="${D.avatarUrl(e, 40)}" alt=""/></span>` : ''}
          ${n.unread ? '<span class="unread-dot"></span>' : ''}
        </div>
      `;
    }).join('') : `<div class="empty-state"><div class="empty-emoji">🔕</div><h3>لا توجد تنبيهات</h3><p class="muted">كل شي تمام</p></div>`;
  }

  /* ---------- URGENT (right rail) ---------- */
  function renderUrgent() {
    const overdue = tasks.filter(t => !t.done && isOverdue(t)).sort((a,b) => a.due.localeCompare(b.due));
    document.getElementById('urgentCount').textContent = overdue.length;
    document.getElementById('urgentList').innerHTML = overdue.length ? overdue.map(t => {
      const e = findEmployee(t.assignee);
      return `
        <a href="index.html" class="cal-agenda-row overdue" style="--emp-color:${e ? e.color : 'var(--red)'}">
          <span class="adot"></span>
          <div class="ai-text">
            <b>${escapeHtml(t.title)}</b>
            <span class="ai-sub">${e ? escapeHtml(e.name) : 'غير مسندة'} • ${formatDue(t.due)}</span>
          </div>
        </a>
      `;
    }).join('') : `<div class="muted" style="padding:14px;text-align:center">لا متأخّرات 🎉</div>`;
  }

  function renderAll() { renderKpis(); renderList(); renderUrgent(); }

  document.getElementById('typeFilters').addEventListener('click', e => {
    const btn = e.target.closest('.chip-btn');
    if (!btn) return;
    document.querySelectorAll('#typeFilters .chip-btn').forEach(b => b.classList.toggle('active', b === btn));
    activeType = btn.dataset.type;
    renderList();
  });

  document.getElementById('markAllRead').addEventListener('click', () => {
    notifications.forEach(n => n.unread = false);
    renderAll();
    const t = document.getElementById('toast');
    if (t) { t.textContent = 'تم تحديد الكل كمقروء'; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 1500); }
  });

  setTimeout(() => {
    document.getElementById('searchInput')?.addEventListener('input', renderList);
  }, 0);

  renderAll();
})();
