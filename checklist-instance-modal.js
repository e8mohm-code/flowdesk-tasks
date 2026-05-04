/* =====================================================================
   ChecklistInstanceModal — employee fills (or supervisor reviews) one
   day's instance of a checklist template. Each step can require a photo.
   ===================================================================== */

window.ChecklistInstanceModal = (function () {

  let mounted = false;
  let currentInstanceId = null;
  let readOnly = false;
  let attachTargetIdx = -1;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function buildShell() {
    const overlay = document.createElement('div');
    overlay.className = 'td-overlay';
    overlay.id = 'cliOverlay';
    overlay.innerHTML = `<div class="td-modal" id="cliModal" role="dialog" aria-modal="true"></div>`;
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
    const inst = D.findChecklistInstance(currentInstanceId);
    if (!inst) { close(); return; }
    const tpl = D.findChecklistTemplate(inst.templateId);
    const u = D.getCurrentUser();
    const isOwner = u && inst.assigneeId === u.id;
    const editable = !readOnly && isOwner && inst.status !== 'submitted';

    const stepsTotal = (inst.steps || []).length;
    const stepsAnswered = (inst.steps || []).filter(s => s.answer != null).length;
    const pct = stepsTotal ? Math.round((stepsAnswered / stepsTotal) * 100) : 0;

    const blocking = (inst.steps || []).find(s => (s.answer == null) || (s.photoRequired && !s.photoFile));
    const canSubmit = editable && !blocking;

    const statusLabel = inst.status === 'submitted' ? 'مُسلَّم ✓' :
                        inst.status === 'in-progress' ? 'قيد التنفيذ' : 'لم يبدأ';
    const statusClass = inst.status === 'submitted' ? 'submitted' :
                        inst.status === 'in-progress' ? 'progress' : 'pending';

    const modal = document.getElementById('cliModal');
    modal.innerHTML = `
      <header class="td-head">
        <span class="td-time-badge ${statusClass}">${statusLabel}</span>
        <span class="muted" style="font-size:12px">${esc(inst.date)}</span>
        <button type="button" class="td-close-btn" aria-label="إغلاق">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </header>

      <div class="td-body">
        <div class="td-title-row">
          <h1 class="td-title">${esc(tpl ? tpl.title : 'شك ليست')}</h1>
        </div>
        ${tpl && tpl.description ? `<p class="td-desc">${esc(tpl.description)}</p>` : ''}

        <div class="cli-progress-row">
          <div class="cli-progress-bar"><span style="width:${pct}%"></span></div>
          <b>${stepsAnswered}/${stepsTotal}</b>
        </div>

        <ul class="cli-step-list">
          ${(inst.steps || []).map((s, i) => {
            const att = s.photoFile;
            const answers = (Array.isArray(s.answers) && s.answers.length) ? s.answers : ['نعم', 'لا', 'غير متوفر'];
            const answered = s.answer != null;
            return `
              <li class="cli-step ${answered ? 'done' : ''} ${s.photoRequired ? 'req-photo' : ''}">
                <div class="cli-step-head">
                  <span class="cli-step-num">${i + 1}</span>
                  <div class="cli-step-text">
                    <span>${esc(s.text)}</span>
                    ${s.photoRequired
                      ? `<small class="cli-req-pill ${att ? 'ok' : ''}">${att ? '📷 مرفوعة' : '📷 إجبارية'}</small>`
                      : (s.photoFile ? '<small class="cli-req-pill ok">📷 مرفوعة</small>' : '')}
                  </div>
                  ${att ? `
                    <a class="cli-photo-thumb" href="${att}" target="_blank" rel="noopener">
                      <img src="${att}" alt=""/>
                    </a>
                  ` : ''}
                  ${editable ? `
                    <button type="button" class="cli-photo-btn" data-step-photo="${i}" title="${att ? 'استبدال الصورة' : 'إرفاق صورة'}">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </button>
                  ` : ''}
                </div>
                <div class="cli-answer-row">
                  ${answers.map((label, ai) => `
                    <button type="button" class="cli-ans-btn ${s.answer === ai ? 'selected ans-' + ai : ''}" data-step-answer="${i}" data-ans-idx="${ai}" ${editable ? '' : 'disabled'}>
                      ${esc(label)}
                    </button>
                  `).join('')}
                </div>
              </li>
            `;
          }).join('')}
        </ul>
        ${editable ? '<input type="file" id="cliPhotoInput" accept="image/*" capture="environment" hidden/>' : ''}
      </div>

      <footer class="td-foot">
        ${editable ? `
          <span class="muted" style="margin-inline-end:auto;font-size:11.5px">${blocking ? `متبقي ${(inst.steps || []).filter(s => (s.answer == null) || (s.photoRequired && !s.photoFile)).length} خطوة` : 'جميع الخطوات جاهزة ✓'}</span>
          <button type="button" class="td-btn primary" id="cliSubmitBtn" ${canSubmit ? '' : 'disabled'}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l5 5 13-13"/></svg>
            إرسال نهائي
          </button>
        ` : (inst.status === 'submitted'
              ? `<span class="td-done-marker">✓ مُسلَّم${inst.submittedAt ? ' • ' + esc(inst.submittedAt.slice(0,10)) : ''}</span>`
              : '<span class="muted">عرض فقط</span>')}
      </footer>
    `;

    /* Wire up */
    modal.querySelector('.td-close-btn').addEventListener('click', close);

    modal.querySelectorAll('[data-step-answer]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!editable) return;
        const i = +btn.dataset.stepAnswer;
        const ai = +btn.dataset.ansIdx;
        const step = inst.steps[i];
        if (step.photoRequired && !step.photoFile) {
          alert('هذي الخطوة تحتاج صورة قبل اختيار الإجابة');
          return;
        }
        // toggle: if same answer clicked, clear it
        const newAnswer = step.answer === ai ? null : ai;
        D.updateInstanceStep(currentInstanceId, i, { answer: newAnswer, done: newAnswer != null });
        render();
        refresh();
      });
    });

    const photoInput = modal.querySelector('#cliPhotoInput');
    modal.querySelectorAll('[data-step-photo]').forEach(btn => {
      btn.addEventListener('click', () => {
        attachTargetIdx = +btn.dataset.stepPhoto;
        photoInput?.click();
      });
    });
    photoInput?.addEventListener('change', e => {
      const f = e.target.files && e.target.files[0];
      if (!f || attachTargetIdx < 0) return;
      if (!f.type.startsWith('image/')) { alert('يجب اختيار صورة'); return; }
      const reader = new FileReader();
      reader.onerror = () => alert('فشل قراءة الصورة');
      reader.onload = ev => {
        const img = new Image();
        img.onerror = () => {
          // Fallback: use original data URL
          D.updateInstanceStep(currentInstanceId, attachTargetIdx, { photoFile: ev.target.result });
          attachTargetIdx = -1;
          photoInput.value = '';
          render();
          refresh();
        };
        img.onload = () => {
          // Resize to max 800px (preserve aspect)
          const MAX = 800;
          let w = img.width, h = img.height;
          if (w > h) { if (w > MAX) { h = h * MAX / w; w = MAX; } }
          else      { if (h > MAX) { w = w * MAX / h; h = MAX; } }
          let dataUrl;
          try {
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          } catch (err) {
            dataUrl = ev.target.result;
          }
          D.updateInstanceStep(currentInstanceId, attachTargetIdx, { photoFile: dataUrl });
          attachTargetIdx = -1;
          photoInput.value = '';
          render();
          refresh();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(f);
    });

    modal.querySelector('#cliSubmitBtn')?.addEventListener('click', () => {
      const ok = D.submitInstance(currentInstanceId);
      if (!ok) { alert('أكمل جميع الخطوات وأرفق الصور الإجبارية أولاً'); return; }
      const t = document.getElementById('toast');
      if (t) { t.textContent = 'تم تسليم الشك ليست ✓'; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1700); }
      render();
      refresh();
    });
  }

  function refresh() {
    if (typeof window.refreshTasks === 'function') window.refreshTasks();
    if (typeof window.refreshChecklists === 'function') window.refreshChecklists();
  }

  function open(instanceId, opts) {
    if (!window.APP_DATA) return;
    if (!mounted) buildShell();
    currentInstanceId = instanceId;
    readOnly = !!(opts && opts.readOnly);
    attachTargetIdx = -1;
    render();
    document.getElementById('cliOverlay').classList.add('open');
    document.body.classList.add('modal-open');
  }

  function close() {
    document.getElementById('cliOverlay')?.classList.remove('open');
    document.body.classList.remove('modal-open');
    currentInstanceId = null;
    readOnly = false;
  }

  return { open, close };
})();
