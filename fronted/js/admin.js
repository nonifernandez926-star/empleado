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

window.addEventListener('DOMContentLoaded', () => {
  intentarSesionGuardada();

  if (window.google && GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith('TU_CLIENT_ID')) {
    google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: alRecibirRespuestaGoogle });
    google.accounts.id.renderButton(document.getElementById('boton-google-login'), { theme: 'outline', size: 'large', width: 300 });
  }
});

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
  document.getElementById('vista-login').style.display = 'none';
  document.getElementById('vista-panel').style.display = 'block';

  document.getElementById('nombre-negocio-panel').textContent = negocioActual.formData?.nombreNegocio || 'Mi negocio';
  document.getElementById('estado-suscripcion').textContent = negocioActual.suscripcion.estado.toUpperCase();
  if (negocioActual.suscripcion.estado === 'vencida') {
    document.getElementById('aviso-vencida').style.display = 'block';
  }
  if (negocioActual.suscripcion.fechaVencimiento) {
    const fecha = new Date(negocioActual.suscripcion.fechaVencimiento).toLocaleDateString('es-AR');
    document.getElementById('fecha-vencimiento').textContent = `Vence: ${fecha}`;
  }
  document.getElementById('link-chat').textContent = `${window.location.origin}/chat.html?codigo=${negocioActual.codigoPublico}`;
  document.getElementById('disponibilidad-hoy').value = negocioActual.disponibilidadHoy || '';

  renderizarCamposEdicion();
  cargarEstadisticas();
  cargarPedidos();
  renderizarFotos();
  cargarPlanes();
  cargarResumenDiario();
  cargarPreguntasSinRespuesta();
  iniciarNotificacionesPedidos();
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
  } catch (error) {
    contenedor.innerHTML = `<p class="ayuda">No se pudo cargar el resumen.</p>`;
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

async function cargarPedidos() {
  const contenedor = document.getElementById('lista-pedidos');
  try {
    const res = await fetch(`${API_URL}/pedidos`, {
      headers: headersAuth(),
    });
    const pedidos = await res.json();

    if (!pedidos.length) {
      contenedor.innerHTML = `<p class="ayuda">Todavía no llegó ningún pedido.</p>`;
      return;
    }

    contenedor.innerHTML = pedidos.map((p) => `
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
  } catch (error) {
    contenedor.innerHTML = `<div class="error-msg">No se pudieron cargar los pedidos.</div>`;
  }
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
