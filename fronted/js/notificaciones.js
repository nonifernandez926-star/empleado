// Centro de notificaciones del dueño + avisos al celular (push).
// Cada aviso sale de un dato real del negocio (lo arma el servidor en /cuenta/novedades). Acá solo se guarda
// en el celular cuáles ya leíste y cuáles borraste.

const NT_TIPOS = {
  pedido:      { icono: 'package',       color: 'azul',     cat: 'pedidos' },
  comprobante: { icono: 'receipt',       color: 'verde',    cat: 'pedidos' },
  turno:       { icono: 'calendarCheck', color: 'azul',     cat: 'pedidos' },
  agenda:      { icono: 'clock',         color: 'celeste',  cat: 'pedidos' },
  resena:      { icono: 'star',          color: 'amarillo', cat: 'clientes' },
  alerta:      { icono: 'alert',         color: 'rojo',     cat: 'clientes' },
  pregunta:    { icono: 'help',          color: 'violeta',  cat: 'clientes' },
  suscripcion: { icono: 'card',          color: 'naranja',  cat: 'cuenta' },
  soporte:     { icono: 'message',       color: 'verde',    cat: 'cuenta' },
  seguridad:   { icono: 'shieldAlert',   color: 'rojo',     cat: 'cuenta' },
};
const NT_K = { leidas: 'miAsistenteNotifLeidas', borradas: 'miAsistenteNotifBorradas', vistas: 'miAsistenteNotifVistas', sonido: 'miAsistenteSonido', banner: 'miAsistenteBannerPush' };
const NT = { lista: [], leidas: new Set(), borradas: new Set(), vistas: new Set(), cargado: false, filtro: 'todas', timer: null, abierta: false };

function ntLeerSet(k) { try { return new Set(JSON.parse(localStorage.getItem(k) || '[]')); } catch (e) { return new Set(); } }
function ntGuardarSet(k, set) { try { localStorage.setItem(k, JSON.stringify([...set].slice(-400))); } catch (e) { /* sin almacenamiento */ } }
const ntSonidoActivo = () => localStorage.getItem(NT_K.sonido) !== '0';

function ntVisibles() { return NT.lista.filter((n) => !NT.borradas.has(n.id)); }
function ntNoLeidas() { return ntVisibles().filter((n) => !NT.leidas.has(n.id)); }

// ---------- Datos ----------
async function ntRefrescar() {
  if (typeof negocioActual === 'undefined' || !negocioActual || !jwtTokenActual) return;
  let lista;
  try { lista = await ajApi('/cuenta/novedades'); } catch (e) { return; }
  const primeraVez = !localStorage.getItem(NT_K.leidas);
  NT.lista = lista;

  if (primeraVez) { // lo viejo no debe llegar como "sin leer" de golpe
    lista.filter((n) => Date.now() - new Date(n.fecha).getTime() > 2 * 86400000).forEach((n) => NT.leidas.add(n.id));
    ntGuardarSet(NT_K.leidas, NT.leidas);
  }

  const nuevos = ntVisibles().filter((n) => !NT.vistas.has(n.id) && !NT.leidas.has(n.id));
  if (NT.cargado && nuevos.length) ntAvisarNuevos(nuevos);
  ntVisibles().forEach((n) => NT.vistas.add(n.id));
  ntGuardarSet(NT_K.vistas, NT.vistas);
  NT.cargado = true;

  ntActualizarBadge();
  if (NT.abierta) ntRender(false);
}

function ntAvisarNuevos(nuevos) {
  const mostrar = nuevos.slice(0, 2);
  mostrar.forEach((n, i) => setTimeout(() => {
    const t = NT_TIPOS[n.tipo] || NT_TIPOS.pedido;
    ajToast(n.descripcion, 'info', { titulo: n.titulo, icono: t.icono, alTocar: () => ntAbrirAviso(n.id), duracion: 6000 });
  }, i * 450));
  if (nuevos.length > 2) setTimeout(() => ajToast(`${nuevos.length - 2} avisos más en tus notificaciones.`, 'info', { alTocar: ntAbrir }), 1000);
  if (ntSonidoActivo() && typeof reproducirSonidoAviso === 'function') reproducirSonidoAviso();
  const campana = document.getElementById('btn-campana');
  if (campana) { campana.classList.remove('sacudir'); void campana.offsetWidth; campana.classList.add('sacudir'); }
  if (typeof tituloOriginal !== 'undefined') {
    document.title = `(${ntNoLeidas().length}) ${tituloOriginal}`;
    setTimeout(() => { document.title = tituloOriginal; }, 8000);
  }
  // si llegó algo que se ve en otra pestaña del panel, la actualizamos sin que tengas que recargar
  const tipos = new Set(nuevos.map((n) => n.tipo));
  try {
    if (tipos.has('pedido') || tipos.has('comprobante')) { if (typeof cargarPedidos === 'function') cargarPedidos(); }
    if (tipos.has('turno') && typeof cargarTurnos === 'function') cargarTurnos();
    if (typeof cargarResumenDiario === 'function') cargarResumenDiario();
    if (tipos.has('pregunta') && typeof cargarPreguntasFrecuentes === 'function') cargarPreguntasFrecuentes();
  } catch (e) { /* si falla una actualización, no importa: se ve al recargar */ }
}

