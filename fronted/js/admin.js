let jwtTokenActual = null;
let negocioActual = null;
let inicialNegocio = 'N';

// Iconos SVG chicos para usar dentro de las tarjetas de pedido (nada de emojis)
const ICONOS_PEDIDO = {
  moto: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><circle cx="9" cy="7" r="1.4" fill="currentColor" stroke="none"/><path d="M9 8.5v3l2.5 2"/><path d="M8 11.5h4"/><circle cx="5.5" cy="17.5" r="3"/><circle cx="18.5" cy="17.5" r="3"/><path d="M11.5 13.5H9l-1.5 4h6l-1-4h4l2 4h2.5"/></svg>',
  efectivo: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9v.01M18 15v.01"/></svg>',
  transferencia: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M4 7h13"/><path d="M13 3l4 4-4 4"/><path d="M20 17H7"/><path d="M11 21l-4-4 4-4"/></svg>',
  casa: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M3 9.5 12 3l9 6.5"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/></svg>',
  tarjeta: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
  nota: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>',
  check: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
  equis: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
  tacho: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
  flecha: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  persona: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 16 0v1"/></svg>',
  reloj: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  pin: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.3"/></svg>',
};

// Elige el ícono según el texto de forma de pago (efectivo / transferencia / tarjeta / otro)
function iconoFormaPago(formaPago = '') {
  const texto = formaPago.toLowerCase();
  if (texto.includes('transfer')) return ICONOS_PEDIDO.transferencia;
  if (texto.includes('efectivo')) return ICONOS_PEDIDO.efectivo;
  return ICONOS_PEDIDO.tarjeta;
}

// Headers con la sesión de la cuenta (Google)
function headersAuth(extra = {}) {
  return { ...extra, Authorization: `Bearer ${jwtTokenActual}` };
}

// Sin sesión válida se vuelve a la pantalla de acceso (Google), sin códigos
function irAlAcceso() { location.replace('index.html?acceso=1'); }

// Si ya había una sesión guardada, entramos directo; si no, vamos al acceso
async function intentarSesionGuardada() {
  const tokenGuardado = localStorage.getItem('jwtToken');
  if (!tokenGuardado) { irAlAcceso(); return; }

  jwtTokenActual = tokenGuardado;
  try {
    const res = await fetch(`${API_URL}/negocios/mi-negocio`, { headers: headersAuth() });
    if (res.status === 403) { location.replace('registro.html'); return; } // tiene cuenta pero todavía no creó su asistente
    if (!res.ok) throw new Error('Sesión vencida');
    negocioActual = await res.json();
    mostrarPanel();
  } catch (error) {
    jwtTokenActual = null;
    localStorage.removeItem('jwtToken');
    irAlAcceso();
  }
}

function cerrarSesion(e) {
  if (e) e.preventDefault();
  localStorage.removeItem('jwtToken');
  jwtTokenActual = null;
  negocioActual = null;
  location.replace('index.html');
}

function abrirDrawer() {
  document.getElementById('drawer').classList.add('abierto');
  document.getElementById('drawer-overlay').classList.add('abierto');
}
function cerrarDrawer() {
  document.getElementById('drawer').classList.remove('abierto');
  document.getElementById('drawer-overlay').classList.remove('abierto');
}

// Muestra la foto real del negocio (categoría "logo") en los avatares si existe,
// o si no, un círculo con la inicial del nombre.
function actualizarAvatares(inicial) {
  const fotosLogo = (negocioActual.fotos || []).filter((f) => f.categoria === 'logo');
  const urlLogo = fotosLogo.length ? fotosLogo[fotosLogo.length - 1].url : null;
  const html = urlLogo ? `<img src="${urlLogo}" alt="Foto de perfil">` : inicial;
  document.getElementById('avatar-topbar').innerHTML = html;
  document.getElementById('avatar-drawer').innerHTML = html;
  const previewImg = document.getElementById('modal-foto-preview-img');
  if (previewImg) {
    previewImg.innerHTML = urlLogo ? `<img src="${urlLogo}" alt="Foto de perfil">` : `<span class="modal-foto-inicial">${inicial}</span>`;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  intentarSesionGuardada();

  // Navegación inferior por pestañas
  document.querySelectorAll('.app-navbar-item').forEach((btn) => {
    btn.addEventListener('click', () => mostrarSeccion(btn.dataset.seccion));
  });

  // Menú lateral (drawer): abrir/cerrar y navegar
  document.getElementById('btn-abrir-menu').addEventListener('click', abrirDrawer);
  document.getElementById('drawer-overlay').addEventListener('click', cerrarDrawer);
  document.querySelectorAll('.drawer-nav-item[data-seccion]').forEach((btn) => {
    btn.addEventListener('click', () => { mostrarSeccion(btn.dataset.seccion); cerrarDrawer(); });
  });
  document.getElementById('drawer-ayuda').addEventListener('click', () => {
    cerrarDrawer();
    document.getElementById('link-ayuda').click();
  });
  document.getElementById('drawer-soporte').addEventListener('click', () => {
    cerrarDrawer();
    document.getElementById('link-ayuda').click();
  });
  document.getElementById('drawer-cerrar-sesion').addEventListener('click', cerrarSesion);

  // La campana lleva directo a Pedidos, filtrados por "Pendientes"
  document.getElementById('btn-campana').addEventListener('click', () => {
    mostrarSeccion('pedidos');
    const idTabs = negocioActual?.tipoOperacion === 'turnos' ? 'tabs-turnos' : 'tabs-pedidos';
    const tabPendientes = document.querySelector(`#${idTabs} .tab-pill[data-filtro="pendiente"]`);
    if (tabPendientes) tabPendientes.click();
  });

  // El avatar abre el modal para cambiar la foto de perfil (el menú se abre con el ☰)
  document.getElementById('avatar-topbar').addEventListener('click', abrirModalFoto);
  document.getElementById('avatar-drawer').addEventListener('click', () => { cerrarDrawer(); abrirModalFoto(); });

  // Todas las opciones de Herramientas, Negocio y Ajustes abren su contenido en pantalla completa,
  // con una flechita para volver arriba a la izquierda.
  document.querySelectorAll('.list-row[data-fullscreen]').forEach((fila) => {
    fila.addEventListener('click', () => abrirPantallaCompleta(fila.dataset.fullscreen, fila.dataset.titulo));
  });
  document.getElementById('btn-cerrar-pantalla-completa').addEventListener('click', cerrarPantallaCompleta);

  // Copiar enlace de chat con un botón (en vez de seleccionar texto a mano)
  document.getElementById('btn-copiar-link').addEventListener('click', () => copiarAlPortapapeles('link-chat', 'btn-copiar-link', '📋 Copiar enlace'));
  document.getElementById('btn-copiar-invitar')?.addEventListener('click', () => copiarAlPortapapeles('link-invitar', 'btn-copiar-invitar', 'Copiar enlace'));

  document.getElementById('link-ayuda').addEventListener('click', (e) => {
    e.preventDefault();
    alert('¿Necesitás ayuda? Escribinos a soporte@tudominio.com o por WhatsApp al [tu número de soporte].');
  });

  document.getElementById('link-cerrar-sesion').addEventListener('click', cerrarSesion);

  // Filtros por pestaña y buscador de la sección Pedidos
  document.querySelectorAll('#tabs-pedidos .tab-pill').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#tabs-pedidos .tab-pill').forEach((t) => t.classList.remove('activo'));
      tab.classList.add('activo');
      filtroPedidoActual = tab.dataset.filtro;
      renderizarPedidos();
    });
  });
  document.getElementById('buscador-pedidos').addEventListener('input', (e) => {
    busquedaPedidoActual = e.target.value.trim().toLowerCase();
    renderizarPedidos();
  });
});

async function copiarAlPortapapeles(idOrigen, idBoton, textoOriginal) {
  const texto = document.getElementById(idOrigen).textContent.trim();
  const boton = document.getElementById(idBoton);
  try {
    await navigator.clipboard.writeText(texto);
    boton.textContent = '✅ Copiado';
  } catch (error) {
    boton.textContent = '⚠️ No se pudo copiar, seleccioná el texto a mano';
  }
  setTimeout(() => { boton.textContent = textoOriginal; }, 2200);
}

const TITULOS_SECCION = {
  inicio: null, // en Inicio se muestra el nombre del negocio + el estado del plan
  pedidos: 'Pedidos',
  agenda: 'Agenda',
  herramientas: 'Herramientas',
  negocio: 'Mi Negocio',
  ajustes: 'Ajustes',
};

function mostrarSeccion(nombre) {
  document.querySelectorAll('.app-seccion').forEach((sec) => { sec.style.display = 'none'; });
  document.getElementById(`seccion-${nombre}`).style.display = 'block';

  if (nombre === 'negocio') cerrarEdicionNegocio();
  cerrarPantallaCompleta();

  // La barra de arriba muestra el nombre de la sección actual (como en Herramientas/Ajustes),
  // y solo en Inicio muestra el nombre del negocio junto con el estado del plan (PRUEBA/ACTIVA/VENCIDA).
  const esTurnos = negocioActual?.tipoOperacion === 'turnos';
  const tituloSeccion = nombre === 'pedidos' ? (esTurnos ? 'Consultas' : 'Pedidos') : TITULOS_SECCION[nombre];
  const nombreNegocio = negocioActual?.formData?.nombreNegocio || 'Mi negocio';
  document.getElementById('nombre-negocio-panel').textContent = tituloSeccion || nombreNegocio;
  document.getElementById('estado-suscripcion-pill').style.display = tituloSeccion ? 'none' : '';

  document.querySelectorAll('.app-navbar-item').forEach((btn) => {
    btn.classList.toggle('activo', btn.dataset.seccion === nombre);
  });

  if (nombre === 'agenda' && typeof cargarAgenda === 'function') cargarAgenda();

  document.getElementById('vista-panel').scrollTop = 0;
  document.querySelector('.app-contenido').scrollTop = 0;
}

