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
  document.getElementById('disponibilidad-hoy').value = negocioActual.disponibilidadHoy || '';

  renderizarCamposEdicion();
  cargarEstadisticas();
  cargarPedidos();
  renderizarFotos();
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
          headers: { 'x-codigo-admin': codigoAdminActual },
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
      headers: { 'x-codigo-admin': codigoAdminActual },
      body: formDataFoto,
    });
    if (!res.ok) throw new Error('Error al subir');

    const resNegocio = await fetch(`${API_URL}/negocios/mi-negocio`, { headers: { 'x-codigo-admin': codigoAdminActual } });
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
      headers: { 'x-codigo-admin': codigoAdminActual },
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
      </div>
    `).join('');

    document.querySelectorAll('.select-estado-pedido').forEach((select) => {
      select.addEventListener('change', async (e) => {
        const id = e.target.dataset.id;
        const nuevoEstado = e.target.value;
        try {
          const res = await fetch(`${API_URL}/pedidos/${id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-codigo-admin': codigoAdminActual },
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
      headers: { 'Content-Type': 'application/json', 'x-codigo-admin': codigoAdminActual },
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