function ntActualizarBadge() {
  const n = ntNoLeidas().length;
  const badge = document.getElementById('badge-campana');
  if (!badge) return;
  if (n > 0) {
    badge.textContent = n > 9 ? '9+' : n;
    badge.style.display = 'flex';
    badge.classList.remove('rebota'); void badge.offsetWidth; badge.classList.add('rebota');
  } else badge.style.display = 'none';
  const el = document.getElementById('nt-sub');
  if (el) el.textContent = n > 0 ? `${n} sin leer` : 'Estás al día';
}

// ---------- Pantalla ----------
function ntAbrir() {
  const p = document.getElementById('pantalla-notificaciones');
  if (!p) return;
  NT.abierta = true;
  p.classList.add('abierta');
  document.body.classList.add('sin-scroll');
  ntRender(true);
  ntRefrescar();
}
function ntCerrar() {
  NT.abierta = false;
  const p = document.getElementById('pantalla-notificaciones');
  if (p) p.classList.remove('abierta');
  document.body.classList.remove('sin-scroll');
}
function ntAbrirAviso(id) {
  const n = NT.lista.find((x) => x.id === id);
  if (!n) return ntAbrir();
  NT.leidas.add(id); ntGuardarSet(NT_K.leidas, NT.leidas); ntActualizarBadge();
  ajIr(n.destino);
}
function ntMarcarTodas() {
  ntVisibles().forEach((n) => NT.leidas.add(n.id));
  ntGuardarSet(NT_K.leidas, NT.leidas);
  ntActualizarBadge(); ntRender(false);
  ajToast('Marcaste todo como leído.', 'ok');
}

const NT_FILTROS = [['todas', 'Todas'], ['sinleer', 'Sin leer'], ['pedidos', 'Actividad'], ['clientes', 'Clientes'], ['cuenta', 'Cuenta']];

function ntGrupo(fecha) {
  const d = new Date(fecha), hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) return 'Hoy';
  if (d.toDateString() === new Date(Date.now() - 86400000).toDateString()) return 'Ayer';
  return 'Anteriores';
}

async function ntRender(conAnimacion) {
  const cont = document.getElementById('nt-contenido');
  if (!cont) return;
  const esTurnos = negocioActual && negocioActual.tipoOperacion === 'turnos';
  NT_FILTROS[2][1] = esTurnos ? 'Consultas' : 'Pedidos';

  const todas = ntVisibles();
  let lista = todas;
  if (NT.filtro === 'sinleer') lista = todas.filter((n) => !NT.leidas.has(n.id));
  else if (NT.filtro !== 'todas') lista = todas.filter((n) => (NT_TIPOS[n.tipo] || {}).cat === NT.filtro);

  const sub = ntNoLeidas().length;
  document.getElementById('nt-sub').textContent = sub > 0 ? `${sub} sin leer` : 'Estás al día';
  document.getElementById('nt-marcar').style.display = sub > 0 ? '' : 'none';

  document.getElementById('nt-chips').innerHTML = NT_FILTROS.map(([id, nombre]) => {
    const cuenta = id === 'sinleer' ? sub : 0;
    return `<button class="nt-chip ${NT.filtro === id ? 'activo' : ''}" data-f="${id}">${nombre}${cuenta ? `<b>${cuenta}</b>` : ''}</button>`;
  }).join('');

  // invitación a activar los avisos del celular (si todavía no están)
  let banner = '';
  const estadoPush = await avEstadoPush();
  if (estadoPush.estado === 'inactivo' && localStorage.getItem(NT_K.banner) !== '1') {
    banner = `<div class="nt-banner">
      <div class="nt-banner-ic">${ajIcono('bell', 20)}</div>
      <div class="nt-banner-tx"><strong>Recibí los avisos en tu celular</strong><span>Pedidos, turnos y reseñas, aunque tengas el panel cerrado.</span></div>
      <button class="nt-banner-btn" id="nt-activar">Activar</button>
      <button class="nt-banner-x" id="nt-banner-x" aria-label="Ocultar">${ajIcono('x', 16)}</button>
    </div>`;
  }

  if (!lista.length) {
    const vacio = NT.filtro === 'sinleer' ? ['Todo leído', 'No tenés avisos sin leer.'] : todas.length ? ['Nada por acá', 'No hay avisos en esta categoría.'] : ['Todavía no hay avisos', 'Cuando llegue un pedido, un turno, una reseña o algo de tu cuenta, lo ves acá.'];
    cont.innerHTML = `${banner}<div class="nt-vacio"><div class="nt-vacio-halo"><span>${ajIcono('bell', 30)}</span></div><strong>${vacio[0]}</strong><p>${vacio[1]}</p></div>`;
  } else {
    const grupos = {};
    lista.forEach((n) => { (grupos[ntGrupo(n.fecha)] = grupos[ntGrupo(n.fecha)] || []).push(n); });
    let i = 0;
    cont.innerHTML = banner + ['Hoy', 'Ayer', 'Anteriores'].filter((g) => grupos[g]).map((g) => `
      <div class="nt-grupo"><h4>${g}</h4>
      ${grupos[g].map((n) => {
        const t = NT_TIPOS[n.tipo] || NT_TIPOS.pedido;
        const sinLeer = !NT.leidas.has(n.id);
        return `<div class="nt-fila-caja ${conAnimacion ? 'entra' : ''}" style="animation-delay:${Math.min(i++, 9) * 40}ms" data-id="${ajEsc(n.id)}">
          <div class="nt-fila-borrar">${ajIcono('trash', 20)}</div>
          <button class="nt-fila ${sinLeer ? 'sin-leer' : ''}">
            <span class="nt-ic ic-${t.color}">${ajIcono(t.icono, 20)}</span>
            <span class="nt-tx"><strong>${ajEsc(n.titulo)}</strong><span>${ajEsc(n.descripcion)}</span>
              <small>${ajHoraNotif(n.fecha)}${n.pendiente ? '<em>Pendiente</em>' : ''}</small></span>
            ${sinLeer ? '<i class="nt-punto"></i>' : ''}
          </button>
        </div>`;
      }).join('')}</div>`).join('') + `<p class="nt-pie">Deslizá un aviso hacia la derecha para borrarlo.</p>`;
  }
  ntEnlazar(cont);
}