async function mostrarPanel() {
  document.getElementById('contenedor-login').style.display = 'none';
  document.getElementById('vista-panel').style.display = 'flex';

  const nombreNegocio = negocioActual.formData?.nombreNegocio || 'Mi negocio';
  document.getElementById('nombre-negocio-panel').textContent = nombreNegocio;
  document.getElementById('drawer-nombre-negocio').textContent = nombreNegocio;
  document.getElementById('saludo-nombre').textContent = `¡Hola, ${nombreNegocio}!`;

  inicialNegocio = nombreNegocio.trim().charAt(0).toUpperCase() || 'N';
  actualizarAvatares(inicialNegocio);

  // "Pedidos" se llama "Consultas" en negocios que funcionan con turnos (médicos, peluquerías, talleres, etc.)
  const etiquetaPedidos = negocioActual.tipoOperacion === 'turnos' ? 'Consultas' : 'Pedidos';
  document.getElementById('texto-nav-pedidos-drawer').textContent = etiquetaPedidos;
  document.getElementById('texto-nav-pedidos-navbar').textContent = etiquetaPedidos;

  const estado = negocioActual.suscripcion.estado;
  const ETIQUETAS_PLAN = { activa: 'Plan activo', prueba: 'Plan de prueba', vencida: 'Suscripción vencida' };
  const pill = document.getElementById('estado-suscripcion-pill');
  pill.textContent = estado.toUpperCase();
  pill.className = `pill-estado ${estado}`;
  document.getElementById('drawer-estado-negocio').textContent = ETIQUETAS_PLAN[estado] || estado;

  actualizarEstadoSuscripcionUI();
  esperarConfirmacionPago();
  const linkChat = `${window.location.origin}/chat.html?codigo=${negocioActual.codigoPublico}`;
  document.getElementById('link-chat').textContent = linkChat;
  document.getElementById('qr-chat').src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(linkChat)}`;
  // el vínculo con Mi Zona va implícito en el enlace: la persona no ve ni copia ningún código
  document.getElementById('btn-registrar-mizona').href = `${MI_ZONA_URL}?codigo=${negocioActual.codigoVinculacion}`;
  document.getElementById('link-invitar').textContent = `${window.location.origin}/registro.html`;
  document.getElementById('aviso-suscripcion-herramientas').style.display = estado === 'activa' ? 'none' : 'block';
  document.getElementById('disponibilidad-hoy').value = negocioActual.disponibilidadHoy || '';

  document.getElementById('select-modo-vendedor').value = negocioActual.modoVendedor || 'normal';
  document.getElementById('check-memoria-activa').checked = negocioActual.memoriaActiva !== false;
  const permisosActuales = negocioActual.permisos || {};
  document.getElementById('check-permiso-recomendar').checked = permisosActuales.recomendarProductos !== false;
  document.getElementById('check-permiso-promos').checked = permisosActuales.ofrecerPromociones !== false;
  document.getElementById('check-permiso-tomar').checked = permisosActuales.tomarPedidosOTurnos !== false;
  document.getElementById('check-permiso-cerrar').checked = permisosActuales.intentarCerrarVenta !== false;

  // Vista de "Pedidos" o de "Turnos" según el tipo de negocio
  const esTurnos = negocioActual.tipoOperacion === 'turnos';
  document.getElementById('vista-pedidos').style.display = esTurnos ? 'none' : 'block';
  document.getElementById('vista-turnos').style.display = esTurnos ? 'block' : 'none';

  // Las promociones no tienen mucho sentido en rubros de Salud (no es habitual ni bien visto
  // ofrecer descuentos en consultas médicas); en el resto de los negocios de turnos sí aplica.
  document.getElementById('tarjeta-promociones').style.display = negocioActual.rubroCategoria === 'Salud' ? 'none' : 'block';
  document.getElementById('tarjeta-zonas-delivery').style.display = negocioActual.tipoOperacion === 'turnos' ? 'none' : 'block';
  aplicarEjemplosPorRubro();

  cargarEstadisticas();
  if (esTurnos) {
    prepararBloqueoTurno();
    cargarTurnos();
    cargarFila();
  } else {
    cargarPedidos();
  }
  renderizarFotos();
  cargarProductos();
  renderizarPromociones();
  renderizarZonasDelivery();
  cargarOportunidades();
  cargarExperiencia();
  cargarRanking();
  cargarPlanes();
  actualizarEstadoSuscripcionUI();
  cargarResumenDiario();
  cargarPreguntasFrecuentes();
  iniciarNotificacionesPedidos();
  if (typeof iniciarRecordatoriosAgenda === 'function') iniciarRecordatoriosAgenda();
  cargarDefinicionCampos();

  mostrarSeccion('inicio');
}

// =====================================================================
// Helpers compartidos
// =====================================================================
function escHtml(t) {
  return String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const fmtPesos = (n) => '$' + Number(n || 0).toLocaleString('es-AR');
function fmtCorto(n) {
  n = Number(n || 0);
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1000) return '$' + (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '') + 'k';
  return '$' + n;
}
function capitalizar(t) { t = String(t || ''); return t.charAt(0).toUpperCase() + t.slice(1); }

// =====================================================================
// INICIO: KPIs + gráficos (donut interactivo, barras de la semana, actividad por hora)
// =====================================================================
const PALETA_DONUT = ['#2454ff', '#7c3aed', '#06b6d4', '#f59e0b', '#16a34a', '#ef4444', '#ec4899', '#64748b'];
const ETIQUETAS_DONUT = {
  pendiente: 'Pendientes', confirmado: 'Confirmados', en_preparacion: 'En preparación', listo: 'Listos',
  entregado: 'Entregados', rechazado: 'Rechazados', cancelado: 'Cancelados',
  delivery: 'Delivery', retiro: 'Retiro en local',
};

let resumenDatos = null;
let donutSeleccion = -1;
let semanaModo = 'cantidad';

const ICONO_KPI = {
  chat: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  caja: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v9l9 5 9-5V8"/><path d="M12 13v9"/></svg>',
  plata: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.5.7-2.5 1.8 0 2.4 5 1.2 5 3.6 0 1.1-1.1 1.8-2.5 1.8-1.1 0-2.1-.5-2.6-1.3"/><path d="M12 6.5V8m0 8v1.5"/></svg>',
  reloj: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
};

function renderizarKPIs(r) {
  const esTurnos = r.tipoOperacion === 'turnos';
  actualizarTarjetaAsistente(r, esTurnos);
  const cont = document.getElementById('resumen-diario');
  const tarjetas = [
    { clase: 'kpi-azul', icono: ICONO_KPI.chat, valor: r.conversacionesHoy, etiqueta: 'Conversaciones hoy' },
    { clase: 'kpi-violeta', icono: ICONO_KPI.caja, valor: r.pedidosHoy, etiqueta: esTurnos ? 'Consultas hoy' : 'Pedidos hoy' },
  ];
  if (!esTurnos) {
    tarjetas.push({ clase: 'kpi-verde', icono: ICONO_KPI.plata, valor: (r.facturacionHoy || 0) >= 1000000 ? fmtCorto(r.facturacionHoy) : fmtPesos(r.facturacionHoy || 0), etiqueta: 'Facturado hoy' });
  } else {
    tarjetas.push({ clase: 'kpi-verde', icono: ICONO_KPI.reloj, valor: r.horaPico || '—', etiqueta: 'Horario más activo' });
  }

  const insights = [];
  if (!esTurnos && r.productoMasPedido) insights.push(`<div class="insight"><span>Más pedido hoy</span><strong>${escHtml(r.productoMasPedido.nombre)} (${r.productoMasPedido.cantidad}x)</strong></div>`);
  if (!esTurnos && r.horaPico) insights.push(`<div class="insight"><span>Horario más activo</span><strong>${escHtml(r.horaPico)}</strong></div>`);

  cont.innerHTML = tarjetas.map((t) => `
    <div class="kpi-card ${t.clase}">
      <div class="kpi-icono">${t.icono}</div>
      <div class="kpi-valor">${t.valor}</div>
      <div class="kpi-etiqueta">${t.etiqueta}</div>
    </div>
  `).join('') + (insights.length ? `<div class="insights">${insights.join('')}</div>` : '');
}

// ---------- Donut interactivo ----------
// Un solo gráfico: cada color es un grupo. Al tocar un color (en el círculo o en la lista)
// aparece abajo el detalle de ese grupo con su cantidad, porcentaje y datos propios.
function filaDetalleDonut(etiqueta, valor) {
  return `<div class="dd-fila"><span>${escHtml(etiqueta)}</span><strong>${valor}</strong></div>`;
}

function listaCorta(lista, formato) {
  return (lista || []).map((x) => `${escHtml(formato ? formato(x.nombre) : capitalizar(x.nombre))} ${x.valor}`).join(' · ');
}

function htmlDetalleDonut(d, total, color) {
  const pct = Math.round((d.valor / total) * 100);
  const det = d.detalle || {};
  const esTurnos = resumenDatos.tipoOperacion === 'turnos';
  const filas = [
    filaDetalleDonut(esTurnos ? 'Consultas' : 'Pedidos', d.valor),
    filaDetalleDonut('Del total', `${pct}%`),
  ];
  if (!esTurnos) {
    if (det.monto) filas.push(filaDetalleDonut('Facturado', fmtPesos(det.monto)));
    if (det.topProducto) filas.push(filaDetalleDonut('Más pedido', `${escHtml(det.topProducto.nombre)} (${det.topProducto.cantidad}x)`));
    if ((det.entrega || []).length) filas.push(filaDetalleDonut('Entrega', listaCorta(det.entrega, (n) => ETIQUETAS_DONUT[n] || capitalizar(n))));
    if ((det.pago || []).length) filas.push(filaDetalleDonut('Pago', listaCorta(det.pago)));
  } else {
    if ((det.motivo || []).length) filas.push(filaDetalleDonut('Motivo', listaCorta(det.motivo)));
    if ((det.profesional || []).length) filas.push(filaDetalleDonut('Profesional', listaCorta(det.profesional)));
  }
  return `
    <div class="dd-titulo"><span class="donut-punto" style="background:${color}"></span>${escHtml(d.nombre)}</div>
    ${filas.join('')}`;
}

function seleccionarSegmentoDonut(i) {
  donutSeleccion = donutSeleccion === i ? -1 : i;
  const cont = document.getElementById('donut-contenedor');
  const datos = cont._datos || [];
  const total = cont._total || 0;

  cont.querySelectorAll('.donut-seg').forEach((seg) => {
    const idx = Number(seg.dataset.i);
    seg.classList.toggle('sel', idx === donutSeleccion);
    seg.classList.toggle('dim', donutSeleccion !== -1 && idx !== donutSeleccion);
  });
  cont.querySelectorAll('.donut-fila').forEach((fila) => {
    const idx = Number(fila.dataset.i);
    fila.classList.toggle('sel', idx === donutSeleccion);
    fila.classList.toggle('dim', donutSeleccion !== -1 && idx !== donutSeleccion);
  });

  const valorEl = document.getElementById('donut-centro-valor');
  const textoEl = document.getElementById('donut-centro-texto');
  const pctEl = document.getElementById('donut-centro-pct');
  const detalleEl = document.getElementById('donut-detalle');
  if (donutSeleccion === -1) {
    valorEl.textContent = total;
    textoEl.textContent = 'en total';
    pctEl.textContent = 'Tocá un color';
    detalleEl.classList.remove('abierto');
    detalleEl.innerHTML = `<p class="dd-hint">Tocá un color del gráfico para ver sus datos.</p>`;
  } else {
    const d = datos[donutSeleccion];
    const color = PALETA_DONUT[donutSeleccion % PALETA_DONUT.length];
    valorEl.textContent = d.valor;
    textoEl.textContent = d.nombre;
    pctEl.textContent = `${Math.round((d.valor / total) * 100)}% del total`;
    detalleEl.classList.add('abierto');
    detalleEl.style.setProperty('--dd-color', color);
    detalleEl.innerHTML = htmlDetalleDonut(d, total, color);
  }
}

function renderizarDonut() {
  const cont = document.getElementById('donut-contenedor');
  const detalleEstado = resumenDatos.detalleEstado || {};
  const crudos = ((resumenDatos.distribuciones || {}).estado) || [];
  const datos = crudos.map((d) => ({ nombre: ETIQUETAS_DONUT[d.nombre] || capitalizar(d.nombre), valor: d.valor, detalle: detalleEstado[d.nombre] || {} }));
  const total = datos.reduce((acc, d) => acc + d.valor, 0);
  donutSeleccion = -1;

  if (!total) {
    cont.innerHTML = `
      <div class="donut-vacio">
        <svg viewBox="0 0 200 200" width="170" height="170"><circle cx="100" cy="100" r="70" fill="none" stroke="#e5e9f7" stroke-width="26" stroke-dasharray="6 8"/></svg>
        <p>Todavía no hay datos para mostrar.<br>Cuando lleguen ${resumenDatos.tipoOperacion === 'turnos' ? 'consultas' : 'pedidos'}, acá vas a ver cómo se reparten.</p>
      </div>`;
    return;
  }

  const R = 70;
  const C = 2 * Math.PI * R;
  const hueco = datos.length > 1 ? 4 : 0;
  let acumulado = 0;

  const segmentos = datos.map((d, i) => {
    const fraccion = d.valor / total;
    const largo = Math.max(fraccion * C - hueco, 0.5);
    const desplazamiento = -acumulado;
    acumulado += fraccion * C;
    const color = PALETA_DONUT[i % PALETA_DONUT.length];
    return `<circle class="donut-seg" data-i="${i}" data-largo="${largo}" cx="100" cy="100" r="${R}" fill="none" stroke="${color}" stroke-width="26" stroke-dasharray="0 ${C}" stroke-dashoffset="${desplazamiento}" transform="rotate(-90 100 100)"/>`;
  }).join('');

  const filas = datos.map((d, i) => {
    const pct = Math.round((d.valor / total) * 100);
    const color = PALETA_DONUT[i % PALETA_DONUT.length];
    return `
      <button class="donut-fila" data-i="${i}">
        <span class="donut-punto" style="background:${color}"></span>
        <span class="donut-nombre">${escHtml(d.nombre)}</span>
        <span class="donut-cifra">${d.valor}</span>
        <span class="donut-pct">${pct}%</span>
        <span class="donut-barra"><i style="width:${pct}%; background:${color}"></i></span>
      </button>`;
  }).join('');

  cont._datos = datos;
  cont._total = total;
  cont.innerHTML = `
    <div class="donut-wrap">
      <svg viewBox="0 0 200 200" class="donut-svg">${segmentos}</svg>
      <div class="donut-centro">
        <strong id="donut-centro-valor">${total}</strong>
        <span id="donut-centro-texto">en total</span>
        <em id="donut-centro-pct">Tocá un color</em>
      </div>
    </div>
    <div class="donut-detalle" id="donut-detalle"><p class="dd-hint">Tocá un color del gráfico para ver sus datos.</p></div>
    <div class="donut-leyenda">${filas}</div>
  `;

  cont.querySelectorAll('.donut-seg, .donut-fila').forEach((el) => {
    el.addEventListener('click', () => seleccionarSegmentoDonut(Number(el.dataset.i)));
  });

  // Animación de entrada: los arcos "se dibujan" de a uno
  requestAnimationFrame(() => {
    cont.querySelectorAll('.donut-seg').forEach((seg) => {
      const largo = Number(seg.dataset.largo);
      seg.style.strokeDasharray = `${largo} ${C - largo}`;
    });
  });
}

// ---------- Barras de la semana ----------
function renderizarChartSemana(r) {
  const contenedor = document.getElementById('chart-pedidos-semana');
  const detalle = document.getElementById('chart-semana-detalle');
  const esTurnos = r.tipoOperacion === 'turnos';
  const serie = semanaModo === 'monto'
    ? (r.ingresosUltimos7Dias || []).map((d) => ({ etiqueta: d.etiqueta, valor: d.monto }))
    : (r.pedidosUltimos7Dias || []).map((d) => ({ etiqueta: d.etiqueta, valor: d.cantidad }));

  if (!serie.length) {
    contenedor.innerHTML = `<p class="ayuda">Sin datos todavía.</p>`;
    detalle.textContent = '';
    return;
  }

  const maximo = Math.max(...serie.map((d) => d.valor), 1);
  const todoCero = serie.every((d) => d.valor === 0);
  const unidad = esTurnos ? 'consultas' : 'pedidos';

  contenedor.innerHTML = serie.map((d, i) => `
    <div class="chart-barra-col" data-i="${i}">
      <div class="chart-barra-valor">${semanaModo === 'monto' ? fmtCorto(d.valor) : d.valor}</div>
      <div class="chart-barra ${i === serie.length - 1 ? 'hoy' : ''}" style="height:${Math.max((d.valor / maximo) * 100, 3)}%;"></div>
      <div class="chart-barra-etiqueta">${escHtml(d.etiqueta)}</div>
    </div>
  `).join('');

  const mostrarDetalle = (i) => {
    const d = serie[i];
    contenedor.querySelectorAll('.chart-barra-col').forEach((c) => c.classList.toggle('sel', Number(c.dataset.i) === i));
    detalle.innerHTML = semanaModo === 'monto'
      ? `<strong>${escHtml(d.etiqueta)}</strong> · ${fmtPesos(d.valor)} facturados`
      : `<strong>${escHtml(d.etiqueta)}</strong> · ${d.valor} ${unidad}`;
  };
  contenedor.querySelectorAll('.chart-barra-col').forEach((col) => col.addEventListener('click', () => mostrarDetalle(Number(col.dataset.i))));
  mostrarDetalle(serie.length - 1);
  if (todoCero) detalle.innerHTML += ' <span class="dash-nota">(todavía sin movimiento esta semana)</span>';
}

// ---------- Actividad por hora (área suave) ----------
function renderizarChartHoras(r) {
  const cont = document.getElementById('chart-horas');
  const horas = r.actividadPorHora || [];
  const max = Math.max(...horas, 0);
  if (!max) {
    cont.innerHTML = `<p class="ayuda">Cuando tus clientes empiecen a escribir, vas a ver acá en qué horarios hay más movimiento.</p>`;
    return;
  }

  const W = 320, H = 130, PAD_X = 12, BASE = 104, ALTO = 78;
  const paso = (W - PAD_X * 2) / 23;
  const puntos = horas.map((v, i) => ({ x: PAD_X + i * paso, y: BASE - (v / max) * ALTO, v }));

  let linea = `M ${puntos[0].x} ${puntos[0].y}`;
  for (let i = 1; i < puntos.length; i++) {
    const p0 = puntos[i - 1], p1 = puntos[i];
    const cx = (p0.x + p1.x) / 2;
    linea += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  const area = `${linea} L ${puntos[puntos.length - 1].x} ${BASE} L ${puntos[0].x} ${BASE} Z`;
  const pico = horas.indexOf(max);
  const etiquetas = [0, 6, 12, 18, 23].map((h) => `<text x="${PAD_X + h * paso}" y="${H - 8}" text-anchor="middle" class="horas-eje">${h}h</text>`).join('');
  const zonas = puntos.map((p, i) => `<rect class="horas-zona" data-h="${i}" x="${p.x - paso / 2}" y="0" width="${paso}" height="${BASE}" fill="transparent"/>`).join('');

  cont.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="horas-svg">
      <defs>
        <linearGradient id="grad-horas" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2454ff" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#2454ff" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <line x1="${PAD_X}" x2="${W - PAD_X}" y1="${BASE}" y2="${BASE}" stroke="#e5e9f7"/>
      <path d="${area}" fill="url(#grad-horas)"/>
      <path d="${linea}" fill="none" stroke="#2454ff" stroke-width="2.5" stroke-linecap="round"/>
      <circle id="horas-punto" cx="${puntos[pico].x}" cy="${puntos[pico].y}" r="5" fill="#fff" stroke="#2454ff" stroke-width="3"/>
      ${etiquetas}
      ${zonas}
    </svg>
    <div id="horas-detalle" class="dash-detalle"></div>
  `;

  const punto = document.getElementById('horas-punto');
  const detalle = document.getElementById('horas-detalle');
  const mostrar = (h) => {
    punto.setAttribute('cx', puntos[h].x);
    punto.setAttribute('cy', puntos[h].y);
    const v = horas[h];
    detalle.innerHTML = `<strong>${h}:00 a ${h + 1}:00</strong> · ${v} conversación${v === 1 ? '' : 'es'}${h === pico ? ' <span class="dash-nota">(tu horario más activo)</span>' : ''}`;
  };
  cont.querySelectorAll('.horas-zona').forEach((z) => z.addEventListener('click', () => mostrar(Number(z.dataset.h))));
  mostrar(pico);
}

async function cargarResumenDiario() {
  const contenedor = document.getElementById('resumen-diario');
  try {
    const res = await fetch(`${API_URL}/estadisticas/resumen`, { headers: headersAuth(), cache: 'no-store' });
    if (!res.ok) throw new Error('resumen');
    const r = await res.json();
    resumenDatos = r;

    // El tab "Ingresos" no tiene sentido en negocios de turnos (no manejan un total por turno)
    const tabIngresos = document.querySelector('#semana-tabs [data-modo="monto"]');
    const tabCantidad = document.getElementById('semana-tab-cantidad');
    if (tabIngresos) tabIngresos.style.display = r.tipoOperacion === 'turnos' ? 'none' : '';
    if (tabCantidad) tabCantidad.textContent = r.tipoOperacion === 'turnos' ? 'Consultas' : 'Pedidos';
    if (r.tipoOperacion === 'turnos') semanaModo = 'cantidad';

    const filtrosDonut = document.getElementById('donut-filtros');
    if (filtrosDonut) filtrosDonut.style.display = r.tipoOperacion === 'turnos' ? 'none' : 'flex';

    renderizarKPIs(r);
    renderizarDonut();
    renderizarChartSemana(r);
    renderizarChartHoras(r);
  } catch (error) {
    contenedor.innerHTML = `<p class="ayuda">No se pudo cargar el resumen.</p>`;
  }
}

// --- Filtros del gráfico circular: por tipo de entrega y por forma de pago ---
let filtroDonutEntrega = '';
let filtroDonutPago = '';

async function aplicarFiltrosDonut() {
  const cont = document.getElementById('donut-contenedor');
  cont.innerHTML = `<p class="ayuda">Cargando...</p>`;
  try {
    const params = new URLSearchParams();
    if (filtroDonutEntrega) params.set('filtroEntrega', filtroDonutEntrega);
    if (filtroDonutPago) params.set('filtroPago', filtroDonutPago);
    const res = await fetch(`${API_URL}/estadisticas/resumen?${params.toString()}`, { headers: headersAuth(), cache: 'no-store' });
    if (!res.ok) throw new Error('resumen filtrado');
    const r = await res.json();
    if (resumenDatos) {
      resumenDatos.distribuciones = r.distribuciones;
      resumenDatos.detalleEstado = r.detalleEstado;
    }
    renderizarDonut();
  } catch (error) {
    cont.innerHTML = `<p class="ayuda">No se pudo aplicar el filtro.</p>`;
  }
}

// Selector único: se toca para desplegar las opciones hacia abajo. Se puede elegir una de entrega,
// una de pago (combinables) o "Todos" para quitar los filtros.
(function iniciarSelectorFiltro() {
  const caja = document.getElementById('filtro-select');
  const btn = document.getElementById('filtro-select-btn');
  const valorTxt = document.getElementById('filtro-select-valor');
  if (!caja || !btn) return;

  const etiquetas = { delivery: 'Con delivery', retiro: 'Sin delivery', efectivo: 'Efectivo', transferencia: 'Transferencia' };
  const abrir = (abierto) => { caja.classList.toggle('abierto', abierto); btn.setAttribute('aria-expanded', String(abierto)); };

  function refrescar() {
    caja.querySelectorAll('.filtro-op').forEach((op) => {
      const g = op.dataset.grupo;
      const activo = g === 'todos' ? !filtroDonutEntrega && !filtroDonutPago
        : g === 'entrega' ? op.dataset.valor === filtroDonutEntrega
        : op.dataset.valor === filtroDonutPago;
      op.classList.toggle('activo', activo);
    });
    const partes = [etiquetas[filtroDonutEntrega], etiquetas[filtroDonutPago]].filter(Boolean);
    valorTxt.textContent = partes.length ? partes.join(' · ') : 'Todos los pedidos';
    caja.classList.toggle('con-filtro', partes.length > 0);
  }

  btn.addEventListener('click', () => abrir(!caja.classList.contains('abierto')));

  caja.querySelectorAll('.filtro-op').forEach((op) => {
    op.addEventListener('click', () => {
      const g = op.dataset.grupo;
      if (g === 'todos') { filtroDonutEntrega = ''; filtroDonutPago = ''; }
      else if (g === 'entrega') filtroDonutEntrega = filtroDonutEntrega === op.dataset.valor ? '' : op.dataset.valor;
      else if (g === 'pago') filtroDonutPago = filtroDonutPago === op.dataset.valor ? '' : op.dataset.valor;
      refrescar();
      abrir(false);
      aplicarFiltrosDonut();
    });
  });

  document.addEventListener('click', (e) => { if (!caja.contains(e.target)) abrir(false); });
})();

document.querySelectorAll('#semana-tabs .dash-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    semanaModo = btn.dataset.modo;
    document.querySelectorAll('#semana-tabs .dash-tab').forEach((b) => b.classList.toggle('activo', b === btn));
    if (resumenDatos) renderizarChartSemana(resumenDatos);
  });
});

function actualizarChipPreguntas(cantidad) {
  const cont = document.getElementById('chip-preguntas-inicio');
  if (!cont) return;
  if (!cantidad) { cont.innerHTML = ''; return; }
  cont.innerHTML = `
    <button class="chip-atencion" id="btn-chip-preguntas">
      <span class="chip-atencion-num">${cantidad}</span>
      <span class="chip-atencion-texto"><strong>${cantidad === 1 ? 'Pregunta sin responder' : 'Preguntas sin responder'}</strong><small>Respondelas para que tu asistente aprenda</small></span>
      <span class="chip-atencion-cta">Responder</span>
    </button>`;
  document.getElementById('btn-chip-preguntas').addEventListener('click', () => abrirPantallaCompleta('panel-preguntas', 'Preguntas frecuentes'));
}



