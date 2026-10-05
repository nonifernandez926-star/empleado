// =====================================================================
// AGENDA DEL DUEÑO: "centro de organización" que se adapta al rubro.
// Vista Hoy, semana, tareas, recordatorios, importar desde foto o mensaje, organizar el día y preguntarle a la agenda.
// (Los pedidos NO se gestionan acá: tienen su propia sección. Los turnos de clientes se muestran en Hoy solo para verlos.)
// Usa helpers de admin.js: API_URL, headersAuth, escHtml, negocioActual.
// =====================================================================
let agendaVista = 'hoy';
let agendaPerfil = null; // { rubro, tipos: [{id,label}], tareas: [] }
let agendaTimerRecordatorios = null;

const AG_ICONO = {
  reloj: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  persona: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 16 0v1"/></svg>',
  campana: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>',
  alerta: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20Z"/><path d="M12 10v4M12 17.5v.01"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>',
  vacio: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  cerrar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  mas: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
};

const RECORDATORIOS_OPCIONES = [
  { valor: '', texto: 'Sin aviso' },
  { valor: '0', texto: 'A la hora' },
  { valor: '15', texto: '15 minutos antes' },
  { valor: '60', texto: '1 hora antes' },
  { valor: '1440', texto: '1 día antes' },
  { valor: '4320', texto: '3 días antes' },
];
const DURACIONES = [15, 30, 45, 60, 90, 120, 180, 240];

