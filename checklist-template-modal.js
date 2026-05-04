/* =====================================================================
   ChecklistTemplateModal — supervisor builds a checklist template:
   title/desc, steps (each can require a photo), schedule, assignees.
   ===================================================================== */

window.ChecklistTemplateModal = (function () {

  let mounted = false;
  let editingId = null;
  let state = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function defaultState() {
    return {
      title: '',
      description: '',
      assigneeIds: [],
      scheduleType: 'daily',
      steps: [],
      active: true,
    };
  }

  function buildShell() {
    const overlay = document.createElement('div');
    overlay.className = 'task-modal-overlay';
    overlay.id = 'clTplOverlay';
    overlay.innerHTML = `<div class="task-modal" id="clTplModal" role="dialog" aria-modal="true"></div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) close();
    });
    mounted = true;
  }

  function render() {
    const D = window.APP_DATA;
    const isEdit = !!editingId;
    const visibleEmps = D.getVisibleEmployees();
    const modal = document.getElementById('clTplModal');

    modal.innerHTML = `
      <header class="tm-head">
        <h2>${isEdit ? 'تعديل قالب الشك ليست' : 'قالب شك ليست جديد'}</h2>
        <button class="tm-close" type="button" aria-label="إغلاق">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </header>

      <form class="tm-body" id="clTplForm" autocomplete="off">

        <div class="tm-field">
          <label class="field-label" for="clTplTitle">عنوان القالب <span class="req">*</span></label>
          <input id="clTplTitle" class="field-input lg" placeholder="مثلاً: افتتاح الفرع" required value="${esc(state.title)}"/>
        </div>

        <div class="tm-field">
          <label class="field-label" for="clTplDesc">وصف مختصر</label>
          <textarea id="clTplDesc" class="field-textarea" rows="2" placeholder="السياق، التوقيت، أي تذكير...">${esc(state.description)}</textarea>
        </div>

        <div class="tm-field">
          <label class="field-label">الخطوات <span class="req">*</span></label>
          <ul class="cl-step-builder" id="clStepList"></ul>
          <div class="cl-step-add">
            <input type="text" class="field-input" id="clStepInput" placeholder="نص الخطوة..." maxlength="120"/>
            <label class="cl-step-photo-toggle" title="هل ترفق صورة إجبارية؟">
              <input type="checkbox" id="clStepPhotoReq"/>
              <span>📷 صورة إجبارية</span>
            </label>
            <button type="button" class="ghost-btn" id="clStepAddBtn">إضافة</button>
          </div>
        </div>

        <div class="tm-grid-2">
          <div class="tm-field">
            <label class="field-label">جدولة</label>
            <div class="seg-mini" id="clSchedSeg">
              <button type="button" data-sched="daily" class="${state.scheduleType === 'daily' ? 'active' : ''}">🔁 يومي</button>
              <button type="button" data-sched="on-demand" class="${state.scheduleType === 'on-demand' ? 'active' : ''}">⚡ عند الحاجة</button>
            </div>
          </div>
          <div class="tm-field">
            <label class="field-label">الحالة</label>
            <label class="setting-toggle compact">
              <input type="checkbox" id="clActive" ${state.active !== false ? 'checked' : ''}/>
              <span class="setting-label">نشط</span>
            </label>
          </div>
        </div>

        <div class="tm-field">
          <label class="field-label">المسند إليهم <small class="muted">(اختر موظفين)</small></label>
          <div class="cl-assignees" id="clAssignees">
            ${visibleEmps.map(emp => {
              const sel = state.assigneeIds.includes(emp.id);
              return `
                <button type="button" class="ass-chip ${sel ? 'selected' : ''}" data-emp="${emp.id}" style="--emp-color:${emp.color}" title="${esc(emp.name)}">
                  <span class="ov-av sm"><img src="${D.avatarUrl(emp, 40)}" alt=""/></span>
                  <span class="ass-name">${esc(emp.name.split(' ')[0])}</span>
                  ${sel ? '<span class="ass-tick">✓</span>' : ''}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div class="ee-error" id="clTplError" hidden></div>
      </form>

      <footer class="tm-foot">
        ${isEdit ? `
          <button type="button" class="td-btn ghost" id="clTplDeleteBtn">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1.5 14a2 2 0 01-2 2H8.5a2 2 0 01-2-2L5 6"/></svg>
            حذف
          </button>
        ` : '<button type="button" class="ghost-btn" id="clTplCancel">إلغاء</button>'}
        <button type="button" class="cta" id="clTplSave">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l5 5 13-13"/></svg>
          ${isEdit ? 'حفظ التعديلات' : 'إنشاء القالب'}
        </button>
      </footer>
    `;

    wire();
    renderSteps();
  }

  function renderSteps() {
    const list = document.getElementById('clStepList');
    if (!state.steps.length) {
      list.innerHTML = '<li class="muted cl-step-empty">لا خطوات بعد — أضف خطوة من المربع تحت</li>';
      return;
    }
    list.innerHTML = state.steps.map((s, i) => `
      <li class="cl-step-row">
        <span class="cl-step-num">${i + 1}</span>
        <span class="cl-step-text">${esc(s.text)}</span>
        ${s.photoRequired ? '<span class="cl-step-photo-pill" title="صورة إجبارية">📷 إجبارية</span>' : '<span class="cl-step-photo-pill optional">📷 اختيارية</span>'}
        <button type="button" class="cl-step-up" data-up="${i}" aria-label="أعلى" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" class="cl-step-down" data-down="${i}" aria-label="أسفل" ${i === state.steps.length - 1 ? 'disabled' : ''}>↓</button>
        <button type="button" class="cl-step-del" data-del="${i}" aria-label="حذف">×</button>
      </li>
    `).join('');

    list.querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.up; if (i <= 0) return;
      [state.steps[i-1], state.steps[i]] = [state.steps[i], state.steps[i-1]];
      renderSteps();
    }));
    list.querySelectorAll('[data-down]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.down; if (i >= state.steps.length - 1) return;
      [state.steps[i+1], state.steps[i]] = [state.steps[i], state.steps[i+1]];
      renderSteps();
    }));
    list.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.del;
      state.steps.splice(i, 1);
      renderSteps();
    }));
  }

  function wire() {
    const D = window.APP_DATA;
    const $ = sel => document.getElementById('clTplModal').querySelector(sel);
    const $$ = sel => document.getElementById('clTplModal').querySelectorAll(sel);

    $('#clTplTitle').addEventListener('input', e => state.title = e.target.value);
    $('#clTplDesc').addEventListener('input', e => state.description = e.target.value);

    // Schedule
    $('#clSchedSeg').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      state.scheduleType = b.dataset.sched;
      $$('#clSchedSeg button').forEach(x => x.classList.toggle('active', x === b));
    });

    // Active toggle
    $('#clActive').addEventListener('change', e => state.active = e.target.checked);

    // Assignees
    $$('#clAssignees .ass-chip').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.dataset.emp;
        const i = state.assigneeIds.indexOf(id);
        if (i >= 0) state.assigneeIds.splice(i, 1);
        else state.assigneeIds.push(id);
        b.classList.toggle('selected');
        const tick = b.querySelector('.ass-tick');
        if (tick) tick.remove();
        else b.insertAdjacentHTML('beforeend', '<span class="ass-tick">✓</span>');
      });
    });

    // Add step
    function addStep() {
      const inp = $('#clStepInput');
      const text = (inp.value || '').trim();
      if (!text) { inp.focus(); return; }
      const photoRequired = $('#clStepPhotoReq').checked;
      state.steps.push({
        id: 's-' + Date.now() + '-' + Math.floor(Math.random()*9999),
        text,
        photoRequired,
      });
      inp.value = '';
      $('#clStepPhotoReq').checked = false;
      renderSteps();
      inp.focus();
    }
    $('#clStepAddBtn').addEventListener('click', addStep);
    $('#clStepInput').addEventListener('keypress', e => {
      if (e.key === 'Enter') { e.preventDefault(); addStep(); }
    });

    // Close / cancel
    $('.tm-close').addEventListener('click', close);
    $('#clTplCancel')?.addEventListener('click', close);

    // Save
    $('#clTplSave').addEventListener('click', save);

    // Delete (edit mode)
    $('#clTplDeleteBtn')?.addEventListener('click', () => {
      if (!editingId) return;
      const tpl = D.findChecklistTemplate(editingId);
      if (!confirm(`حذف قالب "${tpl.title}" نهائياً؟ سيتم حذف كل تعبئاته.`)) return;
      D.deleteChecklistTemplate(editingId);
      close();
      refresh();
    });
  }

  function save() {
    const D = window.APP_DATA;
    const errEl = document.getElementById('clTplError');
    function err(msg) { errEl.textContent = msg; errEl.hidden = false; }

    const title = (state.title || '').trim();
    if (!title) return err('عنوان القالب مطلوب');
    if (!state.steps.length) return err('أضف خطوة واحدة على الأقل');
    if (!state.assigneeIds.length) return err('اختر موظفاً واحداً على الأقل');

    const payload = {
      title,
      description: (state.description || '').trim(),
      assigneeIds: state.assigneeIds.slice(),
      scheduleType: state.scheduleType,
      steps: state.steps.map(s => ({ id: s.id, text: s.text, photoRequired: !!s.photoRequired })),
      active: state.active !== false,
    };

    if (editingId) D.updateChecklistTemplate(editingId, payload);
    else D.addChecklistTemplate(payload);

    close();
    refresh();
  }

  function refresh() {
    if (typeof window.refreshChecklists === 'function') window.refreshChecklists();
  }

  function open(templateId) {
    if (!window.APP_DATA) return;
    if (!mounted) buildShell();
    editingId = templateId || null;
    if (editingId) {
      const tpl = window.APP_DATA.findChecklistTemplate(editingId);
      if (!tpl) { editingId = null; state = defaultState(); }
      else {
        state = {
          title: tpl.title || '',
          description: tpl.description || '',
          assigneeIds: (tpl.assigneeIds || []).slice(),
          scheduleType: tpl.scheduleType || 'daily',
          steps: (tpl.steps || []).map(s => ({ ...s })),
          active: tpl.active !== false,
        };
      }
    } else {
      state = defaultState();
    }
    render();
    document.getElementById('clTplOverlay').classList.add('open');
    document.body.classList.add('modal-open');
  }

  function close() {
    document.getElementById('clTplOverlay')?.classList.remove('open');
    document.body.classList.remove('modal-open');
    editingId = null;
  }

  return { open, close };
})();
