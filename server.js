const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const initSqlJs = require('sql.js/dist/sql-asm.js');

const PORT = process.env.PORT || 3781;
const BASE = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

const APP_DATA = process.env.APPDATA || path.join(process.env.HOME || process.cwd(), '.local', 'share');
const DATA_DIR = path.join(APP_DATA, 'MTB Service');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'mtb-service.db');

let db;

  // ---- SQLite init ----
async function initDb() {
  const SQL = await initSqlJs();

  // migrate old db from exe directory to APPDATA
  const oldDb = path.join(BASE, 'mtb-service.db');
  if (!fs.existsSync(DB_PATH) && fs.existsSync(oldDb)) {
    fs.copyFileSync(oldDb, DB_PATH);
  }

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA foreign_keys = ON');

  db.run(`CREATE TABLE IF NOT EXISTS bikes (id TEXT PRIMARY KEY, brand TEXT NOT NULL, model TEXT NOT NULL, year TEXT DEFAULT '', frameSize TEXT DEFAULT '', color TEXT DEFAULT '', serial TEXT DEFAULT '', notes TEXT DEFAULT '', createdAt TEXT DEFAULT '')`);
  db.run(`CREATE TABLE IF NOT EXISTS components (id TEXT PRIMARY KEY, bikeId TEXT NOT NULL, name TEXT NOT NULL, brand TEXT DEFAULT '', installedDate TEXT DEFAULT '', installedKm INTEGER DEFAULT 0, notes TEXT DEFAULT '', FOREIGN KEY (bikeId) REFERENCES bikes(id) ON DELETE CASCADE)`);
  db.run(`CREATE TABLE IF NOT EXISTS service_log (id TEXT PRIMARY KEY, bikeId TEXT NOT NULL, date TEXT NOT NULL, odometer INTEGER DEFAULT 0, type TEXT NOT NULL, description TEXT DEFAULT '', parts TEXT DEFAULT '', cost REAL DEFAULT 0, FOREIGN KEY (bikeId) REFERENCES bikes(id) ON DELETE CASCADE)`);
  db.run(`CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT DEFAULT 'other', intervalKm INTEGER DEFAULT 0, intervalDays INTEGER DEFAULT 0, lastDate TEXT DEFAULT '', lastKm INTEGER DEFAULT 0)`);
  saveDb();
  seedReminders();
}

function saveDb() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function seedReminders() {
  const count = qGet('SELECT COUNT(*) as c FROM reminders').c;
  if (count > 0) return;
  const items = [
    ['rem-chain', 'Смазка цепи', 'drivetrain', 150, 14],
    ['rem-shift', 'Регулировка переключателей', 'drivetrain', 500, 60],
    ['rem-brake-pads', 'Замена тормозных колодок', 'brakes', 800, 120],
    ['rem-brake-fluid', 'Замена тормозной жидкости', 'brakes', 0, 365],
    ['rem-fork-service', 'Обслуживание вилки (мелкое)', 'suspension', 500, 90],
    ['rem-fork-overhaul', 'Полное обслуживание вилки', 'suspension', 0, 365],
    ['rem-chain-replace', 'Замена цепи', 'drivetrain', 1000, 0],
    ['rem-cassette', 'Замена кассеты', 'drivetrain', 3000, 0],
    ['rem-pivot', 'Смазка и затяжка шарниров подвески', 'suspension', 0, 180],
    ['rem-headset', 'Обслуживание рулевой колонки', 'frame', 0, 180],
    ['rem-wheel-true', 'Правка колёс', 'wheels', 0, 90],
    ['rem-bearing', 'Замена колёсных подшипников', 'wheels', 0, 365],
  ];
  for (const r of items) {
    qRun('INSERT INTO reminders (id, title, category, intervalKm, intervalDays, lastDate, lastKm) VALUES (?,?,?,?,?,?,?)', r);
  }
}

function qAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function qGet(sql, params = []) {
  const rows = qAll(sql, params);
  return rows.length ? rows[0] : null;
}

