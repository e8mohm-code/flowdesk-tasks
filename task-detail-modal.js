/* =====================================================================
   Task Detail Modal — fully editable inline.
   Usage: TaskDetailModal.open(taskId)
   ===================================================================== */

window.TaskDetailModal = (function () {

  let mounted = false;
  let currentTaskId = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function buildShell() {
    const overlay = document.createElement('div');
    overlay.className = 'td-overlay';
    overlay.id = 'tdOverlay';
    overlay.innerHTML = `<div class="td-modal" id="tdModal" role="dialog" aria-modal="true"></div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) close();
    });
    mounted = true;
  }

  /* ---------- Helpers ---------- */
  const PRIO_LABEL = { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };

  function daysBetween(d1, d2) {
    const a = new Date(d1 + 'T00:00:00');
    const b = new Date(d2 + 'T00:00:00');
    return Math.floor((b - a) / (1000 * 60 * 60 * 24));
  }

  function formatRelative(iso) {
    if (!iso) return '';
    const then = new Date(iso);
    const now = new Date();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'الآن';
    if (diffMin < 60) return `قبل ${diffMin} دقيقة`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `قبل ${diffH} ساعة`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `قبل ${diffD} يوم`;
    return then.toISOString().slice(0, 10);
  }

  function activityEntry(act, D) {
    const ICONS = {
      created:               '🆕',
      assigned:              '👤',
      unassigned:            '↩️',
      reassigned:            '🔄',
      progress:              '📊',
      completed:             '✅',
      rescheduled:           '📅',
      comment:               '💬',
      'extension-requested': '⏳',
      'extension-approved':  '✅',
      'extension-denied':    '⛔',
    };
    const icon = ICONS[act.type] || '•';
    let text = '';
    const empName = id => {
      const e = D.findEmployee(id);
      return e ? `<b>${esc(e.name)}</b>` : 'غير مسندة';
    };
    switch (act.type) {
      case 'created':     text = 'أُنشئت المهمة'; break;
      case 'assigned':    text = `أُسندت إلى ${empName(act.to)}`; break;
      case 'unassigned':  text = `أُزيل الإسناد من ${empName(act.from)}`; break;
      case 'reassigned':  text = `نُقلت من ${empName(act.from)} إلى ${empName(act.to)}`; break;
      case 'progress':    text = `التقدّم: <b>${act.from}%</b> → <b>${act.to}%</b>`; break;
      case 'completed':   text = '<b>أُكملت المهمة</b> 🎉'; break;
      case 'rescheduled': text = `الموعد: ${esc(act.from)} → <b>${esc(act.to)}</b>`; break;
      case 'comment':     text = `${empName(act.by)}: «${esc(act.text)}»`; break;
      case 'extension-requested':
        text = `${empName(act.by)} طلب تمديد إلى <b>${esc(act.newDue)}</b>${act.reason ? ` — «${esc(act.reason)}»` : ''}`;
        break;
      case 'extension-approved':
        text = `${empName(act.by)} وافق على التمديد: ${esc(act.from)} → <b>${esc(act.to)}</b>`;
        break;
      case 'extension-denied':
        text = `${empName(act.by)} رفض طلب التمديد`;
        break;
      default:            text = act.type;
    }
    return `
      <li class="td-act td-act-${act.type}">
        <span class="td-act-icon">${icon}</span>
        <span class="td-act-text">${text}</span>
        <span class="td-act-when">${esc(formatRelative(act.when))}</span>
      </li>
    `;
  }

  /* ---------- Render ---------- */
  function render() {
    const D = window.APP_DATA;
    const t = D.tasks.find(x => x.id === currentTaskId);
    if (!t) { close(); return; }

    const canEdit = D.canEditTask(t);            // includes employees
    const canFullyEdit = D.canManageTask(t);      // manager/supervisor only
    const isEmployeeAssigned = canEdit && !canFullyEdit;
    const u = D.getCurrentUser();
    const extReq = t.extensionRequest;
    const hasPendingExt = extReq && extReq.status === 'pending';
    const allAssigneeIds = D.getAllAssignees(t);
    const allTags = D.getAllTags();
    const allBrands = D.getAllBrands();
    const visibleEmps = D.getVisibleEmployees();

    // Time status
    const todayISO = D.TODAY.toISOString().slice(0, 10);
    const diff = daysBetween(todayISO, t.due);
    let timeBadge = '', timeClass = '';
    if (t.done) { timeBadge = `مكتملة ${t.doneAt ? '• ' + D.formatDue(t.doneAt) : ''}`; timeClass = 'done'; }
    else if (diff < 0)   { timeBadge = `متأخرة ${Math.abs(diff)} يوم`; timeClass = 'overdue'; }
    else if (diff === 0) { timeBadge = 'الموعد اليوم'; timeClass = 'today'; }
    else if (diff === 1) { timeBadge = 'الموعد غداً'; timeClass = 'soon'; }
    else                 { timeBadge = `متبقي ${diff} يوم`; timeClass = diff <= 3 ? 'soon' : 'upcoming'; }

    const subDone = (t.subtasks || []).filter(s => s.done).length;
    const subTotal = (t.subtasks || []).length;
    const subPct = subTotal ? (subDone / subTotal) * 100 : 0;

    const modal = document.getElementById('tdModal');
    modal.innerHTML = `
      <header class="td-head">
        <span class="td-time-badge ${timeClass}">${esc(timeBadge)}</span>
        ${t.starred ? '<span class="td-star" title="في المفضلة">⭐</span>' : ''}
        <button type="button" class="td-close-btn" aria-label="إغلاق">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </header>

      <div class="td-body">
        <div class="td-title-row">
          <span class="td-prio-strip" data-prio="${t.priority}"></span>
          ${canFullyEdit
            ? `<input type="text" class="td-title-input" id="tdTitleInput" value="${esc(t.title)}" placeholder="عنوان المهمة"/>`
            : `<h1 class="td-title">${esc(t.title)}</h1>`}
        </div>

        ${hasPendingExt && canFullyEdit ? `
          <div class="td-ext-banner pending" id="tdExtBanner">
            <span class="td-ext-icon">⏳</span>
            <div class="td-ext-text">
              <b>طلب تمديد من ${esc(D.findEmployee(extReq.by)?.name || 'موظف')}</b>
              <span>إلى <b>${esc(D.formatDue(extReq.newDue))}</b>${extReq.reason ? ` — «${esc(extReq.reason)}»` : ''}</span>
            </div>
            <button type="button" class="td-ext-deny" id="tdExtDenyBtn">رفض</button>
            <button type="button" class="td-ext-approve" id="tdExtApproveBtn">موافقة ✓</button>
          </div>
        ` : ''}
        ${hasPendingExt && !canFullyEdit ? `
          <div class="td-ext-banner waiting">
            <span class="td-ext-icon">⏳</span>
            <div class="td-ext-text">
              <b>تم إرسال طلب التمديد</b>
              <span>بانتظار موافقة المسؤول — التاريخ المطلوب: <b>${esc(D.formatDue(extReq.newDue))}</b></span>
            </div>
          </div>
        ` : ''}

        <div class="td-meta-grid">

          <div class="td-meta">
            <span class="td-label">المسند إليه ${canFullyEdit ? '<small class="muted">(يمكن أكثر من شخص)</small>' : ''}</span>
            ${canFullyEdit ? `
              <div class="td-assignee-edit" id="tdAssigneeEdit">
                ${visibleEmps.map(emp => {
                  const sel = allAssigneeIds.includes(emp.id);
                  return `
                    <button type="button" class="ass-chip ${sel ? 'selected' : ''}" data-emp="${emp.id}" style="--emp-color:${emp.color}" title="${esc(emp.name)}">
                      <span class="ov-av sm"><img src="${D.avatarUrl(emp, 40)}" alt=""/></span>
                      <span class="ass-name">${esc(emp.name.split(' ')[0])}</span>
                      ${sel ? '<span class="ass-tick">✓</span>' : ''}
                    </button>
                  `;
                }).join('')}
              </div>
            ` : (allAssigneeIds.length ? `
              <div class="td-assignees-stack">
                ${allAssigneeIds.map(id => {
                  const e = D.findEmployee(id); if (!e) return '';
                  return `
                    <a class="td-assignee" href="employee.html?id=${e.id}" style="--emp-color:${e.color}">
                      <span class="ov-av sm"><img src="${D.avatarUrl(e, 40)}" alt=""/></span>
                      <span class="td-emp-text">
                        <b>${esc(e.name)}</b>
                        <small>${esc(e.role)}</small>
                      </span>
                    </a>
                  `;
                }).join('')}
              </div>
            ` : '<span class="muted">غير مسندة</span>')}
          </div>

          <div class="td-meta">
            <span class="td-label">الموعد</span>
            ${canFullyEdit
              ? `<input type="date" class="td-due-input field-input" id="tdDueInput" value="${esc(t.due)}"/>`
              : `<div class="td-due-block ${timeClass}">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
                  <span>${esc(D.formatDue(t.due))}</span>
                </div>`}
            ${isEmployeeAssigned && !t.done && !hasPendingExt ? `
              <button type="button" class="td-ext-request-btn" id="tdExtRequestBtn">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                طلب تمديد
              </button>
              <div class="td-ext-form" id="tdExtForm" hidden>
                <input type="date" id="tdExtDate" class="field-input" min="${esc(todayISO)}" value="${esc(t.due)}"/>
                <input type="text" id="tdExtReason" class="field-input" placeholder="السبب (اختياري)"/>
                <button type="button" class="ghost-btn" id="tdExtSendBtn">إرسال</button>
                <button type="button" class="ghost-btn" id="tdExtCancelBtn">إلغاء</button>
              </div>
            ` : ''}
          </div>

          <div class="td-meta">
            <span class="td-label">الفئة</span>
            ${canFullyEdit ? `
              <select class="td-tag-select field-input" id="tdTagSelect">
                ${allTags.map(tg => `<option value="${tg.key}" ${t.tagKey === tg.key ? 'selected' : ''}>${esc(tg.label)}</option>`).join('')}
              </select>
            ` : `<span class="tag" style="--tag-color:${D.getTagColor(t.tagKey)}">${esc(t.tag)}</span>`}
          </div>

          <div class="td-meta">
            <span class="td-label">الأولوية</span>
            ${canFullyEdit ? `
              <div class="prio-seg compact" id="tdPrioSeg">
                <button type="button" data-prio="low" class="${t.priority === 'low' ? 'active' : ''}"><i class="dot prio-low"></i><span>منخفضة</span></button>
                <button type="button" data-prio="medium" class="${t.priority === 'medium' ? 'active' : ''}"><i class="dot prio-mid"></i><span>متوسطة</span></button>
                <button type="button" data-prio="high" class="${t.priority === 'high' ? 'active' : ''}"><i class="dot prio-high"></i><span>عالية</span></button>
              </div>
            ` : `<span class="td-prio-badge ${t.priority}">
              <i class="dot prio-${t.priority === 'high' ? 'high' : t.priority === 'medium' ? 'mid' : 'low'}"></i>
              ${PRIO_LABEL[t.priority] || ''}
            </span>`}
          </div>

          <div class="td-meta">
            <span class="td-label">المكافأة</span>
            ${canFullyEdit ? `
              <div class="td-xp-edit">
                <input type="number" min="0" max="9999" id="tdXpInput" class="field-input" value="${t.xp || 0}"/>
                <span class="muted">XP <small>(0 = بدون)</small></span>
              </div>
            ` : `<span class="td-xp-badge">${t.xp ? '+' + t.xp + ' XP' : 'بدون'}</span>`}
          </div>

          <div class="td-meta">
            <span class="td-label">التقدّم</span>
            <div class="td-progress">
              <div class="td-progress-bar"><span style="width:${t.progress || 0}%"></span></div>
              <b>${t.progress || 0}%</b>
            </div>
          </div>
        </div>

        <section class="td-section">
          <h3>الوصف</h3>
          ${canFullyEdit
            ? `<textarea id="tdDescInput" class="field-textarea" rows="3" placeholder="تفاصيل، روابط، متطلبات...">${esc(t.desc || '')}</textarea>`
            : (t.desc ? `<p class="td-desc">${esc(t.desc)}</p>` : '<p class="muted">لا وصف</p>')}
        </section>

        ${(allBrands.length || canFullyEdit) ? `
          <section class="td-section">
            <h3>العلامات / البراندات</h3>
            ${canFullyEdit ? `
              <div class="brand-picker" id="tdBrandPicker">
                ${allBrands.map(b => {
                  const sel = (t.brandKeys || []).includes(b.key);
                  const logo = b.logoFile ? `<span class="brand-logo"><img src="${b.logoFile}" alt=""/></span>` : '<i class="bdot"></i>';
                  return `
                    <button type="button" class="brand-pick ${sel ? 'selected' : ''}" data-key="${b.key}" style="--brand-color:${b.color}">
                      ${logo}${esc(b.label)}
                    </button>
                  `;
                }).join('')}
                ${allBrands.length === 0 ? '<span class="muted">لا توجد علامات بعد — أضفها من نافذة إنشاء مهمة جديدة</span>' : ''}
              </div>
            ` : `
              <div class="td-brand-chips">
                ${(t.brandKeys || []).map(k => {
                  const b = D.findBrand(k); if (!b) return '';
                  const logo = b.logoFile ? `<span class="brand-chip-logo"><img src="${b.logoFile}" alt=""/></span>` : '';
                  return `<span class="brand-chip" style="--brand-color:${b.color}">${logo}${esc(b.label)}</span>`;
                }).join('') || '<span class="muted">—</span>'}
              </div>
            `}
          </section>
        ` : ''}

        ${(subTotal || canEdit) ? `
          <section class="td-section">
            <h3>الخطوات / المهام الفرعية ${subTotal ? `<span class="td-count">${subDone}/${subTotal}</span>` : ''}</h3>
            ${subTotal ? `<div class="td-sub-progress"><span style="width:${subPct}%"></span></div>` : ''}
            <ul class="td-sub-list">
              ${(t.subtasks || []).map((s, i) => {
                const att = s.attachment;
                return `
                  <li class="td-sub ${s.done ? 'done' : ''}" data-sub-row="${i}">
                    <button type="button" class="td-sub-toggle" data-sub-toggle="${i}" aria-label="تبديل" ${canEdit ? '' : 'disabled'}>
                      <span class="td-sub-check">${s.done ? '✓' : ''}</span>
                    </button>
                    <span class="td-sub-text">${esc(s.text)}</span>
                    ${att ? `
                      <a class="td-sub-att" ${att.dataUrl ? `href="${att.dataUrl}" download="${esc(att.name)}"` : ''} title="${esc(att.name)}">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 11-8.48-8.49l8.57-8.57A4 4 0 1118 8.84l-8.59 8.57a2 2 0 11-2.83-2.83l8.49-8.48"/></svg>
                        <span class="td-sub-att-name">${esc(att.name)}</span>
                      </a>
                    ` : ''}
                    ${canEdit ? `
                      <button type="button" class="td-sub-attach-btn" data-sub-attach="${i}" title="${att ? 'استبدال المستند' : 'إرفاق مستند'}">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 11-8.48-8.49l8.57-8.57A4 4 0 1118 8.84l-8.59 8.57a2 2 0 11-2.83-2.83l8.49-8.48"/></svg>
                      </button>
                      <button type="button" class="td-sub-del-btn" data-sub-del="${i}" aria-label="حذف الخطوة">×</button>
                    ` : ''}
                  </li>
                `;
              }).join('')}
            </ul>
            ${canEdit ? `
              <div class="td-sub-add-row">
                <input type="text" class="field-input" id="tdSubAddInput" placeholder="أضف خطوة جديدة..." maxlength="120"/>
                <button type="button" class="ghost-btn" id="tdSubAddBtn">إضافة</button>
                <input type="file" id="tdSubFileInput" hidden/>
              </div>
            ` : ''}
          </section>
        ` : ''}

        ${(t.attachments || []).length ? `
          <section class="td-section">
            <h3>المرفقات <span class="td-count">${t.attachments.length}</span></h3>
            <ul class="td-att-list">
              ${t.attachments.map(a => `
                <li class="td-att-item">
                  <span class="td-att-icon">📎</span>
                  <span class="td-att-name">${esc(a.name)}</span>
                  <span class="td-att-size muted">${a.size ? (a.size/1024).toFixed(1) + ' KB' : ''}</span>
                </li>
              `).join('')}
            </ul>
          </section>
        ` : ''}

        ${(t.watchers || []).length ? `
          <section class="td-section">
            <h3>المتابعون (CC) <span class="td-count">${t.watchers.length}</span></h3>
            <div class="td-watchers">
              ${t.watchers.map(wid => {
                const w = D.findEmployee(wid);
                if (!w) return '';
                return `
                  <a href="employee.html?id=${w.id}" class="td-watcher-chip" style="--emp-color:${w.color}">
                    <span class="ov-av sm"><img src="${D.avatarUrl(w, 40)}" alt=""/></span>
                    ${esc(w.name)}
                  </a>
                `;
              }).join('')}
            </div>
          </section>
        ` : ''}

        ${t.recurring ? `
          <section class="td-section">
            <h3>التكرار</h3>
            <p class="td-recur">${esc(formatRecurring(t.recurring))}</p>
          </section>
        ` : ''}

        <section class="td-section">
          <h3>سجل النشاط</h3>
          <ul class="td-activity">
            ${(t.activity || []).slice().reverse().map(a => activityEntry(a, D)).join('')
              || '<li class="muted">لا نشاط بعد</li>'}
          </ul>

          <div class="td-comment-row">
            <input type="text" id="tdCommentInput" placeholder="أضف تعليقاً..." class="field-input"/>
            <button type="button" class="ghost-btn" id="tdCommentSend">إرسال</button>
          </div>
        </section>
      </div>

      <footer class="td-foot">
        ${D.canDeleteTask(t) ? `
          <button type="button" class="td-btn ghost" id="tdDeleteBtn">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1.5 14a2 2 0 01-2 2H8.5a2 2 0 01-2-2L5 6"/></svg>
            حذف
          </button>
        ` : ''}
        ${!t.done && canEdit ? `
          <div class="td-progress-quick">
            <button type="button" class="td-prog-btn" data-prog="25">25%</button>
            <button type="button" class="td-prog-btn" data-prog="50">50%</button>
            <button type="button" class="td-prog-btn" data-prog="75">75%</button>
          </div>
          ${canFullyEdit ? '<button type="button" class="td-btn save" id="tdSaveBtn"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l5 5 13-13"/></svg> حفظ التعديلات</button>' : ''}
          <button type="button" class="td-btn primary" id="tdCompleteBtn">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l5 5 13-13"/></svg>
            إكمال المهمة
          </button>
        ` : (t.done ? '<span class="td-done-marker">✓ مكتملة</span>' : '<span class="muted" style="margin-inline-start:auto">عرض فقط — لا تملك صلاحية تعديل هذه المهمة</span>')}
      </footer>
    `;

    /* Wire up handlers */
    modal.querySelector('.td-close-btn').addEventListener('click', close);

    modal.querySelector('#tdDeleteBtn')?.addEventListener('click', () => {
      if (!confirm('حذف هذه المهمة نهائياً؟')) return;
      D.deleteTask(currentTaskId);
      close();
      refresh();
    });

    modal.querySelector('#tdCompleteBtn')?.addEventListener('click', () => {
      // Save any pending edits first (manager/supervisor only)
      if (canFullyEdit) gatherAndSaveEdits();
      D.updateTask(currentTaskId, { done: true, progress: 100 });
      render();
      refresh();
    });

    /* ---------- EXTENSION REQUEST flow ---------- */
    modal.querySelector('#tdExtRequestBtn')?.addEventListener('click', () => {
      modal.querySelector('#tdExtRequestBtn').hidden = true;
      modal.querySelector('#tdExtForm').hidden = false;
      modal.querySelector('#tdExtDate')?.focus();
    });
    modal.querySelector('#tdExtCancelBtn')?.addEventListener('click', () => {
      modal.querySelector('#tdExtForm').hidden = true;
      modal.querySelector('#tdExtRequestBtn').hidden = false;
    });
    modal.querySelector('#tdExtSendBtn')?.addEventListener('click', () => {
      const newDue = modal.querySelector('#tdExtDate').value;
      const reason = modal.querySelector('#tdExtReason').value || '';
      if (!newDue) { alert('اختر تاريخاً للتمديد'); return; }
      if (!u) return;
      D.requestExtension(currentTaskId, u.id, newDue, reason);
      const toast = document.getElementById('toast');
      if (toast) { toast.textContent = 'تم إرسال طلب التمديد'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1700); }
      render();
      refresh();
    });
    modal.querySelector('#tdExtApproveBtn')?.addEventListener('click', () => {
      if (!u) return;
      D.approveExtension(currentTaskId, u.id);
      render();
      refresh();
    });
    modal.querySelector('#tdExtDenyBtn')?.addEventListener('click', () => {
      if (!u) return;
      D.denyExtension(currentTaskId, u.id);
      render();
      refresh();
    });

    modal.querySelector('#tdSaveBtn')?.addEventListener('click', () => {
      if (!canFullyEdit) return;
      gatherAndSaveEdits();
      const t = document.getElementById('toast');
      if (t) { t.textContent = 'تم حفظ التعديلات'; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1500); }
      render();
      refresh();
    });

    modal.querySelectorAll('.td-prog-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        D.updateTask(currentTaskId, { progress: +btn.dataset.prog });
        render();
        refresh();
      });
    });

    /* ---------- SUBTASKS — add / toggle / attach / delete ---------- */
    modal.querySelectorAll('[data-sub-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!canEdit) return;
        const idx = +btn.dataset.subToggle;
        const task = D.tasks.find(x => x.id === currentTaskId);
        if (!task || !task.subtasks) return;
        task.subtasks[idx].done = !task.subtasks[idx].done;
        D.saveTasks();
        render();
        refresh();
      });
    });

    modal.querySelectorAll('[data-sub-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!canEdit) return;
        const idx = +btn.dataset.subDel;
        const task = D.tasks.find(x => x.id === currentTaskId);
        if (!task || !task.subtasks) return;
        if (!confirm(`حذف الخطوة "${task.subtasks[idx].text}"؟`)) return;
        task.subtasks.splice(idx, 1);
        D.saveTasks();
        render();
        refresh();
      });
    });

    const subAddInput = modal.querySelector('#tdSubAddInput');
    const subAddBtn = modal.querySelector('#tdSubAddBtn');
    const subFileInput = modal.querySelector('#tdSubFileInput');
    function addSubtask() {
      const txt = (subAddInput.value || '').trim();
      if (!txt) { subAddInput.focus(); return; }
      const task = D.tasks.find(x => x.id === currentTaskId);
      if (!task) return;
      if (!Array.isArray(task.subtasks)) task.subtasks = [];
      task.subtasks.push({ text: txt, done: false, attachment: null });
      subAddInput.value = '';
      D.saveTasks();
      render();
      refresh();
    }
    subAddBtn?.addEventListener('click', addSubtask);
    subAddInput?.addEventListener('keypress', e => {
      if (e.key === 'Enter') { e.preventDefault(); addSubtask(); }
    });

    let attachTargetIdx = -1;
    modal.querySelectorAll('[data-sub-attach]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!canEdit) return;
        attachTargetIdx = +btn.dataset.subAttach;
        subFileInput?.click();
      });
    });
    subFileInput?.addEventListener('change', e => {
      const f = e.target.files && e.target.files[0];
      if (!f || attachTargetIdx < 0) return;
      // Cap at ~2MB to avoid blowing localStorage
      if (f.size > 2 * 1024 * 1024) {
        if (!confirm(`الملف كبير (${(f.size / 1024 / 1024).toFixed(1)}MB). قد لا يُحفظ. تابع؟`)) {
          subFileInput.value = '';
          attachTargetIdx = -1;
          return;
        }
      }
      const reader = new FileReader();
      reader.onerror = () => alert('تعذّر قراءة الملف');
      reader.onload = ev => {
        const task = D.tasks.find(x => x.id === currentTaskId);
        if (!task || !task.subtasks) return;
        task.subtasks[attachTargetIdx].attachment = {
          name: f.name,
          size: f.size,
          type: f.type || '',
          dataUrl: ev.target.result,
        };
        try {
          D.saveTasks();
        } catch (err) {
          alert('فشل الحفظ — قد يكون الملف كبير جداً');
        }
        attachTargetIdx = -1;
        subFileInput.value = '';
        render();
        refresh();
      };
      reader.readAsDataURL(f);
    });

    // Live state for edits (collected on save)
    let editAssignees = allAssigneeIds.slice();
    let editPriority = t.priority;
    let editBrands = (t.brandKeys || []).slice();

    // Assignee chip toggling
    modal.querySelectorAll('#tdAssigneeEdit .ass-chip').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.dataset.emp;
        const i = editAssignees.indexOf(id);
        if (i >= 0) editAssignees.splice(i, 1);
        else editAssignees.push(id);
        b.classList.toggle('selected');
        const tick = b.querySelector('.ass-tick');
        if (tick) tick.remove();
        else b.insertAdjacentHTML('beforeend', '<span class="ass-tick">✓</span>');
      });
    });

    // Priority segment
    modal.querySelector('#tdPrioSeg')?.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      editPriority = b.dataset.prio;
      modal.querySelectorAll('#tdPrioSeg button').forEach(x => x.classList.toggle('active', x === b));
    });

    // Brand toggle
    modal.querySelectorAll('#tdBrandPicker .brand-pick').forEach(b => {
      b.addEventListener('click', () => {
        const k = b.dataset.key;
        const i = editBrands.indexOf(k);
        if (i >= 0) editBrands.splice(i, 1);
        else editBrands.push(k);
        b.classList.toggle('selected');
      });
    });

    function gatherAndSaveEdits() {
      const titleEl = modal.querySelector('#tdTitleInput');
      const descEl = modal.querySelector('#tdDescInput');
      const dueEl = modal.querySelector('#tdDueInput');
      const tagEl = modal.querySelector('#tdTagSelect');
      const xpEl = modal.querySelector('#tdXpInput');
      const patch = {};
      if (titleEl) patch.title = (titleEl.value || '').trim() || t.title;
      if (descEl) patch.desc = descEl.value || '';
      if (dueEl && dueEl.value) patch.due = dueEl.value;
      if (xpEl) patch.xp = Math.max(0, parseInt(xpEl.value, 10) || 0);
      if (tagEl) {
        const tagObj = D.findTag(tagEl.value);
        if (tagObj) { patch.tagKey = tagObj.key; patch.tag = tagObj.label; }
      }
      patch.priority = editPriority;
      patch.assignee = editAssignees[0] || null;
      patch.coAssignees = editAssignees.slice(1);
      patch.brandKeys = editBrands.slice();
      D.updateTask(currentTaskId, patch);
    }

    const cmtInp = modal.querySelector('#tdCommentInput');
    const cmtBtn = modal.querySelector('#tdCommentSend');
    const sendCmt = () => {
      const text = (cmtInp.value || '').trim();
      if (!text) return;
      const u = D.getCurrentUser();
      D.addComment(currentTaskId, text, u ? u.id : 'u1');
      cmtInp.value = '';
      render();
    };
    cmtBtn.addEventListener('click', sendCmt);
    cmtInp.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); sendCmt(); }});
  }

  function formatRecurring(r) {
    const FREQ = { daily: 'يومياً', weekly: 'أسبوعياً', monthly: 'شهرياً' };
    const DAYS = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
    let parts = [FREQ[r.frequency] || ''];
    if (r.frequency === 'weekly' && r.weekdays && r.weekdays.length) {
      parts.push('أيام: ' + r.weekdays.map(v => DAYS[v]).join('، '));
    }
    if (r.frequency === 'monthly') parts.push(`يوم ${r.dayOfMonth}`);
    if (r.end === 'count') parts.push(`${r.endCount} مرة`);
    if (r.end === 'date' && r.endDate) parts.push(`حتى ${r.endDate}`);
    return parts.filter(Boolean).join(' • ');
  }

  function refresh() {
    if (typeof window.refreshTasks === 'function') window.refreshTasks();
  }

  function open(taskId) {
    if (!window.APP_DATA) return;
    if (!mounted) buildShell();
    currentTaskId = taskId;
    render();
    document.getElementById('tdOverlay').classList.add('open');
    document.body.classList.add('modal-open');
  }

  function close() {
    document.getElementById('tdOverlay')?.classList.remove('open');
    document.body.classList.remove('modal-open');
    currentTaskId = null;
  }

  return { open, close };
})();