// =====================================================================
// EJEMPLOS SEGÚN EL RUBRO: los textos de ayuda (placeholders) se adaptan al negocio
// =====================================================================
const EJEMPLOS_RUBRO = {
  gastronomia: {
    promoTitulo: 'Ej: 2x1 en postres los martes', promoDesc: 'Contá los detalles: qué días aplica, si es para llevar o para comer en el local, etc.', promoAplica: 'Ej: Menú del día + bebida',
    productoNombre: 'Ej: Milanesa con papas fritas', productoCategoria: 'Ej: Platos principales, Bebidas, Postres', productoIncluye: 'Ej: Plato + bebida + postre',
    disponibilidad: 'Ej: hoy no hay flan, se agotó el asado', variante: 'Ej: Porción grande', bloqueo: 'Ej: Evento privado, cierre por mantenimiento',
  },
  gastronomia_heladeria: { promoTitulo: 'Ej: 2x1 en helados los martes', promoAplica: 'Ej: Cucurucho doble', productoNombre: 'Ej: Cuarto kilo de helado', productoCategoria: 'Ej: Helados, Postres helados, Bebidas', disponibilidad: 'Ej: hoy no hay dulce de leche granizado' },
  gastronomia_pizzeria: { promoTitulo: 'Ej: 2x1 en pizzas muzzarella los martes', promoAplica: 'Ej: Pizza grande + gaseosa', productoNombre: 'Ej: Pizza muzzarella', productoCategoria: 'Ej: Pizzas, Empanadas, Bebidas', disponibilidad: 'Ej: hoy no hay pizza de rúcula' },
  gastronomia_cafeteria: { promoTitulo: 'Ej: Café + medialuna a precio especial de 15 a 18 hs', promoAplica: 'Ej: Café + medialuna', productoNombre: 'Ej: Café con leche', productoCategoria: 'Ej: Cafés, Tostados, Pastelería', disponibilidad: 'Ej: hoy no hay cheesecake' },
  gastronomia_panaderia: { promoTitulo: 'Ej: Docena de facturas con 15% de descuento', promoAplica: 'Ej: Docena de facturas', productoNombre: 'Ej: Docena de medialunas', productoCategoria: 'Ej: Pan, Facturas, Tortas', disponibilidad: 'Ej: hoy no hay pan de campo' },
  gastronomia_hamburgueseria: { promoTitulo: 'Ej: 2x1 en hamburguesas clásicas los martes', promoAplica: 'Ej: Hamburguesa clásica', productoNombre: 'Ej: Hamburguesa clásica', productoCategoria: 'Ej: Hamburguesas, Papas, Bebidas', disponibilidad: 'Ej: hoy no hay hamburguesa vegetariana' },
  gastronomia_parrilla: { promoTitulo: 'Ej: Parrillada para 2 con bebida incluida', promoAplica: 'Ej: Parrillada para 2', productoNombre: 'Ej: Parrillada para 2', productoCategoria: 'Ej: Parrilladas, Achuras, Guarniciones', disponibilidad: 'Ej: hoy no hay vacío' },
  salud: {
    promoTitulo: 'Ej: 10% de descuento en la primera consulta', promoDesc: 'Contá los detalles: quiénes pueden usarla, condiciones, etc.', promoAplica: 'Ej: Primera consulta',
    productoNombre: 'Ej: Consulta general', productoCategoria: 'Ej: Consultas, Estudios, Tratamientos', productoIncluye: 'Ej: Consulta + control',
    disponibilidad: 'Ej: hoy no atiende la Dra. Pérez', variante: 'Ej: Consulta de control', bloqueo: 'Ej: Congreso médico, vacaciones',
  },
  hogar: {
    promoTitulo: 'Ej: 10% de descuento en la primera visita', promoDesc: 'Contá los detalles: zonas, días, condiciones, etc.', promoAplica: 'Ej: Visita técnica + presupuesto',
    productoNombre: 'Ej: Instalación de toma corriente', productoCategoria: 'Ej: Instalaciones, Reparaciones, Mantenimiento', productoIncluye: 'Ej: Mano de obra + materiales básicos',
    disponibilidad: 'Ej: esta semana no tomamos trabajos en altura', variante: 'Ej: Con materiales incluidos', bloqueo: 'Ej: Feriado, trabajo largo en obra',
  },
  automotor: {
    promoTitulo: 'Ej: Alineación y balanceo con 15% de descuento', promoDesc: 'Contá los detalles: qué días aplica, tipos de vehículo, etc.', promoAplica: 'Ej: Alineación + balanceo',
    productoNombre: 'Ej: Cambio de aceite y filtro', productoCategoria: 'Ej: Mantenimiento, Frenos, Neumáticos', productoIncluye: 'Ej: Aceite + filtro + revisión de niveles',
    disponibilidad: 'Ej: hoy no hay turnos para service completo', variante: 'Ej: Aceite sintético', bloqueo: 'Ej: Feriado, mantenimiento del taller',
  },
  belleza: {
    promoTitulo: 'Ej: 20% de descuento en color los miércoles', promoDesc: 'Contá los detalles: qué días aplica, condiciones, etc.', promoAplica: 'Ej: Corte + barba',
    productoNombre: 'Ej: Corte de pelo', productoCategoria: 'Ej: Cortes, Color, Uñas', productoIncluye: 'Ej: Lavado + corte + peinado',
    disponibilidad: 'Ej: hoy no atiende Sofía, no hay turnos de color', variante: 'Ej: Pelo largo', bloqueo: 'Ej: Capacitación, vacaciones',
  },
  comercio: {
    promoTitulo: 'Ej: 2x1 en remeras de la temporada pasada', promoDesc: 'Contá los detalles: qué días aplica, stock limitado, etc.', promoAplica: 'Ej: Remeras y camisas',
    productoNombre: 'Ej: Remera básica de algodón', productoCategoria: 'Ej: Remeras, Pantalones, Accesorios', productoIncluye: 'Ej: Producto + envoltorio de regalo',
    disponibilidad: 'Ej: se agotó el talle M en jeans negros', variante: 'Ej: Talle 42', bloqueo: 'Ej: Inventario, feriado',
  },
  'servicios profesionales': {
    promoTitulo: 'Ej: Primera consulta sin cargo', promoDesc: 'Contá los detalles: para quién aplica, condiciones, etc.', promoAplica: 'Ej: Primera consulta',
    productoNombre: 'Ej: Consulta inicial', productoCategoria: 'Ej: Consultas, Trámites, Asesoramiento', productoIncluye: 'Ej: Consulta + informe escrito',
    disponibilidad: 'Ej: esta semana no hay turnos para trámites urgentes', variante: 'Ej: Consulta virtual', bloqueo: 'Ej: Audiencia, feriado',
  },
  educacion: {
    promoTitulo: 'Ej: Matrícula gratis si te anotás esta semana', promoDesc: 'Contá los detalles: cursos incluidos, fechas, condiciones, etc.', promoAplica: 'Ej: Cursos de inglés',
    productoNombre: 'Ej: Clase de apoyo escolar', productoCategoria: 'Ej: Clases, Cursos, Talleres', productoIncluye: 'Ej: Clase + material de estudio',
    disponibilidad: 'Ej: el curso de los sábados ya no tiene cupo', variante: 'Ej: Modalidad virtual', bloqueo: 'Ej: Feriado, receso',
  },
  'eventos y fiestas': {
    promoTitulo: 'Ej: 15% de descuento reservando con 30 días de anticipación', promoDesc: 'Contá los detalles: fechas, cantidad de invitados, condiciones, etc.', promoAplica: 'Ej: Paquete cumpleaños infantil',
    productoNombre: 'Ej: Paquete cumpleaños infantil', productoCategoria: 'Ej: Paquetes, Decoración, Catering', productoIncluye: 'Ej: Salón + decoración + animación',
    disponibilidad: 'Ej: el salón no está disponible el 15 de este mes', variante: 'Ej: Para 30 invitados', bloqueo: 'Ej: Evento ya reservado, feriado',
  },
};

function normalizarRubro(t) {
  return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function aplicarEjemplosPorRubro() {
  const cat = normalizarRubro(negocioActual.rubroCategoria);
  const sub = normalizarRubro(negocioActual.rubroSubrubro);
  const base = EJEMPLOS_RUBRO[cat] || EJEMPLOS_RUBRO.comercio;
  const ej = Object.assign({}, base, EJEMPLOS_RUBRO[`${cat}_${sub}`] || {});
  const poner = (id, texto) => { const el = document.getElementById(id); if (el && texto) el.placeholder = texto; };
  poner('promo-titulo', ej.promoTitulo);
  poner('promo-descripcion', ej.promoDesc);
  poner('promo-aplica-a', ej.promoAplica);
  poner('producto-nombre', ej.productoNombre);
  poner('producto-categoria', ej.productoCategoria);
  poner('producto-incluye', ej.productoIncluye);
  poner('disponibilidad-hoy', ej.disponibilidad);
  poner('nueva-variante-nombre', ej.variante);
  poner('bloqueo-motivo', ej.bloqueo);
}


// =====================================================================
// FILA VIRTUAL DE HOY (solo negocios de turnos)
// =====================================================================
function htmlColaFila(cola, variosProfesionales) {
  const atendiendo = cola.atendiendo;
  const bloqueAtendiendo = atendiendo ? `
    <div class="fila-atendiendo ${atendiendo.demorado ? 'demorado' : ''}">
      <div class="fila-atendiendo-info">
        <span class="fila-etiqueta">Atendiendo ahora</span>
        <strong>${escHtml(atendiendo.nombreCliente)}</strong>
        <small>${escHtml(atendiendo.motivo || 'Turno')} · ${atendiendo.transcurridos} min de ${atendiendo.duracionMinutos}${atendiendo.demorado ? ' · se pasó del tiempo' : ''}</small>
      </div>
      <button class="fila-btn principal" data-fila-accion="finalizar" data-id="${atendiendo.id}">Finalizar</button>
    </div>` : `<div class="fila-libre">Nadie se está atendiendo en este momento</div>`;

  const items = cola.esperando.map((e) => `
    <div class="fila-item ${e.posicion === 1 ? 'siguiente' : ''}">
      <div class="fila-num">${e.posicion}</div>
      <div class="fila-item-info">
        <strong>${escHtml(e.nombreCliente)}</strong>
        <small>${escHtml(e.motivo || 'Turno')} · agendado ${e.hora}${e.horaEstimada !== e.hora ? ` · estimado ${e.horaEstimada}` : ''}${e.puedeAdelantar ? ' · <span class="fila-adelanto">puede adelantarse</span>' : ''}${e.atrasoMinutos > 10 ? ` · <span class="fila-demora">demora ~${e.atrasoMinutos} min</span>` : ''}</small>
      </div>
      <div class="fila-acciones">
        <button class="fila-btn principal" data-fila-accion="iniciar" data-id="${e.id}">Atender</button>
        <button class="fila-btn suave" data-fila-accion="ausente" data-id="${e.id}" title="No vino">No vino</button>
      </div>
    </div>`).join('');

  return `
    <div class="fila-cola">
      ${variosProfesionales ? `<div class="fila-prof">${escHtml(cola.profesional || 'General')}</div>` : ''}
      ${bloqueAtendiendo}
      ${items ? `<div class="fila-lista">${items}</div>` : `<p class="ayuda" style="margin:10px 0 0;">No hay nadie esperando.</p>`}
      <div class="fila-resumen"><span><strong>${cola.atendidos}</strong> atendidos</span><span><strong>${cola.ausentes}</strong> no vinieron</span><span><strong>${cola.cancelados}</strong> cancelados</span></div>
    </div>`;
}

let filaCargando = false;
async function cargarFila() {
  const cont = document.getElementById('fila-contenido');
  if (!cont || !negocioActual || negocioActual.tipoOperacion !== 'turnos' || filaCargando) return;
  filaCargando = true;
  try {
    const res = await fetch(`${API_URL}/fila`, { headers: headersAuth(), cache: 'no-store' });
    if (!res.ok) throw new Error('fila');
    const data = await res.json();
    const colas = data.colas || [];
    const aviso = data.pendientesDeConfirmar ? `<div class="fila-aviso">Tenés ${data.pendientesDeConfirmar} turno(s) de hoy sin confirmar: no entran en la fila hasta que los apruebes.</div>` : '';
    if (!colas.length) {
      cont.innerHTML = `${aviso}<div class="fila-vacia"><strong>Hoy no hay turnos en la fila</strong><span>Cuando tus clientes saquen turno para hoy, van a aparecer acá en orden.</span></div>`;
    } else {
      cont.innerHTML = aviso + colas.map((c) => htmlColaFila(c, colas.length > 1)).join('');
      cont.querySelectorAll('[data-fila-accion]').forEach((btn) => btn.addEventListener('click', () => accionFila(btn)));
    }
  } catch (e) {
    cont.innerHTML = `<p class="ayuda">No se pudo cargar la fila.</p>`;
  } finally {
    filaCargando = false;
  }
}

async function accionFila(btn) {
  btn.disabled = true;
  try {
    await fetch(`${API_URL}/fila/${btn.dataset.id}/atencion`, {
      method: 'PUT',
      headers: headersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ accion: btn.dataset.filaAccion }),
    });
  } catch (e) { /* si falla, el próximo refresco muestra el estado real */ }
  cargarFila();
}

// La fila se refresca sola cada 15 segundos mientras el panel está a la vista.
setInterval(() => { if (!document.hidden && negocioActual && negocioActual.tipoOperacion === 'turnos') cargarFila(); }, 15000);

// Notificación de pedido nuevo mientras el panel está abierto: revisa cada 20s si hay
// un pedido más reciente que el último que vimos, y avisa con sonido + notificación del navegador.
let ultimoPedidoIdVisto = null;
let tituloOriginal = document.title;

// Estado de los filtros de la pestaña Pedidos (pestañas + buscador)
let pedidosCache = [];
let filtroPedidoActual = 'todos';
let busquedaPedidoActual = '';

function actualizarBadgeCampana(pedidos) {
  const pendientes = pedidos.filter((p) => p.estado === 'pendiente').length;
  actualizarAtencionInicio(pendientes);
  const badge = document.getElementById('badge-campana');
  if (pendientes > 0) {
    badge.textContent = pendientes > 9 ? '9+' : pendientes;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

function reproducirSonidoAviso() {
  try {
    const contexto = new (window.AudioContext || window.webkitAudioContext)();
    const oscilador = contexto.createOscillator();
    const ganancia = contexto.createGain();
    oscilador.connect(ganancia);
    ganancia.connect(contexto.destination);
    oscilador.frequency.value = 880;
    ganancia.gain.setValueAtTime(0.15, contexto.currentTime);
    oscilador.start();
    oscilador.stop(contexto.currentTime + 0.25);
  } catch (error) {
    // si el navegador bloquea audio sin interacción previa, no pasa nada grave
  }
}

function mostrarToast(texto) {
  const div = document.createElement('div');
  div.className = 'notif-flotante';
  div.textContent = texto;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 6000);
}

function mostrarNotificacionFlotante(texto) {
  const div = document.createElement('div');
  div.className = 'notif-flotante';
  div.textContent = texto;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 6000);

  document.title = '🔔 ¡Nuevo pedido! - ' + tituloOriginal;
  setTimeout(() => { document.title = tituloOriginal; }, 8000);

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Nuevo pedido', { body: texto });
  }
}

function iniciarNotificacionesPedidos() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  const esTurnos = negocioActual.tipoOperacion === 'turnos';

  setInterval(async () => {
    try {
      const res = await fetch(`${API_URL}/${esTurnos ? 'turnos' : 'pedidos'}`, { headers: headersAuth(), cache: 'no-store' });
      const items = await res.json();
      actualizarBadgeCampana(items);
      if (!items.length) return;

      const masReciente = items[0]; // vienen ordenados del más nuevo al más viejo

      if (ultimoPedidoIdVisto === null) {
        ultimoPedidoIdVisto = masReciente._id; // primera carga: solo guardamos referencia, no avisamos
        return;
      }

      if (masReciente._id !== ultimoPedidoIdVisto) {
        ultimoPedidoIdVisto = masReciente._id;
        reproducirSonidoAviso();
        mostrarNotificacionFlotante(esTurnos ? `Turno nuevo de ${masReciente.nombreCliente}` : `Pedido nuevo de ${masReciente.nombreCliente}`);
        if (esTurnos) { cargarTurnos(); } else { cargarPedidos(); }
        cargarResumenDiario();
      }
    } catch (error) {
      // si falla la revisión, lo intentamos de nuevo en el próximo intervalo
    }
  }, 20000);
}

// =====================================================================
// SUSCRIPCIÓN: tiempo restante, avisos antes de vencer, renovar antes, planes
// =====================================================================
const NOMBRES_PLAN = { basico: 'Período de prueba', '1_mes': 'Plan Mensual', '3_meses': 'Plan Trimestral', '5_meses': 'Plan de 5 meses', '6_meses': 'Plan Semestral' };
const MESES_PLAN = { '1_mes': 1, '3_meses': 3, '5_meses': 5, '6_meses': 6 };
const DIAS_AVISO_VENCIMIENTO = 7;

function infoSuscripcion() {
  const s = (negocioActual && negocioActual.suscripcion) || {};
  const venc = s.fechaVencimiento ? new Date(s.fechaVencimiento) : null;
  const dias = venc ? Math.ceil((venc - new Date()) / 86400000) : null;
  const limite = s.limiteMensajesPrueba || 0;
  const usados = s.mensajesUsadosPrueba || 0;
  let estado = s.estado || 'prueba';
  if (estado === 'activa' && dias !== null && dias <= 0) estado = 'vencida';
  return { estado, plan: s.plan, venc, dias, limite, usados, restantesPrueba: Math.max(0, limite - usados) };
}

function textoTiempoRestante(info) {
  if (info.estado === 'activa') return info.dias === 1 ? 'Queda 1 día' : `Quedan ${info.dias} días`;
  if (info.estado === 'prueba') return `${info.restantesPrueba} mensajes de prueba`;
  return 'Vencida';
}

function abrirPlanes() { abrirPantallaCompleta('panel-planes', 'Elegí tu plan'); }

function actualizarEstadoSuscripcionUI() {
  const info = infoSuscripcion();
  const fechaTxt = info.venc ? info.venc.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  // Resumen en la fila de Ajustes
  const resumen = document.getElementById('ajustes-resumen-plan');
  if (resumen) resumen.textContent = info.estado === 'activa' ? `${NOMBRES_PLAN[info.plan] || 'Plan activo'} · ${textoTiempoRestante(info).toLowerCase()}` : (info.estado === 'prueba' ? `Período de prueba · ${textoTiempoRestante(info)}` : 'Suscripción vencida · renovala para reactivar');

  // Cabecera del Inicio
  const hero = document.getElementById('inicio-hero-estado');
  if (hero) {
    const etiqueta = { activa: 'Plan activo', prueba: 'En prueba', vencida: 'Vencida' }[info.estado];
    hero.innerHTML = `<span class="hero-pill ${info.estado}">${etiqueta}</span><span class="hero-dias">${textoTiempoRestante(info)}</span>`;
  }
  const fecha = document.getElementById('inicio-fecha');
  if (fecha) fecha.textContent = capitalizar(new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }));

  // Aviso destacado en Inicio
  let tono = null, titulo = '', detalle = '', cta = '';
  if (info.estado === 'vencida') {
    tono = 'urgente'; titulo = 'Tu suscripción venció';
    detalle = 'Tu asistente está pausado y no responde a tus clientes. Renová para reactivarlo.'; cta = 'Renovar ahora';
  } else if (info.estado === 'activa' && info.dias <= DIAS_AVISO_VENCIMIENTO) {
    tono = info.dias <= 3 ? 'urgente' : 'atencion';
    titulo = info.dias === 1 ? 'Tu suscripción vence mañana' : `Tu suscripción vence en ${info.dias} días`;
    detalle = 'Renová ahora: los meses nuevos se suman al tiempo que te queda, no perdés nada.'; cta = 'Renovar';
  } else if (info.estado === 'prueba' && info.limite && info.usados / info.limite >= 0.8) {
    tono = 'atencion'; titulo = info.restantesPrueba === 0 ? 'Se terminó tu prueba' : `Te quedan ${info.restantesPrueba} mensajes de prueba`;
    detalle = 'Activá un plan para que tu asistente siga atendiendo a tus clientes.'; cta = 'Activar plan';
  }

  const aviso = document.getElementById('aviso-suscripcion-inicio');
  if (aviso) {
    aviso.innerHTML = tono ? `
      <div class="aviso-susc ${tono}">
        <div class="aviso-susc-icono"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></div>
        <div class="aviso-susc-texto"><strong>${titulo}</strong><span>${detalle}</span></div>
        <button class="aviso-susc-btn" id="btn-aviso-renovar">${cta}</button>
      </div>` : '';
    const btn = document.getElementById('btn-aviso-renovar');
    if (btn) btn.addEventListener('click', abrirPlanes);
  }

  // Notificación del navegador (una vez por día) mientras el panel está abierto
  if (tono) notificarSuscripcionUnaVezPorDia(titulo, detalle);

  renderizarSuscripcion(info, fechaTxt);
  renderizarTiempoEnPlanes(info, fechaTxt);
}

function notificarSuscripcionUnaVezPorDia(titulo, texto) {
  try {
    const hoy = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem('ev_aviso_suscripcion') === hoy) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(titulo, { body: texto });
      localStorage.setItem('ev_aviso_suscripcion', hoy);
    }
  } catch (e) { /* si el navegador bloquea el storage, simplemente no avisamos por acá */ }
}

function renderizarSuscripcion(info, fechaTxt) {
  const cont = document.getElementById('suscripcion-contenido');
  if (!cont) return;

  let tono = info.estado, valor, unidad, fraccion, titulo, sub, cta, etiqueta;
  if (info.estado === 'activa') {
    const total = Math.max(30, (MESES_PLAN[info.plan] || 1) * 30);
    valor = info.dias; unidad = info.dias === 1 ? 'día' : 'días'; fraccion = Math.min(1, info.dias / total);
    titulo = NOMBRES_PLAN[info.plan] || 'Plan activo'; sub = `Vence el ${fechaTxt}`;
    cta = 'Renovar antes de que venza'; etiqueta = 'Plan activo';
  } else if (info.estado === 'prueba') {
    valor = info.restantesPrueba; unidad = 'mensajes'; fraccion = info.limite ? info.restantesPrueba / info.limite : 0;
    titulo = 'Período de prueba'; sub = `Usaste ${info.usados} de ${info.limite} mensajes de prueba`;
    cta = 'Activar mi plan'; etiqueta = 'En prueba';
  } else {
    valor = 0; unidad = 'días'; fraccion = 0;
    titulo = 'Suscripción vencida'; sub = fechaTxt ? `Venció el ${fechaTxt}` : 'Activá un plan para reactivar tu asistente';
    cta = 'Reactivar mi asistente'; etiqueta = 'Vencida';
  }

  const R = 52, C = 2 * Math.PI * R;
  cont.innerHTML = `
    <div class="susc-hero susc-${tono}">
      <div class="susc-anillo">
        <svg viewBox="0 0 120 120">
          <circle class="susc-anillo-fondo" cx="60" cy="60" r="${R}"/>
          <circle class="susc-anillo-valor" cx="60" cy="60" r="${R}" stroke-dasharray="${fraccion * C} ${C}" transform="rotate(-90 60 60)"/>
        </svg>
        <div class="susc-anillo-centro"><strong>${valor}</strong><span>${unidad}</span></div>
      </div>
      <div class="susc-hero-texto">
        <span class="susc-etiqueta">${etiqueta}</span>
        <h3>${titulo}</h3>
        <p>${sub}</p>
      </div>
    </div>
    <button class="btn ancho susc-btn" id="btn-renovar-ahora">${cta}</button>
    <div class="susc-datos">
      <div class="susc-dato"><span>Estado</span><strong>${etiqueta}</strong></div>
      <div class="susc-dato"><span>Plan</span><strong>${NOMBRES_PLAN[info.plan] || '—'}</strong></div>
      <div class="susc-dato"><span>${info.estado === 'prueba' ? 'Mensajes' : 'Vencimiento'}</span><strong>${info.estado === 'prueba' ? `${info.usados}/${info.limite}` : (info.venc ? info.venc.toLocaleDateString('es-AR') : '—')}</strong></div>
    </div>
    <div class="susc-nota"><strong>Renová cuando quieras.</strong> Si lo hacés antes de que se termine, los meses nuevos se suman al final del tiempo que ya tenés. Y cuanto más largo el plan, menos pagás por mes.</div>
  `;
  document.getElementById('btn-renovar-ahora').addEventListener('click', abrirPlanes);
}

