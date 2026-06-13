const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const puppeteer = require('puppeteer');

const PORT = 3781;
const BASE = path.resolve(__dirname, '..');
const DB_PATH = path.join(BASE, 'mtb-service-demo.db');
const GIF_PATH = path.join(BASE, 'docs', 'demo.gif');
const FRAMES_DIR = path.join(BASE, 'docs', '.frames');

async function seedData() {
  const initSqlJs = require('sql.js/dist/sql-asm.js');
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');

  db.run(`CREATE TABLE IF NOT EXISTS bikes (id TEXT PRIMARY KEY, brand TEXT NOT NULL, model TEXT NOT NULL, year TEXT DEFAULT '', frameSize TEXT DEFAULT '', color TEXT DEFAULT '', serial TEXT DEFAULT '', notes TEXT DEFAULT '', createdAt TEXT DEFAULT '')`);
  db.run(`CREATE TABLE IF NOT EXISTS components (id TEXT PRIMARY KEY, bikeId TEXT NOT NULL, name TEXT NOT NULL, brand TEXT DEFAULT '', installedDate TEXT DEFAULT '', installedKm INTEGER DEFAULT 0, notes TEXT DEFAULT '', FOREIGN KEY (bikeId) REFERENCES bikes(id) ON DELETE CASCADE)`);
  db.run(`CREATE TABLE IF NOT EXISTS service_log (id TEXT PRIMARY KEY, bikeId TEXT NOT NULL, date TEXT NOT NULL, odometer INTEGER DEFAULT 0, type TEXT NOT NULL, description TEXT DEFAULT '', parts TEXT DEFAULT '', cost REAL DEFAULT 0, FOREIGN KEY (bikeId) REFERENCES bikes(id) ON DELETE CASCADE)`);
  db.run(`CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT DEFAULT 'other', intervalKm INTEGER DEFAULT 0, intervalDays INTEGER DEFAULT 0, lastDate TEXT DEFAULT '', lastKm INTEGER DEFAULT 0)`);

  const bikeId = 'demo-bike-1';
  db.run('INSERT INTO bikes (id, brand, model, year, frameSize, color, serial, notes, createdAt) VALUES (?,?,?,?,?,?,?,?,?)',
    [bikeId, 'Trek', 'Fuel EX 8', '2024', 'M (18.5")', 'Orange', 'WTU1234567', 'Main bike for XC and trail riding', '2026-01-15']);

  const comps = [
    ['comp-1', bikeId, 'Fork', 'Fox', '2026-01-15', 0, 'Fox 36 Float Factory Grip2'],
    ['comp-2', bikeId, 'Rear Shock', 'Fox', '2026-01-15', 0, 'Fox DPX2 Factory'],
    ['comp-3', bikeId, 'Drivetrain', 'Shimano', '2026-03-10', 450, 'Shimano XT M8100 groupset'],
    ['comp-4', bikeId, 'Brakes', 'Shimano', '2026-01-15', 0, 'Shimano XT M8120 4-piston'],
    ['comp-5', bikeId, 'Wheelset', 'Bontrager', '2026-01-15', 0, 'Bontrager Line Elite 30'],
  ];
  for (const c of comps) {
    db.run('INSERT INTO components (id, bikeId, name, brand, installedDate, installedKm, notes) VALUES (?,?,?,?,?,?,?)', c);
  }

  const services = [
    ['svc-1', bikeId, '2026-02-20', 150, 'Первое обслуживание', 'Обкатка завершена, проверка всех узлов, подтяжка спиц', '', 0],
    ['svc-2', bikeId, '2026-03-10', 450, 'Замена цепи', 'Установлена новая цепь Shimano XT, смазка переключателей', 'Цепь Shimano XT M8100 · 4500 ₽', 4500],
    ['svc-3', bikeId, '2026-04-05', 780, 'Регулировка тормозов', 'Продувка гидролинии, центровка колодок, долив жидкости', 'Тормозная жидкость Shimano Mineral Oil · 800 ₽', 800],
    ['svc-4', bikeId, '2026-05-18', 1200, 'Полное обслуживание', 'Регулировка подвески, смазка шарниров, подтяжка болтов', '', 0],
  ];
  for (const s of services) {
    db.run('INSERT INTO service_log (id, bikeId, date, odometer, type, description, parts, cost) VALUES (?,?,?,?,?,?,?,?)', s);
  }

  const reminders = [
    ['rem-chain', 'Смазка цепи', 'drivetrain', 150, 14, '2026-05-18', 1200],
    ['rem-shift', 'Регулировка переключателей', 'drivetrain', 500, 60, '2026-03-10', 450],
    ['rem-brake-pads', 'Замена тормозных колодок', 'brakes', 800, 120, '2026-01-15', 0],
    ['rem-fork-service', 'Обслуживание вилки (мелкое)', 'suspension', 500, 90, '2026-03-10', 450],
    ['rem-chain-replace', 'Замена цепи', 'drivetrain', 1000, 0, '2026-03-10', 450],
    ['rem-cassette', 'Замена кассеты', 'drivetrain', 3000, 0, '', 0],
    ['rem-pivot', 'Смазка шарниров подвески', 'suspension', 0, 180, '2026-05-18', 1200],
    ['rem-bearing', 'Замена колёсных подшипников', 'wheels', 0, 365, '', 0],
  ];
  for (const r of reminders) {
    db.run('INSERT INTO reminders (id, title, category, intervalKm, intervalDays, lastDate, lastKm) VALUES (?,?,?,?,?,?,?)', r);
  }

  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  db.close();
  console.log('Seeded demo database');
}

