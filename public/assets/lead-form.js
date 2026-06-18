document.addEventListener('submit', async (e) => {
  const f = e.target.closest('[data-lead-form]'); if(!f) return; e.preventDefault();
  const s = f.querySelector('[data-form-status]');
  f.querySelector('[name="page_url"]').value = window.location.href;
  s.textContent = 'Отправка...';
  try {
    const r = await fetch('/api/leads', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(Object.fromEntries(new FormData(f))) });
    if(!r.ok) throw new Error();
    f.reset(); s.textContent = 'Успешно отправлено!';
  } catch { s.textContent = 'Ошибка. Попробуйте снова.'; }
});