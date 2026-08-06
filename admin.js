let codigoAdminActual = null;
let negocioActual = null;

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
  document.getElementById('link-chat').textContent = `${window.location.origin}/chat.html?codigo=${negocioActual.codigoPublico}`;

  renderizarCamposEdicion();
  cargarEstadisticas();
}

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
      headers: { 'Content-Type': 'application/json', 'x-codigo-admin': codigoAdminActual },
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
    headers: { 'x-codigo-admin': codigoAdminActual },
  });
  const stats = await res.json();

  document.getElementById('tabla-stats').innerHTML = `
    <tr><td>Conversaciones totales</td><td>${stats.totalConversaciones}</td></tr>
    <tr><td>Mensajes de clientes</td><td>${stats.totalMensajesCliente}</td></tr>
    <tr><td>Plan actual</td><td>${stats.suscripcion.plan}</td></tr>
  `;
}
