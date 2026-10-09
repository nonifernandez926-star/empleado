// Piezas visuales y utilidades compartidas por el centro de notificaciones y por Ajustes:
// íconos, avisos flotantes (toasts), hojas de confirmación, llamadas a la API y fechas.

const AJ_ICONOS = {
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  bellOff: '<path d="M8.7 3A6 6 0 0 1 18 8c0 2.7.5 4.6 1.1 6"/><path d="M17 17H3s3-2 3-9c0-.9.2-1.7.5-2.5"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="m2 2 20 20"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  shieldAlert: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  lock: '<rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8"/><path d="m16 7 3 3"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  monitor: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 22a10 10 0 1 1 10-10c0 3-2 4-4.5 4H15a2 2 0 0 0-1.4 3.4A2 2 0 0 1 12 22z"/>',
  type: '<path d="M4 7V5h16v2M9 19h6M12 5v14"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  chevronLeft: '<path d="M15 6l-6 6 6 6"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4M12 17h.01"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  message: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  store: '<path d="m3 9 1.5-5h15L21 9"/><path d="M3 9v11h18V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M9 20v-6h6v6"/>',
  package: '<path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  calendarCheck: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star: '<path d="m12 2.5 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 18.2l-6.2 3.3L7 14.7 2 9.8l6.9-1z"/>',
  receipt: '<path d="M4 2v20l3-2 2 2 3-2 3 2 2-2 3 2V2l-3 2-2-2-3 2-3-2-2 2z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M10.7 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6"/><path d="m2 2 20 20M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  sparkles: '<path d="m12 3 1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.2"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  whatsapp: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  crown: '<path d="m3 7 4.5 4L12 4l4.5 7L21 7l-2 12H5L3 7Z"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M7.5 8a2.5 2.5 0 1 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 1 1 0 5"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  medal: '<circle cx="12" cy="15" r="5"/><path d="m8.5 11-2-8h4l1.5 4M15.5 11l2-8h-4L12 7"/>',
  at: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.9 7.9"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3M21 14v.01M14 21h.01M17 21h4v-4"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  map: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
};
function ajIcono(nombre, size = 20, extra = '') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0" ${extra}>${AJ_ICONOS[nombre] || ''}</svg>`;
}
const ajEsc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Llamadas a la API con la sesión del dueño ----------
async function ajApi(ruta, { metodo = 'GET', cuerpo, blob = false } = {}) {
  const res = await fetch(`${API_URL}${ruta}`, {
    method: metodo,
    headers: headersAuth(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    cache: 'no-store',
  });
  if (blob && res.ok) return res.blob();
  let data = null;
  try { data = await res.json(); } catch (e) { /* sin cuerpo */ }
  if (!res.ok) {
    if (res.status === 401 && typeof cerrarSesion === 'function' && !/contraseña/i.test((data && data.error) || '')) {
      // la sesión se cerró desde otro dispositivo o venció
      localStorage.removeItem('jwtToken'); localStorage.removeItem('destinoAcceso');
      location.replace('index.html?acceso=1');
    }
    throw new Error((data && (data.error || data.mensaje)) || 'No se pudo completar. Probá de nuevo.');
  }
  return data;
}

// ---------- Fechas ----------
function ajHace(iso) {
  const seg = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seg < 60) return 'recién';
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`;
  if (seg < 86400 * 2) return 'ayer';
  if (seg < 86400 * 30) return `hace ${Math.floor(seg / 86400)} días`;
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}
const ajFecha = (iso) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
function ajHoraNotif(iso) {
  const d = new Date(iso), hoy = new Date(), ayer = new Date(Date.now() - 86400000);
  const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === hoy.toDateString()) return `Hoy · ${hora}`;
  if (d.toDateString() === ayer.toDateString()) return `Ayer · ${hora}`;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) + ` · ${hora}`;
}

// ---------- Avisos flotantes ----------
function ajToast(texto, tipo = 'ok', { icono, titulo, alTocar, duracion = 3800 } = {}) {
  let caja = document.getElementById('aj-toasts');
  if (!caja) { caja = document.createElement('div'); caja.id = 'aj-toasts'; caja.setAttribute('aria-live', 'polite'); document.body.appendChild(caja); }
  const t = document.createElement('div');
  t.className = `aj-toast aj-toast-${tipo}`;
  const ic = icono || (tipo === 'error' ? 'alert' : tipo === 'info' ? 'bell' : 'check');
  t.innerHTML = `<span class="aj-toast-ic">${ajIcono(ic, 18)}</span><span class="aj-toast-tx">${titulo ? `<strong>${ajEsc(titulo)}</strong>` : ''}<span>${ajEsc(texto)}</span></span>`;
  if (alTocar) { t.classList.add('tocable'); t.addEventListener('click', () => { cerrar(); alTocar(); }); }
  caja.appendChild(t);
  requestAnimationFrame(() => t.classList.add('visible'));
  const cerrar = () => { t.classList.remove('visible'); setTimeout(() => t.remove(), 300); };
  setTimeout(cerrar, duracion);
  while (caja.children.length > 3) caja.firstChild.remove();
  return t;
}

// ---------- Hoja de confirmación (reemplaza al feo confirm() del navegador) ----------
function ajConfirmar({ titulo, texto, boton = 'Confirmar', peligro = false, icono = 'alert' }) {
  return new Promise((resolver) => {
    const fondo = document.createElement('div');
    fondo.className = 'aj-hoja-fondo';
    fondo.innerHTML = `
      <div class="aj-hoja" role="dialog" aria-modal="true" aria-label="${ajEsc(titulo)}">
        <div class="aj-hoja-asa"></div>
        <div class="aj-hoja-ic ${peligro ? 'ic-rojo' : 'ic-azul'}">${ajIcono(icono, 24)}</div>
        <h3>${ajEsc(titulo)}</h3>
        <p>${ajEsc(texto)}</p>
        <button class="aj-btn ${peligro ? 'aj-btn-peligro' : 'aj-btn-primario'}" data-ok>${ajEsc(boton)}</button>
        <button class="aj-btn aj-btn-suave" data-no>Cancelar</button>
      </div>`;
    document.body.appendChild(fondo);
    requestAnimationFrame(() => fondo.classList.add('visible'));
    const fin = (v) => { fondo.classList.remove('visible'); setTimeout(() => fondo.remove(), 250); document.removeEventListener('keydown', tecla); resolver(v); };
    const tecla = (e) => { if (e.key === 'Escape') fin(false); };
    document.addEventListener('keydown', tecla);
    fondo.addEventListener('click', (e) => { if (e.target === fondo) fin(false); });
    fondo.querySelector('[data-ok]').addEventListener('click', () => fin(true));
    fondo.querySelector('[data-no]').addEventListener('click', () => fin(false));
    fondo.querySelector('[data-no]').focus();
  });
}

// ---------- Botón con estado de carga ----------
async function ajConCarga(boton, textoCargando, fn) {
  const original = boton.innerHTML;
  boton.disabled = true;
  boton.classList.add('cargando');
  boton.innerHTML = `<span class="aj-spinner"></span>${ajEsc(textoCargando)}`;
  try { return await fn(); } finally { boton.disabled = false; boton.classList.remove('cargando'); boton.innerHTML = original; }
}

function ajSwitch(clave, activo, deshabilitado = false) {
  return `<label class="aj-sw"><input type="checkbox" data-k="${ajEsc(clave)}" ${activo ? 'checked' : ''} ${deshabilitado ? 'disabled' : ''}><span class="aj-sw-pista"></span></label>`;
}
function ajEsqueleto(filas = 3) {
  return `<div class="aj-esq-lista">${Array.from({ length: filas }, () => '<div class="aj-esq"><i></i><span><b></b><b></b></span></div>').join('')}</div>`;
}
