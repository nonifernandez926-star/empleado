const params = new URLSearchParams(window.location.search);
const codigoPublico = params.get('codigo');

// Generamos (o recuperamos) un id anonimo para este cliente en este navegador/dispositivo.
// Usamos localStorage (no sessionStorage) para que persista aunque cierre la pestaña o el navegador,
// asi el asistente puede "recordarlo" si vuelve otro dia.
function obtenerSesionCliente() {
  let id = localStorage.getItem('sesionClienteId');
  if (!id) {
    id = 'sesion-' + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem('sesionClienteId', id);
  }
  return id;
}

const contenedorMensajes = document.getElementById('chat-mensajes');
const inputMensaje = document.getElementById('input-mensaje');
const btnEnviar = document.getElementById('btn-enviar');
const btnAdjuntar = document.getElementById('btn-adjuntar');
const inputComprobante = document.getElementById('input-comprobante');

let ultimoPedidoId = null;

function horaActual() {
  return new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

// Convierte **negrita** en <strong> y escapa el resto del texto para evitar HTML no deseado.
function formatearTexto(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  let escapado = div.innerHTML; // escapa < > & etc.
  escapado = escapado.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  escapado = escapado.replace(/\n/g, '<br>');
  return escapado;
}

function agregarMensaje(texto, rol) {
  const fila = document.createElement('div');
  fila.className = `msg-fila ${rol}`;

  const burbuja = document.createElement('div');
  burbuja.className = `msg ${rol}`;
  burbuja.innerHTML = formatearTexto(texto);

  const hora = document.createElement('div');
  hora.className = 'msg-hora';
  hora.textContent = horaActual();

  fila.appendChild(burbuja);
  fila.appendChild(hora);
  contenedorMensajes.appendChild(fila);
  contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;
}

function agregarImagenes(urls) {
  const fila = document.createElement('div');
  fila.className = 'msg-fila asistente';
  const burbuja = document.createElement('div');
  burbuja.className = 'msg asistente';
  burbuja.style.padding = '4px';

  if (urls.length === 1) {
    // Una sola foto: se muestra grande directamente, igual que en WhatsApp
    const img = document.createElement('img');
    img.src = urls[0];
    img.alt = 'Foto';
    img.className = 'msg-imagen-unica';
    img.addEventListener('click', () => abrirLightbox(urls, 0));
    burbuja.appendChild(img);
  } else {
    // Varias fotos juntas: se ven chicas en grilla, tocando una se abre completa con navegación
    const MAX_VISIBLES = 6;
    const grid = document.createElement('div');
    grid.className = 'msg-imagenes-grid';
    urls.slice(0, MAX_VISIBLES).forEach((url, i) => {
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Foto';
      const esUltimaVisible = i === MAX_VISIBLES - 1 && urls.length > MAX_VISIBLES;
      const celda = document.createElement('div');
      if (esUltimaVisible) {
        celda.className = 'grid-mas';
        celda.dataset.mas = `+${urls.length - MAX_VISIBLES}`;
      }
      celda.appendChild(img);
      celda.addEventListener('click', () => abrirLightbox(urls, i));
      grid.appendChild(celda);
    });
    burbuja.appendChild(grid);
  }

  fila.appendChild(burbuja);
  contenedorMensajes.appendChild(fila);
  contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;
}

// --- Visor de fotos a pantalla completa (lightbox estilo WhatsApp) ---
let lightboxUrls = [];
let lightboxIndice = 0;

function abrirLightbox(urls, indice) {
  lightboxUrls = urls;
  lightboxIndice = indice;
  mostrarFotoLightbox();
  document.getElementById('lightbox-overlay').classList.add('abierto');
}

function mostrarFotoLightbox() {
  document.getElementById('lightbox-img').src = lightboxUrls[lightboxIndice];
  const mostrarNav = lightboxUrls.length > 1;
  document.getElementById('lightbox-prev').style.display = mostrarNav ? 'flex' : 'none';
  document.getElementById('lightbox-next').style.display = mostrarNav ? 'flex' : 'none';
  document.getElementById('lightbox-contador').textContent = mostrarNav ? `${lightboxIndice + 1} / ${lightboxUrls.length}` : '';
}

function cerrarLightbox() {
  document.getElementById('lightbox-overlay').classList.remove('abierto');
}

document.getElementById('lightbox-cerrar').addEventListener('click', cerrarLightbox);
document.getElementById('lightbox-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'lightbox-overlay') cerrarLightbox(); // tocar el fondo también cierra
});
document.getElementById('lightbox-prev').addEventListener('click', () => {
  lightboxIndice = (lightboxIndice - 1 + lightboxUrls.length) % lightboxUrls.length;
  mostrarFotoLightbox();
});
document.getElementById('lightbox-next').addEventListener('click', () => {
  lightboxIndice = (lightboxIndice + 1) % lightboxUrls.length;
  mostrarFotoLightbox();
});


