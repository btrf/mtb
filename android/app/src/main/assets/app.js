const API = '/api';
const isAndroid = typeof Android !== 'undefined';
let androidGet, androidPost, androidPut, androidDel;

if (isAndroid) {
  androidGet = async function(path) {
    const p = path.replace(/^\//, '').split('/');
    if (p[0] === 'bikes' && !p[1]) return JSON.parse(Android.bikesGetAll());
    if (p[0] === 'bikes' && p[1]) return JSON.parse(Android.bikesGetById(p[1]));
    if (p[0] === 'services' && !p[1]) return JSON.parse(Android.servicesGetAll(''));
    if (p[0] === 'services' && p[1]) return JSON.parse(Android.servicesGetAll(p[1]));
    if (p[0] === 'reminders') return JSON.parse(Android.remindersGetAll());
    if (p[0] === 'stats') return JSON.parse(Android.getStats());
    if (p[0] === 'components' && p[1]) return JSON.parse(Android.componentsGetAll(p[1]));
    if (p[0] === 'component' && p[1]) return JSON.parse(Android.componentsGetById(p[1]));
    throw new Error('Unknown path: ' + path);
  };
  androidPost = async function(path, body) {
    const p = path.replace(/^\//, '').split('/');
    const json = JSON.stringify(body);
    if (p[0] === 'bikes') return JSON.parse(Android.bikesCreate(json));
    if (p[0] === 'services') return JSON.parse(Android.servicesCreate(json));
    if (p[0] === 'reminders') return JSON.parse(Android.remindersCreate(json));
    if (p[0] === 'components') return JSON.parse(Android.componentsCreate(json));
    throw new Error('Unknown path: ' + path);
  };
  androidPut = async function(path, body) {
    const p = path.replace(/^\//, '').split('/');
    const json = JSON.stringify(body);
    if (p[0] === 'bikes' && p[1]) { Android.bikesUpdate(p[1], json); return { ok: true }; }
    if (p[0] === 'reminders' && p[1]) { Android.remindersUpdate(p[1], json); return { ok: true }; }
    if (p[0] === 'components' && p[1]) { Android.componentsUpdate(p[1], json); return { ok: true }; }
    throw new Error('Unknown path: ' + path);
  };
  androidDel = async function(path) {
    const p = path.replace(/^\//, '').split('/');
    if (p[0] === 'bikes' && p[1]) { Android.bikesDelete(p[1]); return { ok: true }; }
    if (p[0] === 'services' && p[1]) { Android.servicesDelete(p[1]); return { ok: true }; }
    if (p[0] === 'reminders' && p[1]) { Android.remindersDelete(p[1]); return { ok: true }; }
    if (p[0] === 'components' && p[1]) { Android.componentsDelete(p[1]); return { ok: true }; }
    throw new Error('Unknown path: ' + path);
  };
}

// ---- Dynamic translated lists ----
function getServiceTypes() {
  return [t('st_maintenance'), t('st_repair'), t('st_replacement'), t('st_wash'), t('st_upgrade'), t('st_storage'), t('st_other')];
}

function getCategories() {
  return [
    { id: 'frame', label: t('cat_frame') },
    { id: 'suspension', label: t('cat_suspension') },
    { id: 'brakes', label: t('cat_brakes') },
    { id: 'drivetrain', label: t('cat_drivetrain') },
    { id: 'wheels', label: t('cat_wheels') },
    { id: 'cockpit', label: t('cat_cockpit') },
    { id: 'other', label: t('cat_other') },
  ];
}

function getDefaultReminders() {
  return [
    { id: 'rem-chain', title: t('rem_chain'), intervalKm: 150, intervalDays: 14, category: 'drivetrain' },
    { id: 'rem-shift', title: t('rem_shift'), intervalKm: 500, intervalDays: 60, category: 'drivetrain' },
    { id: 'rem-brake-pads', title: t('rem_brake_pads'), intervalKm: 800, intervalDays: 120, category: 'brakes' },
    { id: 'rem-brake-fluid', title: t('rem_brake_fluid'), intervalKm: 0, intervalDays: 365, category: 'brakes' },
    { id: 'rem-fork-service', title: t('rem_fork_service'), intervalKm: 500, intervalDays: 90, category: 'suspension' },
    { id: 'rem-fork-overhaul', title: t('rem_fork_overhaul'), intervalKm: 0, intervalDays: 365, category: 'suspension' },
    { id: 'rem-chain-replace', title: t('rem_chain_replace'), intervalKm: 1000, intervalDays: 0, category: 'drivetrain' },
    { id: 'rem-cassette', title: t('rem_cassette'), intervalKm: 3000, intervalDays: 0, category: 'drivetrain' },
    { id: 'rem-pivot', title: t('rem_pivot'), intervalKm: 0, intervalDays: 180, category: 'suspension' },
    { id: 'rem-headset', title: t('rem_headset'), intervalKm: 0, intervalDays: 180, category: 'frame' },
    { id: 'rem-wheel-true', title: t('rem_wheel_true'), intervalKm: 0, intervalDays: 90, category: 'wheels' },
    { id: 'rem-bearing', title: t('rem_bearing'), intervalKm: 0, intervalDays: 365, category: 'wheels' },
  ];
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function today() { return new Date().toISOString().slice(0, 10); }

// ---- HTTP helpers ----
async function apiGet(path) {
  if (isAndroid) return androidGet(path);
  const r = await fetch(API + path);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function apiPost(path, body) {
  if (isAndroid) return androidPost(path, body);
  const r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function apiPut(path, body) {
  if (isAndroid) return androidPut(path, body);
  const r = await fetch(API + path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function apiDel(path) {
  if (isAndroid) return androidDel(path);
  const r = await fetch(API + path, { method: 'DELETE' });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ---- Modals ----
function showModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function hideModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) hideModal();
});

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

function kmFormat(km) { return (km || 0).toLocaleString() + ' ' + t('km'); }
function costFormat(cost) { return (cost || 0).toLocaleString('ru-RU') + ' ' + t('rub'); }

function serviceColor(type) {
  const colors = {};
  getServiceTypes().forEach((t, i) => { colors[t] = ['#22c55e', '#ef4444', '#f97316', '#3b82f6', '#a855f7', '#14b8a6', '#94a3b8'][i] || '#94a3b8'; });
  return colors[type] || '#94a3b8';
}

function bikeColor(brand) {
  const colors = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#eab308', '#ef4444'];
  let h = 0;
  for (let i = 0; i < brand.length; i++) h += brand.charCodeAt(i);
  return colors[h % colors.length];
}

function daysBetween(a, b) { return Math.floor((new Date(b) - new Date(a)) / 86400000); }

// ---- Language switcher ----
function renderLangSwitcher() {
  const container = document.getElementById('lang-switcher');
  container.innerHTML = Object.keys(LOCALES).map(code => {
    const active = code === getLangCode() ? ' active' : '';
    return `<button class="lang-btn${active}" onclick="setLang('${code}')">${code.toUpperCase()}</button>`;
  }).join('');
}

function updateStaticNav() {
  document.getElementById('header-subtitle').textContent = t('app_subtitle');
  document.getElementById('nav-dashboard').textContent = t('nav_dashboard');
  document.getElementById('nav-bikes').textContent = t('nav_bikes');
  document.getElementById('nav-service').textContent = t('nav_service');
  document.getElementById('nav-reminders').textContent = t('nav_reminders');
}

// ---- Navigation ----
function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelector(`[data-view="${name}"]`).classList.add('active');
}

// ---- Dashboard ----
function exportData() {
  Android.exportJson();
}

function importFromJson() {
  const input = document.getElementById('import-json-input');
  if (!input.files.length) return;
  if (!confirm(t('import_confirm'))) return;
  const reader = new FileReader();
  reader.onload = function () {
    Android.importJson(reader.result);
    hideModal();
    renderAll();
  };
  reader.readAsText(input.files[0]);
}

function showSettingsModal() {
  showModal(`<h2>${t('settings_title')}</h2>
    <p style="color:var(--text-muted);font-size:13px;margin-bottom:14px">${t('settings_desc')}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <input type="file" id="import-json-input" accept=".json" style="display:none" onchange="importFromJson()">
      <button class="btn btn-outline" onclick="hideModal();exportData()" style="padding:20px;flex-direction:column;height:auto;font-size:15px">
        <div style="font-size:28px;margin-bottom:6px">📤</div>
        <div style="font-weight:700">${t('export_title')}</div>
      </button>
      <button class="btn btn-outline" onclick="document.getElementById('import-json-input').click()" style="padding:20px;flex-direction:column;height:auto;font-size:15px">
        <div style="font-size:28px;margin-bottom:6px">📥</div>
        <div style="font-weight:700">${t('import_title')}</div>
      </button>
    </div>
    <div class="form-actions" style="margin-top:14px">
      <button type="button" class="btn btn-outline" onclick="hideModal()">${t('close')}</button>
    </div>
  `);
}

function showDonateModal() {
  showModal(`<h2 style="display:flex;align-items:center;gap:8px">☕ ${t('donate_title')}</h2>
    <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">${t('donate_text')}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <a href="https://yoomoney.ru/to/41001937179526" target="_blank" class="btn btn-outline" style="padding:14px;flex-direction:column;height:auto;text-decoration:none;display:flex;align-items:center;justify-content:center;text-align:center">
        <div style="font-weight:600;font-size:16px">${t('donate_yoomoney')}</div>
      </a>
      <a href="https://boosty.to/btrf" target="_blank" class="btn btn-outline" style="padding:14px;flex-direction:column;height:auto;text-decoration:none;display:flex;align-items:center;justify-content:center;text-align:center">
        <div style="font-weight:600;font-size:16px">${t('donate_boosty')}</div>
      </a>
    </div>
    <div class="form-actions" style="margin-top:16px">
      <button type="button" class="btn btn-outline" onclick="hideModal()">${t('close')}</button>
    </div>
  `);
}

async function renderDashboard() {
  const [bikes, services, reminders, stats] = await Promise.all([
    apiGet('/bikes'), apiGet('/services'), apiGet('/reminders'), apiGet('/stats'),
  ]);

  const overdue = reminders.filter(r => getReminderStatus(r) === 'overdue');
  const recent = services.slice(0, 5);

  document.getElementById('view-dashboard').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div class="stat-cards" style="flex:1;margin-bottom:0">
        <div class="stat-card"><div class="label">${t('stat_bikes')}</div><div class="value">${stats.bikeCount}</div></div>
        <div class="stat-card"><div class="label">${t('stat_services')}</div><div class="value">${stats.serviceCount}</div></div>
        <div class="stat-card"><div class="label">${t('stat_overdue')}</div><div class="value" style="color:${overdue.length ? 'var(--danger)' : 'var(--success)'}">${overdue.length}</div></div>
        <div class="stat-card"><div class="label">${t('stat_spent')}</div><div class="value" style="font-size:20px">${costFormat(stats.totalCost)}</div></div>
      </div>
      <button class="btn btn-outline" onclick="showDonateModal()" style="flex-shrink:0;margin-left:6px;padding:8px 10px;font-size:16px" title="${t('donate_title')}">☕</button>
      <button class="btn btn-outline" onclick="showSettingsModal()" style="flex-shrink:0;margin-left:6px;padding:8px 10px;font-size:16px" title="${t('settings_title')}">⚙️</button>
    </div>
    <div class="section-header"><h2>${t('recent_title')}</h2><button class="btn btn-sm btn-outline" onclick="switchView('service')">${t('all_btn')}</button></div>
    <div id="recent-services">${recent.length === 0 ? `<div class="empty-state"><div class="icon">📋</div><p>${t('no_records')}</p><button class="btn btn-primary" onclick="showAddServiceModal()">${t('add_record')}</button></div>` : recent.map(s => {
      const b = bikes.find(x => x.id === s.bikeId);
      return `<div class="card" style="cursor:pointer" onclick="switchView('service')">
        <div class="card-header"><div><div class="card-title" style="display:flex;align-items:center;gap:6px"><span class="badge badge-muted">${esc(s.type)}</span>${b ? esc(b.brand) + ' ' + esc(b.model) : '—'}</div><div class="card-subtitle">${s.date} · ${s.odometer ? kmFormat(s.odometer) : '—'}</div></div>${s.cost ? '<div style="color:var(--primary);font-weight:600;font-size:14px">' + costFormat(s.cost) + '</div>' : ''}</div>
        <div class="card-body">${esc(s.description || '')}</div></div>`;
    }).join('')}</div>
    <div class="section-header" style="margin-top:16px"><h2>${t('overdue_title')}</h2><button class="btn btn-sm btn-outline" onclick="switchView('reminders')">${t('all_btn')}</button></div>
    <div id="dashboard-reminders">${overdue.length === 0 ? `<div style="color:var(--text-muted);font-size:13px;padding:8px 0">${t('all_ok')}</div>` : overdue.map(r => `<div class="reminder-item"><div class="reminder-status" style="background:var(--danger)"></div><div class="reminder-info"><div class="title">${esc(reminderTitle(r))}</div><div class="detail">${t('needs_done')}</div></div></div>`).join('')}</div>
  `;
}

// ---- Bikes ----
async function renderBikes() {
  const bikes = await apiGet('/bikes');
  document.getElementById('view-bikes').innerHTML = `
    <div class="section-header"><h2>${t('my_bikes')}</h2><button class="btn btn-primary" onclick="showAddBikeModal()">${t('add_bike_btn')}</button></div>
    <div id="bike-list"></div>
  `;
  const list = document.getElementById('bike-list');
  if (!bikes.length) {
    list.innerHTML = `<div class="empty-state"><div class="icon">🚲</div><p>${t('no_bikes')}</p><button class="btn btn-primary" onclick="showAddBikeModal()">${t('add_bike_empty')}</button></div>`;
    return;
  }
  for (const bike of bikes) {
    const services = await apiGet('/services/' + bike.id);
    const lastKm = services.length ? Math.max(...services.map(s => s.odometer || 0)) : 0;
    list.innerHTML += `<div class="card">
      <div class="card-header">
        <div class="bike-header">
          <div class="bike-avatar" style="background:${bikeColor(bike.brand)}">${esc(bike.brand[0])}</div>
          <div class="bike-info">
            <div class="card-title">${esc(bike.brand)} ${esc(bike.model)}</div>
            <div class="card-subtitle">${bike.year || '—'} · ${t('frame_size')}: ${bike.frameSize || '—'} · ${kmFormat(lastKm)}</div>
            <div class="bike-meta"><span>🔧 ${services.length} ${t('services_count')}</span><span>📅 ${t('added')}: ${bike.createdAt}</span></div>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn btn-sm btn-outline" onclick="showBikeDetail('${bike.id}')">${t('open')}</button>
          <button class="btn btn-sm btn-outline btn-icon" onclick="showEditBikeModal('${bike.id}')">✏️</button>
          <button class="btn btn-sm btn-danger btn-icon" onclick="deleteBike('${bike.id}')">🗑</button>
        </div>
      </div>
    </div>`;
  }
}

function showAddBikeModal() {
  showModal(`<h2>${t('new_bike')}</h2>
    <form onsubmit="addBike(event)">
      <div class="form-row"><div class="form-group"><label>${t('brand')} *</label><input name="brand" placeholder="${t('brand_placeholder')}" required></div><div class="form-group"><label>${t('model')} *</label><input name="model" placeholder="${t('model_placeholder')}" required></div></div>
      <div class="form-row"><div class="form-group"><label>${t('year')}</label><input name="year" type="number" min="1990" max="2030" placeholder="${t('year_placeholder')}"></div><div class="form-group"><label>${t('frame_size')}</label><input name="frameSize" placeholder="${t('frame_placeholder')}"></div></div>
      <div class="form-row"><div class="form-group"><label>${t('color')}</label><input name="color" placeholder="${t('color_placeholder')}"></div><div class="form-group"><label>${t('serial')}</label><input name="serial" placeholder="${t('serial_placeholder')}"></div></div>
      <div class="form-group"><label>${t('notes')}</label><textarea name="notes" placeholder="${t('notes_placeholder')}"></textarea></div>
      <div class="form-actions"><button type="button" class="btn btn-outline" onclick="hideModal()">${t('cancel')}</button><button type="submit" class="btn btn-primary">${t('save')}</button></div>
    </form>`);
}

function showEditBikeModal(id) {
  apiGet('/bikes/' + id).then(bike => {
    if (!bike) return;
    showModal(`<h2>${t('edit_bike')}</h2>
      <form onsubmit="editBike(event, '${id}')">
        <div class="form-row"><div class="form-group"><label>${t('brand')}</label><input name="brand" value="${esc(bike.brand)}" required></div><div class="form-group"><label>${t('model')}</label><input name="model" value="${esc(bike.model)}" required></div></div>
        <div class="form-row"><div class="form-group"><label>${t('year')}</label><input name="year" type="number" min="1990" max="2030" value="${bike.year || ''}"></div><div class="form-group"><label>${t('frame_size')}</label><input name="frameSize" value="${esc(bike.frameSize || '')}"></div></div>
        <div class="form-row"><div class="form-group"><label>${t('color')}</label><input name="color" value="${esc(bike.color || '')}"></div><div class="form-group"><label>${t('serial')}</label><input name="serial" value="${esc(bike.serial || '')}"></div></div>
        <div class="form-group"><label>${t('notes')}</label><textarea name="notes">${esc(bike.notes || '')}</textarea></div>
        <div class="form-actions"><button type="button" class="btn btn-outline" onclick="hideModal()">${t('cancel')}</button><button type="submit" class="btn btn-primary">${t('save')}</button></div>
      </form>`);
  });
}

async function addBike(e) {
  e.preventDefault(); const fd = new FormData(e.target);
  await apiPost('/bikes', { id: uid(), brand: fd.get('brand'), model: fd.get('model'), year: fd.get('year') || '', frameSize: fd.get('frameSize') || '', color: fd.get('color') || '', serial: fd.get('serial') || '', notes: fd.get('notes') || '', createdAt: today() });
  hideModal(); renderAll();
}

async function editBike(e, id) {
  e.preventDefault(); const fd = new FormData(e.target);
  await apiPut('/bikes/' + id, { brand: fd.get('brand'), model: fd.get('model'), year: fd.get('year') || '', frameSize: fd.get('frameSize') || '', color: fd.get('color') || '', serial: fd.get('serial') || '', notes: fd.get('notes') || '' });
  hideModal(); renderAll();
}

async function deleteBike(id) {
  if (!confirm(t('delete_bike_confirm'))) return;
  await apiDel('/bikes/' + id); renderAll();
}

async function showBikeDetail(id) {
  const [bike, services, components] = await Promise.all([apiGet('/bikes/' + id), apiGet('/services/' + id), apiGet('/components/' + id)]);
  if (!bike) return;
  const lastKm = services.length ? Math.max(...services.map(s => s.odometer || 0)) : 0;
  showModal(`<h2>${esc(bike.brand)} ${esc(bike.model)}</h2>
    <div style="margin-bottom:14px;font-size:13px;color:var(--text-muted)">${bike.year ? '📅 ' + bike.year : ''}${bike.frameSize ? ' · ' + t('frame_size') + ': ' + bike.frameSize : ''}${bike.color ? ' · ' + t('color') + ': ' + bike.color : ''}${bike.serial ? ' · S/N: ' + bike.serial : ''}${bike.notes ? '<br>📝 ' + bike.notes : ''}<br>📏 ${kmFormat(lastKm)}</div>
    <div class="section-header"><h3>🔧 ${t('components_title')}</h3><button class="btn btn-sm btn-primary" onclick="showAddComponentModal('${id}')">${t('add_component')}</button></div>
    <div style="margin-bottom:14px">${components.length === 0 ? `<div style="color:var(--text-muted);font-size:13px">${t('no_components')}</div>` : components.map(c => `<div class="service-entry" style="border-left-color:var(--primary)"><div style="display:flex;justify-content:space-between;align-items:center"><div style="flex:1"><div class="type">${esc(c.name)}</div><div class="date">${esc(c.brand||'')} · ${t('install_date')}: ${c.installedDate || '—'} · ${kmFormat(c.installedKm)}</div></div><div style="display:flex;align-items:center;gap:4px"><button class="btn btn-sm btn-outline btn-icon" onclick="showEditComponentModal('${c.id}')">✏️</button><button class="btn btn-sm btn-danger btn-icon" onclick="deleteComponent('${c.id}')">🗑</button></div></div></div>`).join('')}</div>
    <div class="section-header"><h3>📋 ${t('service_log_title')}</h3><button class="btn btn-sm btn-primary" onclick="showAddServiceModal('${id}')">${t('add_service_btn')}</button></div>
    <div>${services.length === 0 ? `<div style="color:var(--text-muted);font-size:13px">${t('no_services')}</div>` : services.map(s => `<div class="service-entry" style="border-left-color:${serviceColor(s.type)}"><div style="display:flex;justify-content:space-between;align-items:center"><div style="flex:1"><div class="date">${s.date} · ${s.odometer ? kmFormat(s.odometer) : '—'}</div><div class="type">${esc(s.type)}</div>${s.description ? '<div class="desc">' + esc(s.description) + '</div>' : ''}${s.cost ? '<div class="cost">' + costFormat(s.cost) + '</div>' : ''}${s.parts ? '<div class="date">🔩 ' + esc(s.parts) + '</div>' : ''}</div><button class="btn btn-sm btn-danger btn-icon" onclick="deleteService('${s.id}')">🗑</button></div></div>`).join('')}</div>
  `);
}

// ---- Components ----
function showAddComponentModal(bikeId) {
  showModal(`<h2>${t('new_component')}</h2>
    <form onsubmit="addComponent(event, '${bikeId}')">
      <div class="form-row"><div class="form-group"><label>${t('component_name')} *</label><input name="name" placeholder="${t('comp_name_placeholder')}" required></div><div class="form-group"><label>${t('component_brand')}</label><input name="brand" placeholder="${t('comp_brand_placeholder')}"></div></div>
      <div class="form-row"><div class="form-group"><label>${t('install_date')}</label><input name="installedDate" type="date" value="${today()}"></div><div class="form-group"><label>${t('install_km')}</label><input name="installedKm" type="number" min="0" value="0"></div></div>
      <div class="form-group"><label>${t('notes')}</label><textarea name="notes" placeholder="${t('comp_notes_placeholder')}"></textarea></div>
      <div class="form-actions"><button type="button" class="btn btn-outline" onclick="hideModal()">${t('cancel')}</button><button type="submit" class="btn btn-primary">${t('save')}</button></div>
    </form>`);
}

async function addComponent(e, bikeId) {
  e.preventDefault(); const fd = new FormData(e.target);
  await apiPost('/components', { id: uid(), bikeId, name: fd.get('name'), brand: fd.get('brand') || '', installedDate: fd.get('installedDate') || '', installedKm: parseInt(fd.get('installedKm')) || 0, notes: fd.get('notes') || '' });
  hideModal(); showBikeDetail(bikeId);
}

async function deleteComponent(compId) {
  if (!confirm(t('delete_comp_confirm'))) return;
  await apiDel('/components/' + compId); hideModal(); renderAll();
}

function showEditComponentModal(compId) {
  apiGet('/component/' + compId).then(c => {
    if (!c) return;
    showModal(`<h2>${t('edit_component')}</h2>
      <form onsubmit="editComponent(event, '${compId}')">
        <div class="form-row"><div class="form-group"><label>${t('component_name')} *</label><input name="name" value="${esc(c.name)}" required></div><div class="form-group"><label>${t('component_brand')}</label><input name="brand" value="${esc(c.brand||'')}"></div></div>
        <div class="form-row"><div class="form-group"><label>${t('install_date')}</label><input name="installedDate" type="date" value="${c.installedDate || today()}"></div><div class="form-group"><label>${t('install_km')}</label><input name="installedKm" type="number" min="0" value="${c.installedKm||0}"></div></div>
        <div class="form-group"><label>${t('notes')}</label><textarea name="notes">${esc(c.notes||'')}</textarea></div>
        <div class="form-actions"><button type="button" class="btn btn-outline" onclick="hideModal()">${t('cancel')}</button><button type="submit" class="btn btn-primary">${t('save')}</button></div>
      </form>`);
  });
}

async function editComponent(e, compId) {
  e.preventDefault(); const fd = new FormData(e.target);
  await apiPut('/components/' + compId, { name: fd.get('name'), brand: fd.get('brand') || '', installedDate: fd.get('installedDate') || '', installedKm: parseInt(fd.get('installedKm')) || 0, notes: fd.get('notes') || '' });
  hideModal(); renderAll();
}

// ---- Service Log ----
async function renderServiceLog() {
  const [bikes, services] = await Promise.all([apiGet('/bikes'), apiGet('/services')]);
  const bikeOpts = bikes.map(b => `<option value="${b.id}">${esc(b.brand)} ${esc(b.model)}</option>`).join('');
  document.getElementById('view-service').innerHTML = `
    <div class="section-header"><h2>${t('service_title')}</h2><button class="btn btn-primary" onclick="showAddServiceModal('')">${t('add_entry')}</button></div>
    <div class="filter-bar">
      <select id="filter-bike" onchange="filterServiceLog()"><option value="">${t('all_bikes')}</option>${bikeOpts}</select>
      <select id="filter-type" onchange="filterServiceLog()"><option value="">${t('all_types')}</option>${getServiceTypes().map(t => `<option value="${t}">${t}</option>`).join('')}</select>
      <input type="text" id="filter-search" placeholder="${t('search')}" oninput="filterServiceLog()" style="flex:1;min-width:120px">
    </div>
    <div id="service-list"></div>
  `;
  window.__allServices = services;
  window.__allBikes = bikes;
  filterServiceLog();
}

function filterServiceLog() {
  const bikeF = document.getElementById('filter-bike').value;
  const typeF = document.getElementById('filter-type').value;
  const search = document.getElementById('filter-search').value.toLowerCase();
  const all = window.__allServices || [];
  const bikes = window.__allBikes || [];
  let filtered = all.filter(s => (!bikeF || s.bikeId === bikeF) && (!typeF || s.type === typeF));
  if (search) filtered = filtered.filter(s => s.description.toLowerCase().includes(search) || s.parts.toLowerCase().includes(search) || (bikes.find(b => b.id === s.bikeId)?.brand + ' ' + bikes.find(b => b.id === s.bikeId)?.model).toLowerCase().includes(search));
  filtered.sort((a, b) => b.date.localeCompare(a.date));
  const list = document.getElementById('service-list');
  if (!filtered.length) { list.innerHTML = `<div class="empty-state"><div class="icon">📝</div><p>${t('not_found')}</p></div>`; return; }
  list.innerHTML = filtered.map(s => {
    const b = bikes.find(x => x.id === s.bikeId);
    return `<div class="card"><div class="card-header"><div><div class="card-title" style="display:flex;align-items:center;gap:8px"><span class="badge ${s.cost ? 'badge-primary' : 'badge-muted'}">${esc(s.type)}</span>${b ? esc(b.brand) + ' ' + esc(b.model) : '—'}</div><div class="card-subtitle">${s.date} · ${s.odometer ? kmFormat(s.odometer) : t('no_odometer')}</div></div><button class="btn btn-sm btn-danger btn-icon" onclick="deleteService('${s.id}')">🗑</button></div><div class="card-body">${s.description ? '<p>' + esc(s.description) + '</p>' : ''}${s.parts ? '<p>🔩 ' + esc(s.parts) + '</p>' : ''}${s.cost ? '<p style="margin-top:4px"><strong>' + costFormat(s.cost) + '</strong></p>' : ''}</div></div>`;
  }).join('');
}

function showAddServiceModal(bikeId) {
  apiGet('/bikes').then(bikes => {
    const bikeOpts = bikes.map(b => `<option value="${b.id}" ${b.id === bikeId ? 'selected' : ''}>${esc(b.brand)} ${esc(b.model)}</option>`).join('');
    showModal(`<h2>${t('new_entry_title')}</h2>
      <form onsubmit="addService(event)">
        <div class="form-group"><label>${t('bike')}</label><select name="bikeId" required><option value="">${t('select_bike')}</option>${bikeOpts}</select></div>
        <div class="form-row"><div class="form-group"><label>${t('date')} *</label><input name="date" type="date" value="${today()}" required></div><div class="form-group"><label>${t('odometer')}</label><input name="odometer" type="number" min="0"></div></div>
        <div class="form-group"><label>${t('type')}</label><select name="type" required>${getServiceTypes().map(t => `<option value="${t}">${t}</option>`).join('')}</select></div>
        <div class="form-group"><label>${t('description')}</label><textarea name="description" placeholder="${t('what_done')}"></textarea></div>
        <div class="form-group"><label>${t('parts_used_label')}</label><textarea name="parts" placeholder="${t('parts_placeholder')}"></textarea></div>
        <div class="form-group"><label>${t('cost')}</label><input name="cost" type="number" min="0" step="0.01"></div>
        <div class="form-actions"><button type="button" class="btn btn-outline" onclick="hideModal()">${t('cancel')}</button><button type="submit" class="btn btn-primary">${t('save')}</button></div>
      </form>`);
  });
}

async function addService(e) {
  e.preventDefault(); const fd = new FormData(e.target);
  if (!fd.get('bikeId')) return;
  await apiPost('/services', { id: uid(), bikeId: fd.get('bikeId'), date: fd.get('date'), odometer: parseInt(fd.get('odometer')) || 0, type: fd.get('type'), description: fd.get('description') || '', parts: fd.get('parts') || '', cost: parseFloat(fd.get('cost')) || 0 });
  hideModal(); renderAll();
}

async function deleteService(id) {
  if (!confirm(t('delete_service_confirm'))) return;
  await apiDel('/services/' + id); renderAll();
}

// ---- Reminders ----
async function renderReminders() {
  document.getElementById('view-reminders').innerHTML = `
    <div class="section-header"><h2>${t('reminders_title')}</h2><button class="btn btn-primary" onclick="showAddReminderModal()">${t('add_custom')}</button></div>
    <div id="reminders-list"></div>`;
  drawReminders(await apiGet('/reminders'));
}

function drawReminders(reminders) {
  const list = document.getElementById('reminders-list');
  if (!reminders.length) { list.innerHTML = `<div class="empty-state"><div class="icon">🔔</div><p>${t('no_reminders')}</p></div>`; return; }
  const groups = { overdue: [], upcoming: [], ok: [] };
  reminders.forEach(r => { const s = getReminderStatus(r); groups[s].push({ r, s }); });
  const labels = { overdue: t('overdue_section'), upcoming: t('upcoming_section'), ok: t('ok_section') };
  const categories = getCategories();
  let html = '';
  for (const key of ['overdue', 'upcoming', 'ok']) {
    if (!groups[key].length) continue;
    html += `<h3 style="font-size:14px;margin:12px 0 8px;color:var(--text-muted)">${labels[key]}</h3>`;
    for (const { r, s } of groups[key]) {
      const cat = categories.find(c => c.id === r.category);
      const detailParts = [];
      if (cat) detailParts.push(cat.label);
      if (r.intervalKm) detailParts.push('· ' + t('every_km') + ' ' + r.intervalKm + ' ' + t('km_unit'));
      if (r.intervalDays) detailParts.push('· ' + t('every_days') + ' ' + r.intervalDays + ' ' + t('days_unit'));
      if (r.lastDate) detailParts.push('· ' + t('last') + ': ' + r.lastDate);
      html += `<div class="reminder-item"><div class="reminder-status" style="background:${s === 'overdue' ? 'var(--danger)' : s === 'upcoming' ? 'var(--warning)' : 'var(--success)'}"></div><div class="reminder-info"><div class="title">${esc(reminderTitle(r))}</div><div class="detail">${detailParts.join(' ')}</div></div><button class="btn btn-sm btn-outline" onclick="resetReminder('${r.id}')">${t('done_btn')}</button><button class="btn btn-sm btn-danger btn-icon" onclick="deleteReminder('${r.id}')">🗑</button></div>`;
    }
  }
  list.innerHTML = html || `<div class="empty-state"><div class="icon">✅</div><p>${t('all_good')}</p></div>`;
}

function reminderTitle(r) {
  if (r.id.startsWith('rem-')) {
    const key = r.id.replace(/-/g, '_');
    const translated = t(key);
    if (translated !== key) return translated;
  }
  return r.title;
}

function getReminderStatus(r) {
  const ds = r.lastDate ? daysBetween(r.lastDate, today()) : Infinity;
  const ks = r.lastKm || 0;
  if ((r.intervalKm && ks >= r.intervalKm) || (r.intervalDays && ds >= r.intervalDays)) return 'overdue';
  if ((r.intervalKm && ks >= r.intervalKm * 0.8) || (r.intervalDays && ds >= r.intervalDays * 0.8)) return 'upcoming';
  return 'ok';
}

async function resetReminder(id) {
  await apiPut('/reminders/' + id, { lastDate: today(), lastKm: 0 });
  drawReminders(await apiGet('/reminders')); renderDashboard();
}

async function deleteReminder(id) {
  if (!confirm(t('delete_reminder_confirm'))) return;
  await apiDel('/reminders/' + id); renderReminders(); renderDashboard();
}

function showAddReminderModal() {
  const catOptions = getCategories().map(c => `<option value="${c.id}">${c.label}</option>`).join('');
  showModal(`<h2>${t('new_reminder')}</h2>
    <form onsubmit="addReminder(event)">
      <div class="form-group"><label>${t('reminder_title')} *</label><input name="title" placeholder="${t('placeholder_reminder')}" required></div>
      <div class="form-group"><label>${t('reminder_category')}</label><select name="category">${catOptions}</select></div>
      <div class="form-row"><div class="form-group"><label>${t('interval_km')}</label><input name="intervalKm" type="number" min="0" value="0"></div><div class="form-group"><label>${t('interval_days')}</label><input name="intervalDays" type="number" min="0" value="0"></div></div>
      <div class="form-actions"><button type="button" class="btn btn-outline" onclick="hideModal()">${t('cancel')}</button><button type="submit" class="btn btn-primary">${t('save')}</button></div>
    </form>`);
}

async function addReminder(e) {
  e.preventDefault(); const fd = new FormData(e.target);
  await apiPost('/reminders', { id: uid(), title: fd.get('title'), category: fd.get('category') || 'other', intervalKm: parseInt(fd.get('intervalKm')) || 0, intervalDays: parseInt(fd.get('intervalDays')) || 0, lastDate: '', lastKm: 0 });
  hideModal(); renderReminders(); renderDashboard();
}

// ---- Render All ----
async function renderAll() {
  renderLangSwitcher();
  updateStaticNav();
  await Promise.all([renderDashboard(), renderBikes(), renderServiceLog(), renderReminders()]);
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
  switchView('dashboard');
  renderAll();
});
