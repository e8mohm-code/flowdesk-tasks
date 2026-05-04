/* =====================================================================
   Checklists page — supervisor/manager view of all templates + history.
   ===================================================================== */

LAYOUT.render('checklists');

(function () {
  const D = window.APP_DATA;
  if (!D) return;
  if (!D.getCurrentUser() || D.isEmployee()) return;
  if (!D.canManageChecklists()) {
    location.replace('index.html');
    return;
  }

  const { escapeHtml: esc, findEmployee, formatDue, AR_MONTHS } = D;

  function pad(n) { return String(n).padStart(2, '0'); }
  function todayISO() {
    const d = new Date();
    d.setHours(0,0,0,0);
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  function renderKpis() {
    const tpls = D.getChecklistTemplatesForUser();
    const today = todayISO();
    let todayCount = 0, pending = 0;
    tpls.forEach(t => {
      const insts = D.getInstancesForTemplate(t.id);
      insts.forEach(i => {
        if (i.date === today) {
          todayCount++;
          if (i.status !== 'submitted') pending++;
        }
      });
    });
    document.getElementById('clKpiTotal').textContent  = tpls.length;
    document.getElementById('clKpiActive').textContent = tpls.filter(t => t.active !== false).length;
    document.getElementById('clKpiToday').textContent  = todayCount;
    document.getElementById('clKpiPending').textContent = pending;
  }

  function templateCardHTML(tpl) {
    const stepsCount = (tpl.steps || []).length;
    const assigneesCount = (tpl.assigneeIds || []).length;
    const today = todayISO();
    const todays = D.getInstancesForTemplate(tpl.id).filter(i => i.date === today);
    const submittedToday = todays.filter(i => i.status === 'submitted').length;
    const inactive = tpl.active === false;
    const sched = tpl.scheduleType === 'daily' ? '🔁 يومي' : '⚡ عند الحاجة';

    return `
      <article class="cl-card ${inactive ? 'inactive' : ''}" data-tpl="${tpl.id}">
        <header class="cl-card-head">
          <h3 class="cl-card-title">${esc(tpl.title || 'بدون عنوان')}</h3>
          <span class="cl-sched-pill">${sched}</span>
        </header>
        ${tpl.description ? `<p class="cl-card-desc">${esc(tpl.description)}</p>` : ''}
        <div class="cl-card-stats">
          <div class="cl-stat">
            <b>${stepsCount}</b>
            <span>خطوة</span>
          </div>
          <div class="cl-stat">
            <b>${assigneesCount}</b>
            <span>موظف</span>
          </div>
          <div class="cl-stat ok">
            <b>${submittedToday}/${todays.length || assigneesCount}</b>
            <span>اليوم</span>
          </div>
        </div>
        <div class="cl-card-assignees">
          ${(tpl.assigneeIds || []).slice(0, 5).map(id => {
            const e = findEmployee(id); if (!e) return '';
            return `<span class="ov-av sm" style="--emp-color:${e.color}" title="${esc(e.name)}"><img src="${D.avatarUrl(e, 40)}" alt=""/></span>`;
          }).join('')}
          ${(tpl.assigneeIds || []).length > 5 ? `<span class="cl-more-pill">+${(tpl.assigneeIds || []).length - 5}</span>` : ''}
        </div>
        <footer class="cl-card-foot">
          <button type="button" class="ghost-btn cl-edit-btn" data-tpl-edit="${tpl.id}">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            تعديل
          </button>
          ${tpl.scheduleType === 'on-demand' ? `
            <button type="button" class="ghost-btn cl-spawn-btn" data-tpl-spawn="${tpl.id}">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              أنشئ نسخة الآن
            </button>
          ` : ''}
        </footer>
      </article>
    `;
  }

  function renderTemplates() {
    const tpls = D.getChecklistTemplatesForUser();
    const grid = document.getElementById('clTemplatesGrid');
    if (!tpls.length) {
      grid.innerHTML = `
        <div class="empty-state cl-empty">
          <div class="empty-emoji">✓</div>
          <h3>لا قوالب بعد</h3>
          <p class="muted">اضغط "قالب جديد" لبناء أول شك ليست لفريقك</p>
        </div>
      `;
      return;
    }
    grid.innerHTML = tpls.map(templateCardHTML).join('');

    grid.querySelectorAll('[data-tpl-edit]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (window.ChecklistTemplateModal) window.ChecklistTemplateModal.open(btn.dataset.tplEdit);
      });
    });
    grid.querySelectorAll('[data-tpl-spawn]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const tpl = D.findChecklistTemplate(btn.dataset.tplSpawn);
        if (!tpl) return;
        const ids = tpl.assigneeIds || [];
        if (!ids.length) { alert('لا موظفون مسندون لهذا القالب'); return; }
        ids.forEach(id => D.createOnDemandInstance(tpl.id, id));
        const t = document.getElementById('toast');
        if (t) { t.textContent = `تم إنشاء ${ids.length} نسخة`; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1500); }
        renderAll();
      });
    });
    grid.querySelectorAll('.cl-card').forEach(card => {
      card.addEventListener('click', e => {
        // Avoid double-handling when an inner button fired
        if (e.target.closest('button')) return;
        if (window.ChecklistTemplateModal) window.ChecklistTemplateModal.open(card.dataset.tpl);
      });
    });
  }

  function renderHistory() {
    const tpls = D.getChecklistTemplatesForUser();
    const allInstances = [];
    tpls.forEach(t => {
      D.getInstancesForTemplate(t.id).forEach(i => allInstances.push({ ...i, _tplTitle: t.title }));
    });
    allInstances.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const list = document.getElementById('clHistoryList');
    if (!allInstances.length) {
      list.innerHTML = '<div class="muted" style="padding:18px;text-align:center">لا تعبئات بعد</div>';
      return;
    }

    // Group by date
    const groups = {};
    allInstances.forEach(i => {
      const k = i.date || 'بدون تاريخ';
      if (!groups[k]) groups[k] = [];
      groups[k].push(i);
    });

    list.innerHTML = Object.keys(groups).sort((a,b) => b.localeCompare(a)).map(date => `
      <div class="cl-hist-day">
        <h4 class="cl-hist-day-title">${esc(formatDateAr(date))}</h4>
        <div class="cl-hist-rows">
          ${groups[date].map(i => {
            const e = findEmployee(i.assigneeId);
            const stepsTotal = (i.steps || []).length;
            const stepsDone = (i.steps || []).filter(s => s.done).length;
            const pct = stepsTotal ? Math.round((stepsDone / stepsTotal) * 100) : 0;
            const statusClass = i.status === 'submitted' ? 'submitted' :
                                i.status === 'in-progress' ? 'progress' : 'pending';
            const statusLabel = i.status === 'submitted' ? 'مُسلَّم ✓' :
                                i.status === 'in-progress' ? 'قيد التنفيذ' : 'معلّق';
            return `
              <div class="cl-hist-row" data-inst="${i.id}">
                <span class="ov-av sm" style="--emp-color:${e ? e.color : 'var(--ink-3)'}">${e ? `<img src="${D.avatarUrl(e, 40)}" alt=""/>` : ''}</span>
                <div class="cl-hist-text">
                  <b>${esc(e ? e.name : '—')}</b>
                  <span class="muted">${esc(i._tplTitle || '')}</span>
                </div>
                <div class="cl-hist-progress">
                  <div class="cl-hist-bar"><span style="width:${pct}%"></span></div>
                  <small>${stepsDone}/${stepsTotal}</small>
                </div>
                <span class="cl-hist-status ${statusClass}">${statusLabel}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `).join('');

    list.querySelectorAll('[data-inst]').forEach(row => {
      row.addEventListener('click', () => {
        if (window.ChecklistInstanceModal) window.ChecklistInstanceModal.open(row.dataset.inst, { readOnly: true });
      });
    });
  }

  function formatDateAr(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  function renderAll() {
    renderKpis();
    renderTemplates();
    renderHistory();
  }

  document.getElementById('clNewBtn').addEventListener('click', () => {
    if (window.ChecklistTemplateModal) window.ChecklistTemplateModal.open();
  });

  // Re-render after the modal saves/closes
  window.refreshChecklists = renderAll;

  renderAll();
})();
