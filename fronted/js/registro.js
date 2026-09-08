const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
let categoriasData = [];
let categoriaSeleccionada = null;
let subrubroSeleccionado = null;
let googleIdTokenCapturado = null;
let pasoActual = 1;

// Muestra un único paso a la vez (los otros quedan completamente ocultos, sin poder
// hacer scroll hacia ellos) y hace que la flecha de "volver" de arriba retroceda un
// paso en vez de salir de la página, salvo que ya estemos en el Paso 1.
function mostrarPaso(n) {
  document.getElementById('paso-categoria').style.display = n === 1 ? 'block' : 'none';
  document.getElementById('paso-subrubro').style.display = n === 2 ? 'block' : 'none';
  document.getElementById('paso-formulario').style.display = n === 3 ? 'block' : 'none';
  pasoActual = n;
  document.querySelector('.pantalla-contenido').scrollTop = 0;
}

document.getElementById('btn-volver-registro').addEventListener('click', (e) => {
  if (pasoActual > 1) {
    e.preventDefault();
    mostrarPaso(pasoActual - 1);
  }
  // si ya estamos en el Paso 1, dejamos que el link navegue normalmente a index.html
});

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

// Ícono + color por categoría (mismo estilo que el resto del panel)
const ICONOS_CATEGORIA = {
  'Gastronomia': { clase: 'ic-naranja', svg: '<path d="M3 2v7a3 3 0 0 0 3 3v10"/><path d="M3 2v20"/><path d="M9 2v7a3 3 0 0 1-3 3"/><path d="M17 2c-2 2-3 4-3 8 0 3 1.5 4 3 4v8"/>' },
  'Salud': { clase: 'ic-verde', svg: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>' },
  'Hogar': { clase: 'ic-violeta', svg: '<path d="M3 9.5 12 3l9 6.5"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/>' },
  'Automotor': { clase: 'ic-rojo', svg: '<path d="M5 17h14M5 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm14 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"/><path d="M3 17V11l2-5h10l4 5h2v6"/><path d="M5 11h14"/>' },
  'Belleza': { clase: 'ic-rosado', svg: '<path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/>' },
  'Comercio': { clase: 'ic-amarillo', svg: '<circle cx="9" cy="20" r="1.3" fill="currentColor" stroke="none"/><circle cx="18" cy="20" r="1.3" fill="currentColor" stroke="none"/><path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 7H5.2"/>' },
  'Servicios profesionales': { clase: 'ic-celeste', svg: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>' },
  'Educacion': { clase: 'ic-indigo', svg: '<path d="M2 8 12 3l10 5-10 5-10-5Z"/><path d="M6 10.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-5.5"/><path d="M22 8v6"/>' },
  'Eventos y fiestas': { clase: 'ic-cyan', svg: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>' },
};
const ICONO_CATEGORIA_DEFAULT = { clase: 'ic-gris', svg: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>' };

function iconoCategoriaHTML(nombreCategoria) {
  const ic = ICONOS_CATEGORIA[nombreCategoria] || ICONO_CATEGORIA_DEFAULT;
  return `<span class="icono-circulo ${ic.clase}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ic.svg}</svg></span>`;
}
const ICONO_CHEVRON = '<span class="opcion-rubro-flecha"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span>';

async function cargarRubros() {
  const grid = document.getElementById('grid-categorias');
  try {
    const res = await fetch(`${API_URL}/rubros`, { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo obtener la lista de rubros');
    categoriasData = await res.json();
    renderizarGridCategorias(categoriasData);

    const inputBuscador = document.getElementById('buscador-rubro');
    if (inputBuscador) {
      inputBuscador.addEventListener('input', (e) => {
        const texto = e.target.value.trim().toLowerCase();
        const filtradas = categoriasData.filter((cat) => cat.categoria.toLowerCase().includes(texto));
        renderizarGridCategorias(filtradas);
      });
    }
  } catch (error) {
    console.error('Error al cargar rubros:', error);
    grid.innerHTML = `<div class="error-msg">No se pudo conectar con el servidor. Verificá tu conexión e intentá de nuevo en unos segundos (el servidor puede tardar en despertar).</div>`;
  }
}

function renderizarGridCategorias(categorias) {
  const grid = document.getElementById('grid-categorias');
  if (!categorias.length) {
    grid.innerHTML = `<p class="ayuda">No encontramos ningún rubro con ese nombre.</p>`;
    return;
  }
  grid.innerHTML = '';
  categorias.forEach((cat) => {
    const div = document.createElement('div');
    div.className = 'opcion-rubro opcion-rubro-categoria';
    div.innerHTML = `
      ${iconoCategoriaHTML(cat.categoria)}
      <div class="opcion-rubro-texto">
        <strong>${cat.categoria}</strong>
        <small>${cat.subrubros.length} tipos de negocio</small>
      </div>
      ${ICONO_CHEVRON}
    `;
    div.addEventListener('click', () => seleccionarCategoria(cat, div));
    grid.appendChild(div);
  });
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

  mostrarPaso(2);
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

  mostrarPaso(3);
}

function renderizarCampos(campos) {
  const contenedor = document.getElementById('campos-dinamicos');
  contenedor.innerHTML = '';

  campos.forEach((campo) => {
    const wrapper = document.createElement('div');

    // Caso especial: el campo "menu" no se completa con texto, se reemplaza por carga de fotos
    if (campo.esMenu) {
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
    atencionSoloEnHorario: document.getElementById('atencion-solo-horario').checked,
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
      <p>Guardá este código como respaldo, no se puede recuperar después:</p>
      <p><strong>Código de administración</strong> (privado, es tu llave para el panel):</p>
      <div class="codigo-box">${data.codigoAdmin}</div>

      <div class="acciones-edicion" style="margin-top:18px;">
        <a class="btn" href="chat.html?codigo=${data.codigoPublico}">Probar mi asistente</a>
        <a class="btn secundario" href="admin.html">Ir a mi panel</a>
      </div>

      <div class="mensaje-info" style="margin-top:20px;">
        <strong>¿Ya usás Mi Zona?</strong> Registrá ahí tu negocio para que tus clientes lo encuentren, y vinculalo con este asistente usando el código de abajo cuando Mi Zona te pregunte si querés pegar un código en vez de descargar.
      </div>
      <p><strong>Código de vinculación con Mi Zona:</strong></p>
      <div class="codigo-box">${data.codigoVinculacion}</div>
      <a class="btn secundario ancho" href="${MI_ZONA_URL}?codigo=${data.codigoVinculacion}" target="_blank">Registrar mi negocio en Mi Zona</a>
    `;
    resultadoDiv.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    resultadoDiv.style.display = 'block';
    resultadoDiv.innerHTML = `<div class="error-msg">${error.message}</div>`;
  }
});

cargarRubros();