async function cargarInfoNegocio() {
  if (!codigoPublico) return;
  try {
    const res = await fetch(`${API_URL}/negocios/publico/${codigoPublico}`, { cache: 'no-store' });
    if (!res.ok) return;
    const info = await res.json();

    document.getElementById('chat-header-nombre').textContent = info.nombreNegocio;
    document.title = info.nombreNegocio + ' - Asistente virtual';

    if (info.logoUrl) {
      document.getElementById('chat-header-logo').innerHTML = `<img src="${info.logoUrl}" alt="Logo">`;
    }
  } catch (error) {
    document.getElementById('chat-header-nombre').textContent = 'Asistente';
  }
}

async function enviarMensaje() {
  const texto = inputMensaje.value.trim();
  if (!texto || !codigoPublico) return;

  agregarMensaje(texto, 'cliente');
  inputMensaje.value = '';
  inputMensaje.disabled = true;
  btnEnviar.disabled = true;

  try {
    const res = await fetch(`${API_URL}/chat/${codigoPublico}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensaje: texto, sesionClienteId: obtenerSesionCliente() }),
    });
    const data = await res.json();

    if (!res.ok) {
      agregarMensaje(data.mensaje || 'Este asistente no está disponible en este momento.', 'asistente');
    } else {
      agregarMensaje(data.respuesta, 'asistente');
      if (data.imagenes && data.imagenes.length) {
        agregarImagenes(data.imagenes);
      }
      if (data.pedidoCreado && data.pedidoCreado.exito) {
        agregarMensaje(`✅ Pedido registrado (N° ${data.pedidoCreado.pedidoId.slice(-6)})`, 'asistente');
        ultimoPedidoId = data.pedidoCreado.pedidoId;
        btnAdjuntar.style.display = 'inline-block'; // ya puede adjuntar el comprobante si va a pagar por transferencia
        mostrarWidgetCalificacion();
      }
      if (data.turnoCreado && data.turnoCreado.exito) {
        mostrarWidgetCalificacion();
      }
    }
  } catch (error) {
    agregarMensaje('Hubo un error de conexión. Intentá de nuevo.', 'asistente');
  } finally {
    inputMensaje.disabled = false;
    btnEnviar.disabled = false;
    inputMensaje.focus();
  }
}

// --- Calificación con estrellas (aparece una sola vez, después de cerrar un pedido o turno) ---
let yaSeMostroCalificacion = false;

function mostrarWidgetCalificacion() {
  if (yaSeMostroCalificacion) return; // no lo mostramos más de una vez por conversación
  yaSeMostroCalificacion = true;

  const fila = document.createElement('div');
  fila.className = 'msg-fila asistente';
  const burbuja = document.createElement('div');
  burbuja.className = 'msg asistente resena-widget';
  burbuja.innerHTML = `
    <p class="resena-texto">¿Cómo te resultó la experiencia? Calificanos ⭐</p>
    <div class="resena-estrellas">
      ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="resena-estrella" data-valor="${n}">★</button>`).join('')}
    </div>
    <button type="button" class="resena-enviar" disabled>Enviar</button>
  `;
  fila.appendChild(burbuja);
  contenedorMensajes.appendChild(fila);
  contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;

  let estrellasElegidas = 0;
  const botones = burbuja.querySelectorAll('.resena-estrella');
  const btnEnviarResena = burbuja.querySelector('.resena-enviar');

  function pintarEstrellas() {
    botones.forEach((b) => b.classList.toggle('llena', Number(b.dataset.valor) <= estrellasElegidas));
    btnEnviarResena.disabled = estrellasElegidas === 0;
  }
  botones.forEach((boton) => {
    boton.addEventListener('click', () => {
      estrellasElegidas = Number(boton.dataset.valor);
      pintarEstrellas();
    });
  });

  btnEnviarResena.addEventListener('click', async () => {
    if (!estrellasElegidas) return;
    botones.forEach((b) => { b.disabled = true; });
    btnEnviarResena.disabled = true;
    btnEnviarResena.textContent = 'Enviando...';
    try {
      const res = await fetch(`${API_URL}/resenas/${codigoPublico}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sesionClienteId: obtenerSesionCliente(), estrellas: estrellasElegidas }),
      });
      const data = await res.json();
      burbuja.querySelector('.resena-texto').textContent = 'Gracias por calificarnos 🙌';
      burbuja.querySelector('.resena-estrellas').style.display = 'none';
      btnEnviarResena.style.display = 'none';
      if (res.ok && data.resenaId) {
        mostrarPreguntaSeguimientoResena(data.resenaId, data.preguntaSeguimiento);
      }
    } catch (error) {
      btnEnviarResena.textContent = 'No se pudo enviar';
    }
  });
}

function mostrarPreguntaSeguimientoResena(resenaId, pregunta) {
  agregarMensaje(pregunta, 'asistente');

  const fila = document.createElement('div');
  fila.className = 'msg-fila asistente';
  const burbuja = document.createElement('div');
  burbuja.className = 'msg asistente resena-comentario-widget';
  burbuja.innerHTML = `
    <input type="text" class="resena-comentario-input" placeholder="Escribí tu respuesta (opcional)">
    <button type="button" class="resena-comentario-enviar">Enviar</button>
  `;
  fila.appendChild(burbuja);
  contenedorMensajes.appendChild(fila);
  contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;

  const inputComentario = burbuja.querySelector('.resena-comentario-input');
  const btnComentario = burbuja.querySelector('.resena-comentario-enviar');

  async function enviarComentarioResena() {
    const comentario = inputComentario.value.trim();
    if (!comentario) return;
    inputComentario.disabled = true;
    btnComentario.disabled = true;
    try {
      await fetch(`${API_URL}/resenas/${codigoPublico}/${resenaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comentario }),
      });
      burbuja.innerHTML = '<p class="resena-texto">¡Gracias por contarnos! 💙</p>';
    } catch (error) {
      inputComentario.disabled = false;
      btnComentario.disabled = false;
    }
  }
  btnComentario.addEventListener('click', enviarComentarioResena);
  inputComentario.addEventListener('keydown', (e) => { if (e.key === 'Enter') enviarComentarioResena(); });
}

btnEnviar.addEventListener('click', enviarMensaje);
inputMensaje.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') enviarMensaje();
});

