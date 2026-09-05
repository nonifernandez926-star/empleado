let codigoAdminActual = null;
let jwtTokenActual = null;
let negocioActual = null;

// Devuelve los headers correctos según cómo se haya logueado el dueño (Google o código admin)
function headersAuth(extra = {}) {
  if (jwtTokenActual) {
    return { ...extra, Authorization: `Bearer ${jwtTokenActual}` };
  }
  return { ...extra, 'x-codigo-admin': codigoAdminActual };
}

// --- Login con Google ---
function alRecibirRespuestaGoogle(respuesta) {
  procesarLoginGoogle(respuesta.credential);
}

async function procesarLoginGoogle(idToken) {
  const errorDiv = document.getElementById('login-error');
  errorDiv.innerHTML = '';
  try {
    const res = await fetch(`${API_URL}/auth/google/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json();

    if (!res.ok) {
      if (data.error === 'sin_negocio_vinculado') {
        errorDiv.innerHTML = `<div class="error-msg">Esta cuenta de Google todavía no tiene un negocio creado. <a href="registro.html">Crear mi negocio</a></div>`;
      } else {
        errorDiv.innerHTML = `<div class="error-msg">No se pudo iniciar sesión con Google.</div>`;
      }
      return;
    }

    jwtTokenActual = data.token;
    localStorage.setItem('jwtToken', data.token); // sesión persistente: no hay que loguearse cada vez

    const resNegocio = await fetch(`${API_URL}/negocios/mi-negocio`, { headers: headersAuth() });
    negocioActual = await resNegocio.json();
    mostrarPanel();
  } catch (error) {
    errorDiv.innerHTML = `<div class="error-msg">Error de conexión, intentá de nuevo.</div>`;
  }
}

// Si ya había una sesión de Google guardada, entramos directo sin pedir login de nuevo
async function intentarSesionGuardada() {
  const tokenGuardado = localStorage.getItem('jwtToken');
  if (!tokenGuardado) return;

  jwtTokenActual = tokenGuardado;
  try {
    const res = await fetch(`${API_URL}/negocios/mi-negocio`, { headers: headersAuth() });
    if (!res.ok) throw new Error('Sesión vencida');
    negocioActual = await res.json();
    mostrarPanel();
  } catch (error) {
    jwtTokenActual = null;
    localStorage.removeItem('jwtToken');
  }
}

function cerrarSesion(e) {
  if (e) e.preventDefault();
  localStorage.removeItem('jwtToken');
  jwtTokenActual = null;
  codigoAdminActual = null;
  negocioActual = null;
  cerrarDrawer();
  document.getElementById('vista-panel').style.display = 'none';
  document.getElementById('contenedor-login').style.display = 'flex';
  document.getElementById('vista-login').style.display = 'block';
}

function abrirDrawer() {
  document.getElementById('drawer').classList.add('abierto');
  document.getElementById('drawer-overlay').classList.add('abierto');
}
function cerrarDrawer() {
  document.getElementById('drawer').classList.remove('abierto');
  document.getElementById('drawer-overlay').classList.remove('abierto');
}

window.addEventListener('DOMContentLoaded', () => {
  intentarSesionGuardada();

  if (window.google && GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith('TU_CLIENT_ID')) {
    google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: alRecibirRespuestaGoogle });
    google.accounts.id.renderButton(document.getElementById('boton-google-login'), { theme: 'outline', size: 'large', width: 300 });
  }

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
    const tabPendientes = document.querySelector('#tabs-pedidos .tab-pill[data-filtro="pendiente"]');
    if (tabPendientes) tabPendientes.click();
  });

  // El avatar abre el mismo menú lateral (accesos a ajustes, ayuda, cerrar sesión, etc.)
  document.getElementById('avatar-topbar').addEventListener('click', abrirDrawer);

  // Acordeones de "Herramientas" y "Ajustes": abrir/cerrar el panel de cada fila
  document.querySelectorAll('.list-row[data-panel]').forEach((fila) => {
    fila.addEventListener('click', () => {
      const panel = document.getElementById(fila.dataset.panel);
      const yaAbierto = panel.classList.contains('abierto');
      // cerramos los demás paneles del mismo grupo de lista, para que quede como un acordeón prolijo
      const tarjetaLista = fila.closest('.list-card');
      if (tarjetaLista) {
        tarjetaLista.querySelectorAll('.list-row-panel.abierto').forEach((p) => p.classList.remove('abierto'));
        tarjetaLista.querySelectorAll('.list-row.abierta').forEach((f) => f.classList.remove('abierta'));
      }
      if (!yaAbierto) {
        panel.classList.add('abierto');
        fila.classList.add('abierta');
      }
    });
  });

  // Copiar enlace de chat / código de vinculación con un botón (en vez de seleccionar texto a mano)
  document.getElementById('btn-copiar-link').addEventListener('click', () => copiarAlPortapapeles('link-chat', 'btn-copiar-link', '📋 Copiar enlace'));
  document.getElementById('btn-copiar-codigo').addEventListener('click', () => copiarAlPortapapeles('codigo-vinculacion', 'btn-copiar-codigo', '📋 Copiar código'));

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

function mostrarSeccion(nombre) {
  document.querySelectorAll('.app-seccion').forEach((sec) => { sec.style.display = 'none'; });
  document.getElementById(`seccion-${nombre}`).style.display = 'block';

  document.querySelectorAll('.app-navbar-item').forEach((btn) => {
    btn.classList.toggle('activo', btn.dataset.seccion === nombre);
  });

  document.getElementById('vista-panel').scrollTop = 0;
  document.querySelector('.app-contenido').scrollTop = 0;
}

document.getElementById('btn-login').addEventListener('click', async () => {
  const codigo = document.getElementById('input-codigo-admin').value.trim();
  const errorDiv = document.getElementById('login-error');
  errorDiv.innerHTML = '';

  try {
    const res = await fetch(`${API_URL}/negocios/mi-negocio`, {
      headers: { 'x-codigo-admin': codigo },
    });
    if (!res.ok) throw new Error('Código inválido');

    negocioActual = await res.json();
    codigoAdminActual = codigo;
    jwtTokenActual = null;
    mostrarPanel();
  } catch (error) {
    errorDiv.innerHTML = `<div class="error-msg">Código inválido, revisalo e intentá de nuevo.</div>`;
  }
});

async function mostrarPanel() {
  document.getElementById('contenedor-login').style.display = 'none';
  document.getElementById('vista-panel').style.display = 'flex';

  const nombreNegocio = negocioActual.formData?.nombreNegocio || 'Mi negocio';
  document.getElementById('nombre-negocio-panel').textContent = nombreNegocio;
  document.getElementById('drawer-nombre-negocio').textContent = nombreNegocio;
  document.getElementById('saludo-nombre').textContent = `¡Hola, ${nombreNegocio}!`;

  const inicial = nombreNegocio.trim().charAt(0).toUpperCase() || 'N';
  document.getElementById('avatar-topbar').textContent = inicial;
  document.getElementById('avatar-drawer').textContent = inicial;

  const estado = negocioActual.suscripcion.estado;
  const ETIQUETAS_PLAN = { activa: 'Plan activo', prueba: 'Plan de prueba', vencida: 'Suscripción vencida' };
  const pill = document.getElementById('estado-suscripcion-pill');
  pill.textContent = estado.toUpperCase();
  pill.className = `pill-estado ${estado}`;
  document.getElementById('estado-suscripcion').textContent = estado.toUpperCase();
  document.getElementById('drawer-estado-negocio').textContent = ETIQUETAS_PLAN[estado] || estado;
  document.getElementById('ajustes-resumen-plan').textContent = ETIQUETAS_PLAN[estado] || estado;

  if (estado === 'vencida') {
    document.getElementById('aviso-vencida').style.display = 'block';
  }
  if (negocioActual.suscripcion.fechaVencimiento) {
    const fecha = new Date(negocioActual.suscripcion.fechaVencimiento).toLocaleDateString('es-AR');
    document.getElementById('fecha-vencimiento').textContent = `Vence: ${fecha}`;
  }
  const linkChat = `${window.location.origin}/chat.html?codigo=${negocioActual.codigoPublico}`;
  document.getElementById('link-chat').textContent = linkChat;
  document.getElementById('qr-chat').src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(linkChat)}`;
  document.getElementById('codigo-vinculacion').textContent = negocioActual.codigoVinculacion || '(no disponible)';
  document.getElementById('btn-registrar-mizona').href = `${MI_ZONA_URL}?codigo=${negocioActual.codigoVinculacion}`;
  document.getElementById('aviso-suscripcion-herramientas').style.display = estado === 'activa' ? 'none' : 'block';
  document.getElementById('disponibilidad-hoy').value = negocioActual.disponibilidadHoy || '';
  document.getElementById('atencion-solo-horario-panel').checked = !!negocioActual.atencionSoloEnHorario;

  renderizarCamposEdicion();
  cargarEstadisticas();
  cargarPedidos();
  renderizarFotos();
  cargarPlanes();
  cargarResumenDiario();
  cargarPreguntasSinRespuesta();
  iniciarNotificacionesPedidos();

  mostrarSeccion('inicio');
}

function renderizarChartSemana(pedidosUltimos7Dias) {
  const contenedor = document.getElementById('chart-pedidos-semana');
  if (!pedidosUltimos7Dias || !pedidosUltimos7Dias.length) {
    contenedor.innerHTML = `<p class="ayuda">Sin datos todavía.</p>`;
    return;
  }

  const maximo = Math.max(...pedidosUltimos7Dias.map((d) => d.cantidad), 1);

  contenedor.innerHTML = pedidosUltimos7Dias.map((d) => `
    <div class="chart-barra-col">
      <div class="chart-barra-valor">${d.cantidad}</div>
      <div class="chart-barra" style="height:${Math.max((d.cantidad / maximo) * 100, 3)}%;"></div>
      <div class="chart-barra-etiqueta">${d.etiqueta}</div>
    </div>
  `).join('');
}

async function cargarResumenDiario() {
  const contenedor = document.getElementById('resumen-diario');
  try {
    const res = await fetch(`${API_URL}/estadisticas/resumen`, { headers: headersAuth(), cache: 'no-store' });
    const r = await res.json();

    contenedor.innerHTML = `
      <div class="resumen-grid">
        <div class="resumen-item"><div class="valor">${r.conversacionesHoy}</div><div class="etiqueta">Conversaciones hoy</div></div>
        <div class="resumen-item"><div class="valor">${r.pedidosHoy}</div><div class="etiqueta">Pedidos hoy</div></div>
        ${r.facturacionHoy ? `<div class="resumen-item"><div class="valor">$${r.facturacionHoy.toLocaleString('es-AR')}</div><div class="etiqueta">Facturado hoy (${r.pedidosConTotal} pedidos con precio)</div></div>` : ''}
        ${r.productoMasPedido ? `<div class="resumen-item"><div class="valor">${r.productoMasPedido.cantidad}x</div><div class="etiqueta">${r.productoMasPedido.nombre} (el más pedido hoy)</div></div>` : ''}
        ${r.horaPico ? `<div class="resumen-item"><div class="valor">${r.horaPico}</div><div class="etiqueta">Horario con más actividad</div></div>` : ''}
      </div>
      ${r.preguntasSinRespuestaHoy.length ? `<p class="ayuda" style="margin-top:14px;">Hoy hubo ${r.preguntasSinRespuestaHoy.length} pregunta(s) que el asistente no pudo responder. Mirá la sección de abajo para verlas.</p>` : ''}
    `;

    renderizarChartSemana(r.pedidosUltimos7Dias);
    actualizarBannerAnimo(r);
  } catch (error) {
    contenedor.innerHTML = `<p class="ayuda">No se pudo cargar el resumen.</p>`;
  }
}

function actualizarBannerAnimo(r) {
  const emoji = document.getElementById('banner-animo-emoji');
  const titulo = document.getElementById('banner-animo-titulo');
  const texto = document.getElementById('banner-animo-texto');
  if (!r.conversacionesHoy && !r.pedidosHoy) {
    emoji.textContent = '👋';
    titulo.textContent = 'Todavía no hay actividad hoy';
    texto.textContent = 'Cuando tengas conversaciones o pedidos, los vas a ver acá.';
  } else {
    emoji.textContent = '🚀';
    titulo.textContent = '¡Sigue así!';
    texto.textContent = `Hoy ya tuviste ${r.conversacionesHoy} conversación(es) y ${r.pedidosHoy} pedido(s).`;
  }
}

async function cargarPreguntasSinRespuesta() {
  const contenedor = document.getElementById('preguntas-sin-respuesta');
  try {
    const res = await fetch(`${API_URL}/estadisticas/preguntas-sin-respuesta`, { headers: headersAuth(), cache: 'no-store' });
    const preguntas = await res.json();

    if (!preguntas.length) {
      contenedor.innerHTML = `<p class="ayuda">Todavía no hay preguntas sin responder. 🎉</p>`;
      return;
    }

    contenedor.innerHTML = preguntas.map((p) => `
      <div class="pregunta-item">
        "${p.texto}"
        <div class="pregunta-fecha">${new Date(p.fecha).toLocaleString('es-AR')}</div>
      </div>
    `).join('');
  } catch (error) {
    contenedor.innerHTML = `<p class="ayuda">No se pudieron cargar las preguntas.</p>`;
  }
}

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

  setInterval(async () => {
    try {
      const res = await fetch(`${API_URL}/pedidos`, { headers: headersAuth(), cache: 'no-store' });
      const pedidos = await res.json();
      actualizarBadgeCampana(pedidos);
      if (!pedidos.length) return;

      const masReciente = pedidos[0]; // vienen ordenados del más nuevo al más viejo

      if (ultimoPedidoIdVisto === null) {
        ultimoPedidoIdVisto = masReciente._id; // primera carga: solo guardamos referencia, no avisamos
        return;
      }

      if (masReciente._id !== ultimoPedidoIdVisto) {
        ultimoPedidoIdVisto = masReciente._id;
        reproducirSonidoAviso();
        mostrarNotificacionFlotante(`Pedido nuevo de ${masReciente.nombreCliente}`);
        cargarPedidos();
        cargarResumenDiario();
      }
    } catch (error) {
      // si falla la revisión, lo intentamos de nuevo en el próximo intervalo
    }
  }, 20000);
}

async function cargarPlanes() {
  const grid = document.getElementById('grid-planes');
  try {
    const res = await fetch(`${API_URL}/suscripcion/planes`, { cache: 'no-store' });
    const planes = await res.json();

    grid.innerHTML = Object.entries(planes).map(([clave, plan]) => `
      <div class="opcion-rubro" data-plan="${clave}">
        <strong>${plan.label}</strong>
        <small>$${plan.precio.toLocaleString('es-AR')} ARS</small>
      </div>
    `).join('');

    document.querySelectorAll('#grid-planes .opcion-rubro').forEach((div) => {
      div.addEventListener('click', () => iniciarPago(div.dataset.plan));
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

document.getElementById('btn-subir-foto').addEventListener('click', async () => {
  const inputFoto = document.getElementById('input-foto');
  const categoria = document.getElementById('select-categoria-foto').value;
  const msgDiv = document.getElementById('foto-msg');

  if (!inputFoto.files.length) {
    msgDiv.innerHTML = `<div class="error-msg">Elegí una foto primero.</div>`;
    return;
  }

  const formDataFoto = new FormData();
  formDataFoto.append('foto', inputFoto.files[0]);
  formDataFoto.append('categoria', categoria);

  try {
    const res = await fetch(`${API_URL}/negocios/fotos`, {
      method: 'POST',
      headers: headersAuth(),
      body: formDataFoto,
    });
    if (!res.ok) throw new Error('Error al subir');

    const resNegocio = await fetch(`${API_URL}/negocios/mi-negocio`, { headers: headersAuth() });
    negocioActual = await resNegocio.json();
    renderizarFotos();
    inputFoto.value = '';
    msgDiv.innerHTML = `<div class="exito">Foto subida correctamente.</div>`;
  } catch (error) {
    msgDiv.innerHTML = `<div class="error-msg">No se pudo subir la foto. Intentá de nuevo.</div>`;
  }
});

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
      <div class="pedido-card" data-id="${p._id}">
        <div class="pedido-header">
          <div>
            <strong>${p.nombreCliente}</strong>
            ${p.telefonoCliente ? ` — ${p.telefonoCliente}` : ''}
            <div class="pedido-fecha">${new Date(p.createdAt).toLocaleString('es-AR')}</div>
          </div>
          <span class="badge-estado badge-${p.estado}">${ETIQUETAS_ESTADO[p.estado] || p.estado}</span>
        </div>
        <ul class="pedido-items">
          ${p.items.map((i) => `<li>${i.cantidad}x ${i.producto}${i.precioUnitario ? ` — $${i.precioUnitario * i.cantidad}` : ''}</li>`).join('')}
        </ul>
        ${p.total ? `<div class="pedido-detalle"><strong>Total: $${p.total}</strong></div>` : ''}
        <div class="pedido-detalle">${p.tipoEntrega === 'delivery' ? `🛵 Delivery — ${p.direccionEntrega || 'sin dirección'}` : '🏠 Retira en el local'}</div>
        <div class="pedido-detalle">💳 ${p.formaPago}</div>
        ${p.observaciones ? `<div class="pedido-detalle">📝 ${p.observaciones}</div>` : ''}

        ${ETIQUETAS_ESTADO_PAGO[p.estadoPago] ? `<div class="pedido-detalle"><strong>${ETIQUETAS_ESTADO_PAGO[p.estadoPago]}</strong></div>` : ''}

        ${p.comprobante && p.comprobante.url ? `
          <div class="comprobante-box">
            <a href="${p.comprobante.url}" target="_blank" rel="noopener">
              <img src="${p.comprobante.url}" alt="Comprobante" class="comprobante-miniatura">
            </a>
            <button class="btn-verificar-pago" data-id="${p._id}" data-verificado="${p.pagoVerificado ? 'false' : 'true'}">
              ${p.pagoVerificado ? 'Desmarcar verificación' : '✅ Confirmar que la plata llegó'}
            </button>
            ${p.estadoPago !== 'rechazado' ? `<button class="btn-rechazar-pago" data-id="${p._id}">🚫 Rechazar (no era válido)</button>` : ''}
          </div>
        ` : ''}

        <label style="margin-top:10px;">Cambiar estado</label>
        <select class="select-estado-pedido" data-id="${p._id}">
          ${Object.entries(ETIQUETAS_ESTADO).map(([valor, etiqueta]) =>
            `<option value="${valor}" ${valor === p.estado ? 'selected' : ''}>${etiqueta}</option>`
          ).join('')}
        </select>
        ${p.estado === 'entregado' ? `<button class="btn-eliminar-pedido" data-id="${p._id}" style="margin-top:10px; margin-left:8px; background:#fee2e2; color:#dc2626; border:none; border-radius:8px; padding:8px 14px; cursor:pointer; font-size:0.85rem;">🗑️ Eliminar pedido</button>` : ''}
      </div>
    `).join('');

    document.querySelectorAll('.btn-eliminar-pedido').forEach((btn) => {
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

document.getElementById('btn-guardar-disponibilidad').addEventListener('click', async () => {
  const disponibilidadHoy = document.getElementById('disponibilidad-hoy').value;
  const msgDiv = document.getElementById('disponibilidad-msg');
  try {
    const res = await fetch(`${API_URL}/negocios/mi-negocio`, {
      method: 'PUT',
      headers: headersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ disponibilidadHoy }),
    });
    if (!res.ok) throw new Error('Error al guardar');

    msgDiv.innerHTML = `<div class="exito">Disponibilidad actualizada. El asistente ya no va a recomendar lo que marcaste.</div>`;
  } catch (error) {
    msgDiv.innerHTML = `<div class="error-msg">No se pudo guardar. Intentá de nuevo.</div>`;
  }
});

document.getElementById('btn-guardar-horario-atencion').addEventListener('click', async () => {
  const atencionSoloEnHorario = document.getElementById('atencion-solo-horario-panel').checked;
  const msgDiv = document.getElementById('horario-atencion-msg');
  try {
    const res = await fetch(`${API_URL}/negocios/mi-negocio`, {
      method: 'PUT',
      headers: headersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ atencionSoloEnHorario }),
    });
    if (!res.ok) throw new Error('Error al guardar');

    negocioActual.atencionSoloEnHorario = atencionSoloEnHorario;
    msgDiv.innerHTML = `<div class="exito">Guardado.</div>`;
  } catch (error) {
    msgDiv.innerHTML = `<div class="error-msg">No se pudo guardar. Intentá de nuevo.</div>`;
  }
});

function renderizarCamposEdicion() {
  const contenedor = document.getElementById('campos-edicion');
  contenedor.innerHTML = '';

  Object.entries(negocioActual.formData || {}).forEach(([clave, valor]) => {
    const wrapper = document.createElement('div');
    const valorTexto = Array.isArray(valor) ? valor.join(', ') : (valor ?? '');
    wrapper.innerHTML = `
      <label>${clave}</label>
      <textarea data-campo="${clave}">${valorTexto}</textarea>
    `;
    contenedor.appendChild(wrapper);
  });
}

document.getElementById('btn-guardar-info').addEventListener('click', async () => {
  const formData = {};
  document.querySelectorAll('#campos-edicion textarea').forEach((el) => {
    formData[el.dataset.campo] = el.value;
  });

  const msgDiv = document.getElementById('guardado-msg');
  try {
    const res = await fetch(`${API_URL}/negocios/mi-negocio`, {
      method: 'PUT',
      headers: headersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ formData }),
    });
    if (!res.ok) throw new Error('Error al guardar');

    msgDiv.innerHTML = `<div class="exito">Cambios guardados. Tu asistente ya responde con la información actualizada.</div>`;
  } catch (error) {
    msgDiv.innerHTML = `<div class="error-msg">No se pudo guardar. Intentá de nuevo.</div>`;
  }
});

async function cargarEstadisticas() {
  const res = await fetch(`${API_URL}/estadisticas`, {
    headers: headersAuth(),
  });
  const stats = await res.json();

  document.getElementById('tabla-stats').innerHTML = `
    <tr><td>Conversaciones totales</td><td>${stats.totalConversaciones}</td></tr>
    <tr><td>Mensajes de clientes</td><td>${stats.totalMensajesCliente}</td></tr>
    <tr><td>Plan actual</td><td>${stats.suscripcion.plan}</td></tr>
  `;
}
