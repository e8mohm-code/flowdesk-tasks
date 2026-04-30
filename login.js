/* =====================================================================
   Login — credentials (loginId + password) form.
   ===================================================================== */

(function () {
  const D = window.APP_DATA;
  if (!D) return;

  const form    = document.getElementById('loginForm');
  const idInput = document.getElementById('loginIdInput');
  const pwInput = document.getElementById('loginPwdInput');
  const errBox  = document.getElementById('loginError');
  const toggle  = document.getElementById('pwdToggle');

  // Toggle password visibility
  toggle?.addEventListener('click', () => {
    pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
    toggle.classList.toggle('on', pwInput.type === 'text');
  });

  // Demo accounts: fill credentials on click
  document.querySelectorAll('.login-demo-row[data-fill]').forEach(row => {
    row.addEventListener('click', () => {
      const [id, pw] = row.dataset.fill.split('|');
      idInput.value = id;
      pwInput.value = pw;
      idInput.focus();
    });
  });

  // Hide error when typing
  [idInput, pwInput].forEach(el => el.addEventListener('input', () => {
    errBox.hidden = true;
  }));

  // Submit handler
  form.addEventListener('submit', e => {
    e.preventDefault();
    const emp = D.tryLogin(idInput.value, pwInput.value);
    if (!emp) {
      errBox.hidden = false;
      pwInput.select();
      return;
    }
    // Redirect based on role
    if (emp.permRole === 'employee') location.href = 'my-tasks.html';
    else location.href = 'index.html';
  });

  idInput.focus();
})();
