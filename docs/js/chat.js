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
  urls.forEach((url) => {
    const fila = document.createElement('div');
    fila.className = 'msg-fila asistente';
    const burbuja = document.createElement('div');
    burbuja.className = 'msg asistente';
    burbuja.style.padding = '4px';
    burbuja.innerHTML = `<img src="${url}" alt="Menu" style="max-width:100%; border-radius:10px; display:block;">`;
    fila.appendChild(burbuja);
    contenedorMensajes.appendChild(fila);
  });
  contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;
}

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
