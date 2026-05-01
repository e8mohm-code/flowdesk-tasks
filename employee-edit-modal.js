/* =====================================================================
   Employee edit/create modal — manager only.
   Usage: EmployeeEditModal.open()       -> create new
          EmployeeEditModal.open(empId)  -> edit existing
   ===================================================================== */

window.EmployeeEditModal = (function () {

  let mounted = false;
  let editingId = null;

  const COLOR_PALETTE = [
    '#4f7af0','#7c5cf0','#2bb673','#f0a042','#ee6f9c','#36b3d4',
    '#ff7e3a','#94a3b8','#e25b62','#a78bfa','#14b8a6','#f43f5e',
    '#06b6d4','#8b5cf6','#84cc16','#0ea5e9'
  ];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function buildShell() {
    const overlay = document.createElement('div');
    overlay.className = 'task-modal-overlay'; // reuse base style
    overlay.id = 'eeOverlay';
    overlay.innerHTML = `<div class="task-modal" id="eeModal" role="dialog" aria-modal="true"></div>`;
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
    const e = isEdit ? D.findEmployee(editingId) : null;
    const form = isEdit ? { ...e } : {
      name: '', role: '', email: '', phone: '',
      loginId: '', password: '',
      avatar: 1, color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
      level: 'Mid', joined: new Date().toISOString().slice(0,10),
      department: 'engineering', permRole: 'employee', active: true,
    };

    const modal = document.getElementById('eeModal');
    modal.innerHTML = `
      <header class="tm-head">
        <h2>${isEdit ? 'تعديل موظف' : 'إضافة موظف جديد'}</h2>
        <button class="tm-close" type="button" aria-label="إغلاق">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </header>

      <form class="tm-body" id="eeForm" autocomplete="off">

        <!-- Avatar + Color -->
        <div class="tm-field">
          <label class="field-label">المظهر</label>
          <div class="ee-look-row">
            <div class="ee-avatar-preview" style="--emp-color:${form.color}">
              <img id="eePreviewImg" src="https://i.pravatar.cc/120?img=${form.avatar}" alt=""/>
            </div>
            <div class="ee-look-controls">
              <div class="ee-look-line">
                <span class="mini-label">رقم الصورة</span>
                <div class="ee-avatar-picker">
                  <button type="button" class="ee-avatar-btn" id="eeAvatarPrev" aria-label="السابق">‹</button>
                  <input type="number" id="eeAvatar" class="field-input" min="1" max="70" value="${form.avatar}" />
                  <button type="button" class="ee-avatar-btn" id="eeAvatarNext" aria-label="التالي">›</button>
                </div>
              </div>
              <div class="ee-look-line">
                <span class="mini-label">اللون</span>
                <div class="ee-color-grid" id="eeColorGrid">
                  ${COLOR_PALETTE.map(c => `
                    <button type="button" class="ee-color ${c === form.color ? 'selected' : ''}" data-color="${c}" style="background:${c}" aria-label="${c}"></button>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Identity -->
        <div class="tm-grid-2">
          <div class="tm-field">
            <label class="field-label" for="eeName">الاسم الكامل <span class="req">*</span></label>
            <input id="eeName" class="field-input lg" required value="${esc(form.name)}" placeholder="مثلاً: عبدالله الفهد"/>
          </div>
          <div class="tm-field">
            <label class="field-label" for="eeRole">المسمى الوظيفي</label>
            <input id="eeRole" class="field-input" value="${esc(form.role)}" placeholder="مثلاً: مهندس برمجيات"/>
          </div>
        </div>

        <!-- Contact -->
        <div class="tm-grid-2">
          <div class="tm-field">
            <label class="field-label" for="eeEmail">البريد الإلكتروني</label>
            <input id="eeEmail" type="email" class="field-input" value="${esc(form.email)}" placeholder="name@flowdesk.io"/>
          </div>
          <div class="tm-field">
            <label class="field-label" for="eePhone">رقم الجوال (للواتساب) <span class="req">*</span></label>
            <input id="eePhone" type="tel" class="field-input" value="${esc(form.phone || '')}" placeholder="+966501234567" required dir="ltr"/>
            <span class="field-hint">يُستخدم لإرسال تنبيهات الواتساب لاحقاً</span>
          </div>
        </div>

        <!-- Credentials -->
        <div class="tm-field">
          <label class="field-label">بيانات الدخول</label>
          <div class="tm-grid-2">
            <div>
              <span class="mini-label">رقم المستخدم <span class="req">*</span></span>
              <input id="eeLoginId" class="field-input" required inputmode="numeric" pattern="[0-9]+" value="${esc(form.loginId)}" placeholder="مثلاً: 200001"/>
            </div>
            <div>
              <span class="mini-label">كلمة المرور <span class="req">*</span></span>
              <input id="eePassword" type="text" class="field-input" required value="${esc(form.password)}" placeholder="مثلاً: 1234"/>
            </div>
          </div>
          <span class="field-hint">يستخدمها الموظف لتسجيل الدخول. يجب أن يكون رقم المستخدم فريداً.</span>
        </div>

        <!-- Role + Department -->
        <div class="tm-grid-2">
          <div class="tm-field">
            <label class="field-label">الصلاحية</label>
            <div class="seg-mini" id="eePermRole">
              <button type="button" data-val="manager"    class="${form.permRole === 'manager' ? 'active' : ''}">👑 مدير</button>
              <button type="button" data-val="supervisor" class="${form.permRole === 'supervisor' ? 'active' : ''}">🛡️ مشرف</button>
              <button type="button" data-val="employee"   class="${form.permRole === 'employee' ? 'active' : ''}">👤 موظف</button>
            </div>
          </div>
          <div class="tm-field">
            <label class="field-label" for="eeDepartment">القسم</label>
            <select id="eeDepartment" class="field-input">
              ${D.DEPARTMENTS.map(d => `
                <option value="${d.key}" ${form.department === d.key ? 'selected' : ''}>${esc(d.label)}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Level + Joined date -->
        <div class="tm-grid-2">
          <div class="tm-field">
            <label class="field-label">المستوى</label>
            <div class="seg-mini" id="eeLevel">
              <button type="button" data-val="Jr."  class="${form.level === 'Jr.'  ? 'active' : ''}">Jr.</button>
              <button type="button" data-val="Mid"  class="${form.level === 'Mid'  ? 'active' : ''}">Mid</button>
              <button type="button" data-val="Sr."  class="${form.level === 'Sr.'  ? 'active' : ''}">Sr.</button>
            </div>
          </div>
          <div class="tm-field">
            <label class="field-label" for="eeJoined">تاريخ الانضمام</label>
            <input id="eeJoined" type="date" class="field-input" value="${esc(form.joined)}"/>
          </div>
        </div>

        <!-- Active toggle -->
        <div class="setting-block">
          <label class="setting-toggle">
            <input type="checkbox" id="eeActive" ${form.active !== false ? 'checked' : ''}/>
            <span class="setting-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
              الحساب مُفعّل
            </span>
            <span class="setting-summary" id="eeActiveSummary">${form.active !== false ? '✓ يستطيع تسجيل الدخول' : '✗ معطّل — لا يستطيع الدخول'}</span>
          </label>
        </div>

        <div class="ee-error" id="eeError" hidden></div>
      </form>

      <footer class="tm-foot">
        ${isEdit ? `
          <button type="button" class="td-btn ghost" id="eeDeleteBtn">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1.5 14a2 2 0 01-2 2H8.5a2 2 0 01-2-2L5 6"/></svg>
            حذف
          </button>
        ` : '<button type="button" class="ghost-btn" id="eeCancelBtn">إلغاء</button>'}
        <button type="button" class="cta" id="eeSaveBtn">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l5 5 13-13"/></svg>
          ${isEdit ? 'حفظ التعديلات' : 'إضافة الموظف'}
        </button>
      </footer>
    `;

    wireForm();
  }

  function wireForm() {
    const D = window.APP_DATA;
    const $ = sel => document.getElementById('eeModal').querySelector(sel);
    const $$ = sel => document.getElementById('eeModal').querySelectorAll(sel);

    // Avatar preview live update
    function refreshPreview() {
      const num = $('#eeAvatar').value;
      const color = document.querySelector('.ee-avatar-preview').style.getPropertyValue('--emp-color');
      $('#eePreviewImg').src = `https://i.pravatar.cc/120?img=${num}`;
    }
    $('#eeAvatar').addEventListener('input', refreshPreview);
    $('#eeAvatarPrev').addEventListener('click', () => {
      const inp = $('#eeAvatar');
      inp.value = Math.max(1, (parseInt(inp.value, 10) || 1) - 1);
      refreshPreview();
    });
    $('#eeAvatarNext').addEventListener('click', () => {
      const inp = $('#eeAvatar');
      inp.value = Math.min(70, (parseInt(inp.value, 10) || 1) + 1);
      refreshPreview();
    });

    // Color picker
    $$('.ee-color').forEach(b => b.addEventListener('click', () => {
      $$('.ee-color').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      document.querySelector('.ee-avatar-preview').style.setProperty('--emp-color', b.dataset.color);
    }));

    // Segments
    function wireSeg(sel) {
      const seg = $(sel);
      seg.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        seg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
      });
    }
    wireSeg('#eePermRole');
    wireSeg('#eeLevel');

    // Active summary
    $('#eeActive').addEventListener('change', e => {
      $('#eeActiveSummary').textContent = e.target.checked ? '✓ يستطيع تسجيل الدخول' : '✗ معطّل — لا يستطيع الدخول';
    });

    // Close
    document.querySelector('#eeOverlay .tm-close').addEventListener('click', close);
    $('#eeCancelBtn')?.addEventListener('click', close);

    // Save
    $('#eeSaveBtn').addEventListener('click', save);

    // Delete
    $('#eeDeleteBtn')?.addEventListener('click', () => {
      const e = D.findEmployee(editingId);
      if (!e) return;
      if (!confirm(`حذف الموظف "${e.name}" نهائياً؟ مهامه ستُلغى الإسناد عنها.`)) return;
      D.deleteEmployee(editingId);
      close();
      refresh();
    });
  }

  function save() {
    const D = window.APP_DATA;
    const $ = sel => document.getElementById('eeModal').querySelector(sel);

    const name     = $('#eeName').value.trim();
    const loginId  = $('#eeLoginId').value.trim();
    const password = $('#eePassword').value.trim();
    const phone    = $('#eePhone').value.trim();
    const errEl    = $('#eeError');

    function err(msg) {
      errEl.textContent = msg;
      errEl.hidden = false;
    }

    if (!name)     return err('الاسم مطلوب');
    if (!loginId)  return err('رقم المستخدم مطلوب');
    if (!/^\d+$/.test(loginId)) return err('رقم المستخدم يجب أن يحتوي أرقاماً فقط');
    if (!password) return err('كلمة المرور مطلوبة');
    if (!phone)    return err('رقم الجوال مطلوب (يُستخدم لتنبيهات الواتساب)');
    if (D.loginIdExists(loginId, editingId)) return err('رقم المستخدم مستخدم بالفعل');

    const payload = {
      name,
      loginId,
      password,
      phone,
      role:       $('#eeRole').value.trim(),
      email:      $('#eeEmail').value.trim(),
      avatar:     parseInt($('#eeAvatar').value, 10) || 1,
      color:      document.querySelector('.ee-avatar-preview').style.getPropertyValue('--emp-color'),
      level:      document.querySelector('#eeLevel button.active')?.dataset.val || 'Mid',
      joined:     $('#eeJoined').value || new Date().toISOString().slice(0,10),
      department: $('#eeDepartment').value,
      permRole:   document.querySelector('#eePermRole button.active')?.dataset.val || 'employee',
      active:     $('#eeActive').checked,
    };

    if (editingId) D.updateEmployee(editingId, payload);
    else D.addEmployee(payload);

    close();
    refresh();
  }

  function refresh() {
    if (typeof window.refreshTeam === 'function') window.refreshTeam();
    else location.reload();
  }

  function open(empId) {
    if (!window.APP_DATA) return;
    if (!mounted) buildShell();
    editingId = empId || null;
    render();
    document.getElementById('eeOverlay').classList.add('open');
    document.body.classList.add('modal-open');
  }

  function close() {
    document.getElementById('eeOverlay')?.classList.remove('open');
    document.body.classList.remove('modal-open');
    editingId = null;
  }

  return { open, close };
})();
