const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
let categoriasData = [];
let categoriaSeleccionada = null;
let subrubroSeleccionado = null;
let googleIdTokenCapturado = null;

window.addEventListener('DOMContentLoaded', () => {
  if (window.google && GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith('TU_CLIENT_ID')) {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (respuesta) => {
        googleIdTokenCapturado = respuesta.credential;
        document.getElementById('estado-google-registro').textContent = '✅ Cuenta de Google vinculada correctamente.';
      },
    });
    google.accounts.id.renderButton(document.getElementById('boton-google-registro'), { theme: 'outline', size: 'large', width: 280 });
  }
});

async function cargarRubros() {
  const grid = document.getElementById('grid-categorias');
  try {
    const res = await fetch(`${API_URL}/rubros`, { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo obtener la lista de rubros');
    categoriasData = await res.json();

    grid.innerHTML = '';
    categoriasData.forEach((cat) => {
      const div = document.createElement('div');
      div.className = 'opcion-rubro';
      div.innerHTML = `<strong>${cat.categoria}</strong><small>${cat.subrubros.length} tipos de negocio</small>`;
      div.addEventListener('click', () => seleccionarCategoria(cat, div));
      grid.appendChild(div);
    });
  } catch (error) {
    grid.innerHTML = `<div class="error-msg">No se pudo conectar con el servidor. Verificá tu conexión e intentá de nuevo en unos segundos (el servidor puede tardar en despertar).</div>`;
  }
}

function seleccionarCategoria(cat, elemento) {
  document.querySelectorAll('#grid-categorias .opcion-rubro').forEach((el) => el.classList.remove('seleccionado'));
  elemento.classList.add('seleccionado');
  categoriaSeleccionada = cat;

  document.getElementById('titulo-categoria').textContent = `Paso 2: elegí el subrubro dentro de ${cat.categoria}`;
  const gridSub = document.getElementById('grid-subrubros');
  gridSub.innerHTML = '';
  cat.subrubros.forEach((sub) => {
    const div = document.createElement('div');
    div.className = 'opcion-rubro';
    div.innerHTML = `<strong>${sub.nombre}</strong>`;
    div.addEventListener('click', () => seleccionarSubrubro(sub.id, div));
    gridSub.appendChild(div);
  });

  document.getElementById('paso-subrubro').style.display = 'block';
  document.getElementById('paso-formulario').style.display = 'none';
  document.getElementById('paso-subrubro').scrollIntoView({ behavior: 'smooth' });
}

async function seleccionarSubrubro(subrubroId, elemento) {
  document.querySelectorAll('#grid-subrubros .opcion-rubro').forEach((el) => el.classList.remove('seleccionado'));
  elemento.classList.add('seleccionado');
  subrubroSeleccionado = subrubroId;

  const res = await fetch(`${API_URL}/rubros/${subrubroId}/formulario`, { cache: 'no-store' });
  const data = await res.json();

  document.getElementById('titulo-subrubro').textContent = `Paso 3: contanos sobre tu ${data.subrubro.toLowerCase()}`;
  renderizarCampos(data.campos);
  renderizarHorarios();

  document.getElementById('paso-formulario').style.display = 'block';
  document.getElementById('paso-formulario').scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('link-volver-categoria').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('paso-subrubro').style.display = 'none';
  document.getElementById('paso-formulario').style.display = 'none';
  document.getElementById('paso-categoria').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('link-volver-subrubro').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('paso-formulario').style.display = 'none';
  document.getElementById('paso-subrubro').scrollIntoView({ behavior: 'smooth' });
});

function renderizarCampos(campos) {
  const contenedor = document.getElementById('campos-dinamicos');
  contenedor.innerHTML = '';

  campos.forEach((campo) => {
    const wrapper = document.createElement('div');

    // Caso especial: el campo "menu" no se completa con texto, se reemplaza por carga de fotos
    if (campo.id === 'menu') {
      wrapper.innerHTML = `
        <label>Fotos de tu menú (subí 1 o 2)</label>
        <p class="ayuda">En vez de escribir el menú, subí fotos claras de tu carta. El asistente se las va a mostrar a los clientes cuando pregunten qué tenés.</p>
        <input type="file" id="input-menu-foto-1" accept="image/*">
        <input type="file" id="input-menu-foto-2" accept="image/*" style="margin-top:8px;">
      `;
      contenedor.appendChild(wrapper);
      return;
    }

    const requerido = campo.obligatorio ? 'required' : '';
    const etiquetaOpcional = campo.obligatorio ? '' : ' (opcional)';

    let inputHtml = '';
    switch (campo.tipo) {
      case 'textoLargo':
        inputHtml = `<textarea id="campo-${campo.id}" ${requerido}></textarea>`;
        break;
      case 'booleano':
        inputHtml = `<select id="campo-${campo.id}" ${requerido}>
          <option value="">Seleccionar...</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>`;
        break;
      case 'seleccionUnica':
        inputHtml = `<select id="campo-${campo.id}" ${requerido}>
          <option value="">Seleccionar...</option>
          ${campo.opciones.map((o) => `<option value="${o}">${o}</option>`).join('')}
        </select>`;
        break;
      case 'seleccionMultiple':
        inputHtml = `<div class="opciones-checkbox" id="campo-${campo.id}">
          ${campo.opciones.map((o) => `
            <label><input type="checkbox" value="${o}" name="check-${campo.id}"> ${o}</label>
          `).join('')}
        </div>`;
        break;
      default:
        inputHtml = `<input type="text" id="campo-${campo.id}" ${requerido}>`;
    }

    wrapper.innerHTML = `<label>${campo.label}${etiquetaOpcional}</label>${inputHtml}`;
    contenedor.appendChild(wrapper);
  });
}

function renderizarHorarios() {
  const contenedor = document.getElementById('dias-horario');
  contenedor.innerHTML = DIAS.map((dia) => `
    <div class="dia-fila" data-dia="${dia}">
      <label class="nombre-dia" style="margin:0;">
        <input type="checkbox" class="dia-activo" style="width:auto;"> ${dia}
      </label>
      <input type="text" class="dia-apertura" placeholder="09:00" style="width:90px;" disabled>
      <span>a</span>
      <input type="text" class="dia-cierre" placeholder="18:00" style="width:90px;" disabled>
    </div>
  `).join('');

  contenedor.querySelectorAll('.dia-activo').forEach((chk) => {
    chk.addEventListener('change', (e) => {
      const fila = e.target.closest('.dia-fila');
      const inputs = fila.querySelectorAll('input[type="text"]');
      inputs.forEach((i) => (i.disabled = !e.target.checked));
    });
  });
}

function recolectarFormData(campos) {
  const formData = {};
  campos.forEach((campo) => {
    const el = document.getElementById(`campo-${campo.id}`);
    if (!el) return;

    if (campo.tipo === 'seleccionMultiple') {
      const seleccionados = Array.from(el.querySelectorAll('input:checked')).map((i) => i.value);
      formData[campo.id] = seleccionados;
    } else if (campo.tipo === 'booleano') {
      formData[campo.id] = el.value === '' ? undefined : el.value === 'true';
    } else {
      formData[campo.id] = el.value;
    }
  });
  return formData;
}

function recolectarHorarios() {
  return Array.from(document.querySelectorAll('.dia-fila')).map((fila) => {
    const activo = fila.querySelector('.dia-activo').checked;
    const apertura = fila.querySelector('.dia-apertura').value;
    const cierre = fila.querySelector('.dia-cierre').value;
    return {
      dia: fila.dataset.dia,
      activo,
      bloques: activo && apertura && cierre ? [{ apertura, cierre }] : [],
    };
  });
}

async function subirUnaFoto(codigoAdmin, archivo, categoria) {
  if (!archivo) return;
  const formDataFoto = new FormData();
  formDataFoto.append('foto', archivo);
  formDataFoto.append('categoria', categoria);
  try {
    await fetch(`${API_URL}/negocios/fotos`, {
      method: 'POST',
      headers: { 'x-codigo-admin': codigoAdmin },
      body: formDataFoto,
    });
  } catch (error) {
    // si falla una foto, no bloqueamos el registro; el dueño puede volver a subirla desde el panel
    console.error('No se pudo subir una foto:', error);
  }
}

async function subirFotosDelRegistro(codigoAdmin) {
  const logo = document.getElementById('input-logo')?.files[0];
  const menuFoto1 = document.getElementById('input-menu-foto-1')?.files[0];
  const menuFoto2 = document.getElementById('input-menu-foto-2')?.files[0];

  await subirUnaFoto(codigoAdmin, logo, 'logo');
  await subirUnaFoto(codigoAdmin, menuFoto1, 'menu');
  await subirUnaFoto(codigoAdmin, menuFoto2, 'menu');
}

document.getElementById('form-negocio').addEventListener('submit', async (e) => {
  e.preventDefault();

  const resDefinicion = await fetch(`${API_URL}/rubros/${subrubroSeleccionado}/formulario`, { cache: 'no-store' });
  const definicion = await resDefinicion.json();

  const payload = {
    subrubroId: subrubroSeleccionado,
    formData: recolectarFormData(definicion.campos),
    horarios: recolectarHorarios(),
    personalidad: {
      estilo: document.getElementById('personalidad-estilo').value,
      descripcionLibre: document.getElementById('personalidad-libre').value,
    },
    googleIdToken: googleIdTokenCapturado || undefined,
  };

  const resultadoDiv = document.getElementById('resultado');

  try {
    const res = await fetch(`${API_URL}/negocios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Error al crear el asistente');

    if (data.token) {
      localStorage.setItem('jwtToken', data.token); // así entra directo al panel sin loguearse de nuevo
    }

    // Subimos el logo y las fotos del menú, si el dueño cargó alguna, usando el código admin recién generado
    await subirFotosDelRegistro(data.codigoAdmin);

    resultadoDiv.style.display = 'block';
    resultadoDiv.innerHTML = `
      <div class="exito">¡Tu asistente fue creado en modo prueba!</div>
      ${data.googleVinculado ? '<p>Tu cuenta de Google ya está vinculada, vas a poder entrar a tu panel directamente.</p>' : ''}
      <p>Guardá estos dos códigos como respaldo, no se pueden recuperar después:</p>
      <p><strong>Código de administración</strong> (privado, es tu llave para el panel):</p>
      <div class="codigo-box">${data.codigoAdmin}</div>
      <p><strong>Código público</strong> (para probar el chat):</p>
      <div class="codigo-box">${data.codigoPublico}</div>
      <a class="btn" href="chat.html?codigo=${data.codigoPublico}">Probar mi asistente</a>
      <a class="btn secundario" href="admin.html">Ir a mi panel</a>
    `;
    resultadoDiv.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    resultadoDiv.style.display = 'block';
    resultadoDiv.innerHTML = `<div class="error-msg">${error.message}</div>`;
  }
});

cargarRubros();
