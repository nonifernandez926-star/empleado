const params = new URLSearchParams(window.location.search);
const codigoPublico = params.get('codigo');

// Generamos (o recuperamos) un id anónimo de sesión para este cliente en este navegador
function obtenerSesionCliente() {
  let id = sessionStorage.getItem('sesionClienteId');
  if (!id) {
    id = 'sesion-' + Math.random().toString(36).slice(2) + Date.now();
    sessionStorage.setItem('sesionClienteId', id);
  }
  return id;
}

const contenedorMensajes = document.getElementById('chat-mensajes');
const inputMensaje = document.getElementById('input-mensaje');
const btnEnviar = document.getElementById('btn-enviar');

function agregarMensaje(texto, rol) {
  const div = document.createElement('div');
  div.className = `msg ${rol}`;
  div.textContent = texto;
  contenedorMensajes.appendChild(div);
  contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;
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

if (!codigoPublico) {
  agregarMensaje('Falta el código del negocio en la URL (?codigo=...)', 'asistente');
} else {
  agregarMensaje('¡Hola! ¿En qué puedo ayudarte?', 'asistente');
}
