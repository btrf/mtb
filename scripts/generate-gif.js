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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

async function seedData() {
  const initSqlJs = require('sql.js/dist/sql-asm.js');
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');

  db.run(`CREATE TABLE IF NOT EXISTS bikes (id TEXT PRIMARY KEY, brand TEXT NOT NULL, model TEXT NOT NULL, year TEXT DEFAULT '', frameSize TEXT DEFAULT '', color TEXT DEFAULT '', serial TEXT DEFAULT '', notes TEXT DEFAULT '', createdAt TEXT DEFAULT '')`);
  db.run(`CREATE TABLE IF NOT EXISTS components (id TEXT PRIMARY KEY, bikeId TEXT NOT NULL, name TEXT NOT NULL, brand TEXT DEFAULT '', installedDate TEXT DEFAULT '', installedKm INTEGER DEFAULT 0, notes TEXT DEFAULT '', FOREIGN KEY (bikeId) REFERENCES bikes(id) ON DELETE CASCADE)`);
  db.run(`CREATE TABLE IF NOT EXISTS service_log (id TEXT PRIMARY KEY, bikeId TEXT NOT NULL, date TEXT NOT NULL, odometer INTEGER DEFAULT 0, type TEXT NOT NULL, description TEXT DEFAULT '', parts TEXT DEFAULT '', cost REAL DEFAULT 0, FOREIGN KEY (bikeId) REFERENCES bikes(id) ON DELETE CASCADE)`);
  db.run(`CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT DEFAULT 'other', intervalKm INTEGER DEFAULT 0, intervalDays INTEGER DEFAULT 0, lastDate TEXT DEFAULT '', lastKm INTEGER DEFAULT 0)`);

  // ---- Bikes ----
  const bike1 = 'b1';
  const bike2 = 'b2';
  const bike3 = 'b3';

  db.run('INSERT INTO bikes (id, brand, model, year, frameSize, color, serial, notes, createdAt) VALUES (?,?,?,?,?,?,?,?,?)',
    [bike1, 'Trek', 'Fuel EX 8', '2024', 'M (18.5")', 'Orange', 'WTU1234567', 'Основной байк для XC и трейлов', '2026-01-15']);
  db.run('INSERT INTO bikes (id, brand, model, year, frameSize, color, serial, notes, createdAt) VALUES (?,?,?,?,?,?,?,?,?)',
    [bike2, 'Specialized', 'Rockhopper Pro', '2023', 'L (19")', 'Gloss Black', 'WSBC0987654', 'Для покатушек с семьёй и асфальта', '2026-02-01']);
  db.run('INSERT INTO bikes (id, brand, model, year, frameSize, color, serial, notes, createdAt) VALUES (?,?,?,?,?,?,?,?,?)',
    [bike3, 'Canyon', 'Spectral 29', '2025', 'L', 'Stealth Grey', 'CN7654321', 'Эндуро — парк и даунхилл', '2026-03-20']);

  // ---- Components ----
  const comps = [
    ['c1', bike1, 'Вилка', 'Fox', '2026-01-15', 0, 'Fox 36 Float Factory Grip2'],
    ['c2', bike1, 'Задний амортизатор', 'Fox', '2026-01-15', 0, 'Fox DPX2 Factory'],
    ['c3', bike1, 'Трансмиссия', 'Shimano', '2026-03-10', 450, 'Shimano XT M8100'],
    ['c4', bike1, 'Тормоза', 'Shimano', '2026-01-15', 0, 'Shimano XT M8120 4-piston'],
    ['c5', bike1, 'Колёса', 'Bontrager', '2026-01-15', 0, 'Bontrager Line Elite 30'],
    ['c6', bike2, 'Вилка', 'SR Suntour', '2026-02-01', 0, 'SR Suntour XCR 32 Air'],
    ['c7', bike2, 'Трансмиссия', 'Shimano', '2026-02-01', 0, 'Shimano Deore M6100'],
    ['c8', bike2, 'Колёса', 'Specialized', '2026-02-01', 0, 'Specialized Ground Control 29"'],
    ['c9', bike3, 'Вилка', 'RockShox', '2026-03-20', 0, 'RockShox Zeb Ultimate'],
    ['c10', bike3, 'Задний амортизатор', 'RockShox', '2026-03-20', 0, 'RockShox Super Deluxe Ultimate'],
    ['c11', bike3, 'Трансмиссия', 'SRAM', '2026-03-20', 0, 'SRAM GX Eagle'],
    ['c12', bike3, 'Тормоза', 'SRAM', '2026-03-20', 0, 'SRAM Code RSC'],
  ];
  for (const c of comps) {
    db.run('INSERT INTO components (id, bikeId, name, brand, installedDate, installedKm, notes) VALUES (?,?,?,?,?,?,?)', c);
  }

  // ---- Service Records ----
  const services = [
    // Trek Fuel EX
    ['s1', bike1, daysAgo(113), 150, 'Первое обслуживание', 'Обкатка завершена, проверка всех узлов, подтяжка спиц', '', 0],
    ['s2', bike1, daysAgo(95), 450, 'Замена цепи', 'Установлена новая цепь Shimano XT, смазка переключателей', 'Цепь Shimano XT M8100 · 4500 ₽', 4500],
    ['s3', bike1, daysAgo(69), 780, 'Регулировка тормозов', 'Продувка гидролинии, центровка колодок, долив жидкости', 'Тормозная жидкость Shimano Mineral Oil · 800 ₽', 800],
    ['s4', bike1, daysAgo(40), 1050, 'Замена колодок', 'Колодки стёрлись после грязных покатушек, установлены новые', 'Колодки Shimano H03C · 2800 ₽', 2800],
    ['s5', bike1, daysAgo(26), 1200, 'Полное обслуживание', 'Регулировка подвески, смазка шарниров, подтяжка болтов', 'Смазка Motorex · 600 ₽', 600],
    ['s6', bike1, daysAgo(10), 1350, 'Мойка', 'Полная мойка рамы и компонентов после покатушек в грязи', '', 0],
    // Specialized Rockhopper
    ['s7', bike2, daysAgo(90), 80, 'Первое обслуживание', 'Проверка после покупки, подтяжка спиц', '', 0],
    ['s8', bike2, daysAgo(45), 200, 'Регулировка переключателей', 'Настройка заднего переключателя после растяжения троса', '', 0],
    ['s9', bike2, daysAgo(12), 320, 'Замена покрышки', 'Прокол заднего колеса, замена на новую', 'Покрышка Specialized Ground Control · 3500 ₽', 3500],
    // Canyon Spectral
    ['s10', bike3, daysAgo(60), 250, 'Первое обслуживание', 'Обкатка, проверка подвески', '', 0],
    ['s11', bike3, daysAgo(30), 500, 'Замена колодок', 'Колодки после паркового дня', 'Колодки SRAM Organic · 2500 ₽', 2500],
    ['s12', bike3, daysAgo(18), 620, 'Регулировка подвески', 'Настройка сага и отскока под вес райдера', '', 0],
    ['s13', bike3, daysAgo(5), 720, 'Мойка + цепь', 'Чистка и смазка цепи после дождливого катания', 'Смазок Muc-Off Wet Lube · 650 ₽', 650],
  ];
  for (const s of services) {
    db.run('INSERT INTO service_log (id, bikeId, date, odometer, type, description, parts, cost) VALUES (?,?,?,?,?,?,?,?)', s);
  }

  // ---- Reminders ----
  const reminders = [
    // Trek — most overdue to show red dots
    ['rem-chain', 'Смазка цепи', 'drivetrain', 150, 14, daysAgo(10), 1350],
    ['rem-shift', 'Регулировка переключателей', 'drivetrain', 500, 60, daysAgo(95), 450],
    ['rem-brake-pads', 'Замена тормозных колодок', 'brakes', 800, 120, daysAgo(26), 1200],
    ['rem-fork-service', 'Обслуживание вилки (мелкое)', 'suspension', 500, 90, daysAgo(60), 250],
    ['rem-chain-replace', 'Замена цепи', 'drivetrain', 1000, 0, daysAgo(95), 450],
    ['rem-cassette', 'Замена кассеты', 'drivetrain', 3000, 0, '', 0],
    ['rem-pivot', 'Смазка шарниров подвески', 'suspension', 0, 180, daysAgo(26), 1200],
    ['rem-bearing', 'Замена колёсных подшипников', 'wheels', 0, 365, '', 0],
    ['rem-fork-overhaul', 'Полное обслуживание вилки', 'suspension', 0, 365, '', 0],
    ['rem-headset', 'Обслуживание рулевой колонки', 'frame', 0, 180, daysAgo(150), 0],
    ['rem-wheel-true', 'Правка колёс', 'wheels', 0, 90, '', 0],
    ['rem-brake-fluid', 'Замена тормозной жидкости', 'brakes', 0, 365, '', 0],
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