function ntEnlazar(cont) {
  document.querySelectorAll('#nt-chips .nt-chip').forEach((b) => b.addEventListener('click', () => { NT.filtro = b.dataset.f; ntRender(false); }));
  const activar = document.getElementById('nt-activar');
  if (activar) activar.addEventListener('click', () => ajConCarga(activar, 'Activando...', async () => {
    try { await avActivarPush(); ajToast('Listo: vas a recibir los avisos en este celular.', 'ok'); } catch (e) { ajToast(e.message, 'error'); }
    ntRender(false);
  }));
  const x = document.getElementById('nt-banner-x');
  if (x) x.addEventListener('click', () => { localStorage.setItem(NT_K.banner, '1'); ntRender(false); });

  cont.querySelectorAll('.nt-fila-caja').forEach((caja) => {
    const id = caja.dataset.id, fila = caja.querySelector('.nt-fila');
    let x0 = null, dx = 0, movio = false;
    const borrar = () => {
      caja.classList.add('saliendo');
      setTimeout(() => {
        NT.borradas.add(id); ntGuardarSet(NT_K.borradas, NT.borradas);
        ntActualizarBadge(); ntRender(false);
      }, 260);
    };
    fila.addEventListener('pointerdown', (e) => { x0 = e.clientX; dx = 0; movio = false; fila.style.transition = 'none'; });
    fila.addEventListener('pointermove', (e) => {
      if (x0 === null) return;
      dx = Math.max(0, Math.min(160, e.clientX - x0));
      if (dx > 6) { movio = true; fila.style.transform = `translateX(${dx}px)`; caja.style.setProperty('--arrastre', Math.min(1, dx / 90)); }
    });
    const soltar = () => {
      if (x0 === null) return;
      x0 = null; fila.style.transition = '';
      if (dx > 90) { fila.style.transform = 'translateX(110%)'; borrar(); }
      else { fila.style.transform = ''; caja.style.setProperty('--arrastre', 0); }
    };
    fila.addEventListener('pointerup', soltar);
    fila.addEventListener('pointercancel', soltar);
    fila.addEventListener('pointerleave', () => { if (x0 !== null) soltar(); });
    fila.addEventListener('click', (e) => { if (movio) { e.preventDefault(); movio = false; return; } ntAbrirAviso(id); });
  });
}

