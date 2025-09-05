// dashboard.js – pacote único (localStorage)
const USED_KEY = 'qr_used';
const LOG_KEY  = 'qr_checkins';

const tbody = document.getElementById('tbody');
const kpiTotal = document.getElementById('kpiTotal');
const kpiUsed = document.getElementById('kpiUsed');
const kpiLeft = document.getElementById('kpiLeft');
const filterInput = document.getElementById('filter');
const btnExport = document.getElementById('btnExport');
const confirmInput = document.getElementById('confirm');
const btnReset = document.getElementById('btnReset');

async function getCodes(){
  const res = await fetch('data.json?_=' + Date.now());
  const data = await res.json();
  if (Array.isArray(data)){
    return data.map(r => String(r.codigo||'').trim()).filter(Boolean);
  }
  return Object.keys(data || {});
}
function getUsed(){ return new Set(JSON.parse(localStorage.getItem(USED_KEY) || '[]')); }
function getCheckins(){ return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); }

async function refresh(){
  const codes = await getCodes();
  const used = getUsed();
  const total = codes.length;
  const usados = codes.filter(c => used.has(c)).length;
  kpiTotal.textContent = total;
  kpiUsed.textContent = usados;
  kpiLeft.textContent = Math.max(0, total - usados);
  renderTable(getCheckins());
}

function renderTable(arr){
  const q = (filterInput.value || '').toLowerCase();
  const rows = arr.slice()
    .sort((a,b)=>(b.at||0)-(a.at||0))
    .filter(c => !q || (String(c.code||'').toLowerCase().includes(q) || String(c.name||'').toLowerCase().includes(q)))
    .map(c => {
      const when = c.at ? new Date(c.at).toLocaleString() : '-';
      return `<tr>
        <td>${when}</td>
        <td>${escapeHtml(c.code||'')}</td>
        <td>${escapeHtml(c.name||'')}</td>
        <td>${escapeHtml(c.deviceId||'local')}</td>
      </tr>`;
    }).join('');
  tbody.innerHTML = rows || '<tr><td colspan="4"><em>Nenhum check-in neste aparelho.</em></td></tr>';
}
function escapeHtml(s){ return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',\"'\":'&#039;' }[m])); }

btnExport.addEventListener('click', () => {
  const header = ['quando','codigo','nome','origem'];
  const rows = getCheckins()
    .slice()
    .sort((a,b)=>(a.at||0)-(b.at||0))
    .map(c => [
      c.at ? new Date(c.at).toISOString() : '',
      (c.code||''), (c.name||''), (c.deviceId||'local')
    ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `checkins-local.csv`; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 5000);
});

confirmInput.addEventListener('input', () => {
  btnReset.disabled = (confirmInput.value.trim().toLowerCase() !== 'resetar');
});
btnReset.addEventListener('click', async () => {
  if (confirmInput.value.trim().toLowerCase() !== 'resetar') return;
  localStorage.removeItem(USED_KEY);
  localStorage.removeItem(LOG_KEY);
  await refresh();
  alert('Reiniciado neste aparelho.');
});

filterInput.addEventListener('input', refresh);
refresh();