function renderizarTiempoEnPlanes(info, fechaTxt) {
  const cont = document.getElementById('planes-resumen-tiempo');
  if (!cont) return;
  if (info.estado === 'activa') {
    cont.innerHTML = `<div class="planes-tiempo ${info.dias <= DIAS_AVISO_VENCIMIENTO ? 'aviso' : ''}"><strong>${textoTiempoRestante(info)}</strong><span>Tu plan vence el ${fechaTxt}</span></div>`;
  } else if (info.estado === 'prueba') {
    cont.innerHTML = `<div class="planes-tiempo"><strong>Estás en período de prueba</strong><span>Te quedan ${info.restantesPrueba} mensajes de prueba</span></div>`;
  } else {
    cont.innerHTML = `<div class="planes-tiempo aviso"><strong>Tu suscripción venció</strong><span>Elegí un plan para reactivar tu asistente</span></div>`;
  }
}

function fraseAhorroPlan(plan, precioMensualBase) {
  if (!plan.ahorro) return 'Ideal para empezar, sin compromiso.';
  const mesesEquivalentes = plan.ahorro / precioMensualBase;
  if (mesesEquivalentes >= 1) {
    const n = Math.floor(mesesEquivalentes);
    return `¡Ahorrás ${fmtPesos(plan.ahorro)}! Es como llevarte más de ${n === 1 ? 'un mes' : n + ' meses'} gratis.`;
  }
  return `Ahorrás ${fmtPesos(plan.ahorro)} frente a pagar mes a mes.`;
}

async function cargarPlanes() {
  const grid = document.getElementById('grid-planes');
  try {
    const res = await fetch(`${API_URL}/suscripcion/planes`, { cache: 'no-store' });
    const planes = await res.json();
    const entradas = Object.entries(planes);
    const primero = entradas[0] ? entradas[0][1] : null;
    const base = primero ? primero.precio / primero.meses : 0;

    grid.innerHTML = entradas.map(([clave, plan]) => {
      const insignia = plan.meses === 6 ? 'Mejor precio' : (plan.meses === 3 ? 'Popular' : '');
      return `
        <div class="plan-card" data-plan="${clave}">
          ${insignia ? `<div class="plan-insignia">${insignia}</div>` : ''}
          <div class="plan-cabecera">
            <div class="plan-titulo-fila">
              <span class="plan-radio"></span>
              <div>
                <div class="plan-nombre">${escHtml(plan.label)}</div>
                <div class="plan-duracion">${plan.meses === 1 ? '1 mes' : plan.meses + ' meses'}</div>
              </div>
            </div>
            ${plan.descuentoPorcentaje ? `<div class="plan-descuento">${plan.descuentoPorcentaje}% OFF</div>` : ''}
          </div>
          <div class="plan-precio-fila">
            <span class="plan-precio">${fmtPesos(plan.precio)}</span>
            ${plan.ahorro ? `<span class="plan-precio-tachado">${fmtPesos(plan.precioSinDescuento)}</span>` : ''}
          </div>
          <div class="plan-por-mes"><strong>${fmtPesos(plan.precioPorMes)}</strong> por mes</div>
          <div class="plan-frase">${fraseAhorroPlan(plan, base)}</div>
          <div class="plan-accion"></div>
        </div>`;
    }).join('');

    // El botón de pago aparece recién cuando el dueño elige un plan, y solo en el plan elegido.
    grid.querySelectorAll('.plan-card').forEach((card) => {
      card.addEventListener('click', () => {
        if (card.classList.contains('seleccionado')) return;
        grid.querySelectorAll('.plan-card').forEach((c) => {
          c.classList.remove('seleccionado');
          c.querySelector('.plan-accion').innerHTML = '';
        });
        card.classList.add('seleccionado');
        const plan = planes[card.dataset.plan];
        const accion = card.querySelector('.plan-accion');
        accion.innerHTML = `<button class="btn ancho plan-boton" data-plan="${card.dataset.plan}">Obtener ${escHtml(plan.label.toLowerCase())}</button>`;
        accion.querySelector('.plan-boton').addEventListener('click', (e) => { e.stopPropagation(); iniciarPago(card.dataset.plan); });
      });
    });
  } catch (error) {
    grid.innerHTML = `<p class="ayuda">No se pudieron cargar los planes.</p>`;
  }
}

async function iniciarPago(plan) {
  const msgDiv = document.getElementById('pago-msg');
  msgDiv.innerHTML = `<p class="ayuda">Generando link de pago...</p>`;

  try {
    const res = await fetch(`${API_URL}/suscripcion/crear-pago`, {
      method: 'POST',
      headers: headersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();

    if (!res.ok) {
      msgDiv.innerHTML = `<div class="error-msg">${data.error || 'No se pudo generar el pago.'}</div>`;
      return;
    }

    window.location.href = data.initPoint; // redirige a Mercado Pago a completar el pago
  } catch (error) {
    msgDiv.innerHTML = `<div class="error-msg">Error de conexión, intentá de nuevo.</div>`;
  }
}

// Al volver de Mercado Pago (?pago=exito|pendiente|fallo en la URL), el webhook puede tardar
// unos segundos en llegar. En vez de mostrar el estado viejo, esperamos y consultamos de nuevo
// hasta ver la suscripción activada (o avisamos si tarda más de lo normal).
async function esperarConfirmacionPago() {
  const params = new URLSearchParams(window.location.search);
  const resultado = params.get('pago');
  if (!resultado) return;

  history.replaceState({}, '', window.location.pathname); // limpiamos el parámetro para no repetir esto si recarga

  if (resultado === 'fallo') {
    mostrarToast('El pago no se pudo completar. Podés intentar de nuevo desde "Mi plan".');
    return;
  }
  if (negocioActual.suscripcion.estado === 'activa') return; // ya estaba activa (por ejemplo, si tardó en volver)

  const banner = document.createElement('div');
  banner.className = 'aviso-info';
  banner.id = 'aviso-confirmando-pago';
  banner.textContent = 'Confirmando tu pago con Mercado Pago...';
  document.getElementById('vista-panel').prepend(banner);

  const maxIntentos = 10; // 10 x 3s = 30 segundos
  for (let intento = 0; intento < maxIntentos; intento++) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const res = await fetch(`${API_URL}/negocios/mi-negocio`, { headers: headersAuth(), cache: 'no-store' });
      if (res.ok) {
        negocioActual = await res.json();
        if (negocioActual.suscripcion.estado === 'activa') {
          banner.remove();
          mostrarToast('¡Pago confirmado! Tu suscripción ya está activa.');
          const estado = negocioActual.suscripcion.estado;
          const pill = document.getElementById('estado-suscripcion-pill');
          pill.textContent = estado.toUpperCase();
          pill.className = `pill-estado ${estado}`;
          actualizarEstadoSuscripcionUI();
          return;
        }
      }
    } catch (error) {
      // reintenta en la próxima vuelta
    }
  }
  banner.textContent = 'Tu pago está siendo procesado. Puede demorar unos minutos: recargá esta página en un rato.';
}

function renderizarFotos() {
  const grid = document.getElementById('grid-fotos');
  const fotos = negocioActual.fotos || [];

  if (!fotos.length) {
    grid.innerHTML = `<p class="ayuda">Todavía no subiste ninguna foto.</p>`;
    return;
  }

  grid.innerHTML = fotos.map((f) => `
    <div style="position:relative;">
      <img src="${f.url}" style="width:110px; height:110px; object-fit:cover; border-radius:10px;">
      <div style="font-size:0.75rem; text-align:center; color:var(--gris-texto);">${f.categoria}</div>
      <button class="btn-borrar-foto" data-public-id="${f.publicId}" style="position:absolute; top:2px; right:2px; background:rgba(220,38,38,0.9); color:white; border:none; border-radius:50%; width:22px; height:22px; cursor:pointer; font-size:0.8rem;">✕</button>
    </div>
  `).join('');

  document.querySelectorAll('.btn-borrar-foto').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const publicId = btn.dataset.publicId;
      try {
        const res = await fetch(`${API_URL}/negocios/fotos/${encodeURIComponent(publicId)}`, {
          method: 'DELETE',
          headers: headersAuth(),
        });
        if (!res.ok) throw new Error('Error al borrar');
        negocioActual.fotos = negocioActual.fotos.filter((f) => f.publicId !== publicId);
        renderizarFotos();
      } catch (error) {
        alert('No se pudo borrar la foto.');
      }
    });
  });
}

const ETIQUETAS_ESTADO = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  entregado: 'Entregado',
};

const ETIQUETAS_ESTADO_PAGO = {
  esperando_comprobante: '⏳ Esperando que el cliente adjunte el comprobante',
  comprobante_recibido: '📩 Comprobante recibido — falta que revises si llegó',
  verificado: '✅ Pago verificado por vos',
  rechazado: '🚫 Pago rechazado (no era válido)',
};

async function cargarPedidos() {
  const contenedor = document.getElementById('lista-pedidos');
  try {
    const res = await fetch(`${API_URL}/pedidos`, {
      headers: headersAuth(),
    });
    pedidosCache = await res.json();
    actualizarBadgeCampana(pedidosCache);
    renderizarPedidos();
  } catch (error) {
    contenedor.innerHTML = `<div class="error-msg">No se pudieron cargar los pedidos.</div>`;
  }
}

// Grupos de estados que agrupa cada pestaña (la pestaña "en_preparacion" también
// muestra "confirmado", porque para el dueño ambos significan "todavía no está listo")
const GRUPOS_FILTRO_PEDIDOS = {
  todos: null,
  pendiente: ['pendiente'],
  en_preparacion: ['confirmado', 'en_preparacion', 'listo'],
  entregado: ['entregado'],
};

function renderizarPedidos() {
  const contenedor = document.getElementById('lista-pedidos');
  const totalHoyCard = document.getElementById('total-hoy-card');

  const gruposPermitidos = GRUPOS_FILTRO_PEDIDOS[filtroPedidoActual];
  let pedidosFiltrados = pedidosCache.filter((p) => !gruposPermitidos || gruposPermitidos.includes(p.estado));

  if (busquedaPedidoActual) {
    pedidosFiltrados = pedidosFiltrados.filter((p) => {
      const numero = String(p._id).slice(-4).toLowerCase();
      return (p.nombreCliente || '').toLowerCase().includes(busquedaPedidoActual) || numero.includes(busquedaPedidoActual);
    });
  }

  // Tarjeta de "Total hoy": se calcula siempre sobre TODOS los pedidos de hoy, sin importar el filtro activo
  const hoy = new Date();
  const pedidosDeHoy = pedidosCache.filter((p) => new Date(p.createdAt).toDateString() === hoy.toDateString());
  if (pedidosDeHoy.length) {
    const totalHoy = pedidosDeHoy.reduce((suma, p) => suma + (p.total || 0), 0);
    document.getElementById('total-hoy-etiqueta').textContent = `${pedidosDeHoy.length} pedido(s) hoy`;
    document.getElementById('total-hoy-monto').textContent = `$${totalHoy.toLocaleString('es-AR')}`;
    totalHoyCard.style.display = 'flex';
  } else {
    totalHoyCard.style.display = 'none';
  }

  if (!pedidosCache.length) {
    contenedor.innerHTML = `<p class="ayuda">Todavía no llegó ningún pedido.</p>`;
    return;
  }
  if (!pedidosFiltrados.length) {
    contenedor.innerHTML = `<p class="ayuda">No hay pedidos que coincidan con este filtro.</p>`;
    return;
  }

  contenedor.innerHTML = pedidosFiltrados.map((p) => `
      <div class="pedido-card" data-id="${p._id}" data-estado="${p.estado}">
        <div class="pedido-header">
          <div class="pedido-avatar">${ICONOS_PEDIDO.persona}</div>
          <div class="pedido-header-texto">
            <strong>${p.nombreCliente}</strong>
            ${p.telefonoCliente ? `<span class="pedido-telefono"> · ${p.telefonoCliente}</span>` : ''}
            <div class="pedido-fecha">${ICONOS_PEDIDO.reloj} ${new Date(p.createdAt).toLocaleString('es-AR')}</div>
          </div>
          <span class="badge-estado badge-${p.estado}"><span class="badge-punto"></span>${ETIQUETAS_ESTADO[p.estado] || p.estado}</span>
        </div>
        <ul class="pedido-items">
          ${p.items.map((i) => `<li>${i.cantidad}x ${i.producto}${i.precioUnitario ? ` — $${i.precioUnitario * i.cantidad}` : ''}</li>`).join('')}
        </ul>
        ${p.total ? `<div class="pedido-total-linea">Total: <strong>$${p.total.toLocaleString('es-AR')}</strong></div>` : ''}

        <div class="pedido-info-chips">
          <span class="chip-info">${p.tipoEntrega === 'delivery' ? `${ICONOS_PEDIDO.moto} Delivery — ${p.direccionEntrega || 'sin dirección'}` : `${ICONOS_PEDIDO.pin} Retira en el local`}</span>
          <span class="chip-info">${iconoFormaPago(p.formaPago)} ${p.formaPago}</span>
        </div>
        ${p.observaciones ? `<div class="pedido-detalle">${ICONOS_PEDIDO.nota} ${p.observaciones}</div>` : ''}

        ${ETIQUETAS_ESTADO_PAGO[p.estadoPago] ? `<div class="pedido-detalle"><strong>${ETIQUETAS_ESTADO_PAGO[p.estadoPago]}</strong></div>` : ''}

        ${p.comprobante && p.comprobante.url ? `
          <div class="comprobante-box">
            <a href="${p.comprobante.url}" target="_blank" rel="noopener">
              <img src="${p.comprobante.url}" alt="Comprobante" class="comprobante-miniatura">
            </a>
            <button class="btn-verificar-pago" data-id="${p._id}" data-verificado="${p.pagoVerificado ? 'false' : 'true'}">
              ${p.pagoVerificado ? 'Desmarcar verificación' : `${ICONOS_PEDIDO.check} Confirmar que la plata llegó`}
            </button>
            ${p.estadoPago !== 'rechazado' ? `<button class="btn-rechazar-pago" data-id="${p._id}">${ICONOS_PEDIDO.equis} Rechazar (no era válido)</button>` : ''}
          </div>
        ` : ''}

        <div class="pedido-acciones">
          <label class="pedido-acciones-titulo">Cambiar estado</label>
          <div class="fila-botones-pedido">
            <div class="accion-pedido-wrap azul">
              ${ICONOS_PEDIDO.tarjeta}
              <span>Cambiar estado</span>
              <span class="accion-flecha">${ICONOS_PEDIDO.flecha}</span>
              <select class="select-estado-pedido select-invisible" data-id="${p._id}">
                ${Object.entries(ETIQUETAS_ESTADO).map(([valor, etiqueta]) =>
                  `<option value="${valor}" ${valor === p.estado ? 'selected' : ''}>${etiqueta}</option>`
                ).join('')}
              </select>
            </div>
            ${p.estado === 'entregado' ? `
              <button class="accion-pedido-wrap rojo btn-icono-eliminar" data-id="${p._id}">
                ${ICONOS_PEDIDO.tacho}
                <span>Eliminar pedido</span>
                <span class="accion-flecha">${ICONOS_PEDIDO.flecha}</span>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.btn-icono-eliminar').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este pedido? No se puede deshacer.')) return;
        const id = btn.dataset.id;
        try {
          const res = await fetch(`${API_URL}/pedidos/${id}`, {
            method: 'DELETE',
            headers: headersAuth(),
          });
          if (!res.ok) throw new Error('Error al eliminar');
          cargarPedidos();
        } catch (error) {
          alert('No se pudo eliminar el pedido, intentá de nuevo.');
        }
      });
    });

    document.querySelectorAll('.select-estado-pedido').forEach((select) => {
      select.addEventListener('change', async (e) => {
        const id = e.target.dataset.id;
        const nuevoEstado = e.target.value;
        try {
          const res = await fetch(`${API_URL}/pedidos/${id}/estado`, {
            method: 'PUT',
            headers: headersAuth({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ estado: nuevoEstado }),
          });
          if (!res.ok) throw new Error('Error al actualizar');
          cargarPedidos(); // recargamos para actualizar el badge
        } catch (error) {
          alert('No se pudo actualizar el estado del pedido, intentá de nuevo.');
        }
      });
    });

    document.querySelectorAll('.btn-verificar-pago').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const nuevoValor = btn.dataset.verificado === 'true';
        try {
          const res = await fetch(`${API_URL}/pedidos/${id}/pago-verificado`, {
            method: 'PUT',
            headers: headersAuth({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ verificado: nuevoValor }),
          });
          if (!res.ok) throw new Error('Error al actualizar');
          cargarPedidos();
        } catch (error) {
          alert('No se pudo actualizar, intentá de nuevo.');
        }
      });
    });

    document.querySelectorAll('.btn-rechazar-pago').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Marcar este comprobante como rechazado? (transferencia falsa, monto incorrecto, etc.)')) return;
        const id = btn.dataset.id;
        try {
          const res = await fetch(`${API_URL}/pedidos/${id}/pago-rechazado`, {
            method: 'PUT',
            headers: headersAuth({ 'Content-Type': 'application/json' }),
          });
          if (!res.ok) throw new Error('Error al actualizar');
          cargarPedidos();
        } catch (error) {
          alert('No se pudo actualizar, intentá de nuevo.');
        }
      });
    });
}

