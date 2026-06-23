import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, './public');
const port = Number(process.env.PORT ?? 3000);
const adminUser = process.env.ADMIN_USER ?? 'admin';
const adminPassword = process.env.ADMIN_PASSWORD ?? 'change-this-password';

const sha256 = (str) => createHash('sha256').update(str).digest('hex');
const sessionToken = sha256(`${adminUser}:${adminPassword}`);

const parseCookies = (req) => {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      list[parts.shift().trim()] = decodeURIComponent(parts.join('='));
    });
  }
  return list;
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://vesovaya:vesovaya@localhost:5432/vesovaya'
});

const statuses = new Set(['new', 'in_progress', 'called', 'closed']);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const send = (res, status, body, type = 'application/json; charset=utf-8', headers = {}) => {
  res.writeHead(status, {
    'Content-Type': type,
    'X-Content-Type-Options': 'nosniff',
    ...headers
  });
  res.end(body);
};

const sendJson = (res, status, payload, headers = {}) => send(res, status, JSON.stringify(payload), 'application/json; charset=utf-8', headers);

const readBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};

  const contentType = req.headers['content-type'] ?? '';
  if (contentType.includes('application/json')) return JSON.parse(raw);
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  return {};
};

const isAdmin = (req) => {
  const cookies = parseCookies(req);
  return cookies.admin_session === sessionToken;
};

const requireAdmin = (req, res) => {
  if (isAdmin(req)) return true;
  sendJson(res, 401, { ok: false, error: 'Требуется авторизация' });
  return false;
};

