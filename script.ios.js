// script.ios.js – iOS tuned (Safari). Requires data.json in same folder.
// Supports array [{codigo,nome,presenca}] or map {CODE:{name}}.
let html5Qrcode, currentCameraId = null, last = '', lastTime=0;
const DEBOUNCE=1500;
let codesMap = {};

const elStart = document.getElementById('btnStart');
const elStop = document.getElementById('btnStop');
const elSel = document.getElementById('cameraSelect');
const elStatus = document.getElementById('status');

function setStatus(t, cls=''){ elStatus.textContent=t; elStatus.className='badge '+cls; }

function extractCodigo(text){
  try{ const u=new URL(text); const p=new URLSearchParams(u.search||''); const c=p.get('codigo')||p.get('code')||p.get('c'); if(c) return c.trim(); }catch{}
  const idx=text.indexOf('codigo='); const base= idx>=0? text.slice(idx+7): text; return String(base).split('&')[0].trim();
}

async function loadData(){
  const res = await fetch('data.json?_=' + Date.now());
  const data = await res.json();
  if (Array.isArray(data)){
    data.forEach(r=>{ const k=String(r.codigo||'').trim(); if(k) codesMap[k]={ name:r.nome||'', presenca:r.presenca||'' }; });
  } else {
    codesMap = data;
  }
}

async function listCameras(){
  const cams = await Html5Qrcode.getCameras();
  elSel.innerHTML='';
  cams.forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=c.label||c.id; elSel.appendChild(o); });
  if (cams[0]) currentCameraId = cams.find(c=>/back|traseira|back|rear/i.test(c.label||''))?.id || cams[0].id;
}

function handle(text){
  const code = extractCodigo(text);
  if (!code){ setStatus('Inválido', 'err'); return; }
  const now = Date.now(); if (code===last && now-lastTime<DEBOUNCE) return; last=code; lastTime=now;
  const item = codesMap[code];
  if (!item){ setStatus('Inválido', 'err'); return; }
  if (String(item.presenca||'').toLowerCase()==='sim'){ setStatus('❌ Já usado', 'warn'); return; }
  setStatus('✅ Acesso: ' + (item.name || item.nome || 'Convidado'), 'ok');
}

async function start(){
  await loadData(); await listCameras();
  if (!html5Qrcode) html5Qrcode = new Html5Qrcode('reader');
  const config = { fps: 10, qrbox: 250, rememberLastUsedCamera: true };
  const camCfg = currentCameraId ? { deviceId: { exact: currentCameraId } } : { facingMode: 'environment' };
  try{
    await html5Qrcode.start(camCfg, config, (txt)=>handle(txt), ()=>{});
    elStart.disabled=true; elStop.disabled=false; setStatus('Lendo…','');
  }catch(e){
    setStatus('Erro ao iniciar. Abra no Safari e permita câmera.', 'err');
  }
}

function stop(){
  if (!html5Qrcode) return;
  html5Qrcode.stop().then(()=>{ elStart.disabled=false; elStop.disabled=true; setStatus('Parado',''); })
  .catch(()=>{ elStart.disabled=false; elStop.disabled=true; setStatus('Parado',''); });
}

document.getElementById('btnScanFile').addEventListener('click', async ()=>{
  try{
    if (!html5Qrcode) html5Qrcode = new Html5Qrcode('reader');
    const f = document.getElementById('file').files[0];
    if (!f){ setStatus('Selecione uma imagem JPG/PNG', 'warn'); return; }
    // iOS tip: if HEIC, take a screenshot of the QR (gera PNG) e use aqui.
    const txt = await html5Qrcode.scanFile(f, true);
    handle(txt);
  }catch(e){
    setStatus('Falha ao ler a imagem. Use screenshot (PNG) ou JPG.', 'err');
  }
});
document.getElementById('btnManual').addEventListener('click', ()=>{
  const v = document.getElementById('manual').value.trim(); handle(v);
});
elStart.addEventListener('click', start);
elStop.addEventListener('click', stop);
