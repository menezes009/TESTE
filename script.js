// script.js — versão html5-qrcode com leitura por arquivo robusta
let html5Qrcode;
let currentCameraId = null;
let usedSession = new Set();
let lastText = '';
let lastTime = 0;
const DEBOUNCE = 1500;
let codesMap = {}; // {codigo: {nome, presenca?}}

const elSelect = document.getElementById('cameraSelect');
const elStart = document.getElementById('btnStart');
const elStop = document.getElementById('btnStop');
const elFile = document.getElementById('file');
const elBtnScanFile = document.getElementById('btnScanFile');
const elManual = document.getElementById('manualCode');
const elBtnManual = document.getElementById('btnManual');
const elStatus = document.getElementById('status');
const elList = document.getElementById('list');

function setStatus(text, cls='') {
  elStatus.textContent = text;
  elStatus.className = 'badge ' + cls;
}

function extractCodigo(text) {
  try {
    const u = new URL(text);
    const params = new URLSearchParams(u.search || '');
    const c = params.get('codigo') || params.get('code') || params.get('c');
    if (c) return c.trim();
  } catch {}
  const idx = text.indexOf('codigo=');
  const base = idx >= 0 ? text.slice(idx+7) : text;
  return String(base).split('&')[0].trim();
}

async function loadData() {
  const res = await fetch('data.json?_=' + Date.now());
  const data = await res.json();
  if (Array.isArray(data)) {
    // [{codigo, nome, presenca}] -> map
    data.forEach(row => {
      const k = String(row.codigo || '').trim();
      if (k) codesMap[k] = { name: row.nome || '', presenca: row.presenca || '' };
    });
  } else {
    // {codigo: {name}}
    codesMap = data;
  }
}

function addCheckin(nome, codigo) {
  const li = document.createElement('li');
  const when = new Date().toLocaleString();
  li.textContent = `${nome || codigo} — ${when}`;
  elList.prepend(li);
}

function handle(code) {
  if (!code) return;
  const now = Date.now();
  if (code === lastText && (now - lastTime) < DEBOUNCE) return;
  lastText = code; lastTime = now;

  const item = codesMap[code];
  if (!item) { setStatus('Inválido', 'err'); return; }
  if (String(item.presenca || '').toLowerCase() === 'sim') {
    setStatus(`❌ Já usado por ${item.name || item.nome || ''}`, 'warn');
    return;
  }
  if (usedSession.has(code)) {
    setStatus('⛔ Já lido nesta sessão', 'warn');
    return;
  }
  usedSession.add(code);
  setStatus(`✅ Acesso liberado para ${item.name || item.nome || 'Convidado'}`, 'ok');
  addCheckin(item.name || item.nome || code, code);
}

async function listCameras() {
  const cams = await Html5Qrcode.getCameras();
  elSelect.innerHTML = '';
  cams.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.label || c.id;
    elSelect.appendChild(opt);
  });
  if (cams[0]) currentCameraId = cams[0].id;
}

async function start() {
  await loadData();
  await listCameras();
  if (!currentCameraId) { setStatus('Sem câmera. Use "Ler imagem".', 'warn'); return; }
  if (!html5Qrcode) html5Qrcode = new Html5Qrcode("reader");
  const config = { fps: 10, qrbox: 250, rememberLastUsedCamera: true };
  const camCfg = { deviceId: { exact: currentCameraId } };
  return html5Qrcode.start(camCfg, config, (decodedText) => {
    handle(extractCodigo(decodedText));
  }, () => {})
  .then(() => { elStart.disabled = true; elStop.disabled = false; setStatus('Lendo…', ''); })
  .catch(e => { setStatus('Erro ao iniciar câmera. Permissões/HTTPS.', 'err'); });
}

function stop() {
  if (!html5Qrcode) return;
  html5Qrcode.stop().then(() => {
    elStart.disabled = false; elStop.disabled = true; setStatus('Parado','');
  }).catch(() => {
    elStart.disabled = false; elStop.disabled = true; setStatus('Parado','');
  });
}

elStart.addEventListener('click', start);
elStop.addEventListener('click', stop);
elSelect.addEventListener('change', e => { currentCameraId = e.target.value; if (html5Qrcode) { stop(); start(); } });
elBtnManual.addEventListener('click', () => handle(extractCodigo(elManual.value.trim())));

elBtnScanFile.addEventListener('click', async () => {
  try {
    if (!html5Qrcode) html5Qrcode = new Html5Qrcode("reader");
    const file = elFile.files[0];
    if (!file) { setStatus('Selecione uma imagem primeiro.', 'warn'); return; }
    const result = await html5Qrcode.scanFile(file, true);
    handle(extractCodigo(result));
  } catch (e) {
    setStatus('Falha ao ler a imagem', 'err');
  }
});