const initDb = async () => {
  await pool.query(`
    create table if not exists leads (
      id bigserial primary key,
      name text not null,
      phone text not null,
      email text,
      city text,
      product text,
      message text,
      page_url text,
      status text not null default 'new',
      manager_comment text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await pool.query('create index if not exists leads_status_created_idx on leads (status, created_at desc);');
};

const createLead = async (req, res) => {
  let data;
  try {
    data = await readBody(req);
  } catch {
    return sendJson(res, 400, { ok: false, error: 'Некорректные данные формы.' });
  }

  const name = String(data.name ?? '').trim();
  const phone = String(data.phone ?? '').trim();
  const email = String(data.email ?? '').trim();
  const city = String(data.city ?? '').trim();
  const product = String(data.product ?? '').trim();
  const message = String(data.message ?? '').trim();
  const pageUrl = String(data.page_url ?? req.headers.referer ?? '').trim();

  if (name.length < 2 || phone.length < 5) {
    return sendJson(res, 422, { ok: false, error: 'Укажите имя и телефон.' });
  }

  const result = await pool.query(
    `insert into leads (name, phone, email, city, product, message, page_url)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id, created_at`,
    [name, phone, email || null, city || null, product || null, message || null, pageUrl || null]
  );

  sendJson(res, 201, { ok: true, lead: result.rows[0] });
};

const listLeads = async (_req, res) => {
  const result = await pool.query(`
    select id, name, phone, email, city, product, message, page_url, status, manager_comment, created_at, updated_at
    from leads
    order by created_at desc
    limit 300
  `);
  sendJson(res, 200, { ok: true, leads: result.rows });
};

const updateLead = async (req, res, id) => {
  let data;
  try {
    data = await readBody(req);
  } catch {
    return sendJson(res, 400, { ok: false, error: 'Некорректные данные.' });
  }

  const status = String(data.status ?? '').trim();
  const comment = String(data.manager_comment ?? '').trim();
  if (!statuses.has(status)) return sendJson(res, 422, { ok: false, error: 'Некорректный статус.' });

  const result = await pool.query(
    `update leads
     set status = $1, manager_comment = $2, updated_at = now()
     where id = $3
     returning id, status, manager_comment, updated_at`,
    [status, comment || null, id]
  );

  if (!result.rowCount) return sendJson(res, 404, { ok: false, error: 'Заявка не найдена.' });
  sendJson(res, 200, { ok: true, lead: result.rows[0] });
};

const renderLogin = () => `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Вход | Панель управления</title>
  <style>
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; background: #f6f8fb; color: #18212f; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: white; border: 1px solid #d8dee8; padding: 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); width: 100%; max-width: 360px; }
    h1 { margin: 0 0 24px; font-size: 24px; text-align: center; font-weight: 700; }
    label { display: flex; flex-direction: column; gap: 8px; font-size: 13px; font-weight: bold; margin-bottom: 16px; color: #526070; text-transform: uppercase; }
    input { font: inherit; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; width: 100%; box-sizing: border-box; }
    input:focus { border-color: #1f5eff; outline: none; }
    button { font: inherit; background: #1f5eff; color: white; border: 1px solid #1f5eff; border-radius: 8px; padding: 12px; width: 100%; cursor: pointer; font-weight: bold; margin-top: 8px; }
    button:hover { background: #104ee6; }
    .error { color: #d93025; font-size: 14px; margin-bottom: 16px; text-align: center; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Вход в панель</h1>
    <div class="error" id="error"></div>
    <form id="loginForm">
      <label>Логин <input type="text" name="username" required autocomplete="username"></label>
      <label>Пароль <input type="password" name="password" required autocomplete="current-password"></label>
      <button type="submit">Войти</button>
    </form>
  </div>
  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = document.getElementById('error');
      err.style.display = 'none';
      const formData = new FormData(e.target);
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData))
      });
      const data = await res.json();
      if (data.ok) {
        window.location.reload();
      } else {
        err.textContent = data.error || 'Ошибка входа';
        err.style.display = 'block';
      }
    });
  </script>
</body>
</html>`;

const renderAdmin = () => `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Заявки | Админка</title>
  <style>
    body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#f6f8fb;color:#18212f}
    header{padding:18px 28px;background:white;border-bottom:1px solid #d8dee8;display:flex;justify-content:space-between;gap:16px;align-items:center}
    main{padding:24px;max-width:1280px;margin:0 auto}
    h1{margin:0;font-size:26px}
    .muted{color:#667085}
    table{width:100%;border-collapse:collapse;background:white;border:1px solid #d8dee8;border-radius:8px;overflow:hidden}
    th,td{padding:12px;border-bottom:1px solid #e6ebf2;text-align:left;vertical-align:top;font-size:14px}
    th{background:#eef3fa;font-size:12px;text-transform:uppercase;color:#526070}
    select,textarea,button{font:inherit;border:1px solid #cbd5e1;border-radius:8px;padding:8px;background:white}
    textarea{width:220px;min-height:72px;resize:vertical}
    button{background:#1f5eff;color:white;border-color:#1f5eff;cursor:pointer;font-weight:700}
    .toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px}
    .status{display:inline-block;padding:4px 8px;border-radius:999px;background:#e9eefc;color:#1f3d85}
    .message{max-width:260px;white-space:pre-wrap}
    @media(max-width:900px){table,thead,tbody,tr,th,td{display:block}thead{display:none}tr{margin-bottom:14px;border:1px solid #d8dee8;background:white}td{border-bottom:1px solid #eef2f7}td:before{content:attr(data-label);display:block;font-size:12px;text-transform:uppercase;color:#667085;margin-bottom:4px}}
  </style>
</head>
<body>
  <header>
    <h1>Заявки с сайта</h1>
    <div style="display: flex; align-items: center; gap: 16px;">
      <span class="muted">Менеджерская панель</span>
      <button id="logout" style="background: transparent; color: #18212f; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; font-size: 13px; font-weight: 600; cursor: pointer;">Выйти</button>
    </div>
  </header>
  <main>
    <div class="toolbar"><p class="muted" id="summary">Загрузка...</p><button id="refresh">Обновить</button></div>
    <table>
      <thead><tr><th>ID</th><th>Дата</th><th>Клиент</th><th>Контакты</th><th>Интерес</th><th>Сообщение</th><th>Статус</th><th>Комментарий</th><th></th></tr></thead>
      <tbody id="leads"></tbody>
    </table>
  </main>
  <script>
    const statuses = {new:'Новая', in_progress:'В работе', called:'Позвонили', closed:'Закрыта'};
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const load = async () => {
      const response = await fetch('/api/admin/leads');
      const data = await response.json();
      const rows = data.leads.map((lead) => '<tr data-id="'+lead.id+'">'
        + '<td data-label="ID">'+lead.id+'</td>'
        + '<td data-label="Дата">'+new Date(lead.created_at).toLocaleString('ru-RU')+'</td>'
        + '<td data-label="Клиент"><strong>'+escapeHtml(lead.name)+'</strong><br><span class="muted">'+escapeHtml(lead.city || '')+'</span></td>'
        + '<td data-label="Контакты"><a href="tel:'+escapeHtml(lead.phone)+'">'+escapeHtml(lead.phone)+'</a><br>'+escapeHtml(lead.email || '')+'</td>'
        + '<td data-label="Интерес">'+escapeHtml(lead.product || '')+'<br><a class="muted" href="'+escapeHtml(lead.page_url || '#')+'" target="_blank">страница</a></td>'
        + '<td data-label="Сообщение" class="message">'+escapeHtml(lead.message || '')+'</td>'
        + '<td data-label="Статус"><select name="status">'+Object.entries(statuses).map(([value,label]) => '<option value="'+value+'" '+(lead.status === value ? 'selected' : '')+'>'+label+'</option>').join('')+'</select></td>'
        + '<td data-label="Комментарий"><textarea name="manager_comment">'+escapeHtml(lead.manager_comment || '')+'</textarea></td>'
        + '<td><button data-save>Сохранить</button></td>'
        + '</tr>').join('');
      document.querySelector('#leads').innerHTML = rows || '<tr><td colspan="9">Заявок пока нет.</td></tr>';
      document.querySelector('#summary').textContent = 'Всего заявок: ' + data.leads.length;
    };
    document.addEventListener('click', async (event) => {
      if (event.target.id === 'refresh') load();
      if (!event.target.matches('[data-save]')) return;
      const row = event.target.closest('tr');
      event.target.disabled = true;
      await fetch('/api/admin/leads/' + row.dataset.id, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          status: row.querySelector('[name=status]').value,
          manager_comment: row.querySelector('[name=manager_comment]').value
        })
      });
      event.target.disabled = false;
      load();
    });
    document.getElementById('logout').addEventListener('click', async () => {
      await fetch('/api/admin/logout', { method: 'POST' });
      window.location.reload();
    });
    load();
  </script>
</body>
</html>`;

const serveStatic = async (req, res, pathname) => {
  const safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(publicDir, safePath);
  
  const relative = path.relative(publicDir, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  }

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
    filePath = path.join(publicDir, safePath, 'index.html');
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('Not a file');
    res.writeHead(200, {
      'Content-Type': mime[path.extname(filePath)] ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff'
    });
    createReadStream(filePath).pipe(res);
  } catch {
    const notFound = await readFile(path.join(publicDir, 'index.html'), 'utf8');
    send(res, 404, notFound, 'text/html; charset=utf-8');
  }
};

await initDb();

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'POST' && url.pathname === '/api/leads') return await createLead(req, res);
    
    if (url.pathname === '/admin/' || url.pathname === '/admin') {
      if (!isAdmin(req)) {
        return send(res, 200, renderLogin(), 'text/html; charset=utf-8', { 'X-Robots-Tag': 'noindex, nofollow' });
      }
      return send(res, 200, renderAdmin(), 'text/html; charset=utf-8', { 'X-Robots-Tag': 'noindex, nofollow' });
    }

    if (req.method === 'POST' && url.pathname === '/api/admin/login') {
      let data;
      try {
        data = await readBody(req);
      } catch {
        return sendJson(res, 400, { ok: false, error: 'Некорректные данные.' });
      }
      const username = String(data.username ?? '').trim();
      const password = String(data.password ?? '').trim();
      if (username === adminUser && password === adminPassword) {
        return sendJson(res, 200, { ok: true }, {
          'Set-Cookie': `admin_session=${sessionToken}; Path=/; HttpOnly; Max-Age=86400; SameSite=Strict`
        });
      }
      return sendJson(res, 401, { ok: false, error: 'Неверный логин или пароль.' });
    }

    if (req.method === 'POST' && url.pathname === '/api/admin/logout') {
      return sendJson(res, 200, { ok: true }, {
        'Set-Cookie': 'admin_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Strict'
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/admin/leads') {
      if (!requireAdmin(req, res)) return;
      return await listLeads(req, res);
    }
    const match = url.pathname.match(/^\/api\/admin\/leads\/(\d+)$/);
    if (req.method === 'PATCH' && match) {
      if (!requireAdmin(req, res)) return;
      return await updateLead(req, res, match[1]);
    }

    if (url.pathname.startsWith('/api/')) return sendJson(res, 404, { ok: false, error: 'Not found' });
    return await serveStatic(req, res, url.pathname);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { ok: false, error: 'Внутренняя ошибка сервера.' });
  }
}).listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