// ---------- fechas (hora local del dispositivo, que en Argentina coincide con la del negocio) ----------
function agHoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function agSumarDias(iso, n) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function agFechaLinda(iso, conAnio) {
  if (!iso) return 'Sin fecha';
  const d = new Date(`${iso}T12:00:00`);
  return capitalizar(d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', ...(conAnio ? { year: 'numeric' } : {}) }));
}
function agEtiquetaFecha(iso) {
  const hoy = agHoyISO();
  if (!iso) return { texto: 'Sin fecha', clase: '' };
  if (iso < hoy) return { texto: 'Vencida', clase: 'vencida' };
  if (iso === hoy) return { texto: 'Hoy', clase: 'hoy' };
  if (iso === agSumarDias(hoy, 1)) return { texto: 'Mañana', clase: '' };
  return { texto: new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', ''), clase: '' };
}
function agMinutos(hora) { const [h, m] = hora.split(':').map(Number); return h * 60 + m; }
function agNombreCategoria(id) {
  const t = (agendaPerfil && agendaPerfil.tipos || []).find((x) => x.id === id);
  return t ? t.label : '';
}

async function agFetch(ruta, opciones = {}) {
  const res = await fetch(`${API_URL}/agenda${ruta}`, {
    ...opciones,
    headers: headersAuth(opciones.body && !(opciones.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
  });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(datos.error || 'Algo salió mal. Probá de nuevo.');
  return datos;
}

// ---------- carga principal ----------
async function cargarAgenda() {
  agActualizarSaludo();
  if (!agendaPerfil) {
    try { agendaPerfil = await agFetch('/perfil'); } catch (e) { agendaPerfil = { rubro: 'General', tipos: [], tareas: [] }; }
  }
  agPrepararBotones();
  agMostrarVista(agendaVista);
  agBannerNotificaciones();
}

function agActualizarSaludo() {
  const h = new Date().getHours();
  const saludo = h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  const nombre = (negocioActual && negocioActual.formData && negocioActual.formData.nombreNegocio) || '';
  document.getElementById('ag-saludo').textContent = nombre ? `${saludo}, ${nombre}` : saludo;
  document.getElementById('ag-fecha-titulo').textContent = agFechaLinda(agHoyISO());
}

let agBotonesListos = false;
function agPrepararBotones() {
  if (agBotonesListos) return;
  agBotonesListos = true;
  document.getElementById('ag-btn-evento').addEventListener('click', () => agAbrirFormulario({ tipo: 'evento', fecha: agHoyISO() }));
  document.getElementById('ag-btn-tarea').addEventListener('click', () => agAbrirFormulario({ tipo: 'tarea' }));
  document.getElementById('ag-btn-foto').addEventListener('click', () => document.getElementById('ag-input-foto').click());
  document.getElementById('ag-input-foto').addEventListener('change', agImportarFoto);
  document.getElementById('ag-btn-mensaje').addEventListener('click', agAbrirMensaje);
  document.getElementById('ag-btn-organizar').addEventListener('click', agOrganizarDia);
  const enviar = () => agPreguntar();
  document.getElementById('ag-pregunta-btn').addEventListener('click', enviar);
  document.getElementById('ag-pregunta-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') enviar(); });
  document.querySelectorAll('#ag-tabs .ag-tab').forEach((t) => t.addEventListener('click', () => agMostrarVista(t.dataset.vista)));
}

function agMostrarVista(vista) {
  agendaVista = vista;
  document.querySelectorAll('#ag-tabs .ag-tab').forEach((t) => t.classList.toggle('activo', t.dataset.vista === vista));
  if (vista === 'hoy') agRenderHoy();
  else if (vista === 'semana') agRenderSemana();
  else agRenderTareas();
}

// ---------- tarjetas ----------
function agTarjetaEvento(e, opciones = {}) {
  const ahoraMin = new Date().getHours() * 60 + new Date().getMinutes();
  const esHoy = e.fecha === agHoyISO();
  const pasado = esHoy && e.hora && agMinutos(e.hora) + (e.duracionMinutos || 30) < ahoraMin;
  const proximo = opciones.proximoId && String(e._id) === String(opciones.proximoId);
  const esTurno = e.tipo === 'turno';
  const cat = agNombreCategoria(e.categoria);
  return `
    <div class="ag-evento ${pasado ? 'pasado' : ''} ${proximo ? 'proximo' : ''} ${esTurno ? 'turno' : ''}" ${esTurno ? '' : `data-editar="${e._id}"`}>
      <div class="ag-evento-hora">
        <strong>${e.hora ? escHtml(e.hora) : 'Todo<br>el día'}</strong>
        ${e.hora && e.duracionMinutos ? `<span>${e.duracionMinutos} min</span>` : ''}
      </div>
      <div class="ag-evento-cuerpo">
        <div class="ag-evento-titulo">${escHtml(e.titulo)}${proximo ? '<em class="ag-chip-proximo">Próximo</em>' : ''}</div>
        <div class="ag-evento-meta">
          ${esTurno ? '<span class="ag-chip turno">Turno de cliente</span>' : (cat ? `<span class="ag-chip">${escHtml(cat)}</span>` : '')}
          ${e.persona && !esTurno ? `<span class="ag-meta">${AG_ICONO.persona} ${escHtml(e.persona)}</span>` : ''}
          ${e.recordatorioMinutos !== null && e.recordatorioMinutos !== undefined && !esTurno ? `<span class="ag-meta">${AG_ICONO.campana} Aviso</span>` : ''}
        </div>
        ${e.notas ? `<div class="ag-evento-notas">${escHtml(e.notas)}</div>` : ''}
      </div>
    </div>`;
}

function agTarjetaTarea(t) {
  const et = t.completada ? { texto: 'Hecha', clase: 'hecha' } : agEtiquetaFecha(t.fecha);
  return `
    <div class="ag-tarea ${t.completada ? 'completada' : ''}">
      <button class="ag-check ${t.completada ? 'marcado' : ''}" data-completar="${t._id}" data-estado="${t.completada ? '1' : '0'}" aria-label="Marcar como hecha">${t.completada ? AG_ICONO.check : ''}</button>
      <div class="ag-tarea-cuerpo" data-editar="${t._id}">
        <div class="ag-tarea-titulo">${escHtml(t.titulo)}</div>
        <div class="ag-evento-meta">
          ${t.fecha ? `<span class="ag-fecha-chip ${et.clase}">${escHtml(et.texto)}${t.hora ? ' · ' + escHtml(t.hora) : ''}</span>` : '<span class="ag-fecha-chip">Sin fecha</span>'}
          ${t.persona ? `<span class="ag-meta">${AG_ICONO.persona} ${escHtml(t.persona)}</span>` : ''}
        </div>
        ${t.notas ? `<div class="ag-evento-notas">${escHtml(t.notas)}</div>` : ''}
      </div>
    </div>`;
}

let agCache = {}; // id -> item, para abrir el formulario de edición sin pedirlo otra vez
function agGuardarEnCache(lista) { (lista || []).forEach((i) => { if (i && i._id) agCache[i._id] = i; }); }

function agEnlazarLista(contenedor) {
  contenedor.querySelectorAll('[data-editar]').forEach((el) => el.addEventListener('click', () => {
    const item = agCache[el.dataset.editar];
    if (item) agAbrirFormulario(item);
  }));
  contenedor.querySelectorAll('[data-completar]').forEach((el) => el.addEventListener('click', async (ev) => {
    ev.stopPropagation();
    el.disabled = true;
    try {
      await agFetch(`/${el.dataset.completar}/completar`, { method: 'PUT', body: JSON.stringify({ completada: el.dataset.estado !== '1' }) });
      agMostrarVista(agendaVista);
    } catch (e) { alert(e.message); el.disabled = false; }
  }));
}

// ---------- vista HOY ----------
async function agRenderHoy() {
  const cont = document.getElementById('ag-contenido');
  cont.innerHTML = '<p class="ayuda">Cargando tu día...</p>';
  try {
    const d = await agFetch('/hoy');
    agGuardarEnCache(d.eventos); agGuardarEnCache(d.tareas);
    const pendientes = d.tareas.length;
    document.getElementById('ag-num-eventos').textContent = d.eventos.length;
    document.getElementById('ag-linea-resumen').textContent = d.eventos.length || pendientes
      ? `${d.eventos.length} ${d.eventos.length === 1 ? 'evento' : 'eventos'} y ${pendientes} ${pendientes === 1 ? 'tarea pendiente' : 'tareas pendientes'}`
      : 'Tu día está libre';

    const ahoraMin = new Date().getHours() * 60 + new Date().getMinutes();
    const proximo = d.eventos.find((e) => e.hora && agMinutos(e.hora) >= ahoraMin);

    let html = '';
    if (d.avisos.length) html += `<div class="ag-avisos">${d.avisos.map((a) => `<div class="ag-aviso">${AG_ICONO.alerta}<span>${escHtml(a)}</span></div>`).join('')}</div>`;

    html += '<div class="ag-seccion-titulo">Tu agenda de hoy</div>';
    html += d.eventos.length
      ? `<div class="ag-lista">${d.eventos.map((e) => agTarjetaEvento(e, { proximoId: proximo && proximo._id })).join('')}</div>`
      : `<div class="ag-vacio">${AG_ICONO.vacio}<strong>No tenés eventos hoy</strong><span>Agregá uno o importalo desde una foto de tu agenda.</span></div>`;

    html += `<div class="ag-seccion-titulo">Tareas pendientes ${pendientes ? `<span class="ag-contador">${pendientes}</span>` : ''}</div>`;
    html += pendientes
      ? `<div class="ag-lista">${d.tareas.slice(0, 8).map(agTarjetaTarea).join('')}</div>${pendientes > 8 ? '<button class="ag-ver-mas" data-ir="tareas">Ver todas las tareas</button>' : ''}`
      : '<div class="ag-vacio chico"><span>No tenés tareas pendientes. 🎉</span></div>';

    cont.innerHTML = html;
    agEnlazarLista(cont);
    cont.querySelector('[data-ir="tareas"]')?.addEventListener('click', () => agMostrarVista('tareas'));
  } catch (e) {
    cont.innerHTML = `<div class="error-msg">${escHtml(e.message || 'No se pudo cargar tu agenda.')}</div>`;
  }
}

// ---------- vista SEMANA ----------
async function agRenderSemana() {
  const cont = document.getElementById('ag-contenido');
  cont.innerHTML = '<p class="ayuda">Cargando la semana...</p>';
  try {
    const d = await agFetch('/semana');
    d.dias.forEach((dia) => agGuardarEnCache(dia.eventos)); agGuardarEnCache(d.tareas);
    cont.innerHTML = d.dias.map((dia) => `
      <div class="ag-dia">
        <div class="ag-dia-cab">
          <div><strong>${escHtml(agFechaLinda(dia.fecha))}</strong>${dia.fecha === agHoyISO() ? '<span class="ag-fecha-chip hoy">Hoy</span>' : ''}</div>
          <button class="ag-mini-mas" data-agregar-dia="${dia.fecha}" aria-label="Agregar evento este día">${AG_ICONO.mas}</button>
        </div>
        ${dia.eventos.length ? `<div class="ag-lista">${dia.eventos.map((e) => agTarjetaEvento(e)).join('')}</div>` : '<div class="ag-dia-vacio">Sin eventos</div>'}
      </div>`).join('');
    agEnlazarLista(cont);
    cont.querySelectorAll('[data-agregar-dia]').forEach((b) => b.addEventListener('click', () => agAbrirFormulario({ tipo: 'evento', fecha: b.dataset.agregarDia })));
  } catch (e) {
    cont.innerHTML = `<div class="error-msg">${escHtml(e.message)}</div>`;
  }
}

// ---------- vista TAREAS ----------
async function agRenderTareas() {
  const cont = document.getElementById('ag-contenido');
  cont.innerHTML = '<p class="ayuda">Cargando tareas...</p>';
  try {
    const d = await agFetch('/tareas');
    agGuardarEnCache(d.pendientes); agGuardarEnCache(d.hechas);
    let html = `<div class="ag-seccion-titulo">Pendientes ${d.pendientes.length ? `<span class="ag-contador">${d.pendientes.length}</span>` : ''}</div>`;
    html += d.pendientes.length
      ? `<div class="ag-lista">${d.pendientes.map(agTarjetaTarea).join('')}</div>`
      : '<div class="ag-vacio chico"><span>No tenés tareas pendientes.</span></div>';

    const sugeridas = (agendaPerfil && agendaPerfil.tareas || []).filter((t) => !d.pendientes.some((p) => p.titulo.toLowerCase() === t.toLowerCase()));
    if (sugeridas.length) {
      html += `<div class="ag-seccion-titulo">Sugeridas para tu rubro${agendaPerfil.rubro ? ` (${escHtml(agendaPerfil.rubro)})` : ''}</div>
        <div class="ag-sugeridas">${sugeridas.map((t) => `<button class="ag-sug" data-sugerida="${escHtml(t)}">${AG_ICONO.mas} ${escHtml(t)}</button>`).join('')}</div>`;
    }
    if (d.hechas.length) html += `<div class="ag-seccion-titulo">Hechas esta semana</div><div class="ag-lista">${d.hechas.map(agTarjetaTarea).join('')}</div>`;

    cont.innerHTML = html;
    agEnlazarLista(cont);
    cont.querySelectorAll('[data-sugerida]').forEach((b) => b.addEventListener('click', () => agAbrirFormulario({ tipo: 'tarea', titulo: b.dataset.sugerida })));
  } catch (e) {
    cont.innerHTML = `<div class="error-msg">${escHtml(e.message)}</div>`;
  }
}

// =====================================================================
// MODALES
// =====================================================================
function agAbrirModal(titulo, contenidoHtml, { ancho } = {}) {
  agCerrarModal();
  const overlay = document.createElement('div');
  overlay.id = 'ag-modal';
  overlay.className = 'ag-modal-overlay';
  overlay.innerHTML = `
    <div class="ag-modal" style="${ancho ? `max-width:${ancho}px;` : ''}" role="dialog" aria-modal="true">
      <div class="ag-modal-cab"><strong>${escHtml(titulo)}</strong><button class="ag-modal-cerrar" aria-label="Cerrar">${AG_ICONO.cerrar}</button></div>
      <div class="ag-modal-cuerpo">${contenidoHtml}</div>
    </div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) agCerrarModal(); });
  overlay.querySelector('.ag-modal-cerrar').addEventListener('click', agCerrarModal);
  document.body.appendChild(overlay);
  return overlay;
}
function agCerrarModal() { document.getElementById('ag-modal')?.remove(); }

// ---------- formulario de evento / tarea (crear o editar) ----------
// `inicial` puede ser un elemento guardado (con _id), una propuesta de la IA, o valores sueltos para crear uno nuevo
function agAbrirFormulario(inicial, { alGuardar, alEliminar } = {}) {
  const x = { tipo: 'evento', duracionMinutos: 30, categoria: 'general', persona: '', notas: '', recordatorioMinutos: null, ...inicial };
  const esNuevo = !x._id;
  const tipos = (agendaPerfil && agendaPerfil.tipos) || [];
  const opcionesCat = [{ id: 'general', label: 'General' }, ...tipos].map((t) => `<option value="${escHtml(t.id)}" ${t.id === x.categoria ? 'selected' : ''}>${escHtml(t.label)}</option>`).join('');
  const rec = x.recordatorioMinutos === null || x.recordatorioMinutos === undefined ? '' : String(x.recordatorioMinutos);
  const opcionesRec = RECORDATORIOS_OPCIONES.map((o) => `<option value="${o.valor}" ${o.valor === rec ? 'selected' : ''}>${o.texto}</option>`).join('');
  const opcionesDur = DURACIONES.concat(DURACIONES.includes(x.duracionMinutos) ? [] : [x.duracionMinutos]).sort((a, b) => a - b)
    .map((m) => `<option value="${m}" ${m === x.duracionMinutos ? 'selected' : ''}>${m < 60 ? `${m} min` : `${m / 60} h`}</option>`).join('');

  const overlay = agAbrirModal(esNuevo ? 'Nuevo' : 'Editar', `
    <div class="ag-switch">
      <button type="button" data-tipo="evento" class="${x.tipo === 'evento' ? 'activo' : ''}">Evento</button>
      <button type="button" data-tipo="tarea" class="${x.tipo === 'tarea' ? 'activo' : ''}">Tarea</button>
    </div>
    <label class="ag-label">Título</label>
    <input id="ag-f-titulo" type="text" maxlength="140" value="${escHtml(x.titulo || '')}" placeholder="Ej: Reunión con proveedor">
    <div class="ag-fila2">
      <div><label class="ag-label">Fecha<span id="ag-f-fecha-op"></span></label><input id="ag-f-fecha" type="date" value="${escHtml(x.fecha || '')}"></div>
      <div><label class="ag-label">Hora (opcional)</label><input id="ag-f-hora" type="time" value="${escHtml(x.hora || '')}"></div>
    </div>
    <div class="ag-fila2" id="ag-f-fila-dur">
      <div><label class="ag-label">Duración</label><select id="ag-f-dur">${opcionesDur}</select></div>
      <div><label class="ag-label">Tipo</label><select id="ag-f-cat">${opcionesCat}</select></div>
    </div>
    <label class="ag-label">Persona relacionada (opcional)</label>
    <input id="ag-f-persona" type="text" maxlength="80" value="${escHtml(x.persona || '')}" placeholder="Cliente, proveedor, empleado...">
    <label class="ag-label">Notas (opcional)</label>
    <textarea id="ag-f-notas" rows="2" maxlength="600" placeholder="Tema, qué llevar, qué revisar...">${escHtml(x.notas || '')}</textarea>
    <label class="ag-label">Recordatorio</label>
    <select id="ag-f-rec">${opcionesRec}</select>
    <div id="ag-f-error" class="error-msg" style="display:none;"></div>
    <div class="ag-modal-botones">
      ${esNuevo ? '' : '<button type="button" class="ag-btn-eliminar" id="ag-f-eliminar">Eliminar</button>'}
      <button type="button" class="btn ag-btn-guardar" id="ag-f-guardar">${alGuardar && esNuevo ? 'Listo' : 'Guardar'}</button>
    </div>`);

  let tipo = x.tipo === 'tarea' ? 'tarea' : 'evento';
  const actualizarTipo = () => {
    overlay.querySelectorAll('.ag-switch button').forEach((b) => b.classList.toggle('activo', b.dataset.tipo === tipo));
    overlay.querySelector('#ag-f-fila-dur').style.display = tipo === 'evento' ? '' : 'none';
    overlay.querySelector('#ag-f-fecha-op').textContent = tipo === 'tarea' ? ' (opcional)' : '';
  };
  overlay.querySelectorAll('.ag-switch button').forEach((b) => b.addEventListener('click', () => { tipo = b.dataset.tipo; actualizarTipo(); }));
  actualizarTipo();

  const mostrarError = (t) => { const e = overlay.querySelector('#ag-f-error'); e.textContent = t; e.style.display = 'block'; };

  overlay.querySelector('#ag-f-guardar').addEventListener('click', async () => {
    const datos = {
      tipo,
      titulo: overlay.querySelector('#ag-f-titulo').value.trim(),
      fecha: overlay.querySelector('#ag-f-fecha').value,
      hora: overlay.querySelector('#ag-f-hora').value,
      duracionMinutos: Number(overlay.querySelector('#ag-f-dur').value) || 30,
      categoria: overlay.querySelector('#ag-f-cat').value,
      persona: overlay.querySelector('#ag-f-persona').value.trim(),
      notas: overlay.querySelector('#ag-f-notas').value.trim(),
      recordatorioMinutos: overlay.querySelector('#ag-f-rec').value === '' ? null : Number(overlay.querySelector('#ag-f-rec').value),
    };
    if (!datos.titulo) return mostrarError('Escribí un título.');
    if (tipo === 'evento' && !datos.fecha) return mostrarError('Un evento necesita una fecha.');
    if (datos.recordatorioMinutos !== null && !datos.fecha) return mostrarError('Para un recordatorio elegí una fecha.');

    // Si estamos revisando una propuesta de la IA, devolvemos los datos editados sin guardar todavía
    if (alGuardar) { agCerrarModal(); alGuardar(datos); return; }

    const boton = overlay.querySelector('#ag-f-guardar');
    boton.disabled = true;
    try {
      if (esNuevo) await agFetch('', { method: 'POST', body: JSON.stringify(datos) });
      else await agFetch(`/${x._id}`, { method: 'PUT', body: JSON.stringify(datos) });
      agCerrarModal();
      agMostrarVista(agendaVista);
    } catch (e) { mostrarError(e.message); boton.disabled = false; }
  });

  overlay.querySelector('#ag-f-eliminar')?.addEventListener('click', async () => {
    if (!confirm('¿Eliminar este elemento de tu agenda?')) return;
    try { await agFetch(`/${x._id}`, { method: 'DELETE' }); agCerrarModal(); agMostrarVista(agendaVista); }
    catch (e) { mostrarError(e.message); }
  });
  overlay.querySelector('#ag-f-titulo').focus();
}

// ---------- agregar desde un mensaje ----------
function agAbrirMensaje() {
  const overlay = agAbrirModal('Agregar desde un mensaje', `
    <p class="ag-ayuda">Escribí como hablás y la IA arma el evento o la tarea. Siempre vas a poder revisarlo antes de guardar.</p>
    <textarea id="ag-m-texto" rows="4" maxlength="2500" placeholder="Ej: El jueves a las 16 tengo que reunirme con Martín para hablar del nuevo pedido."></textarea>
    <div id="ag-m-error" class="error-msg" style="display:none;"></div>
    <div class="ag-modal-botones"><button type="button" class="btn ag-btn-guardar" id="ag-m-enviar">Interpretar</button></div>`);
  const boton = overlay.querySelector('#ag-m-enviar');
  boton.addEventListener('click', async () => {
    const texto = overlay.querySelector('#ag-m-texto').value.trim();
    const error = overlay.querySelector('#ag-m-error');
    error.style.display = 'none';
    if (texto.length < 3) { error.textContent = 'Escribí qué querés agendar.'; error.style.display = 'block'; return; }
    boton.disabled = true; boton.textContent = 'Interpretando...';
    try {
      const r = await agFetch('/interpretar', { method: 'POST', body: JSON.stringify({ texto }) });
      agMostrarPropuestas(r, 'mensaje');
    } catch (e) { error.textContent = e.message; error.style.display = 'block'; boton.disabled = false; boton.textContent = 'Interpretar'; }
  });
  overlay.querySelector('#ag-m-texto').focus();
}

// ---------- importar desde la foto de una agenda de papel ----------
// Se achica la foto en el celular antes de subirla: más rápido, y evita pasar el límite de tamaño.
function agReducirImagen(archivo, maxLado = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(archivo);
    img.onload = () => {
      const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la foto.'))), 'image/jpeg', 0.88);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo abrir esa imagen.')); };
    img.src = url;
  });
}

async function agImportarFoto(ev) {
  const archivo = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!archivo) return;
  const overlay = agAbrirModal('Leyendo tu agenda', `
    <div class="ag-cargando"><div class="ag-spinner"></div><strong>Analizando la foto...</strong><span>Puede tardar unos segundos. Después vas a poder revisar todo antes de guardar.</span></div>`);
  try {
    const blob = await agReducirImagen(archivo);
    const form = new FormData();
    form.append('foto', blob, 'agenda.jpg');
    const r = await agFetch('/interpretar-foto', { method: 'POST', body: form });
    agMostrarPropuestas(r, 'foto');
  } catch (e) {
    overlay.querySelector('.ag-modal-cuerpo').innerHTML = `<div class="error-msg">${escHtml(e.message)}</div><div class="ag-modal-botones"><button class="btn ag-btn-guardar" id="ag-cerrar-error">Cerrar</button></div>`;
    overlay.querySelector('#ag-cerrar-error').addEventListener('click', agCerrarModal);
  }
}

// ---------- revisar lo que encontró la IA antes de guardar ----------
function agMostrarPropuestas(resultado, origen) {
  let items = (resultado.items || []).map((i) => ({ ...i, _marcado: i.confianza !== 'baja' }));
  if (!items.length) {
    const o = agAbrirModal('No encontré nada', `<p class="ag-ayuda">${escHtml(resultado.aclaraciones || 'No pude encontrar eventos ni tareas. Probá con otra foto más nítida o escribilo de otra forma.')}</p>
      <div class="ag-modal-botones"><button class="btn ag-btn-guardar" id="ag-p-cerrar">Cerrar</button></div>`);
    o.querySelector('#ag-p-cerrar').addEventListener('click', agCerrarModal);
    return;
  }

  const dibujar = () => {
    const marcados = items.filter((i) => i._marcado).length;
    const overlay = agAbrirModal(`Encontré ${items.length} ${items.length === 1 ? 'elemento' : 'elementos'}`, `
      <p class="ag-ayuda">Revisalos antes de guardar: una letra mal leída puede cambiar una fecha o un horario. Tocá "Editar" para corregir.</p>
      ${resultado.aclaraciones ? `<div class="ag-aviso">${AG_ICONO.alerta}<span>${escHtml(resultado.aclaraciones)}</span></div>` : ''}
      <div class="ag-propuestas">
        ${items.map((i, n) => `
          <div class="ag-propuesta ${i._marcado ? '' : 'desmarcada'} ${i.confianza === 'baja' ? 'dudosa' : ''}">
            <button class="ag-check ${i._marcado ? 'marcado' : ''}" data-marcar="${n}" aria-label="Incluir">${i._marcado ? AG_ICONO.check : ''}</button>
            <div class="ag-propuesta-cuerpo">
              <div class="ag-propuesta-tit">${escHtml(i.titulo)} <span class="ag-chip ${i.tipo === 'tarea' ? 'tarea' : ''}">${i.tipo === 'tarea' ? 'Tarea' : 'Evento'}</span></div>
              <div class="ag-evento-meta">
                <span class="ag-meta">${AG_ICONO.reloj} ${i.fecha ? escHtml(agFechaLinda(i.fecha)) : 'Sin fecha'}${i.hora ? ' · ' + escHtml(i.hora) : ''}</span>
                ${i.persona ? `<span class="ag-meta">${AG_ICONO.persona} ${escHtml(i.persona)}</span>` : ''}
              </div>
              ${i.notas ? `<div class="ag-evento-notas">${escHtml(i.notas)}</div>` : ''}
              ${i.confianza === 'baja' ? '<div class="ag-duda">No estoy seguro de esta lectura: revisala.</div>' : ''}
              ${i.textoOriginal ? `<div class="ag-original">Leí: “${escHtml(i.textoOriginal)}”</div>` : ''}
              <button class="ag-link" data-editar-prop="${n}">Editar</button>
            </div>
          </div>`).join('')}
      </div>
      <div id="ag-p-error" class="error-msg" style="display:none;"></div>
      <div class="ag-modal-botones">
        <button type="button" class="ag-btn-eliminar" id="ag-p-cancelar">Descartar</button>
        <button type="button" class="btn ag-btn-guardar" id="ag-p-guardar" ${marcados ? '' : 'disabled'}>Agregar a la agenda (${marcados})</button>
      </div>`, { ancho: 520 });

    overlay.querySelectorAll('[data-marcar]').forEach((b) => b.addEventListener('click', () => { const i = items[Number(b.dataset.marcar)]; i._marcado = !i._marcado; dibujar(); }));
    overlay.querySelectorAll('[data-editar-prop]').forEach((b) => b.addEventListener('click', () => {
      const n = Number(b.dataset.editarProp);
      agAbrirFormulario(items[n], { alGuardar: (datos) => { items[n] = { ...items[n], ...datos, confianza: 'alta', _marcado: true }; dibujar(); } });
    }));
    overlay.querySelector('#ag-p-cancelar').addEventListener('click', agCerrarModal);
    overlay.querySelector('#ag-p-guardar').addEventListener('click', async () => {
      const boton = overlay.querySelector('#ag-p-guardar');
      boton.disabled = true; boton.textContent = 'Guardando...';
      try {
        const aGuardar = items.filter((i) => i._marcado).map(({ _marcado, confianza, textoOriginal, ...resto }) => resto);
        const r = await agFetch('/guardar-propuestas', { method: 'POST', body: JSON.stringify({ items: aGuardar, origen }) });
        agCerrarModal();
        agMostrarVista(agendaVista);
        if (r.omitidos) alert(`Se guardaron ${r.guardados}. ${r.omitidos} no se pudieron guardar por faltarles la fecha.`);
      } catch (e) {
        const err = overlay.querySelector('#ag-p-error'); err.textContent = e.message; err.style.display = 'block';
        boton.disabled = false; boton.textContent = `Agregar a la agenda (${marcados})`;
      }
    });
  };
  dibujar();
}

// =====================================================================
// IA: organizar el día y preguntarle a la agenda
// =====================================================================
function agMostrarResultadoIA(html) {
  const caja = document.getElementById('ag-ia-resultado');
  caja.innerHTML = html;
  caja.style.display = 'block';
  caja.querySelector('[data-cerrar-ia]')?.addEventListener('click', () => { caja.style.display = 'none'; });
}

async function agOrganizarDia() {
  const boton = document.getElementById('ag-btn-organizar');
  boton.disabled = true;
  agMostrarResultadoIA('<div class="ag-cargando chico"><div class="ag-spinner"></div><span>Organizando tu día...</span></div>');
  try {
    const r = await agFetch('/organizar-dia', { method: 'POST', body: JSON.stringify({ fecha: agHoyISO() }) });
    agMostrarResultadoIA(`<div class="ag-ia-cab"><strong>Tu día, organizado</strong><button data-cerrar-ia aria-label="Cerrar">${AG_ICONO.cerrar}</button></div><div class="ag-ia-texto">${escHtml(r.resumen)}</div>`);
  } catch (e) { agMostrarResultadoIA(`<div class="error-msg">${escHtml(e.message)}</div>`); }
  boton.disabled = false;
}

async function agPreguntar() {
  const input = document.getElementById('ag-pregunta-input');
  const pregunta = input.value.trim();
  if (pregunta.length < 3) return;
  agMostrarResultadoIA('<div class="ag-cargando chico"><div class="ag-spinner"></div><span>Revisando tu agenda...</span></div>');
  try {
    const r = await agFetch('/preguntar', { method: 'POST', body: JSON.stringify({ pregunta }) });
    agMostrarResultadoIA(`<div class="ag-ia-cab"><strong>${escHtml(pregunta)}</strong><button data-cerrar-ia aria-label="Cerrar">${AG_ICONO.cerrar}</button></div><div class="ag-ia-texto">${escHtml(r.respuesta)}</div>`);
  } catch (e) { agMostrarResultadoIA(`<div class="error-msg">${escHtml(e.message)}</div>`); }
}

// =====================================================================
// RECORDATORIOS: se revisan cada minuto mientras el panel esté abierto
// =====================================================================
function agBannerNotificaciones() {
  const cont = document.getElementById('ag-avisos-navegador');
  if (!cont) return;
  if (!('Notification' in window) || Notification.permission !== 'default') { cont.innerHTML = ''; return; }
  cont.innerHTML = `<div class="ag-banner"><span>${AG_ICONO.campana} Activá los avisos para que te recordemos tus eventos, aunque tengas el panel cerrado.</span><button id="ag-activar-avisos">Activar</button></div>`;
  document.getElementById('ag-activar-avisos').addEventListener('click', activarPushDueno);
}

// Deja los avisos "mientras el panel está abierto" (de arriba) como primer paso, pero además
// intenta suscribir de verdad al dueño a notificaciones push (Service Worker), que sí llegan
// con el panel cerrado. Si algo de esto falla (navegador sin soporte, sin conexión, VAPID sin
// configurar en el servidor), no pasa nada grave: queda el aviso en pantalla como respaldo.
async function activarPushDueno() {
  const permiso = await Notification.requestPermission();
  agBannerNotificaciones();
  if (permiso !== 'granted') return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const resClave = await fetch(`${API_URL}/push/clave-publica`);
    if (!resClave.ok) return; // VAPID no configurado todavía en el servidor
    const { publicKey } = await resClave.json();

    const registro = await navigator.serviceWorker.register('/sw.js');
    const subscription = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    await agFetch('/push-dueno', { method: 'POST', body: JSON.stringify({ subscription }) });
  } catch (error) {
    // Sin push real, pero el aviso en pantalla (mientras el panel está abierto) sigue funcionando.
  }
}

// La clave pública VAPID viene en base64url; el navegador la necesita como bytes (Uint8Array).
// (Mismo helper que ya usa el chat del cliente para suscribirse.)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function agMostrarRecordatorio(r) {
  const cont = document.getElementById('ag-recordatorios');
  const titulo = r.tipo === 'tarea' ? 'Tarea pendiente' : 'Evento próximo';
  const detalle = `${r.titulo}${r.hora ? ' · ' + r.hora : ''}${r.persona ? ' · ' + r.persona : ''}`;
  if (cont) {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'ag-recordatorio';
    tarjeta.innerHTML = `${AG_ICONO.campana}<div><strong>${escHtml(titulo)}</strong><span>${escHtml(detalle)}</span></div><button aria-label="Cerrar">${AG_ICONO.cerrar}</button>`;
    tarjeta.querySelector('button').addEventListener('click', () => tarjeta.remove());
    cont.prepend(tarjeta);
  }
  try { if ('Notification' in window && Notification.permission === 'granted') new Notification(titulo, { body: detalle, icon: 'img/icono-192.png' }); } catch (e) { /* algunos celulares no permiten crear notificaciones desde la página */ }
}

async function agRevisarRecordatorios() {
  try {
    const r = await agFetch('/recordatorios');
    (r.recordatorios || []).forEach(agMostrarRecordatorio);
  } catch (e) { /* sin conexión: se vuelve a intentar en un minuto */ }
}

function iniciarRecordatoriosAgenda() {
  if (agendaTimerRecordatorios) clearInterval(agendaTimerRecordatorios);
  agRevisarRecordatorios();
  agendaTimerRecordatorios = setInterval(agRevisarRecordatorios, 60 * 1000);
}