// Sube una foto apenas se elige el archivo, con la categoría fija de esa fila (logo / menu / producto)
function activarSubidaAutomatica(inputId, categoria) {
  document.getElementById(inputId).addEventListener('change', async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    const msgDiv = document.getElementById('foto-msg');
    msgDiv.innerHTML = `<p class="ayuda">Subiendo foto...</p>`;

    try {
      // El logo es una sola foto: si ya había una, la reemplazamos en vez de acumular
      if (categoria === 'logo') {
        const logosViejos = (negocioActual.fotos || []).filter((f) => f.categoria === 'logo');
        for (const foto of logosViejos) {
          await fetch(`${API_URL}/negocios/fotos/${foto.publicId}`, { method: 'DELETE', headers: headersAuth() });
        }
      }

      const formDataFoto = new FormData();
      formDataFoto.append('foto', archivo);
      formDataFoto.append('categoria', categoria);

      const res = await fetch(`${API_URL}/negocios/fotos`, {
        method: 'POST',
        headers: headersAuth(),
        body: formDataFoto,
      });
      if (!res.ok) throw new Error('Error al subir');

      const resNegocio = await fetch(`${API_URL}/negocios/mi-negocio`, { headers: headersAuth() });
      negocioActual = await resNegocio.json();
      if (categoria === 'logo') actualizarAvatares(inicialNegocio);
      renderizarFotos();
      e.target.value = '';
      msgDiv.innerHTML = `<div class="exito">Foto subida correctamente.</div>`;
    } catch (error) {
      msgDiv.innerHTML = `<div class="error-msg">No se pudo subir la foto. Intentá de nuevo.</div>`;
    }
  });
}
activarSubidaAutomatica('input-foto-logo', 'logo');
activarSubidaAutomatica('input-foto-menu', 'menu');
// --- Promociones ---
function renderizarPromociones() {
  const contenedor = document.getElementById('lista-promociones');
  const promos = negocioActual.promociones || [];
  if (!promos.length) {
    contenedor.innerHTML = `<p class="ayuda">Todavía no publicaste ninguna promoción.</p>`;
    return;
  }
  contenedor.innerHTML = promos.map((p) => {
    const reglas = [];
    if (p.aplicaA) reglas.push(`Solo: ${p.aplicaA}`);
    if (p.horarioDesde && p.horarioHasta) reglas.push(`${p.horarioDesde}–${p.horarioHasta}`);
    if (p.fechaHasta) reglas.push(`Hasta ${new Date(p.fechaHasta).toLocaleDateString('es-AR')}`);
    if (typeof p.usosMaximos === 'number') reglas.push(`${p.usosActuales || 0}/${p.usosMaximos} usos`);
    return `
    <div class="promo-card ${p.activa ? '' : 'promo-inactiva'}" data-id="${p._id}">
      <div class="promo-info">
        <strong>${p.titulo}</strong>
        ${p.descripcion ? `<span>${p.descripcion}</span>` : ''}
        ${reglas.length ? `<span>${reglas.join(' · ')}</span>` : ''}
      </div>
      <div class="promo-acciones">
        ${typeof p.usosMaximos === 'number' ? `<button class="btn-sumar-uso-promo" data-id="${p._id}" title="Sumar un uso">+1 uso</button>` : ''}
        <button class="toggle-switch ${p.activa ? 'activo' : ''}" data-id="${p._id}" data-activa="${p.activa}" title="${p.activa ? 'Desactivar' : 'Activar'}"><span></span></button>
        <button class="btn-icono-eliminar btn-borrar-promo" data-id="${p._id}" title="Eliminar">${ICONOS_PEDIDO.tacho}</button>
      </div>
    </div>
  `;
  }).join('');

  contenedor.querySelectorAll('.toggle-switch').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const nuevaActiva = btn.dataset.activa !== 'true';
      try {
        await fetch(`${API_URL}/negocios/promociones/${id}`, {
          method: 'PUT',
          headers: headersAuth({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ activa: nuevaActiva }),
        });
        const promo = negocioActual.promociones.find((p) => p._id === id);
        if (promo) promo.activa = nuevaActiva;
        renderizarPromociones();
      } catch (error) {
        alert('No se pudo actualizar la promoción.');
      }
    });
  });

  contenedor.querySelectorAll('.btn-sumar-uso-promo').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const promo = negocioActual.promociones.find((p) => p._id === id);
      if (!promo) return;
      const nuevosUsos = (promo.usosActuales || 0) + 1;
      try {
        await fetch(`${API_URL}/negocios/promociones/${id}`, {
          method: 'PUT',
          headers: headersAuth({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ usosActuales: nuevosUsos }),
        });
        promo.usosActuales = nuevosUsos;
        renderizarPromociones();
      } catch (error) {
        alert('No se pudo actualizar el contador de usos.');
      }
    });
  });

  contenedor.querySelectorAll('.btn-borrar-promo').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar esta promoción?')) return;
      const id = btn.dataset.id;
      try {
        await fetch(`${API_URL}/negocios/promociones/${id}`, { method: 'DELETE', headers: headersAuth() });
        negocioActual.promociones = negocioActual.promociones.filter((p) => p._id !== id);
        renderizarPromociones();
      } catch (error) {
        alert('No se pudo eliminar la promoción.');
      }
    });
  });
}

document.getElementById('btn-mostrar-reglas-promo').addEventListener('click', () => {
  const wrap = document.getElementById('reglas-promo-wrap');
  const abrir = wrap.style.display === 'none';
  wrap.style.display = abrir ? 'block' : 'none';
  document.getElementById('btn-mostrar-reglas-promo').style.display = abrir ? 'none' : 'block';
});

document.getElementById('btn-crear-promocion').addEventListener('click', async () => {
  const tituloInput = document.getElementById('promo-titulo');
  const descripcionInput = document.getElementById('promo-descripcion');
  const msgDiv = document.getElementById('promo-msg');
  const titulo = tituloInput.value.trim();

  if (!titulo) {
    msgDiv.innerHTML = `<div class="error-msg">Escribí un título para la promoción.</div>`;
    return;
  }

  const payload = {
    titulo,
    descripcion: descripcionInput.value.trim(),
    aplicaA: document.getElementById('promo-aplica-a').value.trim(),
    fechaHasta: document.getElementById('promo-fecha-hasta').value || undefined,
    horarioDesde: document.getElementById('promo-horario-desde').value || undefined,
    horarioHasta: document.getElementById('promo-horario-hasta').value || undefined,
    usosMaximos: document.getElementById('promo-usos-maximos').value || undefined,
  };

  try {
    const res = await fetch(`${API_URL}/negocios/promociones`, {
      method: 'POST',
      headers: headersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Error al crear');
    const nuevaPromo = await res.json();

    negocioActual.promociones = negocioActual.promociones || [];
    negocioActual.promociones.push(nuevaPromo);
    renderizarPromociones();
    tituloInput.value = '';
    descripcionInput.value = '';
    document.getElementById('promo-aplica-a').value = '';
    document.getElementById('promo-fecha-hasta').value = '';
    document.getElementById('promo-horario-desde').value = '';
    document.getElementById('promo-horario-hasta').value = '';
    document.getElementById('promo-usos-maximos').value = '';
    document.getElementById('reglas-promo-wrap').style.display = 'none';
    document.getElementById('btn-mostrar-reglas-promo').style.display = 'block';
    msgDiv.innerHTML = `<div class="exito">Promoción publicada. El asistente ya la va a mencionar cuando tenga sentido.</div>`;
  } catch (error) {
    msgDiv.innerHTML = `<div class="error-msg">No se pudo publicar la promoción. Intentá de nuevo.</div>`;
  }
});

// Nota: este botón ya existía en el HTML pero no tenía listener (no hacía nada al tocarlo). Lo conecto acá.
document.getElementById('btn-guardar-disponibilidad').addEventListener('click', async () => {
  const msgDiv = document.getElementById('disponibilidad-msg');
  try {
    const res = await fetch(`${API_URL}/negocios/mi-negocio`, {
      method: 'PUT',
      headers: headersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ disponibilidadHoy: document.getElementById('disponibilidad-hoy').value }),
    });
    if (!res.ok) throw new Error('Error al guardar');
    const data = await res.json();
    negocioActual = data.negocio;
    msgDiv.innerHTML = `<p class="exito">Guardado.</p>`;
    setTimeout(() => { msgDiv.innerHTML = ''; }, 2000);
  } catch (error) {
    msgDiv.innerHTML = `<div class="error-msg">No se pudo guardar, intentá de nuevo.</div>`;
  }
});

// --- Vendedor y memoria (modo vendedor, memoria de clientes, permisos del asistente) ---
document.getElementById('btn-guardar-vendedor-memoria').addEventListener('click', async () => {
  const msgDiv = document.getElementById('vendedor-memoria-msg');
  const cambios = {
    modoVendedor: document.getElementById('select-modo-vendedor').value,
    memoriaActiva: document.getElementById('check-memoria-activa').checked,
    permisos: {
      recomendarProductos: document.getElementById('check-permiso-recomendar').checked,
      ofrecerPromociones: document.getElementById('check-permiso-promos').checked,
      tomarPedidosOTurnos: document.getElementById('check-permiso-tomar').checked,
      intentarCerrarVenta: document.getElementById('check-permiso-cerrar').checked,
    },
  };
  try {
    const res = await fetch(`${API_URL}/negocios/mi-negocio`, {
      method: 'PUT',
      headers: headersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(cambios),
    });
    if (!res.ok) throw new Error('Error al guardar');
    const data = await res.json();
    negocioActual = data.negocio;
    msgDiv.innerHTML = `<p class="exito">Guardado.</p>`;
    setTimeout(() => { msgDiv.innerHTML = ''; }, 2000);
  } catch (error) {
    msgDiv.innerHTML = `<div class="error-msg">No se pudo guardar, intentá de nuevo.</div>`;
  }
});

activarSubidaAutomatica('input-foto-producto', 'producto');

// --- Productos y servicios (catálogo real) ---
let productosCache = [];
let tipoProductoSeleccionado = 'general';
let variantesProducto = [];
let productoEditandoId = null; // null = creando uno nuevo; si tiene valor, estamos editando ese producto

document.getElementById('btn-mostrar-form-producto').addEventListener('click', () => {
  const wrap = document.getElementById('form-producto-wrap');
  const abrir = wrap.style.display === 'none';
  if (abrir) {
    limpiarFormProducto(); // siempre arranca en modo "nuevo producto" al abrirlo con este botón
  }
  wrap.style.display = abrir ? 'block' : 'none';
  document.getElementById('btn-mostrar-form-producto').style.display = abrir ? 'none' : 'block';
});
document.getElementById('btn-cancelar-producto').addEventListener('click', () => {
  limpiarFormProducto();
  document.getElementById('form-producto-wrap').style.display = 'none';
  document.getElementById('btn-mostrar-form-producto').style.display = 'block';
});

document.querySelectorAll('.opcion-tipo-producto').forEach((el) => {
  el.addEventListener('click', () => {
    tipoProductoSeleccionado = el.dataset.tipo;
    document.querySelectorAll('.opcion-tipo-producto').forEach((e) => e.classList.toggle('seleccionado', e === el));
    document.getElementById('campos-comida').style.display = tipoProductoSeleccionado === 'comida_bebida' ? 'block' : 'none';
    document.getElementById('campos-servicio').style.display = tipoProductoSeleccionado === 'servicio' ? 'block' : 'none';
    document.getElementById('campos-variantes').style.display = tipoProductoSeleccionado === 'ropa_calzado' ? 'block' : 'none';
  });
});
document.querySelector('.opcion-tipo-producto[data-tipo="general"]').classList.add('seleccionado');

function renderizarVariantesProducto() {
  const contenedor = document.getElementById('lista-variantes-producto');
  contenedor.innerHTML = variantesProducto.map((v, i) => `
    <div class="fila-variante">
      <span>${v.nombre}${v.stock !== null && v.stock !== undefined ? ` — stock: ${v.stock}` : ''}</span>
      <button type="button" data-i="${i}">Quitar</button>
    </div>
  `).join('');
  contenedor.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      variantesProducto.splice(parseInt(btn.dataset.i, 10), 1);
      renderizarVariantesProducto();
    });
  });
}
document.getElementById('btn-agregar-variante').addEventListener('click', () => {
  const nombreInput = document.getElementById('nueva-variante-nombre');
  const stockInput = document.getElementById('nueva-variante-stock');
  if (!nombreInput.value.trim()) { alert('Ponele un nombre a la variante (ej: Talle 42, Color rojo).'); return; }
  variantesProducto.push({ nombre: nombreInput.value.trim(), stock: stockInput.value !== '' ? parseInt(stockInput.value, 10) : null });
  renderizarVariantesProducto();
  nombreInput.value = '';
  stockInput.value = '';
});

function limpiarFormProducto() {
  ['producto-nombre', 'producto-descripcion', 'producto-categoria', 'producto-precio', 'producto-stock',
   'producto-tamano', 'producto-ingredientes', 'producto-apto', 'producto-duracion', 'producto-incluye'].forEach((id) => {
    document.getElementById(id).value = '';
  });
  document.getElementById('producto-disponible-hoy').checked = true;
  document.getElementById('producto-recomendar').checked = true;
  variantesProducto = [];
  renderizarVariantesProducto();
  tipoProductoSeleccionado = 'general';
  document.querySelectorAll('.opcion-tipo-producto').forEach((e) => e.classList.remove('seleccionado'));
  document.querySelector('.opcion-tipo-producto[data-tipo="general"]').classList.add('seleccionado');
  document.getElementById('campos-comida').style.display = 'none';
  document.getElementById('campos-servicio').style.display = 'none';
  document.getElementById('campos-variantes').style.display = 'none';
  document.getElementById('producto-msg').innerHTML = '';

  productoEditandoId = null;
  document.getElementById('form-producto-titulo').textContent = 'Nuevo producto';
  document.getElementById('btn-guardar-producto').textContent = 'Guardar producto';
  document.getElementById('producto-foto-nueva').value = '';
  document.getElementById('producto-foto-actual-wrap').style.display = 'none';
}

// Abre el formulario ya precargado con los datos del producto, para editarlo (en vez de crear uno nuevo)
function abrirFormEdicionProducto(producto) {
  limpiarFormProducto();
  productoEditandoId = producto._id;
  document.getElementById('form-producto-titulo').textContent = `Editando: ${producto.nombre}`;
  document.getElementById('btn-guardar-producto').textContent = 'Guardar cambios';

  document.getElementById('producto-nombre').value = producto.nombre || '';
  document.getElementById('producto-descripcion').value = producto.descripcion || '';
  document.getElementById('producto-categoria').value = producto.categoria || '';
  document.getElementById('producto-precio').value = producto.precio ?? '';
  document.getElementById('producto-stock').value = producto.stock ?? '';
  document.getElementById('producto-disponible-hoy').checked = producto.disponibleHoy !== false;
  document.getElementById('producto-recomendar').checked = producto.recomendar !== false;
  document.getElementById('producto-tamano').value = producto.tamanoPorcion || '';
  document.getElementById('producto-ingredientes').value = producto.ingredientesPrincipales || '';
  document.getElementById('producto-apto').value = producto.aptoPara || '';
  document.getElementById('producto-duracion').value = producto.duracionEstimada || '';
  document.getElementById('producto-incluye').value = producto.queIncluye || '';

  variantesProducto = Array.isArray(producto.variantes) ? producto.variantes.map((v) => ({ ...v })) : [];
  renderizarVariantesProducto();

  tipoProductoSeleccionado = producto.tipoProducto || 'general';
  document.querySelectorAll('.opcion-tipo-producto').forEach((e) => e.classList.toggle('seleccionado', e.dataset.tipo === tipoProductoSeleccionado));
  document.getElementById('campos-comida').style.display = tipoProductoSeleccionado === 'comida_bebida' ? 'block' : 'none';
  document.getElementById('campos-servicio').style.display = tipoProductoSeleccionado === 'servicio' ? 'block' : 'none';
  document.getElementById('campos-variantes').style.display = tipoProductoSeleccionado === 'ropa_calzado' ? 'block' : 'none';

  if (producto.fotos && producto.fotos[0]) {
    document.getElementById('producto-foto-actual').src = producto.fotos[0].url;
    document.getElementById('producto-foto-actual-wrap').style.display = 'block';
  }

  document.getElementById('form-producto-wrap').style.display = 'block';
  document.getElementById('btn-mostrar-form-producto').style.display = 'none';
  document.getElementById('form-producto-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Quita la foto actual del producto que se está editando (borra todas las que tenga, es una sola en la práctica)
document.getElementById('btn-quitar-foto-producto').addEventListener('click', async () => {
  if (!productoEditandoId) return;
  const producto = productosCache.find((p) => p._id === productoEditandoId);
  if (!producto || !producto.fotos || !producto.fotos.length) return;
  try {
    for (const foto of producto.fotos) {
      await fetch(`${API_URL}/productos/${productoEditandoId}/fotos/${encodeURIComponent(foto.publicId)}`, { method: 'DELETE', headers: headersAuth() });
    }
    producto.fotos = [];
    document.getElementById('producto-foto-actual-wrap').style.display = 'none';
    renderizarProductos();
  } catch (error) {
    alert('No se pudo quitar la foto, intentá de nuevo.');
  }
});

// Sube la foto nueva de un producto (si el dueño eligió un archivo), reemplazando cualquier foto anterior
async function subirFotoProducto(productoId, archivo) {
  const formData = new FormData();
  formData.append('foto', archivo);
  const res = await fetch(`${API_URL}/productos/${productoId}/fotos`, {
    method: 'POST',
    headers: headersAuth(), // sin Content-Type: el navegador arma el multipart/form-data solo
    body: formData,
  });
  if (!res.ok) throw new Error('Error al subir la foto');
  return res.json();
}

document.getElementById('btn-guardar-producto').addEventListener('click', async () => {
  const msgDiv = document.getElementById('producto-msg');
  const nombre = document.getElementById('producto-nombre').value.trim();
  if (!nombre) {
    msgDiv.innerHTML = `<div class="error-msg">El nombre es obligatorio.</div>`;
    return;
  }

  const payload = {
    nombre,
    descripcion: document.getElementById('producto-descripcion').value.trim(),
    categoria: document.getElementById('producto-categoria').value.trim(),
    precio: document.getElementById('producto-precio').value,
    stock: document.getElementById('producto-stock').value,
    variantes: variantesProducto,
    disponibleHoy: document.getElementById('producto-disponible-hoy').checked,
    recomendar: document.getElementById('producto-recomendar').checked,
    tipoProducto: tipoProductoSeleccionado,
    tamanoPorcion: document.getElementById('producto-tamano').value.trim(),
    ingredientesPrincipales: document.getElementById('producto-ingredientes').value.trim(),
    aptoPara: document.getElementById('producto-apto').value.trim(),
    duracionEstimada: document.getElementById('producto-duracion').value.trim(),
    queIncluye: document.getElementById('producto-incluye').value.trim(),
  };

  const archivoFoto = document.getElementById('producto-foto-nueva').files[0] || null;

  try {
    let productoGuardado;
    if (productoEditandoId) {
      const res = await fetch(`${API_URL}/productos/${productoEditandoId}`, {
        method: 'PUT',
        headers: headersAuth({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Error al guardar');
      productoGuardado = await res.json();
    } else {
      const res = await fetch(`${API_URL}/productos`, {
        method: 'POST',
        headers: headersAuth({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Error al guardar');
      productoGuardado = await res.json();
    }

    // Si eligió una foto nueva, la subimos después de guardar los datos (necesitamos el id del producto)
    if (archivoFoto) {
      productoGuardado = await subirFotoProducto(productoGuardado._id, archivoFoto);
    }

    if (productoEditandoId) {
      const idx = productosCache.findIndex((p) => p._id === productoEditandoId);
      if (idx !== -1) productosCache[idx] = productoGuardado;
    } else {
      productosCache.unshift(productoGuardado);
    }
    renderizarProductos();
    limpiarFormProducto();
    document.getElementById('form-producto-wrap').style.display = 'none';
    document.getElementById('btn-mostrar-form-producto').style.display = 'block';
  } catch (error) {
    msgDiv.innerHTML = `<div class="error-msg">No se pudo guardar el producto. Intentá de nuevo.</div>`;
  }
});

async function cargarProductos() {
  const contenedor = document.getElementById('lista-productos');
  try {
    const res = await fetch(`${API_URL}/productos`, { headers: headersAuth() });
    productosCache = await res.json();
    renderizarProductos();
  } catch (error) {
    contenedor.innerHTML = `<p class="ayuda">No se pudo cargar el catálogo.</p>`;
  }
}

function renderizarProductos() {
  const contenedor = document.getElementById('lista-productos');
  if (!productosCache.length) {
    contenedor.innerHTML = `<p class="ayuda">Todavía no cargaste ningún producto o servicio.</p>`;
    return;
  }
  contenedor.innerHTML = productosCache.map((p) => `
    <div class="producto-card ${p.disponibleHoy ? '' : 'producto-no-disponible'}" data-id="${p._id}">
      ${p.fotos && p.fotos[0] ? `<img class="producto-foto" src="${p.fotos[0].url}" alt="${p.nombre}">` : '<div class="producto-foto"></div>'}
      <div class="producto-info">
        <strong>${p.nombre}</strong>
        ${p.categoria ? `<span>${p.categoria}</span>` : ''}
        ${p.precio ? `<span class="producto-precio">$${Number(p.precio).toLocaleString('es-AR')}</span>` : ''}
        ${!p.disponibleHoy ? '<span>No disponible hoy</span>' : ''}
      </div>
      <div class="producto-acciones">
        <button class="btn-editar-producto" data-id="${p._id}">Editar</button>
        <button class="toggle-disponible-producto" data-id="${p._id}" data-valor="${!p.disponibleHoy}">${p.disponibleHoy ? 'Marcar agotado' : 'Marcar disponible'}</button>
        <button class="quitar btn-borrar-producto" data-id="${p._id}">Eliminar</button>
      </div>
    </div>
  `).join('');

  contenedor.querySelectorAll('.btn-editar-producto').forEach((btn) => {
    btn.addEventListener('click', () => {
      const producto = productosCache.find((p) => p._id === btn.dataset.id);
      if (producto) abrirFormEdicionProducto(producto);
    });
  });

  contenedor.querySelectorAll('.toggle-disponible-producto').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const nuevoValor = btn.dataset.valor === 'true';
      await fetch(`${API_URL}/productos/${id}`, {
        method: 'PUT',
        headers: headersAuth({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ disponibleHoy: nuevoValor }),
      });
      const producto = productosCache.find((p) => p._id === id);
      if (producto) producto.disponibleHoy = nuevoValor;
      renderizarProductos();
    });
  });

  contenedor.querySelectorAll('.btn-borrar-producto').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este producto del catálogo?')) return;
      const id = btn.dataset.id;
      await fetch(`${API_URL}/productos/${id}`, { method: 'DELETE', headers: headersAuth() });
      productosCache = productosCache.filter((p) => p._id !== id);
      renderizarProductos();
    });
  });
}

// --- Turnos (agenda de negocios que funcionan con turnos) ---
let turnosCache = [];
let filtroTurnoActual = 'todos';

function prepararBloqueoTurno() {
  const profesionales = (negocioActual.profesionales || []).filter((p) => p.activo);
  const wrap = document.getElementById('bloqueo-profesional-wrap');
  const select = document.getElementById('bloqueo-profesional');

  if (profesionales.length > 1) {
    select.innerHTML = profesionales.map((p) => `<option value="${p.nombre}">${p.nombre}</option>`).join('');
    wrap.style.display = 'block';
  } else {
    wrap.style.display = 'none';
  }

  const hoy = new Date().toISOString().slice(0, 10);
  document.getElementById('bloqueo-fecha').min = hoy;
  if (!document.getElementById('bloqueo-fecha').value) document.getElementById('bloqueo-fecha').value = hoy;
}

document.getElementById('btn-bloquear-turno').addEventListener('click', async () => {
  const msgDiv = document.getElementById('bloqueo-msg');
  const fecha = document.getElementById('bloqueo-fecha').value;
  const hora = document.getElementById('bloqueo-hora').value;
  const nombreCliente = document.getElementById('bloqueo-nombre').value.trim();
  const motivo = document.getElementById('bloqueo-motivo').value.trim();
  const duracionMinutos = parseInt(document.getElementById('bloqueo-duracion').value, 10) || 30;
  const profesionalWrap = document.getElementById('bloqueo-profesional-wrap');
  const profesional = profesionalWrap.style.display !== 'none' ? document.getElementById('bloqueo-profesional').value : '';

  if (!fecha || !hora || !nombreCliente) {
    msgDiv.innerHTML = `<div class="error-msg">Completá fecha, hora y nombre.</div>`;
    return;
  }

  try {
    const res = await fetch(`${API_URL}/turnos`, {
      method: 'POST',
      headers: headersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ fecha, hora, duracionMinutos, motivo, profesional, nombreCliente }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al bloquear');

    turnosCache.unshift(data);
    renderizarTurnos();
    document.getElementById('bloqueo-hora').value = '';
    document.getElementById('bloqueo-nombre').value = '';
    document.getElementById('bloqueo-motivo').value = '';
    msgDiv.innerHTML = `<div class="exito">Horario bloqueado. El asistente ya no lo va a ofrecer.</div>`;
  } catch (error) {
    msgDiv.innerHTML = `<div class="error-msg">${error.message}</div>`;
  }
});

document.querySelectorAll('.btn-borrar-turnos-rango').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const etiquetas = { dia: 'de hoy', semana: 'de esta semana', mes: 'de este mes' };
    if (!confirm(`¿Borrar todos los turnos ${etiquetas[btn.dataset.rango]}? No se puede deshacer.`)) return;
    try {
      const res = await fetch(`${API_URL}/turnos/bulk?rango=${btn.dataset.rango}`, { method: 'DELETE', headers: headersAuth() });
      const data = await res.json();
      alert(`Se borraron ${data.cantidad} turno(s).`);
      cargarTurnos();
    } catch (error) {
      alert('No se pudieron borrar los turnos.');
    }
  });
});

