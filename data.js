/* =====================================================================
   Shared data for all pages.
   Loaded before page-specific JS so it's available as window.APP_DATA.
   ===================================================================== */

window.APP_DATA = (function () {

  // Real current date (midnight) — so completion timestamps and "this week" filters
  // are always in sync with when the user is actually using the app.
  const TODAY = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const LS_KEY = 'flowdesk-tasks-v7';
  const TAGS_LS_KEY = 'flowdesk-tags-v1';
  const USER_LS_KEY = 'flowdesk-current-user-v2';
  const XP_BY_PRIORITY = { high: 50, medium: 25, low: 10 };

  /* ============================================================
     DEPARTMENTS
     ============================================================ */
  const DEPARTMENTS = [
    { key: 'engineering', label: 'الهندسة',         color: '#4f7af0' },
    { key: 'product',     label: 'المنتج والتصميم', color: '#7c5cf0' },
    { key: 'operations',  label: 'العمليات والدعم', color: '#2bb673' },
    { key: 'marketing',   label: 'التسويق',          color: '#ee6f9c' },
  ];
  function findDepartment(key) {
    return DEPARTMENTS.find(d => d.key === key) || { key: key, label: key, color: '#94a3b8' };
  }

  /* ============================================================
     TAGS — editable, deletable, custom-addable, persisted
     ============================================================ */
  const SEED_TAGS = [
    { key: 'dev',      label: 'تطوير',  color: '#4f7af0' },
    { key: 'design',   label: 'تصميم',  color: '#7c5cf0' },
    { key: 'plan',     label: 'تخطيط',  color: '#2bb673' },
    { key: 'qa',       label: 'جودة',   color: '#f0a042' },
    { key: 'mkt',      label: 'تسويق',  color: '#ee6f9c' },
    { key: 'review',   label: 'مراجعة', color: '#a78bfa' },
    { key: 'infra',    label: 'بنية',   color: '#36b3d4' },
    { key: 'analysis', label: 'تحليل',  color: '#4f7af0' },
    { key: 'content',  label: 'محتوى',  color: '#94a3b8' },
  ];
  const TAG_COLORS_PALETTE = ['#4f7af0','#7c5cf0','#2bb673','#f0a042','#ee6f9c','#36b3d4','#ff7e3a','#94a3b8','#e25b62','#a78bfa'];

  let allTags = [];
  try {
    const stored = localStorage.getItem(TAGS_LS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length) allTags = parsed;
      else allTags = SEED_TAGS.slice();
    } else {
      allTags = SEED_TAGS.slice();
    }
  } catch (_) { allTags = SEED_TAGS.slice(); }

  function saveTags() {
    try { localStorage.setItem(TAGS_LS_KEY, JSON.stringify(allTags)); } catch (_) {}
  }
  function getAllTags() { return allTags; }
  function findTag(key) { return allTags.find(t => t.key === key); }
  function getTagColor(key) {
    const t = findTag(key);
    return t ? t.color : '#94a3b8';
  }
  function addTag(label, color) {
    if (!label || !label.trim()) return null;
    const key = 'tag-' + Date.now();
    if (!color) color = TAG_COLORS_PALETTE[allTags.length % TAG_COLORS_PALETTE.length];
    const tag = { key, label: label.trim(), color, custom: true };
    allTags.push(tag);
    saveTags();
    return tag;
  }
  function updateTag(key, patch) {
    const t = allTags.find(x => x.key === key);
    if (t) { Object.assign(t, patch); saveTags(); }
  }
  function deleteTag(key) {
    allTags = allTags.filter(t => t.key !== key);
    saveTags();
  }
  function resetTagsToDefaults() {
    allTags = SEED_TAGS.slice();
    saveTags();
  }

  // Demo accounts — manager / supervisor / employee
  // Login = numeric loginId + password (defined here for demo; replace with real auth in production)
  const employees = [
    { id: 'u1', loginId: '151215', password: '1111',
      name: 'المدير', role: 'مدير عام', avatar: 47, color: '#4f7af0',
      email: 'manager@flowdesk.io', level: 'Sr.', joined: '2024-01-01',
      department: 'product', permRole: 'manager' },

    { id: 'u2', loginId: '152525', password: '2525',
      name: 'المشرف', role: 'مشرف فريق الهندسة', avatar: 12, color: '#7c5cf0',
      email: 'supervisor@flowdesk.io', level: 'Sr.', joined: '2024-06-01',
      department: 'engineering', permRole: 'supervisor' },

    { id: 'u3', loginId: '153030', password: '3030',
      name: 'الموظف', role: 'موظف', avatar: 25, color: '#2bb673',
      email: 'employee@flowdesk.io', level: 'Mid', joined: '2025-01-01',
      department: 'engineering', permRole: 'employee' },
  ];

  // Empty by default — user creates tasks via the "+ مهمة جديدة" modal
  let tasks = [];

  // Customers / leads for the relationships page
  const customers = [
    { id: 'c1', name: 'شركة المراعي',         contact: 'فهد العقيل',      status: 'active',   value: 48000, owner: 'e3', last: '2026-04-28' },
    { id: 'c2', name: 'مطاعم البيك',           contact: 'سامية الحربي',    status: 'lead',     value: 22000, owner: 'e5', last: '2026-04-26' },
    { id: 'c3', name: 'متاجر هايبر باندا',     contact: 'محمد الرشيد',     status: 'active',   value: 91000, owner: 'e3', last: '2026-04-25' },
    { id: 'c4', name: 'كيان للاتصالات',        contact: 'نورة القحطاني',  status: 'closed',   value: 156000,owner: 'e1', last: '2026-04-19' },
    { id: 'c5', name: 'الشرق الأوسط للطيران', contact: 'عبدالله الزامل',  status: 'lead',     value: 64000, owner: 'e5', last: '2026-04-23' },
    { id: 'c6', name: 'مصنع الزيوت العربية',   contact: 'تركي الدوسري',   status: 'paused',   value: 18000, owner: 'e6', last: '2026-04-12' },
    { id: 'c7', name: 'بنك الراجحي',           contact: 'لينا السبيعي',    status: 'active',   value: 320000,owner: 'e3', last: '2026-04-29' },
    { id: 'c8', name: 'أرامكو الرقمية',        contact: 'خالد الغامدي',   status: 'closed',   value: 410000,owner: 'e1', last: '2026-04-15' },
    { id: 'c9', name: 'منصة جاهز',              contact: 'ريم العتيبي',    status: 'lead',     value: 31000, owner: 'e2', last: '2026-04-27' },
    { id: 'c10',name: 'شركة الإلكترونيات',    contact: 'ماجد الشمري',    status: 'active',   value: 58000, owner: 'e6', last: '2026-04-24' },
  ];

  // Mark a few tasks as starred (favorites)
  const starredIds = ['t1', 't5', 't9', 't13', 't17', 't3'];
  tasks.forEach(t => { t.starred = starredIds.includes(t.id); });

  // Apply default XP based on priority for any task missing it
  tasks.forEach(t => { if (t.xp == null) t.xp = XP_BY_PRIORITY[t.priority] || 25; });

  // Hydrate from localStorage if present (so newly-created tasks survive navigation/refresh)
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length) tasks = parsed;
    }
  } catch (_) { /* ignore */ }

  function saveTasks() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(tasks)); } catch (_) {}
  }
  function resetTasks() {
    try { localStorage.removeItem(LS_KEY); } catch (_) {}
    location.reload();
  }
  function nowISO() { return new Date().toISOString(); }

  function pushActivity(t, entry) {
    if (!t.activity) t.activity = [];
    t.activity.push({ when: nowISO(), ...entry });
  }

  function addTask(t) {
    if (!t.activity) t.activity = [];
    pushActivity(t, { type: 'created' });
    if (t.assignee) pushActivity(t, { type: 'assigned', to: t.assignee });
    tasks.push(t);
    saveTasks();
  }

  function updateTask(id, patch) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;

    // Track meaningful changes
    if (patch.assignee !== undefined && patch.assignee !== t.assignee) {
      if (patch.assignee === null) {
        pushActivity(t, { type: 'unassigned', from: t.assignee });
      } else if (t.assignee === null) {
        pushActivity(t, { type: 'assigned', to: patch.assignee });
      } else {
        pushActivity(t, { type: 'reassigned', from: t.assignee, to: patch.assignee });
      }
    }
    if (patch.progress !== undefined && patch.progress !== (t.progress || 0)) {
      pushActivity(t, { type: 'progress', from: (t.progress || 0), to: patch.progress });
    }
    if (patch.done && !t.done) {
      pushActivity(t, { type: 'completed' });
      if (!patch.doneAt) patch.doneAt = new Date().toISOString().slice(0, 10);
    }
    if (patch.due !== undefined && patch.due !== t.due) {
      pushActivity(t, { type: 'rescheduled', from: t.due, to: patch.due });
    }

    Object.assign(t, patch);
    saveTasks();
  }

  function deleteTask(id) {
    const i = tasks.findIndex(x => x.id === id);
    if (i >= 0) { tasks.splice(i, 1); saveTasks(); }
  }

  function addComment(taskId, text, byEmpId) {
    const t = tasks.find(x => x.id === taskId);
    if (!t) return;
    pushActivity(t, { type: 'comment', text, by: byEmpId });
    saveTasks();
  }

  // Activity feed for reports
  const activities = [
    { who: 'e1', what: 'أكملت', target: 'تحديث صفحة تسجيل الدخول',     when: '2026-04-22 14:32' },
    { who: 'e3', what: 'أنشأت', target: 'وضع خطة الربع الثاني',         when: '2026-04-25 09:11' },
    { who: 'e2', what: 'أكملت', target: 'مراجعة شاشات الجوال',          when: '2026-04-21 17:48' },
    { who: 'e4', what: 'بدأت',  target: 'تشغيل اختبارات الانحدار',       when: '2026-04-26 10:00' },
    { who: 'e5', what: 'أكملت', target: 'إطلاق منشور للمجتمع',           when: '2026-04-22 12:20' },
    { who: 'e6', what: 'أسندت', target: 'تذكرة دعم #3429',                when: '2026-04-29 08:45' },
    { who: 'e1', what: 'علّقت', target: 'مهمة API audit (انتظار مراجعة)', when: '2026-04-27 16:10' },
    { who: 'e3', what: 'وافقت', target: 'مسار التأهيل',                  when: '2026-04-28 11:25' },
  ];

  /* ----- Helpers ----- */
  const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  function formatDue(iso) {
    const d = new Date(iso + 'T00:00:00');
    return `${d.getDate()} ${AR_MONTHS[d.getMonth()]}`;
  }
  function isOverdue(t) {
    if (t.done) return false;
    return new Date(t.due + 'T00:00:00') < TODAY;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function findEmployee(id) { return employees.find(e => e.id === id) || null; }

  /* ============================================================
     CURRENT USER + PERMISSIONS
     ============================================================ */
  let currentUserId = null;
  try { currentUserId = localStorage.getItem(USER_LS_KEY); } catch (_) {}

  function getCurrentUser() {
    if (!currentUserId) return null;
    return findEmployee(currentUserId);
  }
  function setCurrentUser(empId) {
    currentUserId = empId;
    try {
      if (empId) localStorage.setItem(USER_LS_KEY, empId);
      else localStorage.removeItem(USER_LS_KEY);
    } catch (_) {}
  }
  function logout() {
    setCurrentUser(null);
    location.replace('login.html');
  }

  // Authenticate by numeric loginId + password.
  // Returns the employee object on success, or null on failure.
  function tryLogin(loginId, password) {
    const id = String(loginId || '').trim();
    const pw = String(password || '').trim();
    const emp = employees.find(e => e.loginId === id && e.password === pw);
    if (!emp) return null;
    setCurrentUser(emp.id);
    return emp;
  }

  function isManager()    { const u = getCurrentUser(); return !!u && u.permRole === 'manager'; }
  function isSupervisor() { const u = getCurrentUser(); return !!u && u.permRole === 'supervisor'; }
  function isEmployee()   { const u = getCurrentUser(); return !!u && u.permRole === 'employee'; }

  function canCreateTasks() { return isManager() || isSupervisor(); }

  // Manager can delete anything; Supervisor can delete tasks in their dept; Employee never.
  function canDeleteTask(task) {
    if (isManager()) return true;
    if (isSupervisor() && task) {
      const u = getCurrentUser();
      const e = task.assignee ? findEmployee(task.assignee) : null;
      // Supervisor can delete tasks unassigned or whose assignee is in their dept
      return !task.assignee || (e && e.department === u.department);
    }
    return false;
  }

  // Manager edits anything; Supervisor edits tasks in their dept; Employee edits only own (limited).
  function canEditTask(task) {
    if (isManager()) return true;
    const u = getCurrentUser(); if (!u || !task) return false;
    if (u.permRole === 'supervisor') {
      const e = task.assignee ? findEmployee(task.assignee) : null;
      return !task.assignee || (e && e.department === u.department);
    }
    if (u.permRole === 'employee') return task.assignee === u.id;
    return false;
  }

  // Visibility filtering
  function getVisibleEmployees() {
    const u = getCurrentUser();
    if (!u) return [];
    if (u.permRole === 'manager')    return employees.slice();
    if (u.permRole === 'supervisor') return employees.filter(e => e.department === u.department);
    return [u];
  }
  function getVisibleTasks() {
    const u = getCurrentUser();
    if (!u) return [];
    if (u.permRole === 'manager') return tasks.slice();
    if (u.permRole === 'supervisor') {
      const memberIds = new Set(getVisibleEmployees().map(e => e.id));
      return tasks.filter(t => !t.assignee || memberIds.has(t.assignee));
    }
    // Employee: tasks they own or are CC'd on
    return tasks.filter(t => t.assignee === u.id || (t.watchers || []).includes(u.id));
  }

  // ============================================================
  // XP CALCULATION
  // ----------------------------------------------------------------
  // - Early completion (>=2 days before due):  +25% bonus  (×1.25)
  // - On-time completion:                       full XP    (×1.00)
  // - Late completion (doneAt > due):           half XP    (×0.50)
  // - Open & overdue:                           -10 base + (-2 / extra day, capped at -50)
  // - Subtask bonus:                            +2 XP per completed subtask in done task
  // ============================================================
  const OVERDUE_BASE_PENALTY = 10;
  const OVERDUE_PER_DAY      = 2;
  const OVERDUE_PENALTY_CAP  = 50;
  const EARLY_BONUS_MULT     = 1.25;
  const EARLY_THRESHOLD_DAYS = 2;
  const LATE_MULT            = 0.5;
  const SUBTASK_BONUS        = 2;
  const MS_DAY = 24 * 60 * 60 * 1000;

  function daysBetween(aISO, bISO) {
    const a = new Date(aISO + 'T00:00:00');
    const b = new Date(bISO + 'T00:00:00');
    return Math.round((b - a) / MS_DAY);
  }

  function getEmployeeXPBreakdown(empId) {
    let onTime = 0;        // full XP from on-time completions
    let early  = 0;        // bonus XP added from early completions
    let halved = 0;        // half XP from late completions
    let subtaskBonus = 0;  // +XP for completed subtasks in done tasks
    let penalty = 0;       // -XP from currently overdue open tasks
    let counts = { onTime: 0, early: 0, late: 0, overdue: 0 };

    tasks.forEach(t => {
      if (t.assignee !== empId) return;
      const baseXP = (t.xp || 0);

      if (t.done) {
        const subDone = (t.subtasks || []).filter(s => s.done).length;
        subtaskBonus += subDone * SUBTASK_BONUS;

        if (t.doneAt && t.doneAt > t.due) {
          // Late completion → half XP
          halved += Math.floor(baseXP * LATE_MULT);
          counts.late++;
        } else if (t.doneAt && daysBetween(t.doneAt, t.due) >= EARLY_THRESHOLD_DAYS) {
          // Early completion → full + 25% bonus
          onTime += baseXP;
          early  += Math.round(baseXP * (EARLY_BONUS_MULT - 1));
          counts.early++;
        } else {
          // On-time
          onTime += baseXP;
          counts.onTime++;
        }
      } else if (isOverdue(t)) {
        const daysLate = Math.max(0, daysBetween(t.due, TODAY.toISOString().slice(0,10)));
        const extra = Math.max(0, daysLate - 1) * OVERDUE_PER_DAY;
        penalty += Math.min(OVERDUE_PENALTY_CAP, OVERDUE_BASE_PENALTY + extra);
        counts.overdue++;
      }
    });

    const total = onTime + early + halved + subtaskBonus;
    const net = Math.max(0, total - penalty);
    return { onTime, early, halved, subtaskBonus, penalty, total, net, counts };
  }

  function getEmployeeXP(empId) {
    return getEmployeeXPBreakdown(empId).net;
  }
  // Total team XP (optionally within a date window)
  function getTeamXP(sinceISO) {
    let total = 0;
    tasks.forEach(t => {
      if (t.done) {
        if (sinceISO && (!t.doneAt || t.doneAt < sinceISO)) return;
        const wasLate = t.doneAt && t.doneAt > t.due;
        total += wasLate ? Math.floor((t.xp || 0) / 2) : (t.xp || 0);
      } else if (!sinceISO && isOverdue(t)) {
        total -= OVERDUE_PENALTY;
      }
    });
    return Math.max(0, total);
  }
  // Level from XP (every 250 xp = 1 level)
  function levelFromXP(xp) { return Math.floor(xp / 250) + 1; }

  return {
    TODAY,
    AR_MONTHS,
    employees,
    get tasks() { return tasks; },
    customers,
    activities,
    formatDue,
    isOverdue,
    escapeHtml,
    findEmployee,
    DEPARTMENTS,
    findDepartment,
    getCurrentUser,
    setCurrentUser,
    tryLogin,
    logout,
    isManager,
    isSupervisor,
    isEmployee,
    canCreateTasks,
    canDeleteTask,
    canEditTask,
    getVisibleEmployees,
    getVisibleTasks,
    getEmployeeXP,
    getEmployeeXPBreakdown,
    getTeamXP,
    levelFromXP,
    XP_BY_PRIORITY,
    getAllTags,
    findTag,
    getTagColor,
    addTag,
    updateTag,
    deleteTag,
    resetTagsToDefaults,
    TAG_COLORS_PALETTE,
    saveTasks,
    resetTasks,
    addTask,
    updateTask,
    deleteTask,
    addComment,
  };
})();