function waitForServer(url, timeout) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      http.get(url, res => { res.resume(); resolve(); })
        .on('error', () => {
          if (Date.now() - start > timeout) reject(new Error('Server start timeout'));
          else setTimeout(check, 200);
        });
    }
    check();
  });
}

async function takeScreenshots(browser) {
  if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });

  const page = await browser.newPage();
  page.setDefaultTimeout(10000);

  const views = [
    { name: '01-dashboard', view: 'dashboard', wait: '#recent-services' },
    { name: '02-bikes',     view: 'bikes',     wait: '#bike-list' },
    { name: '03-service',   view: 'service',   wait: '#service-list' },
    { name: '04-reminders', view: 'reminders',  wait: '#reminders-list' },
  ];

  for (const v of views) {
    await page.goto('http://localhost:' + PORT, { waitUntil: 'networkidle0' });
    await page.evaluate(vName => switchView(vName), v.view);
    await page.waitForSelector(v.wait, { timeout: 8000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));
    const fp = path.join(FRAMES_DIR, v.name + '.png');
    await page.screenshot({ path: fp, fullPage: false });
    console.log('Screenshot: ' + v.name);
  }
}

async function createGif() {
  const frames = fs.readdirSync(FRAMES_DIR).filter(f => f.endsWith('.png')).sort();
  if (frames.length < 2) { console.error('Need at least 2 frames'); return; }

  const listPath = path.join(FRAMES_DIR, 'filelist.txt');
  const content = frames.map(f => "file '" + path.join(FRAMES_DIR, f).replace(/\\/g, '/') + "'\nduration 1.5").join('\n');
  fs.writeFileSync(listPath, content + "\nfile '" + path.join(FRAMES_DIR, frames[frames.length - 1]).replace(/\\/g, '/') + "'");

  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listPath,
      '-vf', 'split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer',
      '-loop', '0',
      GIF_PATH,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    ff.on('close', code => {
      if (code === 0) {
        const size = fs.statSync(GIF_PATH).size;
        console.log('GIF created: ' + GIF_PATH + ' (' + (size / 1024).toFixed(0) + ' KB)');
        resolve();
      } else {
        reject(new Error('ffmpeg exit code ' + code));
      }
    });
    ff.stderr.on('data', d => { });
  });
}

function cleanup() {
  if (fs.existsSync(FRAMES_DIR)) fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
}

async function main() {
  console.log('=== MTB Service GIF Generator ===\n');

  await seedData();

  const server = spawn('node', ['server.js'], {
    cwd: BASE,
    env: { ...process.env, PORT: String(PORT), APPDATA: BASE },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stderr.on('data', d => { });

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  try {
    await waitForServer('http://localhost:' + PORT, 10000);
    console.log('Server started on port ' + PORT);

    const browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    try {
      await takeScreenshots(browser);
    } finally {
      await browser.close();
    }

    await createGif();
  } finally {
    server.kill();
    cleanup();
  }

  console.log('\nDone!');
}

main().catch(err => {
  console.error('Error:', err);
  cleanup();
  process.exit(1);
});