async function cargarTurnos() {
  const contenedor = document.getElementById('lista-turnos');
  try {
    const res = await fetch(`${API_URL}/turnos`, { headers: headersAuth() });
    turnosCache = await res.json();
    renderizarTurnos();
    cargarFila();
  } catch (error) {
    contenedor.innerHTML = `<div class="error-msg">No se pudieron cargar los turnos.</div>`;
  }
}

const ETIQUETAS_ESTADO_TURNO = { pendiente: 'Pendiente', confirmado: 'Confirmado', rechazado: 'Rechazado', cancelado: 'Cancelado' };
const GRUPOS_FILTRO_TURNOS = {
  todos: null,
  pendiente: ['pendiente'],
  confirmado: ['confirmado'],
  cancelado: ['cancelado', 'rechazado'],
};

document.querySelectorAll('#tabs-turnos .tab-pill').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('#tabs-turnos .tab-pill').forEach((t) => t.classList.remove('activo'));
    tab.classList.add('activo');
    filtroTurnoActual = tab.dataset.filtro;
    renderizarTurnos();
  });
});

function renderizarTurnos() {
  const contenedor = document.getElementById('lista-turnos');
  const grupos = GRUPOS_FILTRO_TURNOS[filtroTurnoActual];
  const turnos = turnosCache.filter((t) => !grupos || grupos.includes(t.estado));

  if (!turnosCache.length) {
    contenedor.innerHTML = `<p class="ayuda">Todavía no hay turnos agendados.</p>`;
    return;
  }
  if (!turnos.length) {
    contenedor.innerHTML = `<p class="ayuda">No hay turnos que coincidan con este filtro.</p>`;
    return;
  }

  contenedor.innerHTML = turnos.map((t) => `
    <div class="turno-card" data-id="${t._id}">
      <div class="turno-fecha-hora">${new Date(`${t.fecha}T00:00:00`).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })} · ${t.hora}hs
        <span class="badge-estado badge-${t.estado}" style="margin-left:auto;">${ETIQUETAS_ESTADO_TURNO[t.estado] || t.estado}</span>
      </div>
      <div class="turno-detalle"><strong>${t.nombreCliente}</strong>${t.telefonoCliente ? ` · ${t.telefonoCliente}` : ''}</div>
      ${t.motivo ? `<div class="turno-detalle">Motivo: ${t.motivo} (${t.duracionMinutos} min)</div>` : `<div class="turno-detalle">Duración: ${t.duracionMinutos} min</div>`}
      ${t.profesional ? `<div class="turno-detalle">Con: ${t.profesional}</div>` : ''}
      ${t.notas ? `<div class="turno-detalle">Notas: ${t.notas}</div>` : ''}
      ${t.origen === 'dueño' ? `<div class="turno-detalle">Cargado manualmente</div>` : ''}
      <div class="turno-acciones">
        ${t.estado === 'pendiente' ? `
          <button class="btn-aprobar-turno" data-id="${t._id}" data-estado="confirmado">Aprobar</button>
          <button class="btn-rechazar-turno" data-id="${t._id}" data-estado="rechazado">Rechazar</button>
        ` : ''}
        ${t.estado === 'confirmado' ? `<button class="btn-cancelar-turno" data-id="${t._id}" data-estado="cancelado">Cancelar</button>` : ''}
        <button class="btn-eliminar-turno" data-id="${t._id}">Eliminar</button>
      </div>
    </div>
  `).join('');

  contenedor.querySelectorAll('.btn-aprobar-turno, .btn-rechazar-turno, .btn-cancelar-turno').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const estado = btn.dataset.estado;
      try {
        await fetch(`${API_URL}/turnos/${id}/estado`, {
          method: 'PUT',
          headers: headersAuth({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ estado }),
        });
        const turno = turnosCache.find((t) => t._id === id);
        if (turno) turno.estado = estado;
        renderizarTurnos();
      } catch (error) {
        alert('No se pudo actualizar el turno.');
      }
    });
  });

  contenedor.querySelectorAll('.btn-eliminar-turno').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este turno?')) return;
      const id = btn.dataset.id;
      try {
        await fetch(`${API_URL}/turnos/${id}`, { method: 'DELETE', headers: headersAuth() });
        turnosCache = turnosCache.filter((t) => t._id !== id);
        renderizarTurnos();
      } catch (error) {
        alert('No se pudo eliminar el turno.');
      }
    });
  });
}


function abrirModalFoto() {
  document.getElementById('modal-foto-nombre').textContent = negocioActual.formData?.nombreNegocio || 'Mi negocio';
  document.getElementById('modal-foto-msg').innerHTML = '';
  document.getElementById('modal-foto-overlay').classList.add('abierto');
  document.getElementById('modal-foto').classList.add('abierto');
}
function cerrarModalFoto() {
  document.getElementById('modal-foto-overlay').classList.remove('abierto');
  document.getElementById('modal-foto').classList.remove('abierto');
}
document.getElementById('modal-foto-overlay').addEventListener('click', cerrarModalFoto);
document.getElementById('btn-cerrar-modal-foto').addEventListener('click', cerrarModalFoto);

document.getElementById('btn-elegir-galeria').addEventListener('click', () => {
  document.getElementById('input-modal-foto-galeria').click();
});
document.getElementById('btn-tomar-foto').addEventListener('click', () => {
  document.getElementById('input-modal-foto-camara').click();
});

async function cambiarFotoPerfil(archivo) {
  const msgDiv = document.getElementById('modal-foto-msg');
  msgDiv.innerHTML = `<p class="ayuda">Subiendo foto...</p>`;
  try {
    // Sacamos cualquier logo anterior para que quede uno solo (el nuevo)
    const logosViejos = (negocioActual.fotos || []).filter((f) => f.categoria === 'logo');
    for (const foto of logosViejos) {
      await fetch(`${API_URL}/negocios/fotos/${foto.publicId}`, { method: 'DELETE', headers: headersAuth() });
    }

    const formDataFoto = new FormData();
    formDataFoto.append('foto', archivo);
    formDataFoto.append('categoria', 'logo');
    const res = await fetch(`${API_URL}/negocios/fotos`, { method: 'POST', headers: headersAuth(), body: formDataFoto });
    if (!res.ok) throw new Error('Error al subir');

    const resNegocio = await fetch(`${API_URL}/negocios/mi-negocio`, { headers: headersAuth() });
    negocioActual = await resNegocio.json();
    actualizarAvatares(inicialNegocio);
    renderizarFotos();
    cerrarModalFoto();
  } catch (error) {
    msgDiv.innerHTML = `<div class="error-msg">No se pudo subir la foto. Intentá de nuevo.</div>`;
  }
}

document.getElementById('input-modal-foto-galeria').addEventListener('change', (e) => {
  if (e.target.files[0]) cambiarFotoPerfil(e.target.files[0]);
  e.target.value = '';
});
document.getElementById('input-modal-foto-camara').addEventListener('change', (e) => {
  if (e.target.files[0]) cambiarFotoPerfil(e.target.files[0]);
  e.target.value = '';
});

document.getElementById('btn-quitar-foto').addEventListener('click', async () => {
  const logosViejos = (negocioActual.fotos || []).filter((f) => f.categoria === 'logo');
  if (!logosViejos.length) { cerrarModalFoto(); return; }
  const msgDiv = document.getElementById('modal-foto-msg');
  msgDiv.innerHTML = `<p class="ayuda">Quitando foto...</p>`;
  try {
    for (const foto of logosViejos) {
      await fetch(`${API_URL}/negocios/fotos/${foto.publicId}`, { method: 'DELETE', headers: headersAuth() });
    }
    negocioActual.fotos = (negocioActual.fotos || []).filter((f) => f.categoria !== 'logo');
    actualizarAvatares(inicialNegocio);
    renderizarFotos();
    cerrarModalFoto();
  } catch (error) {
    msgDiv.innerHTML = `<div class="error-msg">No se pudo quitar la foto. Intentá de nuevo.</div>`;
  }
});

// --- Edición de "Información del negocio" (nombre, descripción, etc. + horarios) ---
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
let definicionCamposNegocio = null; // { campos: [{id, label}, ...] }, para mostrar etiquetas lindas en vez de "nombreNegocio"

