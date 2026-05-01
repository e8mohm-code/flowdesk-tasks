/* =====================================================================
   Task Modal — popup task creation, replaces task-new.html navigation.
   Usage: TaskModal.open()
   Loaded after data.js + layout.js on any page that needs it.
   ===================================================================== */

window.TaskModal = (function () {

  const WEEKDAYS = [
    { v: 0, label: 'الأحد' },
    { v: 1, label: 'الإثنين' },
    { v: 2, label: 'الثلاثاء' },
    { v: 3, label: 'الأربعاء' },
    { v: 4, label: 'الخميس' },
    { v: 5, label: 'الجمعة' },
    { v: 6, label: 'السبت' },
  ];

  let mounted = false;
  let state = null;
  let pendingBrandLogo = null;  // persists across renderBrands re-renders

  function defaultState(D) {
    const due7 = new Date(D.TODAY); due7.setDate(due7.getDate() + 7);
    const tags = D.getAllTags();
    const firstTag = tags[0] || { key: 'dev', label: 'تطوير' };
    return {
      title: '',
      desc: '',
      assignees: [],          // array — first one becomes primary on save
      watchers: [],
      brandKeys: [],          // brand label keys
      due: due7.toISOString().slice(0,10),
      priority: 'low',
      tag: firstTag.label,
      tagKey: firstTag.key,
      xp: 25,
      starred: false,
      subtasks: [],
      attachments: [],
      recurring: {
        enabled: false,
        frequency: 'weekly',
        weekdays: [],
        dayOfMonth: 1,
        end: 'never',
        endCount: 10,
        endDate: '',
      },
      depends: { enabled: false, taskId: '', type: 'finish' },
    };
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function buildShell() {
    const overlay = document.createElement('div');
    overlay.className = 'task-modal-overlay';
    overlay.id = 'taskModalOverlay';
    overlay.innerHTML = `
      <div class="task-modal" role="dialog" aria-modal="true" aria-labelledby="tmTitle">
        <header class="tm-head">
          <h2 id="tmTitle">مهمة جديدة</h2>
          <button class="tm-close" type="button" aria-label="إغلاق">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </header>
        <form class="tm-body" id="tmForm" autocomplete="off">

          <div class="tm-field">
            <div class="tm-field-row">
              <label class="field-label" for="tmTitleInput">عنوان المهمة <span class="req">*</span></label>
              <button type="button" class="inline-toggle" id="tmSubBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 10l3 3 5-6"/></svg>
                <span class="ic-count" id="tmSubCount">0</span>
                مهام فرعية
              </button>
            </div>
            <input id="tmTitleInput" class="field-input lg" placeholder="مثال: تطوير صفحة لوحة التحكم..." required />
            <div class="inline-section" id="tmSubSection" hidden>
              <ul class="subtask-list" id="tmSubList"></ul>
              <div class="subtask-add">
                <input class="field-input" id="tmSubInput" placeholder="أضف خطوة فرعية..." />
                <button type="button" class="ghost-btn" id="tmSubAdd">إضافة</button>
              </div>
            </div>
          </div>

          <div class="tm-field">
            <div class="tm-field-row">
              <label class="field-label" for="tmDesc">الوصف</label>
              <button type="button" class="inline-toggle" id="tmAttBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 11-8.48-8.49l8.57-8.57A4 4 0 1118 8.84l-8.59 8.57a2 2 0 11-2.83-2.83l8.49-8.48"/></svg>
                <span class="ic-count" id="tmAttCount">0</span>
                مرفقات
              </button>
            </div>
            <textarea id="tmDesc" class="field-textarea" rows="2" placeholder="تفاصيل، روابط، متطلبات..."></textarea>
            <div class="inline-section" id="tmAttSection" hidden>
              <label class="upload-zone compact" id="tmUploadZone" tabindex="0">
                <input type="file" multiple id="tmFileInput" hidden />
                <span class="up-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </span>
                <h4>اسحب أو اضغط للاختيار</h4>
              </label>
              <div id="tmAttList" class="attach-list"></div>
            </div>
          </div>

          <div class="tm-grid-2">
            <div class="tm-field">
              <label class="field-label">المسند إليه</label>
              <div class="tm-assignee-strip" id="tmAssignee"></div>
            </div>

            <div class="tm-field">
              <label class="field-label">المتابعون <small class="muted">(CC)</small></label>
              <div class="watchers-row" id="tmWatchers"></div>
            </div>
          </div>

          <div class="tm-grid-2">
            <div class="tm-field">
              <label class="field-label" for="tmDue">تاريخ الانتهاء</label>
              <input type="date" id="tmDue" class="field-input" />
            </div>

            <div class="tm-field">
              <label class="field-label">الأولوية</label>
              <div class="prio-seg compact" id="tmPrio">
                <button type="button" data-prio="low"><i class="dot prio-low"></i><span>منخفضة</span></button>
                <button type="button" data-prio="medium"><i class="dot prio-mid"></i><span>متوسطة</span></button>
                <button type="button" data-prio="high"><i class="dot prio-high"></i><span>عالية</span></button>
              </div>
            </div>
          </div>

          <div class="tm-field xp-section">
            <div class="tm-field-row">
              <label class="field-label">مكافأة XP</label>
              <button type="button" class="inline-info" id="tmXpInfoBtn" aria-label="قواعد الحساب">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                قواعد الحساب
              </button>
            </div>
            <div class="xp-row-combined">
              <div class="xp-picker-row" id="tmXp">
                <button type="button" class="xp-pill xp-zero" data-xp="0">بدون</button>
                <button type="button" class="xp-pill" data-xp="10">+10</button>
                <button type="button" class="xp-pill" data-xp="25">+25</button>
                <button type="button" class="xp-pill" data-xp="50">+50</button>
                <button type="button" class="xp-pill" data-xp="100">+100</button>
              </div>
              <div class="xp-custom-wrap">
                <span class="xp-custom-or">أو مخصص:</span>
                <input type="number" id="tmXpCustom" class="xp-custom" placeholder="0" min="0" max="9999" />
                <span class="xp-custom-suffix">XP</span>
              </div>
            </div>
            <div class="xp-rules-line" id="tmXpRulesLine" hidden>
              <span class="r-chip plus"><b>+25%</b> مبكر</span>
              <span class="r-chip"><b>100%</b> في الوقت</span>
              <span class="r-chip half"><b>50%</b> متأخر</span>
              <span class="r-chip minus"><b>-10</b> تأخر مفتوح</span>
              <span class="r-chip minus"><b>-2/يوم</b> إضافي</span>
            </div>
          </div>

          <div class="tm-field">
            <label class="field-label">الفئة</label>
            <div class="tag-picker" id="tmTag"></div>
          </div>

          <div class="tm-field">
            <label class="field-label">العلامات / البراندات <small class="muted">(اختياري — اختر أكثر من واحد)</small></label>
            <div class="brand-picker" id="tmBrand"></div>
          </div>

          <!-- Recurring -->
          <div class="setting-block" id="tmRecBlock">
            <label class="setting-toggle">
              <input type="checkbox" id="tmRecEnabled" />
              <span class="setting-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                تتكرر تلقائياً
              </span>
              <span class="setting-summary" id="tmRecSummary"></span>
            </label>
            <div class="setting-content" id="tmRecBody" hidden>
              <div class="tm-field">
                <span class="mini-label">التكرار</span>
                <div class="seg-mini" id="tmRecFreq">
                  <button type="button" data-freq="daily">يومياً</button>
                  <button type="button" data-freq="weekly">أسبوعياً</button>
                  <button type="button" data-freq="monthly">شهرياً</button>
                </div>
              </div>
              <div class="tm-field" id="tmRecWeekly">
                <span class="mini-label">أيام التكرار</span>
                <div class="weekday-picker" id="tmRecDays"></div>
              </div>
              <div class="tm-field" id="tmRecMonthly" hidden>
                <span class="mini-label">يوم الشهر</span>
                <input type="number" id="tmRecMonthDay" class="field-input" min="1" max="31" />
              </div>
              <div class="tm-field">
                <span class="mini-label">ينتهي</span>
                <div class="seg-mini" id="tmRecEnd">
                  <button type="button" data-end="never">لا ينتهي</button>
                  <button type="button" data-end="count">بعد عدد</button>
                  <button type="button" data-end="date">في تاريخ</button>
                </div>
              </div>
              <div class="tm-field" id="tmRecEndCountWrap" hidden>
                <input type="number" id="tmRecEndCount" class="field-input" min="1" placeholder="عدد التكرارات" />
              </div>
              <div class="tm-field" id="tmRecEndDateWrap" hidden>
                <input type="date" id="tmRecEndDate" class="field-input" />
              </div>
            </div>
          </div>

          <!-- Depends -->
          <div class="setting-block" id="tmDepBlock">
            <label class="setting-toggle">
              <input type="checkbox" id="tmDepEnabled" />
              <span class="setting-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                تعتمد على مهمة أخرى
              </span>
              <span class="setting-summary" id="tmDepSummary"></span>
            </label>
            <div class="setting-content" id="tmDepBody" hidden>
              <div class="tm-field">
                <span class="mini-label">المهمة السابقة</span>
                <select id="tmDepSelect" class="field-input">
                  <option value="">اختر مهمة...</option>
                </select>
              </div>
              <div class="tm-field">
                <span class="mini-label">شرط الاعتماد</span>
                <div class="seg-mini" id="tmDepType">
                  <button type="button" data-type="finish">تنتهي السابقة أولاً</button>
                  <button type="button" data-type="start">تبدأ السابقة أولاً</button>
                </div>
              </div>
            </div>
          </div>

          <label class="check star-check tm-fav">
            <input type="checkbox" id="tmStar" />
            <span><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="12 2 15 8.5 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 9 8.5 12 2"/></svg> أضف للمفضلة</span>
          </label>
        </form>

        <footer class="tm-foot">
          <button class="ghost-btn" type="button" id="tmCancel">إلغاء</button>
          <button class="cta" type="button" id="tmSave">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l4 4L13 8"/></svg>
            حفظ المهمة
          </button>
        </footer>
      </div>
    `;
    document.body.appendChild(overlay);

    // Click outside to close
    overlay.addEventListener('click', e => {
      if (e.target === overlay) close();
    });
    overlay.querySelector('.tm-close').addEventListener('click', close);
    overlay.querySelector('#tmCancel').addEventListener('click', close);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) close();
    });
    overlay.querySelector('#tmSave').addEventListener('click', save);

    wireForm(overlay);
    mounted = true;
  }

  function wireForm(overlay) {
    const D = window.APP_DATA;
    const $ = sel => overlay.querySelector(sel);
    const $$ = sel => overlay.querySelectorAll(sel);

    /* ---------- ASSIGNEE STRIP — multi-select ---------- */
    function renderAssignee() {
      const el = $('#tmAssignee');
      const visible = D.getVisibleEmployees();
      const noneSel = !state.assignees.length;
      el.innerHTML = `
        <button type="button" class="ass-chip ${noneSel ? 'selected' : ''}" data-emp="" title="غير مسندة">
          <span class="ov-av sm" style="background:var(--surface-soft);display:grid;place-items:center;color:var(--ink-3)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0116 0v1"/></svg>
          </span>
          <span class="ass-name">غير مسندة</span>
        </button>
        ${visible.map(emp => {
          const sel = state.assignees.includes(emp.id);
          return `
            <button type="button" class="ass-chip ${sel ? 'selected' : ''}" data-emp="${emp.id}" style="--emp-color:${emp.color}" title="${esc(emp.name)}">
              <span class="ov-av sm"><img src="${D.avatarUrl(emp, 40)}" alt=""/></span>
              <span class="ass-name">${esc(emp.name.split(' ')[0])}</span>
              ${sel ? '<span class="ass-tick">✓</span>' : ''}
            </button>
          `;
        }).join('')}
      `;
      el.querySelectorAll('.ass-chip').forEach(b => {
        b.addEventListener('click', () => {
          const id = b.dataset.emp;
          if (!id) {
            state.assignees = []; // none
          } else {
            const i = state.assignees.indexOf(id);
            if (i >= 0) state.assignees.splice(i, 1);
            else state.assignees.push(id);
          }
          renderAssignee();
        });
      });
    }

    /* ---------- WATCHERS ---------- */
    function renderWatchers() {
      const row = $('#tmWatchers');
      const chips = state.watchers.map(id => {
        const e = D.findEmployee(id); if (!e) return '';
        return `
          <span class="watcher-chip" style="--emp-color:${e.color}">
            <span class="ov-av"><img src="${D.avatarUrl(e, 40)}" alt=""/></span>
            ${esc(e.name.split(' ')[0])}
            <button class="watcher-chip-x" type="button" data-rm="${e.id}" aria-label="إزالة">×</button>
          </span>
        `;
      }).join('');
      const visible = D.getVisibleEmployees();
      row.innerHTML = `
        ${chips}
        <button type="button" class="watcher-add" id="tmWatcherAdd" aria-label="إضافة متابع">+</button>
        <div class="watcher-dropdown" id="tmWatcherDropdown">
          ${visible.map(emp => {
            const added = state.watchers.includes(emp.id);
            return `
              <button type="button" class="watcher-dropdown-row ${added ? 'added' : ''}" data-add="${emp.id}" style="--emp-color:${emp.color}" ${added ? 'disabled' : ''}>
                <span class="ov-av"><img src="${D.avatarUrl(emp, 40)}" alt=""/></span>
                <span><b>${esc(emp.name)}</b><span class="muted">${esc(emp.role)}</span></span>
                <span class="added-mark">${added ? '✓' : ''}</span>
              </button>
            `;
          }).join('')}
        </div>
      `;
      const dropdown = $('#tmWatcherDropdown');
      $('#tmWatcherAdd').addEventListener('click', e => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
      });
      row.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', e => {
        e.stopPropagation();
        state.watchers = state.watchers.filter(id => id !== b.dataset.rm);
        renderWatchers();
      }));
      row.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', e => {
        e.stopPropagation();
        const id = b.dataset.add;
        if (!state.watchers.includes(id)) {
          state.watchers.push(id);
          renderWatchers();
          setTimeout(() => $('#tmWatcherDropdown')?.classList.add('open'), 0);
        }
      }));
    }
    overlay.addEventListener('click', e => {
      if (!e.target.closest('.watchers-row')) {
        $('#tmWatcherDropdown')?.classList.remove('open');
      }
    });

    /* ---------- TAGS (editable, deletable, custom-addable) ---------- */
    function renderTags() {
      const el = $('#tmTag');
      const tags = D.getAllTags();
      el.innerHTML = `
        ${tags.map(t => `
          <span class="tag-wrap">
            <button type="button" class="tag-pick ${state.tagKey === t.key ? 'selected' : ''}" data-key="${t.key}" data-label="${esc(t.label)}" style="--tag-color:${t.color}">
              <i class="tdot"></i>${esc(t.label)}
            </button>
            <button type="button" class="tag-del" data-del="${t.key}" aria-label="حذف الفئة" title="حذف">×</button>
          </span>
        `).join('')}
        <span class="tag-add-wrap">
          <button type="button" class="tag-add-btn" id="tmTagAddBtn">+ مخصص</button>
          <span class="tag-add-form" id="tmTagAddForm" hidden>
            <input class="tag-add-input" id="tmTagAddInput" placeholder="اسم الفئة..." maxlength="20" />
            <button type="button" class="tag-add-save" id="tmTagAddSave" aria-label="حفظ">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l5 5 13-13"/></svg>
            </button>
            <button type="button" class="tag-add-cancel" id="tmTagAddCancel" aria-label="إلغاء">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </span>
        </span>
      `;

      // Select tag
      el.querySelectorAll('.tag-pick').forEach(b => b.addEventListener('click', () => {
        state.tagKey = b.dataset.key;
        state.tag = b.dataset.label;
        renderTags();
      }));

      // Delete tag
      el.querySelectorAll('.tag-del').forEach(b => b.addEventListener('click', e => {
        e.stopPropagation();
        const key = b.dataset.del;
        const tag = D.findTag(key);
        if (!tag) return;
        if (!confirm(`حذف فئة "${tag.label}"؟`)) return;
        D.deleteTag(key);
        if (state.tagKey === key) {
          const tags = D.getAllTags();
          const fb = tags[0];
          state.tagKey = fb ? fb.key : '';
          state.tag = fb ? fb.label : '';
        }
        renderTags();
      }));

      // Add new tag
      const addBtn = $('#tmTagAddBtn');
      const addForm = $('#tmTagAddForm');
      const addInp = $('#tmTagAddInput');
      addBtn?.addEventListener('click', () => {
        addBtn.hidden = true;
        addForm.hidden = false;
        addInp.focus();
      });
      $('#tmTagAddCancel')?.addEventListener('click', () => {
        addInp.value = '';
        addBtn.hidden = false;
        addForm.hidden = true;
      });
      const saveAdd = () => {
        const label = (addInp.value || '').trim();
        if (!label) { addInp.focus(); return; }
        const t = D.addTag(label);
        if (t) { state.tagKey = t.key; state.tag = t.label; }
        renderTags();
      };
      $('#tmTagAddSave')?.addEventListener('click', saveAdd);
      addInp?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); saveAdd(); }
        if (e.key === 'Escape') { e.preventDefault(); $('#tmTagAddCancel').click(); }
      });
    }

    /* ---------- BRAND LABELS ---------- */
    function renderBrands() {
      const el = $('#tmBrand');
      const all = D.getAllBrands();
      el.innerHTML = `
        ${all.map(b => `
          <span class="brand-wrap">
            <button type="button" class="brand-pick ${state.brandKeys.includes(b.key) ? 'selected' : ''}" data-key="${b.key}" style="--brand-color:${b.color}">
              ${b.logoFile ? `<span class="brand-logo"><img src="${b.logoFile}" alt=""/></span>` : '<i class="bdot"></i>'}${esc(b.label)}
            </button>
            <button type="button" class="brand-del" data-del="${b.key}" aria-label="حذف" title="حذف">×</button>
          </span>
        `).join('')}
        <span class="brand-add-wrap">
          <button type="button" class="brand-add-btn" id="tmBrandAddBtn">+ علامة جديدة</button>
          <span class="brand-add-form" id="tmBrandAddForm" hidden>
            <span class="brand-logo-preview" id="tmBrandLogoPrev" title="ارفع شعار">
              <span class="brand-logo-empty">📷</span>
            </span>
            <input type="file" id="tmBrandLogoFile" accept="image/*" hidden/>
            <input class="brand-add-input" id="tmBrandAddInput" placeholder="اسم البراند..." maxlength="24"/>
            <input type="color" class="brand-add-color" id="tmBrandAddColor" value="#e25b62"/>
            <button type="button" class="brand-add-save" id="tmBrandAddSave" aria-label="حفظ">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l5 5 13-13"/></svg>
            </button>
            <button type="button" class="brand-add-cancel" id="tmBrandAddCancel" aria-label="إلغاء">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </span>
        </span>
      `;
      // toggle pick
      el.querySelectorAll('.brand-pick').forEach(b => b.addEventListener('click', () => {
        const k = b.dataset.key;
        const i = state.brandKeys.indexOf(k);
        if (i >= 0) state.brandKeys.splice(i, 1);
        else state.brandKeys.push(k);
        renderBrands();
      }));
      // delete brand
      el.querySelectorAll('.brand-del').forEach(b => b.addEventListener('click', e => {
        e.stopPropagation();
        const k = b.dataset.del;
        const br = D.findBrand(k);
        if (!br) return;
        if (!confirm(`حذف العلامة "${br.label}"؟ ستُزال من كل المهام.`)) return;
        D.deleteBrand(k);
        state.brandKeys = state.brandKeys.filter(x => x !== k);
        renderBrands();
      }));
      // add new
      const addBtn = $('#tmBrandAddBtn');
      const addForm = $('#tmBrandAddForm');
      const addInp = $('#tmBrandAddInput');
      const addColor = $('#tmBrandAddColor');
      const logoPrev = $('#tmBrandLogoPrev');
      const logoFile = $('#tmBrandLogoFile');

      // If a previously-uploaded logo exists (form re-render), restore preview
      if (pendingBrandLogo) {
        logoPrev.innerHTML = `<img src="${pendingBrandLogo}" alt=""/>`;
      }

      addBtn?.addEventListener('click', () => {
        addBtn.hidden = true;
        addForm.hidden = false;
        addInp.focus();
      });
      $('#tmBrandAddCancel')?.addEventListener('click', () => {
        addInp.value = '';
        pendingBrandLogo = null;
        logoPrev.innerHTML = '<span class="brand-logo-empty">📷</span>';
        addBtn.hidden = false;
        addForm.hidden = true;
      });

      logoPrev?.addEventListener('click', () => logoFile.click());
      logoFile?.addEventListener('change', e => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        if (!f.type.startsWith('image/')) { alert('يجب اختيار صورة'); return; }

        const reader = new FileReader();
        reader.onerror = () => alert('فشل قراءة الملف');
        reader.onload = ev => {
          const img = new Image();
          img.onerror = () => {
            // Fallback: store original data URL even if Image() can't decode
            pendingBrandLogo = ev.target.result;
            logoPrev.innerHTML = `<img src="${pendingBrandLogo}" alt=""/>`;
          };
          img.onload = () => {
            try {
              // Resize to max 96x96 for crisp small chip display
              const MAX = 96;
              let w = img.width, h = img.height;
              if (w > h) { if (w > MAX) { h = h * MAX / w; w = MAX; } }
              else      { if (h > MAX) { w = w * MAX / h; h = MAX; } }
              const canvas = document.createElement('canvas');
              canvas.width = w; canvas.height = h;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, w, h);
              pendingBrandLogo = canvas.toDataURL('image/png');
            } catch (err) {
              pendingBrandLogo = ev.target.result;
            }
            logoPrev.innerHTML = `<img src="${pendingBrandLogo}" alt=""/>`;
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(f);
        logoFile.value = '';
      });

      const saveAdd = () => {
        const label = (addInp.value || '').trim();
        if (!label) { addInp.focus(); return; }
        const b = D.addBrand(label, addColor.value, pendingBrandLogo);
        if (b) state.brandKeys.push(b.key);
        pendingBrandLogo = null;
        renderBrands();
      };
      $('#tmBrandAddSave')?.addEventListener('click', saveAdd);
      addInp?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); saveAdd(); }
        if (e.key === 'Escape') { e.preventDefault(); $('#tmBrandAddCancel').click(); }
      });
    }
    // Expose so the main save() can auto-commit pending brand
    overlay._commitPendingBrand = function () {
      const form = overlay.querySelector('#tmBrandAddForm');
      if (!form || form.hidden) return;
      const label = (overlay.querySelector('#tmBrandAddInput')?.value || '').trim();
      if (!label) return;
      const color = overlay.querySelector('#tmBrandAddColor')?.value || '#e25b62';
      const b = D.addBrand(label, color, pendingBrandLogo);
      if (b) state.brandKeys.push(b.key);
      pendingBrandLogo = null;
    };

    /* ---------- PRIORITY ---------- */
    function renderPrio() {
      $$('#tmPrio button').forEach(b => b.classList.toggle('active', b.dataset.prio === state.priority));
    }
    $('#tmPrio').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      state.priority = b.dataset.prio;
      // Auto-suggest XP
      state.xp = b.dataset.prio === 'high' ? 50 : b.dataset.prio === 'medium' ? 25 : 10;
      $('#tmXpCustom').value = '';
      renderPrio();
      renderXp();
    });

    /* ---------- XP ---------- */
    function renderXp() {
      const presets = [0, 10, 25, 50, 100];
      const isPreset = presets.includes(state.xp);
      $$('#tmXp .xp-pill').forEach(b => b.classList.toggle('active', isPreset && +b.dataset.xp === state.xp));
      if (!isPreset) {
        $('#tmXpCustom').value = state.xp;
      } else {
        $('#tmXpCustom').value = '';
      }
    }
    $('#tmXp').addEventListener('click', e => {
      const b = e.target.closest('.xp-pill'); if (!b) return;
      state.xp = +b.dataset.xp;
      $('#tmXpCustom').value = '';
      renderXp();
    });
    $('#tmXpCustom').addEventListener('input', e => {
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v) && v >= 0) {
        state.xp = v;
        $$('#tmXp .xp-pill').forEach(b => b.classList.remove('active'));
      }
    });

    /* ---------- SUBTASKS ---------- */
    function renderSubtasks() {
      const list = $('#tmSubList');
      $('#tmSubCount').textContent = state.subtasks.length;
      $('#tmSubBtn').classList.toggle('has-items', state.subtasks.length > 0);
      list.innerHTML = state.subtasks.map((s, i) => `
        <li class="subtask-item ${s.done ? 'done' : ''}">
          <label class="check"><input type="checkbox" data-i="${i}" ${s.done ? 'checked' : ''}/> <span>${esc(s.text)}</span></label>
          <button type="button" class="icon-x" data-rm="${i}" aria-label="حذف">×</button>
        </li>
      `).join('');
      list.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.addEventListener('change', e => {
        state.subtasks[+e.target.dataset.i].done = e.target.checked;
        renderSubtasks();
      }));
      list.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => {
        state.subtasks.splice(+b.dataset.rm, 1); renderSubtasks();
      }));
    }
    function addSubtask() {
      const inp = $('#tmSubInput');
      const v = (inp.value || '').trim();
      if (!v) return;
      state.subtasks.push({ text: v, done: false });
      inp.value = '';
      renderSubtasks();
    }
    $('#tmSubAdd').addEventListener('click', addSubtask);
    $('#tmSubInput').addEventListener('keypress', e => {
      if (e.key === 'Enter') { e.preventDefault(); addSubtask(); }
    });

    /* ---------- ATTACHMENTS ---------- */
    function fmtBytes(b) {
      if (b < 1024) return b + ' B';
      if (b < 1024*1024) return (b/1024).toFixed(1) + ' KB';
      return (b/1024/1024).toFixed(1) + ' MB';
    }
    function fileIcon(f) {
      const t = (f.type||'').toLowerCase();
      const ext = (f.name.split('.').pop()||'').toLowerCase();
      if (t.startsWith('image/')) return { icon: '🖼️', color: 'var(--violet)' };
      if (ext === 'pdf') return { icon: '📕', color: 'var(--red)' };
      if (['doc','docx'].includes(ext)) return { icon: '📘', color: 'var(--accent)' };
      if (['xls','xlsx','csv'].includes(ext)) return { icon: '📗', color: 'var(--green)' };
      return { icon: '📄', color: 'var(--ink-2)' };
    }
    function renderAtt() {
      $('#tmAttCount').textContent = state.attachments.length;
      $('#tmAttBtn').classList.toggle('has-items', state.attachments.length > 0);
      const list = $('#tmAttList');
      list.innerHTML = state.attachments.map((f, i) => {
        const { icon, color } = fileIcon(f);
        const isImg = (f.type||'').startsWith('image/');
        return `
          <div class="attach-row">
            ${isImg && f.preview
              ? `<span class="att-thumb"><img src="${f.preview}" alt=""/></span>`
              : `<span class="att-icon" style="background:${color}25;color:${color}"><span style="font-size:16px">${icon}</span></span>`}
            <div class="att-text">
              <b>${esc(f.name)}</b>
              <span class="muted">${fmtBytes(f.size)}</span>
            </div>
            <button type="button" class="icon-x" data-att="${i}" aria-label="حذف">×</button>
          </div>
        `;
      }).join('');
      list.querySelectorAll('[data-att]').forEach(b => b.addEventListener('click', () => {
        state.attachments.splice(+b.dataset.att, 1);
        renderAtt();
      }));
    }
    function handleFiles(files) {
      [...files].forEach(file => {
        const item = { name: file.name, size: file.size, type: file.type || '', preview: null };
        if ((file.type||'').startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = e => { item.preview = e.target.result; renderAtt(); };
          reader.readAsDataURL(file);
        }
        state.attachments.push(item);
      });
      renderAtt();
    }
    const uz = $('#tmUploadZone'), fi = $('#tmFileInput');
    fi.addEventListener('change', e => handleFiles(e.target.files));
    uz.addEventListener('click', () => fi.click());
    uz.addEventListener('dragover', e => { e.preventDefault(); uz.classList.add('drag-over'); });
    uz.addEventListener('dragleave', () => uz.classList.remove('drag-over'));
    uz.addEventListener('drop', e => {
      e.preventDefault(); uz.classList.remove('drag-over');
      handleFiles(e.dataTransfer.files);
    });

    /* ---------- BASIC INPUTS ---------- */
    $('#tmTitleInput').addEventListener('input', e => state.title = e.target.value);
    $('#tmDesc').addEventListener('input', e => state.desc = e.target.value);
    $('#tmDue').addEventListener('change', e => state.due = e.target.value);
    $('#tmStar').addEventListener('change', e => state.starred = e.target.checked);

    /* ---------- INLINE TOGGLES (subtasks / attachments / xp rules) ---------- */
    $('#tmSubBtn').addEventListener('click', () => {
      const sec = $('#tmSubSection');
      const btn = $('#tmSubBtn');
      sec.hidden = !sec.hidden;
      btn.classList.toggle('open', !sec.hidden);
      if (!sec.hidden) $('#tmSubInput').focus();
    });
    $('#tmAttBtn').addEventListener('click', () => {
      const sec = $('#tmAttSection');
      const btn = $('#tmAttBtn');
      sec.hidden = !sec.hidden;
      btn.classList.toggle('open', !sec.hidden);
    });
    $('#tmXpInfoBtn').addEventListener('click', () => {
      const line = $('#tmXpRulesLine');
      const btn = $('#tmXpInfoBtn');
      line.hidden = !line.hidden;
      btn.classList.toggle('open', !line.hidden);
    });

    /* ---------- RECURRING ---------- */
    function renderWeekdays() {
      const el = $('#tmRecDays');
      el.innerHTML = WEEKDAYS.map(d => `
        <button type="button" data-day="${d.v}" class="${state.recurring.weekdays.includes(d.v) ? 'active' : ''}">${d.label}</button>
      `).join('');
      el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        const v = +b.dataset.day;
        if (state.recurring.weekdays.includes(v)) {
          state.recurring.weekdays = state.recurring.weekdays.filter(x => x !== v);
        } else {
          state.recurring.weekdays.push(v);
          state.recurring.weekdays.sort((a,b) => a - b);
        }
        renderWeekdays();
        renderRecSummary();
      }));
    }
    function renderRecFreq() {
      $$('#tmRecFreq button').forEach(b => b.classList.toggle('active', b.dataset.freq === state.recurring.frequency));
      $('#tmRecWeekly').hidden = state.recurring.frequency !== 'weekly';
      $('#tmRecMonthly').hidden = state.recurring.frequency !== 'monthly';
    }
    function renderRecEnd() {
      $$('#tmRecEnd button').forEach(b => b.classList.toggle('active', b.dataset.end === state.recurring.end));
      $('#tmRecEndCountWrap').hidden = state.recurring.end !== 'count';
      $('#tmRecEndDateWrap').hidden = state.recurring.end !== 'date';
    }
    function renderRecSummary() {
      const r = state.recurring;
      const sum = $('#tmRecSummary');
      if (!r.enabled) { sum.textContent = ''; return; }
      let parts = [];
      if (r.frequency === 'daily') parts.push('يومياً');
      else if (r.frequency === 'weekly') {
        if (r.weekdays.length) {
          parts.push(r.weekdays.map(v => WEEKDAYS[v].label).join('،'));
        } else parts.push('بدون أيام');
      }
      else if (r.frequency === 'monthly') parts.push(`يوم ${r.dayOfMonth}`);
      if (r.end === 'count') parts.push(`${r.endCount} مرة`);
      if (r.end === 'date' && r.endDate) parts.push(`حتى ${r.endDate}`);
      sum.textContent = parts.join(' • ');
    }
    $('#tmRecEnabled').addEventListener('change', e => {
      state.recurring.enabled = e.target.checked;
      $('#tmRecBody').hidden = !e.target.checked;
      renderRecSummary();
    });
    $('#tmRecFreq').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      state.recurring.frequency = b.dataset.freq;
      renderRecFreq();
      renderRecSummary();
    });
    $('#tmRecMonthDay').addEventListener('input', e => {
      state.recurring.dayOfMonth = +e.target.value || 1;
      renderRecSummary();
    });
    $('#tmRecEnd').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      state.recurring.end = b.dataset.end;
      renderRecEnd();
      renderRecSummary();
    });
    $('#tmRecEndCount').addEventListener('input', e => {
      state.recurring.endCount = +e.target.value || 1;
      renderRecSummary();
    });
    $('#tmRecEndDate').addEventListener('change', e => {
      state.recurring.endDate = e.target.value;
      renderRecSummary();
    });

    /* ---------- DEPENDS ---------- */
    function populateDepSel() {
      const sel = $('#tmDepSelect');
      const open = D.tasks.filter(t => !t.done);
      sel.innerHTML = `<option value="">اختر مهمة...</option>` +
        open.map(t => `<option value="${t.id}">${esc(t.title)}</option>`).join('');
      sel.value = state.depends.taskId || '';
    }
    function renderDepType() {
      $$('#tmDepType button').forEach(b => b.classList.toggle('active', b.dataset.type === state.depends.type));
    }
    function renderDepSummary() {
      const d = state.depends;
      const sum = $('#tmDepSummary');
      if (!d.enabled || !d.taskId) { sum.textContent = ''; return; }
      const t = D.tasks.find(x => x.id === d.taskId);
      if (!t) return;
      const cond = d.type === 'finish' ? 'بعد إنجاز' : 'بعد بدء';
      sum.textContent = `${cond}: ${t.title.slice(0, 24)}${t.title.length > 24 ? '…' : ''}`;
    }
    $('#tmDepEnabled').addEventListener('change', e => {
      state.depends.enabled = e.target.checked;
      $('#tmDepBody').hidden = !e.target.checked;
      renderDepSummary();
    });
    $('#tmDepSelect').addEventListener('change', e => {
      state.depends.taskId = e.target.value;
      renderDepSummary();
    });
    $('#tmDepType').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      state.depends.type = b.dataset.type;
      renderDepType();
      renderDepSummary();
    });

    /* ---------- INITIAL FORM RENDER ---------- */
    overlay._refresh = function () {
      $('#tmTitleInput').value = state.title;
      $('#tmDesc').value = state.desc;
      $('#tmDue').value = state.due;
      $('#tmStar').checked = state.starred;
      $('#tmRecEnabled').checked = state.recurring.enabled;
      $('#tmRecBody').hidden = !state.recurring.enabled;
      $('#tmRecMonthDay').value = state.recurring.dayOfMonth;
      $('#tmRecEndCount').value = state.recurring.endCount;
      $('#tmRecEndDate').value = state.recurring.endDate;
      $('#tmDepEnabled').checked = state.depends.enabled;
      $('#tmDepBody').hidden = !state.depends.enabled;
      $('#tmXpCustom').value = '';

      renderAssignee();
      renderWatchers();
      renderTags();
      renderBrands();
      renderPrio();
      renderXp();
      renderSubtasks();
      renderAtt();
      renderRecFreq();
      renderWeekdays();
      renderRecEnd();
      renderRecSummary();
      populateDepSel();
      renderDepType();
      renderDepSummary();
    };
  }

  /* ---------- SAVE / OPEN / CLOSE ---------- */
  function save() {
    const D = window.APP_DATA;
    const overlay = document.getElementById('taskModalOverlay');
    // Auto-commit any pending in-progress brand the user typed but didn't click ✓ on
    if (typeof overlay._commitPendingBrand === 'function') overlay._commitPendingBrand();
    const title = (state.title || '').trim();
    if (!title) {
      const inp = overlay.querySelector('#tmTitleInput');
      inp.focus();
      const t = document.getElementById('toast');
      if (t) { t.textContent = 'عنوان المهمة مطلوب'; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 1500); }
      return;
    }

    const primary = state.assignees[0] || null;
    const coAss = state.assignees.slice(1);

    const newTask = {
      id: 't-' + Date.now(),
      title,
      desc: state.desc || '',
      assignee: primary,
      coAssignees: coAss,
      watchers: state.watchers.slice(),
      brandKeys: state.brandKeys.slice(),
      due: state.due,
      tag: state.tag,
      tagKey: state.tagKey,
      priority: state.priority,
      done: false,
      starred: state.starred,
      subtasks: state.subtasks.slice(),
      attachments: state.attachments.map(a => ({ name: a.name, size: a.size, type: a.type })),
      xp: state.xp,
      recurring: state.recurring.enabled ? JSON.parse(JSON.stringify(state.recurring)) : null,
      depends: state.depends.enabled && state.depends.taskId ? JSON.parse(JSON.stringify(state.depends)) : null,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    D.addTask(newTask);
    const t = document.getElementById('toast');
    if (t) { t.textContent = 'تمت إضافة المهمة بنجاح'; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 1500); }
    close();
    // Trigger re-render on the host page
    if (typeof window.refreshTasks === 'function') window.refreshTasks();
    else setTimeout(() => location.reload(), 600);
  }

  function open() {
    if (!window.APP_DATA) { console.warn('TaskModal needs APP_DATA'); return; }
    if (!mounted) buildShell();
    state = defaultState(window.APP_DATA);
    pendingBrandLogo = null;
    const overlay = document.getElementById('taskModalOverlay');
    overlay._refresh();
    overlay.classList.add('open');
    document.body.classList.add('modal-open');
    setTimeout(() => overlay.querySelector('#tmTitleInput').focus(), 100);
  }

  function close() {
    const overlay = document.getElementById('taskModalOverlay');
    if (overlay) overlay.classList.remove('open');
    document.body.classList.remove('modal-open');
  }

  return { open, close };
})();