// ---------- Ir a la pantalla de cada aviso ----------
function ajAbrirFS(panelId) {
  const fila = document.querySelector(`.list-row[data-fullscreen="${panelId}"]`);
  if (typeof abrirPantallaCompleta === 'function') abrirPantallaCompleta(panelId, fila ? fila.dataset.titulo : '');
}
function ajPendientes() {
  const esTurnos = negocioActual && negocioActual.tipoOperacion === 'turnos';
  const tab = document.querySelector(`#${esTurnos ? 'tabs-turnos' : 'tabs-pedidos'} .tab-pill[data-filtro="pendiente"]`);
  if (tab) tab.click();
}
function ajIr(destino) {
  ntCerrar();
  const esTurnos = negocioActual && negocioActual.tipoOperacion === 'turnos';
  switch (destino) {
    case 'pedidos': mostrarSeccion('pedidos'); ajPendientes(); break;
    case 'agenda': if (esTurnos) { mostrarSeccion('pedidos'); ajPendientes(); } else mostrarSeccion('agenda'); break;
    case 'resenas': mostrarSeccion('negocio'); ajAbrirFS('panel-experiencia'); break;
    case 'preguntas': mostrarSeccion('negocio'); ajAbrirFS('panel-preguntas'); break;
    case 'planes': mostrarSeccion('ajustes'); ajAbrirFS('panel-planes'); break;
    case 'soporte': mostrarSeccion('ajustes'); ajAbrirFS('panel-soporte'); break;
    case 'seguridad': mostrarSeccion('ajustes'); ajAbrirFS('panel-seguridad'); break;
    case 'notificaciones': mostrarSeccion('ajustes'); ajAbrirFS('panel-notificaciones'); break;
    default: break;
  }
}

// ---------- Avisos al celular (push) ----------
function avBase64(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from([...atob(base64)].map((c) => c.charCodeAt(0)));
}
const avSoportado = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// estado: no-soportado | bloqueado | sin-servidor | inactivo | activo
async function avEstadoPush() {
  if (!avSoportado()) return { estado: 'no-soportado', dispositivos: [] };
  if (Notification.permission === 'denied') return { estado: 'bloqueado', dispositivos: [] };
  try {
    const srv = await ajApi('/push/dueno/estado');
    if (!srv.configurado) return { estado: 'sin-servidor', dispositivos: srv.dispositivos || [] };
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    const activoAca = !!(sub && (srv.dispositivos || []).some((d) => d.endpoint === sub.endpoint));
    return { estado: activoAca ? 'activo' : 'inactivo', dispositivos: srv.dispositivos || [], endpointActual: sub && sub.endpoint };
  } catch (e) {
    return { estado: 'inactivo', dispositivos: [], error: true };
  }
}

async function avActivarPush() {
  if (!avSoportado()) throw new Error('Este navegador no permite avisos. En iPhone, agregá el panel a la pantalla de inicio y activalos desde ahí.');
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') throw new Error('Los avisos están bloqueados. Habilitalos desde los permisos del navegador para este sitio.');
  const resClave = await fetch(`${API_URL}/push/clave-publica`);
  if (!resClave.ok) throw new Error('Los avisos al celular todavía no están disponibles en el servidor.');
  const { publicKey } = await resClave.json();
  const registro = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  let sub = await registro.pushManager.getSubscription();
  if (!sub) sub = await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: avBase64(publicKey) });
  await ajApi('/push/dueno/suscribirse', { metodo: 'POST', cuerpo: { subscription: sub.toJSON() } });
}

async function avDesactivarPush(endpoint) {
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  const ep = endpoint || (sub && sub.endpoint);
  if (ep) await ajApi('/push/dueno/cancelar', { metodo: 'POST', cuerpo: { endpoint: ep } });
  if (sub && (!endpoint || endpoint === sub.endpoint)) await sub.unsubscribe().catch(() => null);
}

// ---------- Arranque ----------
function ntIniciar() {
  NT.leidas = ntLeerSet(NT_K.leidas); NT.borradas = ntLeerSet(NT_K.borradas); NT.vistas = ntLeerSet(NT_K.vistas);
  const campana = document.getElementById('btn-campana');
  if (campana && !campana.dataset.nt) { campana.dataset.nt = '1'; campana.addEventListener('click', ntAbrir); }
  document.getElementById('nt-volver')?.addEventListener('click', ntCerrar);
  document.getElementById('nt-marcar')?.addEventListener('click', ntMarcarTodas);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && NT.abierta) ntCerrar(); });

  ntRefrescar();
  clearInterval(NT.timer);
  NT.timer = setInterval(() => { if (!document.hidden) ntRefrescar(); }, 40000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) ntRefrescar(); });

  // al tocar un aviso del celular con el panel ya abierto, el service worker nos manda a dónde ir
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.tipo === 'ir' && e.data.destino) ajIr(e.data.destino); });

  // enlace profundo: /admin.html?ir=pedidos (viene de tocar un aviso con el panel cerrado)
  const ir = new URLSearchParams(location.search).get('ir');
  if (ir) { history.replaceState(null, '', location.pathname); setTimeout(() => ajIr(ir), 500); }
}