function qRun(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

// ---- MIME ----
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const MIME_MAP = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.png': 'image/png' };

let EMBEDDED = {};
try { EMBEDDED = require('./embeds.js'); } catch {}

// ---- Server ----
function serveFile(res, filePath) {
  const ext = path.extname(filePath);
  const name = path.basename(filePath);
  if (EMBEDDED[name]) {
    const contentType = MIME_MAP[ext] || 'text/plain; charset=utf-8';
    if (ext === '.png') {
      res.writeHead(200, { 'Content-Type': contentType });
      return res.end(Buffer.from(EMBEDDED[name], 'base64'));
    }
    res.writeHead(200, { 'Content-Type': contentType });
    return res.end(EMBEDDED[name]);
  }
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
}

function sendJson(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sendError(res, status, msg) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: msg }));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON')); } });
  });
}

// ---- API ----
const API_ROUTES = {
  'GET /api/bikes': () => qAll('SELECT * FROM bikes ORDER BY createdAt DESC'),
  'GET /api/stats': () => {
    const bc = qGet('SELECT COUNT(*) as c FROM bikes').c;
    const sc = qGet('SELECT COUNT(*) as c FROM service_log').c;
    const tc = qGet('SELECT COALESCE(SUM(cost),0) as s FROM service_log').s;
    return { bikeCount: bc, serviceCount: sc, totalCost: tc };
  },
};