btnAdjuntar.addEventListener('click', () => inputComprobante.click());

inputComprobante.addEventListener('change', async () => {
  const archivo = inputComprobante.files[0];
  if (!archivo || !ultimoPedidoId) return;

  // Mostramos la imagen en el chat, del lado del cliente, para que vea que se envió
  const urlLocal = URL.createObjectURL(archivo);
  const fila = document.createElement('div');
  fila.className = 'msg-fila cliente';
  const burbuja = document.createElement('div');
  burbuja.className = 'msg cliente';
  burbuja.style.padding = '4px';
  burbuja.innerHTML = `<img src="${urlLocal}" alt="Comprobante" style="max-width:100%; border-radius:10px; display:block;">`;
  fila.appendChild(burbuja);
  contenedorMensajes.appendChild(fila);
  contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;

  btnAdjuntar.disabled = true;

  const formData = new FormData();
  formData.append('foto', archivo);

  try {
    const res = await fetch(`${API_URL}/pedidos/${ultimoPedidoId}/comprobante`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Error al subir');

    agregarMensaje('Recibimos tu comprobante. El negocio va a revisar que la transferencia haya llegado correctamente y va a confirmar tu pedido a la brevedad.', 'asistente');
  } catch (error) {
    agregarMensaje('No se pudo enviar el comprobante, intentá de nuevo.', 'asistente');
  } finally {
    btnAdjuntar.disabled = false;
    inputComprobante.value = '';
  }
});

cargarInfoNegocio();

if (!codigoPublico) {
  agregarMensaje('Falta el código del negocio en la URL (?codigo=...)', 'asistente');
} else {
  agregarMensaje('¡Hola! ¿En qué puedo ayudarte?', 'asistente');
}
