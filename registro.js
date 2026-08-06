const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
let subrubroSeleccionado = null;

async function cargarRubros() {
  const res = await fetch(`${API_URL}/rubros`);
  const categorias = await res.json();
  const grid = document.getElementById('grid-categorias');
  grid.innerHTML = '';

  categorias.forEach((cat) => {
    cat.subrubros.forEach((sub) => {
      const div = document.createElement('div');
      div.className = 'opcion-rubro';
      div.dataset.id = sub.id;
      div.innerHTML = `<strong>${sub.nombre}</strong><small>${cat.categoria}</small>`;
      div.addEventListener('click', () => seleccionarSubrubro(sub.id, div));
      grid.appendChild(div);
    });
  });
}

async function seleccionarSubrubro(subrubroId, elemento) {
  document.querySelectorAll('.opcion-rubro').forEach((el) => el.classList.remove('seleccionado'));
  elemento.classList.add('seleccionado');
  subrubroSeleccionado = subrubroId;

  const res = await fetch(`${API_URL}/rubros/${subrubroId}/formulario`);
  const data = await res.json();

  document.getElementById('titulo-subrubro').textContent = `Paso 2: contanos sobre tu ${data.subrubro.toLowerCase()}`;
  renderizarCampos(data.campos);
  renderizarHorarios();

  document.getElementById('paso-formulario').style.display = 'block';
  document.getElementById('paso-formulario').scrollIntoView({ behavior: 'smooth' });
}

function renderizarCampos(campos) {
  const contenedor = document.getElementById('campos-dinamicos');
  contenedor.innerHTML = '';

  campos.forEach((campo) => {
    const wrapper = document.createElement('div');
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
          ${campo.opciones.map((o, i) => `
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

document.getElementById('form-negocio').addEventListener('submit', async (e) => {
  e.preventDefault();

  const resDefinicion = await fetch(`${API_URL}/rubros/${subrubroSeleccionado}/formulario`);
  const definicion = await resDefinicion.json();

  const payload = {
    subrubroId: subrubroSeleccionado,
    formData: recolectarFormData(definicion.campos),
    horarios: recolectarHorarios(),
    personalidad: {
      estilo: document.getElementById('personalidad-estilo').value,
      descripcionLibre: document.getElementById('personalidad-libre').value,
    },
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

    resultadoDiv.style.display = 'block';
    resultadoDiv.innerHTML = `
      <div class="exito">¡Tu asistente fue creado en modo prueba!</div>
      <p>Guardá estos dos códigos, no se pueden recuperar después:</p>
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