async function handleApi(req, res) {
  const method = req.method;
  const url = req.url;
  const parts = url.split('/').filter(Boolean); // ['api', 'bikes', ...]

  try {
    // GET /api/bikes
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'bikes' && parts.length === 2) {
      return sendJson(res, qAll('SELECT * FROM bikes ORDER BY createdAt DESC'));
    }
    // GET /api/bikes/:id
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'bikes' && parts.length === 3) {
      const bike = qGet('SELECT * FROM bikes WHERE id = ?', [parts[2]]);
      return sendJson(res, bike || null);
    }
    // POST /api/bikes
    if (method === 'POST' && parts[0] === 'api' && parts[1] === 'bikes' && parts.length === 2) {
      const body = await parseBody(req);
      qRun('INSERT INTO bikes (id, brand, model, year, frameSize, color, serial, notes, createdAt) VALUES (?,?,?,?,?,?,?,?,?)',
        [body.id, body.brand, body.model, body.year||'', body.frameSize||'', body.color||'', body.serial||'', body.notes||'', body.createdAt||'']);
      return sendJson(res, { ok: true });
    }
    // PUT /api/bikes/:id
    if (method === 'PUT' && parts[0] === 'api' && parts[1] === 'bikes' && parts.length === 3) {
      const body = await parseBody(req);
      qRun('UPDATE bikes SET brand=?, model=?, year=?, frameSize=?, color=?, serial=?, notes=? WHERE id=?',
        [body.brand, body.model, body.year||'', body.frameSize||'', body.color||'', body.serial||'', body.notes||'', parts[2]]);
      return sendJson(res, { ok: true });
    }
    // DELETE /api/bikes/:id
    if (method === 'DELETE' && parts[0] === 'api' && parts[1] === 'bikes' && parts.length === 3) {
      qRun('DELETE FROM components WHERE bikeId = ?', [parts[2]]);
      qRun('DELETE FROM service_log WHERE bikeId = ?', [parts[2]]);
      qRun('DELETE FROM bikes WHERE id = ?', [parts[2]]);
      return sendJson(res, { ok: true });
    }

    // GET /api/components/:bikeId — все компоненты велосипеда
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'components' && parts.length === 3) {
      return sendJson(res, qAll('SELECT * FROM components WHERE bikeId = ?', [parts[2]]));
    }
    // GET /api/component/:id — один компонент
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'component' && parts.length === 3) {
      return sendJson(res, qGet('SELECT * FROM components WHERE id = ?', [parts[2]]) || null);
    }
    // POST /api/components
    if (method === 'POST' && parts[0] === 'api' && parts[1] === 'components' && parts.length === 2) {
      const body = await parseBody(req);
      qRun('INSERT INTO components (id, bikeId, name, brand, installedDate, installedKm, notes) VALUES (?,?,?,?,?,?,?)',
        [body.id, body.bikeId, body.name, body.brand||'', body.installedDate||'', body.installedKm||0, body.notes||'']);
      return sendJson(res, { ok: true });
    }
    // PUT /api/components/:id
    if (method === 'PUT' && parts[0] === 'api' && parts[1] === 'components' && parts.length === 3) {
      const body = await parseBody(req);
      qRun('UPDATE components SET name=?, brand=?, installedDate=?, installedKm=?, notes=? WHERE id=?',
        [body.name, body.brand||'', body.installedDate||'', body.installedKm||0, body.notes||'', parts[2]]);
      return sendJson(res, { ok: true });
    }
    // DELETE /api/components/:id
    if (method === 'DELETE' && parts[0] === 'api' && parts[1] === 'components' && parts.length === 3) {
      qRun('DELETE FROM components WHERE id = ?', [parts[2]]);
      return sendJson(res, { ok: true });
    }

    // GET /api/services
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'services' && parts.length === 2) {
      return sendJson(res, qAll('SELECT * FROM service_log ORDER BY date DESC'));
    }
    // GET /api/services/:bikeId
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'services' && parts.length === 3) {
      return sendJson(res, qAll('SELECT * FROM service_log WHERE bikeId = ? ORDER BY date DESC', [parts[2]]));
    }
    // POST /api/services
    if (method === 'POST' && parts[0] === 'api' && parts[1] === 'services' && parts.length === 2) {
      const body = await parseBody(req);
      qRun('INSERT INTO service_log (id, bikeId, date, odometer, type, description, parts, cost) VALUES (?,?,?,?,?,?,?,?)',
        [body.id, body.bikeId, body.date, body.odometer||0, body.type, body.description||'', body.parts||'', body.cost||0]);
      return sendJson(res, { ok: true });
    }
    // DELETE /api/services/:id
    if (method === 'DELETE' && parts[0] === 'api' && parts[1] === 'services' && parts.length === 3) {
      qRun('DELETE FROM service_log WHERE id = ?', [parts[2]]);
      return sendJson(res, { ok: true });
    }

    // GET /api/reminders
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'reminders' && parts.length === 2) {
      return sendJson(res, qAll('SELECT * FROM reminders'));
    }
    // POST /api/reminders
    if (method === 'POST' && parts[0] === 'api' && parts[1] === 'reminders' && parts.length === 2) {
      const body = await parseBody(req);
      qRun('INSERT INTO reminders (id, title, category, intervalKm, intervalDays, lastDate, lastKm) VALUES (?,?,?,?,?,?,?)',
        [body.id, body.title, body.category||'other', body.intervalKm||0, body.intervalDays||0, body.lastDate||'', body.lastKm||0]);
      return sendJson(res, { ok: true });
    }
    // PUT /api/reminders/:id
    if (method === 'PUT' && parts[0] === 'api' && parts[1] === 'reminders' && parts.length === 3) {
      const body = await parseBody(req);
      qRun('UPDATE reminders SET lastDate=?, lastKm=? WHERE id=?', [body.lastDate||'', body.lastKm||0, parts[2]]);
      return sendJson(res, { ok: true });
    }
    // DELETE /api/reminders/:id
    if (method === 'DELETE' && parts[0] === 'api' && parts[1] === 'reminders' && parts.length === 3) {
      qRun('DELETE FROM reminders WHERE id = ?', [parts[2]]);
      return sendJson(res, { ok: true });
    }

    // GET /api/stats
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'stats' && parts.length === 2) {
      return sendJson(res, {
        bikeCount: qGet('SELECT COUNT(*) as c FROM bikes').c,
        serviceCount: qGet('SELECT COUNT(*) as c FROM service_log').c,
        totalCost: qGet('SELECT COALESCE(SUM(cost),0) as s FROM service_log').s,
      });
    }

    // ---- Import / Export ----

    // GET /api/export/json — экспорт всех данных как JSON
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'export' && parts[2] === 'json' && parts.length === 3) {
      const data = {
        bikes: qAll('SELECT * FROM bikes ORDER BY createdAt DESC'),
        components: qAll('SELECT * FROM components'),
        services: qAll('SELECT * FROM service_log ORDER BY date DESC'),
        reminders: qAll('SELECT * FROM reminders'),
      };
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="mtb-export.json"' });
      return res.end(JSON.stringify(data, null, 2));
    }

    // GET /api/export/db — скачать файл БД
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'export' && parts[2] === 'db' && parts.length === 3) {
      saveDb();
      const buf = fs.readFileSync(DB_PATH);
      res.writeHead(200, {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': 'attachment; filename="mtb-service.db"',
        'Content-Length': buf.length,
      });
      return res.end(buf);
    }

    // POST /api/import/db — заменить БД из файла
    if (method === 'POST' && parts[0] === 'api' && parts[1] === 'import' && parts[2] === 'db' && parts.length === 3) {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const raw = Buffer.concat(buffers);
      if (raw.length < 100) return sendError(res, 400, 'Файл слишком мал');

      // Проверяем что это валидный SQLite
      if (raw.slice(0, 16).toString() !== 'SQLite format 3\x00') {
        return sendError(res, 400, 'Файл не является SQLite БД');
      }

      db.close();
      fs.writeFileSync(DB_PATH, raw);
      const SQL = await initSqlJs();
      db = new SQL.Database(fs.readFileSync(DB_PATH));
      db.run('PRAGMA foreign_keys = ON');

      return sendJson(res, { ok: true, message: 'База данных импортирована' });
    }

    // POST /api/import/json — импорт данных из JSON
    if (method === 'POST' && parts[0] === 'api' && parts[1] === 'import' && parts[2] === 'json' && parts.length === 3) {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const body = JSON.parse(Buffer.concat(buffers).toString());
      if (!body.bikes || !body.reminders) return sendError(res, 400, 'Неверный формат JSON');

      // Очищаем текущие данные
      qRun('DELETE FROM components');
      qRun('DELETE FROM service_log');
      qRun('DELETE FROM bikes');
      qRun('DELETE FROM reminders');

      // Импортируем
      for (const b of body.bikes || []) {
        qRun('INSERT INTO bikes (id, brand, model, year, frameSize, color, serial, notes, createdAt) VALUES (?,?,?,?,?,?,?,?,?)',
          [b.id, b.brand, b.model, b.year||'', b.frameSize||'', b.color||'', b.serial||'', b.notes||'', b.createdAt||'']);
      }
      for (const c of body.components || []) {
        qRun('INSERT INTO components (id, bikeId, name, brand, installedDate, installedKm, notes) VALUES (?,?,?,?,?,?,?)',
          [c.id, c.bikeId, c.name, c.brand||'', c.installedDate||'', c.installedKm||0, c.notes||'']);
      }
      for (const s of body.services || []) {
        qRun('INSERT INTO service_log (id, bikeId, date, odometer, type, description, parts, cost) VALUES (?,?,?,?,?,?,?,?)',
          [s.id, s.bikeId, s.date, s.odometer||0, s.type, s.description||'', s.parts||'', s.cost||0]);
      }
      for (const r of body.reminders || []) {
        qRun('INSERT INTO reminders (id, title, category, intervalKm, intervalDays, lastDate, lastKm) VALUES (?,?,?,?,?,?,?)',
          [r.id, r.title, r.category||'other', r.intervalKm||0, r.intervalDays||0, r.lastDate||'', r.lastKm||0]);
      }

      return sendJson(res, { ok: true, message: 'Данные импортированы из JSON' });
    }

    sendError(res, 404, 'Unknown API endpoint');
  } catch (err) {
    sendError(res, 400, err.message);
  }
}

// ---- Main ----
async function main() {
  await initDb();

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    if (pathname.startsWith('/api/')) {
      return handleApi(req, res);
    }

    let filePath = path.join(BASE, pathname === '/' ? 'index.html' : pathname);
    serveFile(res, filePath);
  });

  server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`MTB Service запущен: ${url}`);

    const cmd = process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
    exec(cmd, { detached: true, stdio: 'ignore' }).unref();
  });
}

main().catch(err => {
  console.error('Ошибка запуска:', err);
  process.exit(1);
});