async function cargarDefinicionCampos() {
  try {
    // rubroSubrubro guarda el NOMBRE del subrubro (ej: "Restaurante"), no su id técnico,
    // así que primero buscamos el id correspondiente en el listado de rubros.
    const resLista = await fetch(`${API_URL}/rubros`, { cache: 'no-store' });
    const lista = await resLista.json();
    let subrubroId = null;
    for (const cat of lista) {
      const sub = cat.subrubros.find((s) => s.nombre === negocioActual.rubroSubrubro);
      if (sub) { subrubroId = sub.id; break; }
    }
    if (!subrubroId) throw new Error('Subrubro no encontrado');

    const res = await fetch(`${API_URL}/rubros/${subrubroId}/formulario`, { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo obtener la definición de campos');
    definicionCamposNegocio = await res.json();
  } catch (error) {
    definicionCamposNegocio = null; // si falla, igual mostramos los campos con su nombre técnico como respaldo
  }
}

function etiquetaLegible(clave) {
  const campo = definicionCamposNegocio?.campos?.find((c) => c.id === clave);
  if (campo) return campo.label;
  // respaldo: "nombreNegocio" -> "Nombre Negocio"
  return clave.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

function renderizarCamposEdicion() {
  const contenedor = document.getElementById('campos-edicion');
  contenedor.innerHTML = '';

  Object.entries(negocioActual.formData || {}).forEach(([clave, valor]) => {
    const valorTexto = Array.isArray(valor) ? valor.join(', ') : (valor ?? '');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <label>${etiquetaLegible(clave)}</label>
      <textarea data-campo="${clave}">${valorTexto}</textarea>
    `;
    contenedor.appendChild(wrapper);
  });
}

function renderizarHorariosEdicion() {
  const contenedor = document.getElementById('dias-horario-panel');
  const horariosGuardados = negocioActual.horarios || [];

  contenedor.innerHTML = DIAS_SEMANA.map((dia) => {
    const guardado = horariosGuardados.find((h) => h.dia === dia);
    const activo = guardado?.activo || false;
    const bloque = guardado?.bloques?.[0] || {};
    return `
      <div class="dia-fila" data-dia="${dia}">
        <label class="nombre-dia" style="margin:0;">
          <input type="checkbox" class="dia-activo" style="width:auto;" ${activo ? 'checked' : ''}> ${dia}
        </label>
        <input type="text" class="dia-apertura" placeholder="09:00" style="width:90px;" value="${bloque.apertura || ''}" ${activo ? '' : 'disabled'}>
        <span>a</span>
        <input type="text" class="dia-cierre" placeholder="18:00" style="width:90px;" value="${bloque.cierre || ''}" ${activo ? '' : 'disabled'}>
      </div>
    `;
  }).join('');

  contenedor.querySelectorAll('.dia-activo').forEach((chk) => {
    chk.addEventListener('change', (e) => {
      const fila = e.target.closest('.dia-fila');
      fila.querySelectorAll('input[type="text"]').forEach((i) => (i.disabled = !e.target.checked));
    });
  });
}

function recolectarHorariosEdicion() {
  return Array.from(document.querySelectorAll('#dias-horario-panel .dia-fila')).map((fila) => {
    const activo = fila.querySelector('.dia-activo').checked;
    const apertura = fila.querySelector('.dia-apertura').value;
    const cierre = fila.querySelector('.dia-cierre').value;
    return { dia: fila.dataset.dia, activo, bloques: activo && apertura && cierre ? [{ apertura, cierre }] : [] };
  });
}

// Cada opción de "Negocio" (Productos, Fotos, Promociones, etc.) vive en un <div class="list-row-panel">
// que ya tiene todo su HTML e inputs armados desde antes. En vez de duplicar ese contenido, lo
// Cada opción (de Herramientas, Negocio o Ajustes) vive en un <div class="list-row-panel"> que ya
// tiene todo su HTML e inputs armados desde antes. En vez de duplicar ese contenido, lo MOVEMOS al
// contenedor de la pantalla completa y lo mostramos ahí. Guardamos cuál está abierto para poder
// ocultarlo bien (antes había un bug: se abría uno nuevo sin cerrar el anterior, y quedaban los dos).
let panelAbiertoActualId = null;

function abrirPantallaCompleta(panelId, titulo) {
  const panel = document.getElementById(panelId);
  const contenedor = document.getElementById('pantalla-completa-contenido');
  if (!panel || !contenedor) return;

  if (panelAbiertoActualId && panelAbiertoActualId !== panelId) {
    const anterior = document.getElementById(panelAbiertoActualId);
    if (anterior) anterior.style.display = 'none';
  }
  panelAbiertoActualId = panelId;

  contenedor.appendChild(panel);
  panel.style.display = 'block';
  panel.style.padding = '0';
  panel.style.background = 'transparent';

  document.getElementById('pantalla-completa-titulo').textContent = titulo;

  // Encabezado visual de la opción (ícono + descripción): evita que las opciones con poco contenido
  // se vean vacías y le da a todas la misma presencia profesional.
  const hero = document.getElementById('pantalla-completa-hero');
  const fila = document.querySelector(`.list-row[data-fullscreen="${panelId}"]`);
  const icono = fila && fila.querySelector('.list-row-icono');
  const descripcion = fila && fila.querySelector('.list-row-texto span');
  hero.innerHTML = icono ? `
    <div class="fs-hero">
      <div class="${icono.className} fs-hero-icono">${icono.innerHTML}</div>
      <div class="fs-hero-texto">${escHtml(descripcion ? descripcion.textContent : '')}</div>
    </div>` : '';

  if (panelId === 'panel-ranking') renderizarBloquesRanking(true);
  if (panelId === 'panel-tendencias') cargarTendencias();
  document.getElementById('pantalla-completa').style.display = 'block';
  document.querySelector('.app-contenido').scrollTop = 0;
  document.getElementById('pantalla-completa').scrollTop = 0;
}

function cerrarPantallaCompleta() {
  document.getElementById('pantalla-completa').style.display = 'none';
  if (panelAbiertoActualId) {
    const panel = document.getElementById(panelAbiertoActualId);
    if (panel) panel.style.display = 'none';
  }
  panelAbiertoActualId = null;
}

function abrirEdicionNegocio() {
  renderizarCamposEdicion();
  renderizarHorariosEdicion();
  document.getElementById('atencion-solo-horario-panel').checked = !!negocioActual.atencionSoloEnHorario;
  document.getElementById('guardado-msg').innerHTML = '';
  document.getElementById('negocio-vista').style.display = 'none';
  document.getElementById('negocio-edicion').style.display = 'block';
  document.querySelector('.app-contenido').scrollTop = 0;
}

function cerrarEdicionNegocio() {
  document.getElementById('negocio-edicion').style.display = 'none';
  document.getElementById('negocio-vista').style.display = 'block';
}

document.getElementById('btn-abrir-edicion-negocio').addEventListener('click', abrirEdicionNegocio);
document.getElementById('btn-cerrar-edicion-negocio').addEventListener('click', cerrarEdicionNegocio);
document.getElementById('btn-cancelar-edicion-negocio').addEventListener('click', cerrarEdicionNegocio);

document.getElementById('btn-guardar-info').addEventListener('click', async () => {
  const formData = {};
  document.querySelectorAll('#campos-edicion textarea').forEach((el) => {
    formData[el.dataset.campo] = el.value;
  });
  const horarios = recolectarHorariosEdicion();
  const atencionSoloEnHorario = document.getElementById('atencion-solo-horario-panel').checked;

  const msgDiv = document.getElementById('guardado-msg');
  try {
    const res = await fetch(`${API_URL}/negocios/mi-negocio`, {
      method: 'PUT',
      headers: headersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ formData, horarios, atencionSoloEnHorario }),
    });
    if (!res.ok) throw new Error('Error al guardar');

    negocioActual.formData = { ...negocioActual.formData, ...formData };
    negocioActual.horarios = horarios;
    negocioActual.atencionSoloEnHorario = atencionSoloEnHorario;
    document.getElementById('nombre-negocio-panel').textContent = negocioActual.formData?.nombreNegocio || 'Mi negocio';
    document.getElementById('drawer-nombre-negocio').textContent = negocioActual.formData?.nombreNegocio || 'Mi negocio';

    msgDiv.innerHTML = `<div class="exito">Cambios guardados. Tu asistente ya responde con la información actualizada.</div>`;
    setTimeout(cerrarEdicionNegocio, 900);
  } catch (error) {
    msgDiv.innerHTML = `<div class="error-msg">No se pudo guardar. Intentá de nuevo.</div>`;
  }
});

// --- Oportunidades de venta (indecisos e inactivos) ---
let diasUmbralInactivos = 7;

document.querySelectorAll('#grid-umbral-inactivos .opcion-aprobacion').forEach((el) => {
  el.addEventListener('click', () => {
    diasUmbralInactivos = parseInt(el.dataset.dias, 10);
    document.querySelectorAll('#grid-umbral-inactivos .opcion-aprobacion').forEach((e) => e.classList.toggle('seleccionado', e === el));
    cargarOportunidades();
  });
});
document.querySelector('#grid-umbral-inactivos .opcion-aprobacion[data-dias="7"]').classList.add('seleccionado');

async function cargarOportunidades() {  const contenedorIndecisos = document.getElementById('lista-indecisos');
  const contenedorInactivos = document.getElementById('lista-inactivos');
  try {
    const res = await fetch(`${API_URL}/oportunidades?dias=${diasUmbralInactivos}`, { headers: headersAuth() });
    const data = await res.json();
    renderizarOportunidades('indeciso', data.indecisos, contenedorIndecisos, document.getElementById('btn-recuperar-todos-indecisos'));
    renderizarOportunidades('inactivo', data.inactivos, contenedorInactivos, document.getElementById('btn-recuperar-todos-inactivos'));
  } catch (error) {
    contenedorIndecisos.innerHTML = `<p class="ayuda">No se pudo cargar.</p>`;
    contenedorInactivos.innerHTML = '';
  }
}

function renderizarOportunidades(tipo, lista, contenedor, btnTodos) {
  if (!lista.length) {
    contenedor.innerHTML = `<p class="ayuda">${tipo === 'indeciso' ? 'No hay clientes en esta situación por ahora.' : 'No hay clientes inactivos en este período.'}</p>`;
    btnTodos.style.display = 'none';
    return;
  }

  contenedor.innerHTML = lista.map((c) => `
    <div class="oportunidad-card" data-sesion="${c.sesionClienteId}">
      <strong>${c.nombre || 'Cliente sin identificar'}</strong>
      <span>Último contacto: ${new Date(c.ultimaFecha).toLocaleDateString('es-AR')}</span>
      ${c.totalPedidos ? `<span>${c.totalPedidos} pedido(s) hechos antes</span>` : ''}
      ${c.totalTurnos ? `<span>${c.totalTurnos} turno(s) antes</span>` : ''}
      ${c.ultimoMensaje ? `<span class="mensaje-cliente">"${c.ultimoMensaje}"</span>` : ''}
      <button class="btn-recuperar-cliente" data-sesion="${c.sesionClienteId}" data-tipo="${tipo}" ${c.recuperacionPendiente ? 'disabled' : ''}>
        ${c.recuperacionPendiente ? 'Ya preparado ✓' : 'Recuperar'}
      </button>
    </div>
  `).join('');

  btnTodos.style.display = 'block';
  btnTodos.onclick = async () => {
    if (!confirm(`¿Preparar un mensaje de recuperación para los ${lista.length} clientes de esta lista?`)) return;
    try {
      const res = await fetch(`${API_URL}/oportunidades/recuperar-todos`, {
        method: 'POST',
        headers: headersAuth({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ tipo, sesiones: lista.map((c) => c.sesionClienteId) }),
      });
      const data = await res.json();
      alert(data.mensaje);
      cargarOportunidades();
    } catch (error) {
      alert('No se pudo preparar la recuperación.');
    }
  };

  contenedor.querySelectorAll('.btn-recuperar-cliente').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        const res = await fetch(`${API_URL}/oportunidades/recuperar`, {
          method: 'POST',
          headers: headersAuth({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ sesionClienteId: btn.dataset.sesion, tipo: btn.dataset.tipo }),
        });
        const data = await res.json();
        btn.disabled = true;
        btn.textContent = 'Ya preparado ✓';
      } catch (error) {
        alert('No se pudo preparar la recuperación.');
      }
    });
  });
}

// --- Experiencia (calificaciones con estrellas + reseñas) ---
let filtroResenasActual = 'todas';

document.querySelectorAll('#grid-filtro-resenas .opcion-aprobacion, #filtro-resena-todas').forEach((el) => {
  el.addEventListener('click', () => {
    filtroResenasActual = el.dataset.filtro;
    document.querySelectorAll('#grid-filtro-resenas .opcion-aprobacion, #filtro-resena-todas').forEach((e) => e.classList.toggle('seleccionado', e === el));
    cargarExperiencia();
  });
});

async function cargarExperiencia() {
  const contenedor = document.getElementById('lista-resenas');
  try {
    const url = filtroResenasActual === 'todas' ? `${API_URL}/resenas` : `${API_URL}/resenas?tipo=${filtroResenasActual}`;
    const res = await fetch(url, { headers: headersAuth() });
    const data = await res.json();

    document.getElementById('resumen-promedio').textContent = data.resumen.total ? `${data.resumen.promedio} ⭐` : '—';
    document.getElementById('resumen-total').textContent = data.resumen.total;
    document.getElementById('resumen-positivas').textContent = data.resumen.positivas;
    document.getElementById('resumen-negativas').textContent = data.resumen.negativas;

    if (!data.resenas.length) {
      contenedor.innerHTML = `<p class="ayuda">Todavía no hay reseñas para mostrar acá.</p>`;
      return;
    }

    contenedor.innerHTML = data.resenas.map((r) => `
      <div class="resena-card">
        <span class="resena-card-estrellas">${'★'.repeat(r.estrellas)}${'☆'.repeat(5 - r.estrellas)}</span>
        ${r.nombreCliente ? `<span class="resena-card-nombre">${r.nombreCliente}</span>` : ''}
        ${r.comentario ? `<p class="resena-card-comentario">"${r.comentario}"</p>` : ''}
        <p class="resena-card-fecha">${new Date(r.createdAt).toLocaleDateString('es-AR')}</p>
      </div>
    `).join('');
  } catch (error) {
    contenedor.innerHTML = `<p class="ayuda">No se pudieron cargar las reseñas.</p>`;
  }
}


async function cargarEstadisticas() {
  const contenedor = document.getElementById('tabla-stats');
  try {
    const res = await fetch(`${API_URL}/estadisticas`, { headers: headersAuth() });
    const stats = await res.json();
    contenedor.innerHTML = `
      <div class="stat-chip"><strong>${stats.totalConversaciones}</strong><span>Conversaciones totales</span></div>
      <div class="stat-chip"><strong>${stats.totalMensajesCliente}</strong><span>Mensajes de clientes</span></div>
      <div class="stat-chip"><strong>${NOMBRES_PLAN[stats.suscripcion.plan] || stats.suscripcion.plan}</strong><span>Plan actual</span></div>
    `;
  } catch (error) {
    contenedor.innerHTML = `<p class="ayuda">No se pudieron cargar las estadísticas.</p>`;
  }
}

// --- Probar al asistente (simulación, no guarda nada real) ---
let modoPruebaActual = 'suave';
let historialPrueba = [];

document.querySelectorAll('#grid-modo-prueba .opcion-aprobacion').forEach((el) => {
  el.addEventListener('click', () => {
    modoPruebaActual = el.dataset.modo;
    document.querySelectorAll('#grid-modo-prueba .opcion-aprobacion').forEach((e) => e.classList.toggle('seleccionado', e === el));
  });
});

let puestoSimulado = 0;
document.querySelectorAll('#grid-simular-puesto .opcion-aprobacion').forEach((el) => {
  el.addEventListener('click', () => {
    puestoSimulado = Number(el.dataset.puesto);
    document.querySelectorAll('#grid-simular-puesto .opcion-aprobacion').forEach((e) => e.classList.toggle('seleccionado', e === el));
  });
});

// Busca, entre los criterios activos, el primero que tenga un premio cargado para el puesto simulado
function buscarSimulacionPuesto() {
  if (!puestoSimulado) return null;
  const ranking = negocioActual.ranking || {};
  const criterios = (ranking.criteriosActivos && ranking.criteriosActivos.length) ? ranking.criteriosActivos : ['compras'];
  const criterio = criterios.find((c) => {
    const p = ranking.premiosPorCriterio && ranking.premiosPorCriterio[c] && ranking.premiosPorCriterio[c]['top' + puestoSimulado];
    return p && (p.texto || p.descuentoPorcentaje > 0);
  });
  return criterio ? { criterio, posicion: puestoSimulado } : null;
}

function agregarMensajePrueba(texto, rol) {
  const contenedor = document.getElementById('chat-prueba-mensajes');
  const burbuja = document.createElement('div');
  burbuja.className = `chat-prueba-msg ${rol}`;
  burbuja.textContent = texto;
  contenedor.appendChild(burbuja);
  contenedor.scrollTop = contenedor.scrollHeight;
}

async function enviarMensajePrueba() {
  const input = document.getElementById('input-prueba');
  const texto = input.value.trim();
  if (!texto) return;

  agregarMensajePrueba(texto, 'cliente');
  if (puestoSimulado && !buscarSimulacionPuesto()) {
    agregarMensajePrueba(`🧪 Todavía no guardaste ningún premio para el puesto ${puestoSimulado}° en Clientes destacados, así que el asistente te va a tratar como cliente normal.`, 'asistente');
  }
  historialPrueba.push({ rol: 'cliente', contenido: texto });
  input.value = '';
  input.disabled = true;

  try {
    const res = await fetch(`${API_URL}/chat/prueba`, {
      method: 'POST',
      headers: headersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ mensaje: texto, historial: historialPrueba, modoVendedor: modoPruebaActual, simularPuesto: buscarSimulacionPuesto() }),
    });
    const data = await res.json();
    if (res.ok) {
      agregarMensajePrueba(data.respuesta, 'asistente');
      historialPrueba.push({ rol: 'asistente', contenido: data.respuesta });
      if (data.pedidoCreado && data.pedidoCreado.exito) {
        agregarMensajePrueba('🧪 Pedido DE PRUEBA registrado (no aparece en tus pedidos reales)', 'asistente');
      }
      if (data.turnoCreado && data.turnoCreado.exito) {
        agregarMensajePrueba('🧪 Turno DE PRUEBA registrado (no aparece en tu agenda real)', 'asistente');
      }
    } else {
      agregarMensajePrueba('No se pudo generar la respuesta de prueba.', 'asistente');
    }
  } catch (error) {
    agregarMensajePrueba('Error de conexión al probar el asistente.', 'asistente');
  } finally {
    input.disabled = false;
    input.focus();
  }
}

document.getElementById('btn-enviar-prueba')?.addEventListener('click', enviarMensajePrueba);
document.getElementById('input-prueba')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') enviarMensajePrueba(); });

// --- Zonas de delivery y precios ---
function renderizarZonasDelivery() {
  const contenedor = document.getElementById('lista-zonas-delivery');
  const zonas = negocioActual.zonasDelivery || [];

  if (!zonas.length) {
    contenedor.innerHTML = `<p class="ayuda">Todavía no cargaste ninguna zona de delivery.</p>`;
  } else {
    contenedor.innerHTML = zonas.map((z, i) => `
      <div class="fila-variante">
        <span>${z.zona} — $${Number(z.precio).toLocaleString('es-AR')}</span>
        <button type="button" data-i="${i}">Quitar</button>
      </div>
    `).join('');
    contenedor.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const nuevasZonas = zonas.filter((_, idx) => idx !== Number(btn.dataset.i));
        await guardarZonasDelivery(nuevasZonas);
      });
    });
  }
}

async function guardarZonasDelivery(zonasNuevas) {
  const msgDiv = document.getElementById('zonas-delivery-msg');
  try {
    const res = await fetch(`${API_URL}/negocios/mi-negocio`, {
      method: 'PUT',
      headers: headersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ zonasDelivery: zonasNuevas }),
    });
    if (!res.ok) throw new Error('Error al guardar');
    const data = await res.json();
    negocioActual = data.negocio;
    renderizarZonasDelivery();
    if (msgDiv) {
      msgDiv.innerHTML = `<p class="exito">Guardado.</p>`;
      setTimeout(() => { msgDiv.innerHTML = ''; }, 2000);
    }
  } catch (error) {
    if (msgDiv) msgDiv.innerHTML = `<div class="error-msg">No se pudo guardar, intentá de nuevo.</div>`;
  }
}

document.getElementById('btn-agregar-zona-delivery')?.addEventListener('click', async () => {
  const nombreInput = document.getElementById('zona-delivery-nombre');
  const precioInput = document.getElementById('zona-delivery-precio');
  const nombre = nombreInput.value.trim();
  const precio = Number(precioInput.value);

  if (!nombre) { alert('Escribí el nombre de la zona.'); return; }
  if (Number.isNaN(precio) || precio < 0) { alert('Poné un precio válido.'); return; }

  const nuevasZonas = [...(negocioActual.zonasDelivery || []), { zona: nombre, precio }];
  await guardarZonasDelivery(nuevasZonas);
  nombreInput.value = '';
  precioInput.value = '';
});

// --- Clientes destacados (ranking multi-criterio + premios) ---
let criteriosActivosActual = ['compras'];
let cacheTop10Ranking = {};      // { criterio: [top10] } - se pide al servidor solo lo que falta
let premiosEnEdicion = {};       // lo que el dueño está escribiendo (todavía sin guardar)
let rankingConfigServidor = null;

const ETIQUETAS_CRITERIO = {
  compras: 'compras',
  dinero: 'gastado',
  visitas: 'visitas',
  fidelidad: 'cliente desde',
};
const NOMBRES_CRITERIO = {
  compras: 'Compras',
  dinero: 'Dinero gastado',
  visitas: 'Visitas',
  fidelidad: 'Fidelidad',
};

// Lee lo que hay escrito en los campos de premios y lo guarda en memoria, así no se pierde
// cuando el dueño activa/desactiva un criterio y la pantalla se vuelve a dibujar.
function capturarPremiosDelDOM() {
  document.querySelectorAll('.premio-texto').forEach((inp) => {
    const c = inp.dataset.criterio, p = 'top' + inp.dataset.puesto;
    premiosEnEdicion[c] = premiosEnEdicion[c] || {};
    premiosEnEdicion[c][p] = premiosEnEdicion[c][p] || { texto: '', descuentoPorcentaje: 0 };
    premiosEnEdicion[c][p].texto = inp.value;
  });
  document.querySelectorAll('.premio-descuento').forEach((inp) => {
    const c = inp.dataset.criterio, p = 'top' + inp.dataset.puesto;
    premiosEnEdicion[c] = premiosEnEdicion[c] || {};
    premiosEnEdicion[c][p] = premiosEnEdicion[c][p] || { texto: '', descuentoPorcentaje: 0 };
    premiosEnEdicion[c][p].descuentoPorcentaje = inp.value ? Number(inp.value) : 0;
  });
}

function premiosParaMostrar(criterio) {
  if (premiosEnEdicion[criterio]) return premiosEnEdicion[criterio];
  const guardados = rankingConfigServidor && rankingConfigServidor.premiosPorCriterio;
  return (guardados && guardados[criterio]) || null;
}

function pintarSeleccionCriterios() {
  document.querySelectorAll('#grid-criterio-ranking .opcion-aprobacion').forEach((e) => {
    e.classList.toggle('seleccionado', criteriosActivosActual.includes(e.dataset.criterio));
  });
}

document.querySelectorAll('#grid-criterio-ranking .opcion-aprobacion').forEach((el) => {
  el.addEventListener('click', async () => {
    const criterio = el.dataset.criterio;
    capturarPremiosDelDOM();

    if (criteriosActivosActual.includes(criterio)) {
      if (criteriosActivosActual.length === 1) {
        const msg = document.getElementById('ranking-msg');
        msg.innerHTML = `<p class="ayuda" style="color:var(--advertencia); font-weight:600;">Dejá al menos un criterio activo.</p>`;
        setTimeout(() => { msg.innerHTML = ''; }, 2200);
        return;
      }
      criteriosActivosActual = criteriosActivosActual.filter((c) => c !== criterio);
    } else {
      criteriosActivosActual = [...criteriosActivosActual, criterio];
    }
    pintarSeleccionCriterios();
    await renderizarBloquesRanking(false);
  });
});

function valorRankingTexto(c, criterio) {
  if (!c) return '';
  if (criterio === 'dinero') return `$${Number(c.valor || 0).toLocaleString('es-AR')}`;
  if (criterio === 'fidelidad') return `Cliente desde ${new Date(c.valor).toLocaleDateString('es-AR')}`;
  return `${c.valor} ${ETIQUETAS_CRITERIO[criterio]}`;
}

function htmlPodio(top3, criterio) {
  const clases = { 1: 'oro', 2: 'plata', 3: 'bronce' };
  return [1, 2, 3].map((puesto) => {
    const c = top3[puesto - 1];
    const nombre = c ? (c.nombre || 'Cliente sin identificar') : '—';
    const valor = c ? valorRankingTexto(c, criterio) : 'Todavía nadie';
    return `
      <div class="podio-puesto" data-orden="${puesto}">
        <div class="podio-circulo ${clases[puesto]}">
          ${puesto}
          <span class="podio-badge">${puesto}°</span>
        </div>
        <div class="podio-nombre">${nombre}</div>
        <div class="podio-valor">${valor}</div>
      </div>
    `;
  }).join('');
}

function htmlPremiosPuestos(criterio, premios) {
  const colores = { 1: '#f59e0b', 2: '#94a3b8', 3: '#b8703f' };
  return [1, 2, 3].map((puesto) => {
    const premio = (premios && premios['top' + puesto]) || { texto: '', descuentoPorcentaje: 0 };
    return `
      <div class="premio-puesto-fila">
        <div class="premio-puesto-medalla" style="background:${colores[puesto]}">${puesto}°</div>
        <div class="premio-puesto-campos">
          <input type="text" class="premio-texto" data-criterio="${criterio}" data-puesto="${puesto}" placeholder="Ej: Envío gratis, un producto de regalo..." value="${premio.texto || ''}">
          <div class="premio-puesto-descuento-wrap">
            <input type="number" class="premio-descuento" data-criterio="${criterio}" data-puesto="${puesto}" min="0" max="100" placeholder="0" value="${premio.descuentoPorcentaje || ''}">
            <span>% de descuento (opcional)</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function htmlListaResto(resto, criterio) {
  if (!resto.length) return '';
  return `<div style="margin-top:14px;">${resto.map((c, i) => {
    const nombre = c.nombre || 'Cliente sin identificar';
    return `
      <div class="ranking-card">
        <div class="ranking-puesto">${i + 4}</div>
        <div class="ranking-info">
          <strong>${nombre}</strong>
          <span>${valorRankingTexto(c, criterio)}</span>
        </div>
      </div>
    `;
  }).join('')}</div>`;
}

async function renderizarBloquesRanking(recargarTodo) {
  const contenedor = document.getElementById('ranking-por-criterio');
  try {
    if (recargarTodo || !rankingConfigServidor) {
      contenedor.innerHTML = `<p class="ayuda">Cargando...</p>`;
      const res = await fetch(`${API_URL}/ranking/activos`, { headers: headersAuth(), cache: 'no-store' });
      const data = await res.json();
      rankingConfigServidor = data.config;
      criteriosActivosActual = data.criteriosActivos && data.criteriosActivos.length ? data.criteriosActivos : ['compras'];
      cacheTop10Ranking = data.porCriterio || {};
      premiosEnEdicion = {};
    }

    // Si el dueño activó un criterio nuevo, pedimos solo el TOP de ese (sin pisar lo que ya eligió)
    const faltan = criteriosActivosActual.filter((c) => !cacheTop10Ranking[c]);
    if (faltan.length) {
      const res = await fetch(`${API_URL}/ranking/activos?criterios=${faltan.join(',')}`, { headers: headersAuth(), cache: 'no-store' });
      const data = await res.json();
      Object.assign(cacheTop10Ranking, data.porCriterio || {});
    }

    pintarSeleccionCriterios();

    contenedor.innerHTML = criteriosActivosActual.map((criterio) => {
      const top10 = cacheTop10Ranking[criterio] || [];
      const premios = premiosParaMostrar(criterio);
      return `
        <div class="ranking-bloque-criterio" data-criterio-bloque="${criterio}">
          <div class="ranking-bloque-titulo">${NOMBRES_CRITERIO[criterio]}</div>
          <div class="podio-ranking">${htmlPodio(top10.slice(0, 3), criterio)}</div>
          ${htmlPremiosPuestos(criterio, premios)}
          ${top10.length ? htmlListaResto(top10.slice(3), criterio) : `<p class="ayuda">Todavía no hay clientes suficientes para este criterio.</p>`}
        </div>
      `;
    }).join('');
  } catch (error) {
    contenedor.innerHTML = `<p class="ayuda">No se pudo cargar el ranking.</p>`;
  }
}

async function cargarRanking() {
  await renderizarBloquesRanking(true);
}

document.getElementById('btn-guardar-ranking')?.addEventListener('click', async () => {
  const msgDiv = document.getElementById('ranking-msg');
  capturarPremiosDelDOM();

  try {
    const res = await fetch(`${API_URL}/ranking/config`, {
      method: 'PUT',
      headers: headersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ criteriosActivos: criteriosActivosActual, premiosPorCriterio: premiosEnEdicion }),
    });
    if (!res.ok) throw new Error('Error al guardar');
    negocioActual = (await res.json()).negocio;
    rankingConfigServidor = negocioActual.ranking;
    premiosEnEdicion = {};
    msgDiv.innerHTML = `<p class="exito">Guardado. El asistente ya va a avisar y aplicar estos premios.</p>`;
    setTimeout(() => { msgDiv.innerHTML = ''; }, 2500);
  } catch (error) {
    msgDiv.innerHTML = `<div class="error-msg">No se pudo guardar, intentá de nuevo.</div>`;
  }
});

// --- Preguntas frecuentes (el dueño responde lo que el asistente no supo) ---
async function cargarPreguntasFrecuentes() {
  const contenedor = document.getElementById('lista-preguntas-frecuentes');
  if (!contenedor) return;
  try {
    const res = await fetch(`${API_URL}/preguntas`, { headers: headersAuth(), cache: 'no-store' });
    const preguntas = await res.json();

    if (!preguntas.length) {
      actualizarChipPreguntas(0);
      contenedor.innerHTML = `<p class="ayuda">Todavía no hay preguntas. Cuando un cliente pregunte algo que el asistente no sepa, va a aparecer acá.</p>`;
      return;
    }

    const sinResponder = preguntas.filter((p) => !p.respuesta);
    const respondidas = preguntas.filter((p) => p.respuesta);
    actualizarChipPreguntas(sinResponder.length);

    const htmlSinResponder = sinResponder.map((p) => `
      <div class="pregunta-card" data-id="${p._id}">
        <strong>"${escHtml(p.pregunta)}"</strong>
        <span class="pregunta-card-fecha">${new Date(p.createdAt).toLocaleString('es-AR')}</span>
        <textarea class="pregunta-respuesta-input" placeholder="Escribí acá la respuesta para tu asistente..."></textarea>
        <div class="pregunta-card-acciones">
          <button class="btn-pregunta-quitar" data-id="${p._id}">Quitar</button>
          <button class="btn-pregunta-responder" data-id="${p._id}">Guardar respuesta</button>
        </div>
      </div>
    `).join('');

    const htmlRespondidas = respondidas.map((p) => `
      <div class="pregunta-card respondida" data-id="${p._id}">
        <strong>"${escHtml(p.pregunta)}"</strong>
        <p class="pregunta-card-respuesta">${escHtml(p.respuesta)}</p>
        <div class="pregunta-card-acciones">
          <button class="btn-pregunta-quitar" data-id="${p._id}">Quitar</button>
        </div>
      </div>
    `).join('');

    contenedor.innerHTML = `
      ${sinResponder.length ? `<h3>Sin responder (${sinResponder.length})</h3>${htmlSinResponder}` : `<p class="ayuda">No tenés preguntas sin responder.</p>`}
      ${respondidas.length ? `<h3 style="margin-top:20px;">Ya respondidas (${respondidas.length})</h3>${htmlRespondidas}` : ''}
    `;

    contenedor.querySelectorAll('.btn-pregunta-responder').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('.pregunta-card');
        const respuesta = card.querySelector('.pregunta-respuesta-input').value.trim();
        if (!respuesta) { alert('Escribí la respuesta antes de guardar.'); return; }
        const r = await fetch(`${API_URL}/preguntas/${btn.dataset.id}`, {
          method: 'PUT',
          headers: headersAuth({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ respuesta }),
        });
        if (r.ok) cargarPreguntasFrecuentes();
        else alert('No se pudo guardar la respuesta.');
      });
    });

    contenedor.querySelectorAll('.btn-pregunta-quitar').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Quitar esta pregunta?')) return;
        const r = await fetch(`${API_URL}/preguntas/${btn.dataset.id}`, { method: 'DELETE', headers: headersAuth() });
        if (r.ok) cargarPreguntasFrecuentes();
        else alert('No se pudo quitar la pregunta.');
      });
    });
  } catch (error) {
    contenedor.innerHTML = `<p class="ayuda">No se pudieron cargar las preguntas.</p>`;
  }
}


