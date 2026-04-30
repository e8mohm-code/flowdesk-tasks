/* =====================================================================
   Task creation page — full form with watchers, XP, recurring, deps.
   ===================================================================== */

LAYOUT.render('tasks');

(function () {
  const D = window.APP_DATA;
  if (!D) return;

  const { employees, escapeHtml, AR_MONTHS } = D;

  /* ---------- TAG OPTIONS ---------- */
  const TAGS = [
    { key: 'dev',      label: 'تطوير' },
    { key: 'design',   label: 'تصميم' },
    { key: 'plan',     label: 'تخطيط' },
    { key: 'qa',       label: 'جودة' },
    { key: 'mkt',      label: 'تسويق' },
    { key: 'review',   label: 'مراجعة' },
    { key: 'infra',    label: 'بنية' },
    { key: 'analysis', label: 'تحليل' },
    { key: 'content',  label: 'محتوى' },
  ];

  const WEEKDAY_NAMES = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

  /* ---------- STATE ---------- */
  const state = {
    title: '',
    desc: '',
    assignee: null,
    watchers: [],          // array of employee ids
    due: '',
    priority: 'low',
    tag: 'تطوير',
    tagKey: 'dev',
    starred: false,
    subtasks: [],
    attachments: [],
    progress: 0,
    xp: 25,
    recurring: {
      enabled: false,
      frequency: 'weekly',     // daily | weekly | monthly
      weekdays: [2],            // for weekly
      dayOfMonth: 1,            // for monthly
      end: 'never',             // never | count | date
      endCount: 10,
      endDate: '',
    },
    depends: {
      enabled: false,
      taskId: '',
      type: 'finish',           // finish | start
    },
  };

  /* ---------- TOAST ---------- */
  function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 1800);
  }

  /* ---------- ASSIGNEE PICKER ---------- */
  function renderAssignees() {
    const el = document.getElementById('assigneePicker');
    el.innerHTML = `
      <button type="button" class="assignee-row ${state.assignee === null ? 'selected' : ''}" data-emp="">
        <span class="ov-av sm" style="background:var(--surface-soft);display:grid;place-items:center;color:var(--ink-3)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0116 0v1"/></svg>
        </span>
        <span class="ai-text"><b>غير مسندة</b><span class="ai-sub">في قائمة الانتظار</span></span>
        <span class="check-mark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l5 5 13-13"/></svg></span>
      </button>
      ${employees.map(emp => `
        <button type="button" class="assignee-row ${state.assignee === emp.id ? 'selected' : ''}" data-emp="${emp.id}" style="--emp-color:${emp.color}">
          <span class="ov-av sm"><img src="https://i.pravatar.cc/40?img=${emp.avatar}" alt=""/></span>
          <span class="ai-text"><b>${escapeHtml(emp.name)}</b><span class="ai-sub">${escapeHtml(emp.role)}</span></span>
          <span class="check-mark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l5 5 13-13"/></svg></span>
        </button>
      `).join('')}
    `;
    el.querySelectorAll('.assignee-row').forEach(row => {
      row.addEventListener('click', () => {
        state.assignee = row.dataset.emp || null;
        renderAssignees();
      });
    });
  }

  /* ---------- WATCHERS (CC) ---------- */
  function renderWatchers() {
    const row = document.getElementById('watchersRow');
    if (!row) return;

    const chips = state.watchers.map(id => {
      const e = D.findEmployee(id);
      if (!e) return '';
      return `
        <span class="watcher-chip" style="--emp-color:${e.color}">
          <span class="ov-av"><img src="https://i.pravatar.cc/40?img=${e.avatar}" alt=""/></span>
          ${escapeHtml(e.name.split(' ')[0])}
          <button class="watcher-chip-x" type="button" data-rm="${e.id}" aria-label="إزالة">×</button>
        </span>
      `;
    }).join('');

    row.innerHTML = `
      ${chips}
      <button type="button" class="watcher-add" id="watcherAddBtn" aria-label="إضافة متابع">+</button>
      <div class="watcher-dropdown" id="watcherDropdown">
        ${employees.map(emp => {
          const added = state.watchers.includes(emp.id);
          return `
            <button type="button" class="watcher-dropdown-row ${added ? 'added' : ''}" data-add="${emp.id}" style="--emp-color:${emp.color}" ${added ? 'disabled' : ''}>
              <span class="ov-av"><img src="https://i.pravatar.cc/40?img=${emp.avatar}" alt=""/></span>
              <span><b>${escapeHtml(emp.name)}</b><span class="muted">${escapeHtml(emp.role)}</span></span>
              <span class="added-mark">${added ? '✓' : ''}</span>
            </button>
          `;
        }).join('')}
      </div>
    `;

    // Close other dropdowns when opening
    const dropdown = document.getElementById('watcherDropdown');
    document.getElementById('watcherAddBtn').addEventListener('click', e => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    row.querySelectorAll('[data-rm]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        state.watchers = state.watchers.filter(id => id !== btn.dataset.rm);
        renderWatchers();
      });
    });
    row.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.add;
        if (!state.watchers.includes(id)) {
          state.watchers.push(id);
          renderWatchers();
          // Re-open dropdown for further adds
          setTimeout(() => document.getElementById('watcherDropdown')?.classList.add('open'), 0);
        }
      });
    });
  }
  // Close dropdown when clicking elsewhere
  document.addEventListener('click', () => {
    document.getElementById('watcherDropdown')?.classList.remove('open');
  });

  /* ---------- TAG PICKER ---------- */
  function renderTags() {
    const el = document.getElementById('tagPicker');
    el.innerHTML = TAGS.map(t => `
      <button type="button" class="tag-pick tag-${t.key} ${state.tagKey === t.key ? 'selected' : ''}" data-key="${t.key}" data-label="${t.label}">
        <i class="tdot"></i>
        ${t.label}
      </button>
    `).join('');
    el.querySelectorAll('.tag-pick').forEach(b => {
      b.addEventListener('click', () => {
        state.tagKey = b.dataset.key;
        state.tag = b.dataset.label;
        renderTags();
      });
    });
  }

  /* ---------- XP PICKER ---------- */
  function renderXp() {
    document.querySelectorAll('#xpPicker .xp-pill').forEach(b => {
      b.classList.toggle('active', +b.dataset.xp === state.xp);
    });
  }
  document.getElementById('xpPicker').addEventListener('click', e => {
    const btn = e.target.closest('.xp-pill');
    if (!btn) return;
    state.xp = +btn.dataset.xp;
    renderXp();
  });

  /* ---------- PRIORITY SEG ---------- */
  function renderPrio() {
    document.getElementById('prioSeg').querySelectorAll('button').forEach(b => {
      b.classList.toggle('active', b.dataset.prio === state.priority);
    });
  }
  document.getElementById('prioSeg').addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    state.priority = btn.dataset.prio;
    // suggest XP based on priority
    const suggest = btn.dataset.prio === 'high' ? 50 : btn.dataset.prio === 'medium' ? 25 : 10;
    state.xp = suggest;
    renderXp();
    renderPrio();
  });

  /* ---------- SUBTASKS ---------- */
  function renderSubtasks() {
    const list = document.getElementById('subtaskList');
    const done = state.subtasks.filter(s => s.done).length;
    document.getElementById('subtaskCount').textContent = `${done} / ${state.subtasks.length}`;
    list.innerHTML = state.subtasks.map((s, i) => `
      <li class="subtask-item ${s.done ? 'done' : ''}">
        <label class="check"><input type="checkbox" data-i="${i}" ${s.done ? 'checked' : ''} /> <span>${escapeHtml(s.text)}</span></label>
        <button type="button" class="icon-x" data-rm="${i}" aria-label="حذف">×</button>
      </li>
    `).join('');
    list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', e => {
        const i = +e.target.dataset.i;
        state.subtasks[i].done = e.target.checked;
        renderSubtasks();
      });
    });
    list.querySelectorAll('[data-rm]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.subtasks.splice(+btn.dataset.rm, 1);
        renderSubtasks();
      });
    });
  }
  function addSubtask() {
    const input = document.getElementById('subtaskInput');
    const text = (input.value || '').trim();
    if (!text) return;
    state.subtasks.push({ text, done: false });
    input.value = '';
    renderSubtasks();
  }
  document.getElementById('addSubtask').addEventListener('click', addSubtask);
  document.getElementById('subtaskInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') { e.preventDefault(); addSubtask(); }
  });

  /* ---------- ATTACHMENTS ---------- */
  function fmtBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1024 / 1024).toFixed(1) + ' MB';
  }
  function fileIcon(file) {
    const t = (file.type || '').toLowerCase();
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (t.startsWith('image/')) return { icon: '🖼️', color: 'var(--violet)' };
    if (t.startsWith('video/')) return { icon: '🎬', color: 'var(--pink)' };
    if (t.startsWith('audio/')) return { icon: '🎵', color: 'var(--cyan)' };
    if (ext === 'pdf')          return { icon: '📕', color: 'var(--red)' };
    if (['doc','docx'].includes(ext)) return { icon: '📘', color: 'var(--accent)' };
    if (['xls','xlsx','csv'].includes(ext)) return { icon: '📗', color: 'var(--green)' };
    if (['ppt','pptx','key'].includes(ext)) return { icon: '📙', color: 'var(--amber)' };
    if (['zip','rar','7z','tar'].includes(ext)) return { icon: '🗜️', color: 'var(--ink-3)' };
    return { icon: '📄', color: 'var(--ink-2)' };
  }
  function renderAttachments() {
    document.getElementById('attCount').textContent =
      state.attachments.length ? `${state.attachments.length} ملف` : 'لا ملفات';
    const list = document.getElementById('attachList');
    list.innerHTML = state.attachments.map((f, i) => {
      const { icon, color } = fileIcon(f);
      const isImage = (f.type || '').startsWith('image/');
      return `
        <div class="attach-row">
          ${isImage && f.preview
            ? `<span class="att-thumb"><img src="${f.preview}" alt=""/></span>`
            : `<span class="att-icon" style="background:${color}25;color:${color}"><span style="font-size:18px">${icon}</span></span>`}
          <div class="att-text">
            <b>${escapeHtml(f.name)}</b>
            <span class="muted">${fmtBytes(f.size)} • ${escapeHtml(f.type || 'ملف')}</span>
          </div>
          <button type="button" class="icon-x" data-att="${i}" aria-label="حذف">×</button>
        </div>
      `;
    }).join('');
    list.querySelectorAll('[data-att]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.attachments.splice(+btn.dataset.att, 1);
        renderAttachments();
      });
    });
  }
  function handleFiles(files) {
    [...files].forEach(file => {
      const item = { name: file.name, size: file.size, type: file.type || '', preview: null };
      if ((file.type || '').startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => { item.preview = e.target.result; renderAttachments(); };
        reader.readAsDataURL(file);
      }
      state.attachments.push(item);
    });
    renderAttachments();
  }
  const uz = document.getElementById('uploadZone');
  const fi = document.getElementById('fileInput');
  fi.addEventListener('change', e => handleFiles(e.target.files));
  uz.addEventListener('click', () => fi.click());
  uz.addEventListener('keypress', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); }});
  uz.addEventListener('dragover', e => { e.preventDefault(); uz.classList.add('drag-over'); });
  uz.addEventListener('dragleave', () => uz.classList.remove('drag-over'));
  uz.addEventListener('drop', e => {
    e.preventDefault();
    uz.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });

  /* ---------- QUICK DATES ---------- */
  document.querySelectorAll('[data-quick]').forEach(b => {
    b.addEventListener('click', () => {
      const d = new Date(D.TODAY);
      d.setDate(d.getDate() + parseInt(b.dataset.quick, 10));
      const iso = d.toISOString().slice(0, 10);
      document.getElementById('taskDue').value = iso;
      state.due = iso;
    });
  });

  /* ---------- CHAR COUNT ---------- */
  const desc = document.getElementById('taskDesc');
  desc.addEventListener('input', () => {
    document.getElementById('charCount').textContent = `${desc.value.length} حرف`;
  });

  /* ---------- BASIC INPUT BINDINGS ---------- */
  document.getElementById('taskTitle').addEventListener('input', e => state.title = e.target.value);
  document.getElementById('taskDesc').addEventListener('input',  e => state.desc  = e.target.value);
  document.getElementById('taskDue').addEventListener('change',  e => state.due   = e.target.value);
  document.getElementById('taskProgress').addEventListener('input', e => state.progress = +e.target.value);
  document.getElementById('taskStarred').addEventListener('change', e => state.starred = e.target.checked);

  /* ============================================================
     RECURRING SETTINGS
     ============================================================ */
  function setHidden(id, hide) {
    const el = document.getElementById(id);
    if (el) el.hidden = !!hide;
  }

  function updateRecurringSummary() {
    const r = state.recurring;
    const sum = document.getElementById('recurringSummary');
    if (!sum) return;
    if (!r.enabled) { sum.textContent = ''; return; }
    let label = '';
    if (r.frequency === 'daily') label = 'كل يوم';
    else if (r.frequency === 'weekly') {
      const days = r.weekdays.map(d => WEEKDAY_NAMES[d].slice(0,3)).join('، ');
      label = `أسبوعياً • ${days || 'بدون أيام'}`;
    } else if (r.frequency === 'monthly') label = `يوم ${r.dayOfMonth} كل شهر`;
    if (r.end === 'count') label += ` • ${r.endCount} مرات`;
    else if (r.end === 'date' && r.endDate) label += ` • حتى ${r.endDate}`;
    sum.textContent = label;
  }

  // Toggle recurring on/off
  document.getElementById('optRecurring').addEventListener('change', e => {
    state.recurring.enabled = e.target.checked;
    setHidden('recurringContent', !e.target.checked);
    updateRecurringSummary();
  });

  // Frequency
  document.getElementById('recurFreq').addEventListener('click', e => {
    const btn = e.target.closest('button'); if (!btn) return;
    document.querySelectorAll('#recurFreq button').forEach(b => b.classList.toggle('active', b === btn));
    state.recurring.frequency = btn.dataset.freq;
    setHidden('recurWeeklyDays', btn.dataset.freq !== 'weekly');
    setHidden('recurMonthlyDay', btn.dataset.freq !== 'monthly');
    updateRecurringSummary();
  });

  // Weekdays toggle
  document.getElementById('recurDays').addEventListener('click', e => {
    const btn = e.target.closest('button'); if (!btn) return;
    btn.classList.toggle('active');
    const day = +btn.dataset.day;
    if (btn.classList.contains('active')) {
      if (!state.recurring.weekdays.includes(day)) state.recurring.weekdays.push(day);
    } else {
      state.recurring.weekdays = state.recurring.weekdays.filter(d => d !== day);
    }
    updateRecurringSummary();
  });

  // Day of month
  document.getElementById('recurDayOfMonth').addEventListener('input', e => {
    state.recurring.dayOfMonth = +e.target.value || 1;
    updateRecurringSummary();
  });

  // End mode
  document.getElementById('recurEnd').addEventListener('click', e => {
    const btn = e.target.closest('button'); if (!btn) return;
    document.querySelectorAll('#recurEnd button').forEach(b => b.classList.toggle('active', b === btn));
    state.recurring.end = btn.dataset.end;
    setHidden('recurEndCountWrap', btn.dataset.end !== 'count');
    setHidden('recurEndDateWrap',  btn.dataset.end !== 'date');
    updateRecurringSummary();
  });
  document.getElementById('recurEndCount').addEventListener('input', e => {
    state.recurring.endCount = +e.target.value || 1; updateRecurringSummary();
  });
  document.getElementById('recurEndDate').addEventListener('change', e => {
    state.recurring.endDate = e.target.value; updateRecurringSummary();
  });

  /* ============================================================
     DEPENDS SETTINGS
     ============================================================ */
  function populateDependsOptions() {
    const sel = document.getElementById('dependsSelect');
    if (!sel) return;
    const open = D.tasks.filter(t => !t.done);
    sel.innerHTML = `<option value="">اختر مهمة...</option>` + open.map(t =>
      `<option value="${t.id}">${escapeHtml(t.title)}</option>`
    ).join('');
  }

  function updateDependsSummary() {
    const d = state.depends;
    const sum = document.getElementById('dependsSummary');
    if (!sum) return;
    if (!d.enabled || !d.taskId) { sum.textContent = ''; return; }
    const t = D.tasks.find(x => x.id === d.taskId);
    if (!t) { sum.textContent = ''; return; }
    const cond = d.type === 'finish' ? 'بعد إنجاز' : 'بعد بدء';
    sum.textContent = `${cond}: ${t.title.slice(0, 22)}${t.title.length > 22 ? '…' : ''}`;
  }

  document.getElementById('optDepends').addEventListener('change', e => {
    state.depends.enabled = e.target.checked;
    setHidden('dependsContent', !e.target.checked);
    updateDependsSummary();
  });
  document.getElementById('dependsSelect').addEventListener('change', e => {
    state.depends.taskId = e.target.value; updateDependsSummary();
  });
  document.getElementById('dependsType').addEventListener('click', e => {
    const btn = e.target.closest('button'); if (!btn) return;
    document.querySelectorAll('#dependsType button').forEach(b => b.classList.toggle('active', b === btn));
    state.depends.type = btn.dataset.type; updateDependsSummary();
  });

  /* ============================================================
     SAVE / CANCEL
     ============================================================ */
  document.getElementById('taskForm').addEventListener('submit', e => {
    e.preventDefault();
    const title = (state.title || '').trim();
    if (!title) {
      document.getElementById('taskTitle').focus();
      toast('عنوان المهمة مطلوب');
      return;
    }
    const due = state.due || (() => {
      const d = new Date(D.TODAY); d.setDate(d.getDate() + 7);
      return d.toISOString().slice(0, 10);
    })();

    const newTask = {
      id: 't-' + Date.now(),
      title,
      desc: state.desc || '',
      assignee: state.assignee,
      watchers: state.watchers.slice(),
      due,
      tag: state.tag,
      tagKey: state.tagKey,
      priority: state.priority,
      done: state.progress >= 100,
      starred: state.starred,
      subtasks: state.subtasks,
      attachments: state.attachments.map(a => ({ name: a.name, size: a.size, type: a.type })),
      progress: state.progress,
      xp: state.xp,
      recurring: state.recurring.enabled ? state.recurring : null,
      depends: state.depends.enabled && state.depends.taskId ? state.depends : null,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    D.addTask(newTask);
    toast('تمت إضافة المهمة بنجاح');
    setTimeout(() => { location.href = 'index.html'; }, 700);
  });

  document.getElementById('cancelBtn').addEventListener('click', () => {
    if (state.title || state.attachments.length || state.subtasks.length) {
      if (!confirm('سيتم حذف ما أدخلته. متأكد؟')) return;
    }
    location.href = 'index.html';
  });

  /* ============================================================
     INIT
     ============================================================ */
  // default due = +7 days
  (function setDefaultDue(){
    const d = new Date(D.TODAY); d.setDate(d.getDate() + 7);
    const iso = d.toISOString().slice(0, 10);
    document.getElementById('taskDue').value = iso;
    state.due = iso;
  })();

  renderAssignees();
  renderWatchers();
  renderTags();
  renderXp();
  renderPrio();
  renderSubtasks();
  renderAttachments();
  populateDependsOptions();

  document.getElementById('taskTitle').focus();
})();