// =====================================================================
// Tendencias (fase 8A): todo sale de los datos del propio negocio, sin internet ni IA
// =====================================================================
async function cargarTendencias() {
  const cont = document.getElementById('tendencias-contenido');
  if (!cont) return;
  cont.innerHTML = '<p class="ayuda">Calculando...</p>';
  try {
    const res = await fetch(`${API_URL}/tendencias`, { headers: headersAuth(), cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error');
    cont.innerHTML = htmlTendencias(data);
  } catch (error) {
    cont.innerHTML = '<p class="ayuda">No se pudieron cargar las tendencias. Probá de nuevo en un rato.</p>';
  }
}

function tendFecha(f) {
  const [, m, d] = String(f).split('-');
  return `${d}/${m}`;
}

function tendBadge(m) {
  if (m.tendencia === 'sin_base') return '<span class="tend-badge neutro">Sin base</span>';
  if (m.tendencia === 'igual') return '<span class="tend-badge neutro">Parecido</span>';
  const sube = m.tendencia === 'sube';
  const bueno = m.subeEsMalo ? !sube : sube;
  return `<span class="tend-badge ${bueno ? 'bueno' : 'malo'}">${sube ? '▲' : '▼'} ${Math.abs(m.variacion)}%</span>`;
}

function tendCard(titulo, subtitulo, cuerpo) {
  return `<div class="tend-card"><div class="tend-titulo">${escHtml(titulo)}</div>${subtitulo ? `<p class="ayuda">${subtitulo}</p>` : ''}${cuerpo}</div>`;
}

function htmlTendencias(d) {
  const esTurnos = d.tipoOperacion === 'turnos';
  const cosas = esTurnos ? 'servicios' : 'productos';
  const partes = [];

  // Resumen en frases
  if (d.resumen && d.resumen.length) {
    partes.push(tendCard('Resumen', '', `<ul class="tend-frases">${d.resumen.map((f) => `<li class="tend-frase ${f.tipo}">${escHtml(f.texto)}</li>`).join('')}</ul>`));
  } else {
    partes.push(tendCard('Resumen', '', '<p class="ayuda">Todavía no hay suficientes datos para mostrar tendencias. A medida que tu asistente vaya tomando ' + (esTurnos ? 'turnos' : 'pedidos') + ', esto se va completando solo.</p>'));
  }

  // Esta semana contra la anterior
  const filasSemana = d.semanas.metricas.map((m) => {
    const fmt = (n) => (m.esDinero ? fmtPesos(n) : n);
    return `<div class="tend-fila"><div><strong>${escHtml(m.nombre)}</strong><small>${fmt(m.actual)} ahora · ${fmt(m.anterior)} antes${m.nota ? ' · ' + escHtml(m.nota) : ''}</small></div>${tendBadge(m)}</div>`;
  }).join('');
  partes.push(tendCard('Esta semana contra la anterior', 'Los últimos 7 días contra los 7 anteriores.', filasSemana + (d.semanas.pocosDatos ? '<p class="ayuda" style="margin-top:8px;">Hay muy pocos datos todavía: tomá estos números como orientativos.</p>' : '')));

  // Qué sube y qué baja
  const grupo = (titulo, lista, signo) => (lista.length
    ? `<div class="tend-grupo">${titulo}</div>` + lista.map((x) => `<div class="tend-fila"><div><strong>${escHtml(x.nombre)}</strong><small>${x.actual} esta semana · ${x.anterior} la anterior</small></div>${x.variacion !== null ? `<span class="tend-badge ${signo > 0 ? 'bueno' : 'malo'}">${signo > 0 ? '▲' : '▼'} ${Math.abs(x.variacion)}%</span>` : ''}</div>`).join('')
    : '');
  const itemsHtml = grupo('Suben', d.items.suben, 1) + grupo('Bajan', d.items.bajan, -1) + grupo('Nuevos esta semana', d.items.nuevos, 1) + grupo('Dejaron de pedirse', d.items.dejaron, -1);
  partes.push(tendCard(`Qué ${cosas} suben y bajan`, `Se comparan solo los que tuvieron movimiento suficiente.`,
    itemsHtml || `<p class="ayuda">${d.items.pocosDatos ? 'Todavía no hay datos para comparar.' : `Ningún ${esTurnos ? 'servicio' : 'producto'} cambió lo suficiente esta semana.`}</p>`));

  // Días de la semana
  const p = d.patron;
  if (p.pocosDatos) {
    partes.push(tendCard('Días más flojos', '', `<p class="ayuda">Se activa con al menos ${p.minimo} ${esTurnos ? 'turnos' : 'pedidos'} en 28 días (llevás ${p.totalEventos}).</p>`));
  } else {
    const max = Math.max(...p.dias.map((x) => x.promedio || 0), 1);
    const barras = p.dias.map((x) => {
      const clase = (p.diasFlojos || []).includes(x.nombre) ? 'flojo' : ((p.diasFuertes || []).includes(x.nombre) ? 'fuerte' : '');
      return `<div class="tend-barra-fila"><span>${escHtml(x.nombre)}</span><div class="tend-barra"><span class="${clase}" style="width:${Math.round(((x.promedio || 0) / max) * 100)}%"></span></div><strong>${x.promedio}</strong></div>`;
    }).join('');
    partes.push(tendCard('Días más flojos', `Promedio de ${esTurnos ? 'turnos' : 'pedidos'} por día, en los últimos 28 días (naranja: más flojo, verde: más fuerte).`, barras));
  }

  // Horas
  if (!p.pocosDatos) {
    if (p.horas) {
      const filasHora = (lista) => lista.map((h) => `<div class="tend-fila"><span>${escHtml(h.franja)}</span><small>${h.total} en 28 días</small></div>`).join('');
      const cuerpo = (p.horas.fuertes.length ? `<div class="tend-grupo">Más movimiento</div>${filasHora(p.horas.fuertes)}` : '')
        + (p.horas.flojas.length ? `<div class="tend-grupo">Más flojas</div>${filasHora(p.horas.flojas)}` : '');
      partes.push(tendCard('Horas del día', 'Solo se cuentan las horas dentro de tu horario de atención.', cuerpo || '<p class="ayuda">Tus horas están bastante parejas.</p>'));
    } else {
      partes.push(tendCard('Horas del día', '', '<p class="ayuda">Cargá tus horarios de atención (en Información del negocio) para ver qué horas son más flojas.</p>'));
    }
  }

  // Cambios de precio (solo negocios de pedidos)
  if (d.precios) {
    if (!d.precios.hayPrecios) {
      partes.push(tendCard('Cambios de precio', '', '<p class="ayuda">Se activa cuando tu asistente informa precios y los pedidos los registran.</p>'));
    } else if (!d.precios.cambios.length) {
      partes.push(tendCard('Cambios de precio', '', '<p class="ayuda">No detectamos cambios de precio en los últimos 90 días.</p>'));
    } else {
      const textoVeredicto = { baja: 'La demanda bajó.', sube: 'La demanda subió.', igual: 'La demanda se mantuvo parecida.', pocos_datos: 'Se vendió poco en ambos períodos: no alcanza para sacar conclusiones.' };
      const filas = d.precios.cambios.map((c) => {
        const efecto = c.efecto
          ? `<small>${c.efecto.dias} días antes: ${c.efecto.antes} vendidos (${c.efecto.porSemanaAntes} por semana). ${c.efecto.dias} días después: ${c.efecto.despues} (${c.efecto.porSemanaDespues} por semana). <strong>${textoVeredicto[c.efecto.veredicto]}</strong></small>`
          : '<small>Es muy reciente: todavía es pronto para ver cómo cambió la demanda.</small>';
        return `<div class="tend-fila"><div><strong>${escHtml(c.producto)}</strong><small>${c.sube ? 'Subió' : 'Bajó'} de ${fmtPesos(c.precioAnterior)} a ${fmtPesos(c.precioNuevo)} (${c.variacionPrecio > 0 ? '+' : ''}${c.variacionPrecio}%) el ${tendFecha(c.fecha)}</small>${efecto}</div></div>`;
      }).join('');
      partes.push(tendCard('Cambios de precio', 'Sale de los precios que quedaron registrados en tus pedidos. Ojo: la temporada o las promociones también influyen, no todo es por el precio.', filas));
    }
  }

  // Ausentismo (solo negocios de turnos)
  if (d.ausentismo) {
    const a = d.ausentismo;
    let cuerpo;
    if (a.pocosDatos) cuerpo = `<p class="ayuda">Se activa con al menos ${a.minimo} turnos ya cerrados (atendidos o marcados "No vino"). Llevás ${a.turnosCerrados}.</p>`;
    else cuerpo = `<div class="tend-fila"><div><strong>${a.tasa}% de ausentes</strong><small>${a.ausentes} de ${a.turnosCerrados} turnos cerrados en los últimos 28 días</small></div></div>`
      + (a.diaConMasAusentes ? `<p class="ayuda" style="margin-top:8px;">El día con más ausentes fue el ${escHtml(a.diaConMasAusentes.nombre)} (${a.diaConMasAusentes.ausentes}).</p>` : '');
    partes.push(tendCard('Ausentismo', 'Cuenta los turnos que marcaste como atendidos o "No vino" en la fila del día.', cuerpo));
  }

  partes.push('<p class="ayuda" style="margin-top:12px;">Los pedidos y turnos de prueba no se cuentan. Todo se calcula en el momento con tus datos.</p>');
  return partes.join('');
}


// Barra selector: mueve el "deslizador" a la opción activa (se apoya en data-i + CSS)
function posicionarSelectores() {
  document.querySelectorAll('.seg').forEach((seg) => {
    const opciones = [...seg.querySelectorAll('button')].filter((b) => b.style.display !== 'none');
    const idx = Math.max(0, opciones.findIndex((b) => b.classList.contains('activo')));
    seg.dataset.i = idx;
    seg.style.setProperty('--n', opciones.length);
  });
}
document.addEventListener('click', (e) => { if (e.target.closest('.seg button')) setTimeout(posicionarSelectores, 0); });
window.addEventListener('DOMContentLoaded', posicionarSelectores);
setInterval(posicionarSelectores, 1200); // cubre cuando un botón se oculta/muestra según el tipo de negocio


// ---------- Inicio: el asistente como protagonista ----------
function actualizarTarjetaAsistente(r, esTurnos) {
  const resumen = document.getElementById('ia-resumen');
  const hab = document.getElementById('ia-habilidades');
  const accionPedidos = document.getElementById('ia-accion-pedidos');
  if (!resumen || !hab) return;
  const conv = Number(r.conversacionesHoy) || 0;
  resumen.textContent = conv > 0
    ? `Hoy atendió ${conv} conversación${conv === 1 ? '' : 'es'}${r.pedidosHoy ? ` y generó ${r.pedidosHoy} ${esTurnos ? 'consulta' : 'pedido'}${r.pedidosHoy === 1 ? '' : 's'}` : ''}.`
    : 'Listo para atender a tus clientes las 24 horas.';
  const habilidades = esTurnos
    ? ['Responde consultas', 'Agenda turnos', 'Confirma y recuerda']
    : ['Responde consultas', 'Toma pedidos', 'Valida pagos'];
  hab.innerHTML = habilidades.map((h) => `<span>${h}</span>`).join('');
  if (accionPedidos) accionPedidos.textContent = esTurnos ? 'Agenda' : 'Pedidos';
  const btn = document.getElementById('ia-accion-pedidos');
  if (btn) btn.closest('.ia-accion').dataset.ir = esTurnos ? 'seccion:agenda' : 'seccion:pedidos';
}

function actualizarAtencionInicio(pendientes) {
  const card = document.getElementById('atencion-card');
  if (!card) return;
  if (pendientes > 0) {
    document.getElementById('atencion-texto').textContent = `${pendientes} pedido${pendientes === 1 ? '' : 's'} pendiente${pendientes === 1 ? '' : 's'} de confirmar`;
    card.style.display = 'flex';
  } else {
    card.style.display = 'none';
  }
}

// Atajos del inicio: llevan a una sección o abren una herramienta existente
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-ir]');
  if (!el) return;
  const [tipo, destino] = el.dataset.ir.split(':');
  if (tipo === 'seccion') {
    const nav = document.querySelector(`.app-navbar-item[data-seccion="${destino}"]`);
    if (nav) nav.click();
  } else if (tipo === 'fullscreen') {
    const fila = document.querySelector(`[data-fullscreen="${destino}"]`);
    if (fila) fila.click();
  }
});
