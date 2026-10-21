// Panel de turnos (peluquerías, barberías, consultorios…): mismo diseño que el resto de la app.
// Reemplaza la lista simple anterior por: resumen del día, línea de tiempo con las acciones de cada estado,
// "por confirmar", próximos e historial. Usa los mismos endpoints de siempre (/turnos y /fila).
(function () {
  const COLORES = ['#2350f5', '#7a4fd0', '#1f9d5c', '#e0731e', '#d6336c', '#0e8fa3'];
  const ESTADO = { pendiente: ['amarillo', 'Por confirmar'], confirmado: ['azul', 'Confirmado'], rechazado: ['gris', 'Rechazado'], cancelado: ['gris', 'Cancelado'] };
  const ATENCION = { esperando: null, en_atencion: ['azul', 'Atendiendo'], atendido: ['verde', 'Atendido'], ausente: ['rojo', 'No vino'] };
  let vista = 'hoy', filtroProf = 'todos', fila = null, tick = 0;
  const raiz = () => document.getElementById('turnos-app');
  const esc = (t) => escHtml(t);
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const hoyStr = () => ymd(new Date());
  const minutos = (h) => { const [a, b] = String(h).split(':').map(Number); return a * 60 + b; };
  const finHora = (h, d) => { const t = minutos(h) + (d || 30); return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  const fechaDe = (f) => new Date(`${f}T00:00:00`);
  const mayus = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const dia = (f) => { const h = hoyStr(), m = ymd(new Date(Date.now() + 86400000)); if (f === h) return 'Hoy'; if (f === m) return 'Mañana'; return mayus(fechaDe(f).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })); };
  const profesionales = () => (negocioActual.profesionales || []).filter((p) => p.activo !== false);
  const colorProf = (n) => { const i = profesionales().findIndex((p) => p.nombre === n); return COLORES[(i < 0 ? 0 : i) % COLORES.length]; };
  const lista = () => (Array.isArray(turnosCache) ? turnosCache : []);
  const visibles = (ts) => ts.filter((t) => filtroProf === 'todos' || (t.profesional || '') === filtroProf);
  const ordenar = (ts) => [...ts].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const esperandoPorId = () => { const m = {}; ((fila && fila.colas) || []).forEach((c) => (c.esperando || []).forEach((e) => { m[e.id] = e; })); return m; };

  // ---------- Tarjeta de un turno ----------
  function tarjeta(t, ctx = 'hoy') {
    const at = t.atencion || 'esperando';
    const est = ESTADO[t.estado];
    const cerrado = t.estado === 'rechazado' || t.estado === 'cancelado';
    const hecho = at === 'atendido' || at === 'ausente';
    const prof = t.profesional ? `<span class="an-tag gris" style="--pc:${colorProf(t.profesional)}"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${colorProf(t.profesional)}"></span>${esc(t.profesional)}</span>` : '';
    const espera = esperandoPorId()[t._id];
    let progreso = '', acciones = '';
    if (t.estado === 'pendiente') {
      acciones = `<button type="button" class="tn-btn ok" data-estado="confirmado" data-id="${t._id}">${ajIcono('check', 16)} Aprobar</button><button type="button" class="tn-btn mal" data-estado="rechazado" data-id="${t._id}">Rechazar</button>`;
    } else if (t.estado === 'confirmado' && ctx === 'hoy') {
      if (at === 'esperando') acciones = `<button type="button" class="tn-btn ok" data-fila="iniciar" data-id="${t._id}">Atender ahora</button><button type="button" class="tn-btn suave" data-fila="ausente" data-id="${t._id}">No vino</button>`;
      else if (at === 'en_atencion') {
        const trans = t.inicioAtencion ? Math.max(0, Math.round((Date.now() - new Date(t.inicioAtencion).getTime()) / 60000)) : 0;
        const pasado = trans > t.duracionMinutos;
        progreso = `<div class="tn-prog ${pasado ? 'pasado' : ''}"><i style="width:${Math.min(100, Math.round((trans / (t.duracionMinutos || 30)) * 100))}%"></i></div><div class="tn-meta" style="margin-top:6px"><span>${trans} min de ${t.duracionMinutos}${pasado ? ' · se pasó del tiempo' : ''}</span></div>`;
        acciones = `<button type="button" class="tn-btn ok" data-fila="finalizar" data-id="${t._id}">Finalizar</button>`;
      }
    }
    if (t.estado === 'confirmado' && !hecho && ctx !== 'historial' && at !== 'en_atencion') acciones += `<button type="button" class="tn-btn suave chico" data-estado="cancelado" data-id="${t._id}">Cancelar turno</button>`;
    if (ctx === 'historial') acciones = `<button type="button" class="tn-btn suave chico" data-borrar="${t._id}">Eliminar</button>`;
    return `<div class="tn-item"><div class="tn-hora">${t.hora}<small>${finHora(t.hora, t.duracionMinutos)}</small></div>
      <div class="tn-card ${t.estado === 'pendiente' ? 'pendiente' : ''} ${at === 'en_atencion' ? 'en_atencion' : ''} ${hecho ? 'hecho' : ''} ${cerrado ? 'cerrado' : ''}" style="--pc:${t.profesional ? colorProf(t.profesional) : 'var(--azul)'}">
        <div class="tn-fila-top"><div><div class="tn-nombre">${esc(t.nombreCliente)}</div>
          <div class="tn-meta">${t.motivo ? `<span class="an-tag azul">${esc(t.motivo)}</span>` : ''}<span>${t.duracionMinutos} min</span>${prof}</div></div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px"><span class="an-tag ${est[0]}">${est[1]}</span>${ATENCION[at] && t.estado === 'confirmado' ? `<span class="an-tag ${ATENCION[at][0]}">${ATENCION[at][1]}</span>` : ''}</div></div>
        ${ctx !== 'hoy' ? `<div class="tn-meta" style="margin-top:8px"><span>${dia(t.fecha)}</span></div>` : ''}
        <div class="tn-meta" style="margin-top:6px">${t.telefonoCliente ? `<span class="tn-tel">${ajIcono('phone', 13)} ${esc(t.telefonoCliente)}</span>` : ''}${t.origen === 'dueño' ? '<span>Cargado por vos</span>' : ''}${espera && espera.horaEstimada && espera.horaEstimada !== t.hora ? `<span>Estimado ${espera.horaEstimada}</span>` : ''}${espera && espera.puedeAdelantar ? '<span style="color:#157a46;font-weight:800">Puede adelantarse</span>' : ''}</div>
        ${t.notas ? `<div class="tn-meta" style="margin-top:6px"><span>${esc(t.notas)}</span></div>` : ''}
        ${progreso}${acciones ? `<div class="tn-acc">${acciones}</div>` : ''}</div></div>`;
  }
  const grupos = (ts, ctx) => { const orden = ordenar(ts); if (ctx === 'historial') orden.reverse(); let ult = ''; return orden.map((t) => { const cab = t.fecha !== ult ? `<div class="tn-dia">${dia(t.fecha)}</div>` : ''; ult = t.fecha; return cab + tarjeta(t, ctx); }).join(''); };

  // ---------- Pantalla ----------
  function pintar() {
    const el = raiz();
    if (!el || !negocioActual || negocioActual.tipoOperacion !== 'turnos') return;
    const hoy = hoyStr(), todos = lista();
    const ts = visibles(todos);
    const deHoy = ts.filter((t) => t.fecha === hoy && (t.estado === 'confirmado' || t.estado === 'pendiente'));
    const porConfirmar = todos.filter((t) => t.estado === 'pendiente' && t.fecha >= hoy);
    const proximos = ts.filter((t) => t.fecha > hoy && (t.estado === 'confirmado' || t.estado === 'pendiente'));
    const historial = ts.filter((t) => t.fecha < hoy || t.estado === 'rechazado' || t.estado === 'cancelado').slice();
    const confirmadosHoy = deHoy.filter((t) => t.estado === 'confirmado');
    const ahora = confirmadosHoy.find((t) => t.atencion === 'en_atencion');
    const siguiente = ordenar(confirmadosHoy.filter((t) => (t.atencion || 'esperando') === 'esperando'))[0];
    const semana = todos.filter((t) => t.estado === 'confirmado' && t.fecha >= hoy && t.fecha <= ymd(new Date(Date.now() + 6 * 86400000))).length;
    const fechaHoy = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    const profs = profesionales();

    let cuerpo = '';
    if (vista === 'hoy') {
      cuerpo = deHoy.length ? `<div class="tn-lista">${ordenar(deHoy).map((t) => tarjeta(t, 'hoy')).join('')}</div>` : anVacio({ icono: 'calendar', titulo: 'Hoy no hay turnos', texto: 'Cuando tus clientes reserven por el chat, los vas a ver acá ordenados por hora. También podés bloquear horarios que ya tengas agendados por otro medio.' });
    } else if (vista === 'pendientes') {
      cuerpo = porConfirmar.length ? `<p class="an-sub">Mientras no los apruebes, el horario queda apartado pero el cliente espera tu respuesta.</p>${grupos(visibles(porConfirmar), 'pend')}` : anVacio({ icono: 'check', titulo: 'No tenés turnos por confirmar', texto: negocioActual.configTurnos && negocioActual.configTurnos.requiereAprobacionManual === false ? 'Tus turnos se confirman solos cuando el cliente reserva.' : 'Cuando un cliente pida un turno, va a aparecer acá para que lo apruebes.' });
    } else if (vista === 'proximos') {
      cuerpo = proximos.length ? grupos(proximos, 'prox') : anVacio({ icono: 'calendarCheck', titulo: 'No hay turnos próximos', texto: 'Los turnos de los próximos días van a aparecer acá.' });
    } else {
      cuerpo = historial.length ? grupos(historial.slice(0, 80), 'historial') : anVacio({ icono: 'history', titulo: 'Todavía no hay historial', texto: 'Los turnos pasados, cancelados o rechazados van a quedar guardados acá.' });
    }

    el.innerHTML = `<div class="tn">
      <div class="an-hero"><small>${mayus(fechaHoy)}</small>
        <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><p class="an-hero-num">${confirmadosHoy.length} ${confirmadosHoy.length === 1 ? 'turno' : 'turnos'} hoy</p><span class="tn-vivo"><i></i> En vivo</span></div>
        ${ahora ? `<div class="tn-hero-prox"><span>${ajIcono('zap', 18)}</span><div><strong>Atendiendo: ${esc(ahora.nombreCliente)}</strong><small>${esc(ahora.motivo || 'Turno')} · hasta las ${finHora(ahora.hora, ahora.duracionMinutos)}</small></div></div>`
          : siguiente ? `<div class="tn-hero-prox"><span>${ajIcono('clock', 18)}</span><div><strong>Siguiente: ${siguiente.hora} · ${esc(siguiente.nombreCliente)}</strong><small>${esc(siguiente.motivo || 'Turno')}${siguiente.profesional ? ' · con ' + esc(siguiente.profesional) : ''}</small></div></div>`
          : `<div class="an-hero-linea">${confirmadosHoy.length ? 'Ya atendiste a todos los de hoy. ¡Buen trabajo!' : 'No tenés turnos confirmados para hoy.'}</div>`}</div>
      <div class="an-kpis"><div class="an-kpi ${porConfirmar.length ? 'rojo' : ''}"><b>${porConfirmar.length}</b><small>Por confirmar</small></div><div class="an-kpi"><b>${confirmadosHoy.length}</b><small>Hoy</small></div><div class="an-kpi"><b>${semana}</b><small>Próximos 7 días</small></div></div>
      <div class="tn-barra"><button type="button" class="aj-btn aj-btn-primario aj-btn-ancho" id="tn-bloquear">${ajIcono('lock', 16)} Bloquear un horario</button><button type="button" class="aj-btn aj-btn-suave" id="tn-opciones" aria-label="Más opciones">${ajIcono('sliders', 18)}</button></div>
      ${anSeg([['hoy', 'Hoy'], ['pendientes', 'Por confirmar', porConfirmar.length || ''], ['proximos', 'Próximos'], ['historial', 'Historial']], vista, 'vista')}
      ${profs.length > 1 ? `<div class="tn-chips"><button type="button" class="an-chip ${filtroProf === 'todos' ? 'sel' : ''}" data-prof="todos">Todos</button>${profs.map((p) => `<button type="button" class="an-chip ${filtroProf === p.nombre ? 'sel' : ''}" data-prof="${esc(p.nombre)}" style="--pc:${colorProf(p.nombre)}"><i></i>${esc(p.nombre)}</button>`).join('')}</div>` : ''}
      ${cuerpo}</div>`;
    enlazar(el);
  }

  async function refrescar() { if (typeof cargarTurnos === 'function') await cargarTurnos(); }
  function enlazar(el) {
    el.querySelectorAll('[data-vista]').forEach((b) => b.addEventListener('click', () => { vista = b.dataset.vista; pintar(); }));
    el.querySelectorAll('[data-prof]').forEach((b) => b.addEventListener('click', () => { filtroProf = b.dataset.prof; pintar(); }));
    el.querySelector('#tn-bloquear').addEventListener('click', hojaBloqueo);
    el.querySelector('#tn-opciones').addEventListener('click', hojaOpciones);
    el.querySelectorAll('[data-estado]').forEach((b) => b.addEventListener('click', async () => {
      const estado = b.dataset.estado;
      if (estado === 'rechazado' && !(await ajConfirmar({ titulo: '¿Rechazar este turno?', texto: 'El horario vuelve a quedar libre y el cliente verá que no fue aprobado.', boton: 'Rechazar', peligro: true, icono: 'alert' }))) return;
      if (estado === 'cancelado' && !(await ajConfirmar({ titulo: '¿Cancelar este turno?', texto: 'El horario vuelve a quedar libre para otros clientes.', boton: 'Cancelar turno', peligro: true, icono: 'alert' }))) return;
      b.disabled = true;
      try {
        const r = await fetch(`${API_URL}/turnos/${b.dataset.id}/estado`, { method: 'PUT', headers: headersAuth({ 'Content-Type': 'application/json' }), body: JSON.stringify({ estado }) });
        if (!r.ok) throw new Error();
        const t = lista().find((x) => x._id === b.dataset.id); if (t) t.estado = estado;
        ajToast(estado === 'confirmado' ? 'Turno aprobado.' : estado === 'rechazado' ? 'Turno rechazado.' : 'Turno cancelado.');
        pintar(); if (window.AtencionHub) window.AtencionHub.turnos(lista());
      } catch (e) { b.disabled = false; ajToast('No se pudo actualizar el turno.', 'error'); }
    }));
    el.querySelectorAll('[data-fila]').forEach((b) => b.addEventListener('click', async () => {
      b.disabled = true;
      try { await fetch(`${API_URL}/fila/${b.dataset.id}/atencion`, { method: 'PUT', headers: headersAuth({ 'Content-Type': 'application/json' }), body: JSON.stringify({ accion: b.dataset.fila }) }); } catch (e) { /* el próximo refresco muestra el estado real */ }
      await refrescar(); window.cargarFila();
    }));
    el.querySelectorAll('[data-borrar]').forEach((b) => b.addEventListener('click', async () => {
      if (!(await ajConfirmar({ titulo: '¿Eliminar este turno?', texto: 'Se borra del historial y no se puede recuperar.', boton: 'Eliminar', peligro: true, icono: 'trash' }))) return;
      try { await fetch(`${API_URL}/turnos/${b.dataset.borrar}`, { method: 'DELETE', headers: headersAuth() }); turnosCache = lista().filter((t) => t._id !== b.dataset.borrar); pintar(); ajToast('Turno eliminado.'); }
      catch (e) { ajToast('No se pudo eliminar.', 'error'); }
    }));
  }

  // ---------- Hojas inferiores ----------
  function hoja(html, montar) {
    const fondo = document.createElement('div'); fondo.className = 'tn-hoja-fondo';
    const h = document.createElement('div'); h.className = 'tn-hoja'; h.setAttribute('role', 'dialog'); h.setAttribute('aria-modal', 'true');
    h.innerHTML = `<div class="asa"></div>${html}`;
    document.body.appendChild(fondo); document.body.appendChild(h);
    const cerrar = () => { fondo.classList.remove('abierta'); h.classList.remove('abierta'); setTimeout(() => { fondo.remove(); h.remove(); }, 350); };
    fondo.addEventListener('click', cerrar);
    requestAnimationFrame(() => { fondo.classList.add('abierta'); h.classList.add('abierta'); });
    montar(h, cerrar);
  }

  function hojaBloqueo() {
    const motivos = (negocioActual.configTurnos && negocioActual.configTurnos.motivos) || [];
    const profs = profesionales();
    let dur = 30, prof = profs.length > 1 ? profs[0].nombre : '', motivo = '';
    hoja(`<h2>Bloquear un horario</h2><p class="sub">Usalo para un turno que ya tenés agendado por otro medio (teléfono, en persona…): el asistente nunca lo va a ofrecer.</p>
      <div class="an-form"><div class="tn-dos"><div><label for="bq-f">Fecha</label><input id="bq-f" type="date" min="${hoyStr()}" value="${hoyStr()}"></div><div><label for="bq-h">Hora</label><input id="bq-h" type="time"></div></div>
        ${profs.length > 1 ? `<label>Profesional</label><div class="an-chips">${profs.map((p) => `<button type="button" class="an-chip ${p.nombre === prof ? 'sel' : ''}" data-p="${esc(p.nombre)}">${esc(p.nombre)}</button>`).join('')}</div>` : ''}
        ${motivos.length ? `<label>¿Qué servicio es?</label><div class="an-chips">${motivos.map((m) => `<button type="button" class="an-chip" data-m="${esc(m.nombre)}" data-d="${m.duracionMinutos}">${esc(m.nombre)} · ${m.duracionMinutos} min</button>`).join('')}</div>` : ''}
        <label>Duración</label><div class="an-chips" id="bq-durs">${[15, 30, 45, 60, 90, 120].map((d) => `<button type="button" class="an-chip ${d === dur ? 'sel' : ''}" data-dur="${d}">${d} min</button>`).join('')}</div>
        <label for="bq-n">Nombre del cliente</label><input id="bq-n" type="text" maxlength="60" placeholder="Quién va a venir">
        <label for="bq-nota">Nota (opcional)</label><input id="bq-nota" type="text" maxlength="80" placeholder="Ej: Feriado, inventario">
        <div id="bq-msg"></div><button type="button" class="aj-btn aj-btn-primario aj-btn-ancho" id="bq-ok" style="margin-top:12px">Bloquear horario</button></div>`, (h, cerrar) => {
      h.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => { prof = b.dataset.p; h.querySelectorAll('[data-p]').forEach((x) => x.classList.toggle('sel', x === b)); }));
      h.querySelectorAll('[data-dur]').forEach((b) => b.addEventListener('click', () => { dur = Number(b.dataset.dur); h.querySelectorAll('[data-dur]').forEach((x) => x.classList.toggle('sel', x === b)); }));
      h.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => {
        const ya = b.classList.contains('sel'); h.querySelectorAll('[data-m]').forEach((x) => x.classList.remove('sel'));
        if (ya) { motivo = ''; return; }
        b.classList.add('sel'); motivo = b.dataset.m; dur = Number(b.dataset.d); h.querySelectorAll('[data-dur]').forEach((x) => x.classList.toggle('sel', Number(x.dataset.dur) === dur));
      }));
      h.querySelector('#bq-ok').addEventListener('click', (ev) => ajConCarga(ev.currentTarget, 'Bloqueando', async () => {
        const fecha = h.querySelector('#bq-f').value, hora = h.querySelector('#bq-h').value, nombre = h.querySelector('#bq-n').value.trim(), nota = h.querySelector('#bq-nota').value.trim();
        const msg = h.querySelector('#bq-msg');
        if (!fecha || !hora || !nombre) { msg.innerHTML = ajError('Completá la fecha, la hora y el nombre.'); return; }
        try {
          const r = await fetch(`${API_URL}/turnos`, { method: 'POST', headers: headersAuth({ 'Content-Type': 'application/json' }), body: JSON.stringify({ fecha, hora, duracionMinutos: dur, motivo: motivo || nota, profesional: prof, nombreCliente: nombre }) });
          const data = await r.json();
          if (!r.ok) throw new Error(data.error || 'No se pudo bloquear el horario.');
          turnosCache = [data, ...lista()]; cerrar(); pintar(); ajToast('Horario bloqueado. El asistente ya no lo ofrece.');
        } catch (e) { msg.innerHTML = ajError(e.message); }
      }));
    });
  }

  function hojaOpciones() {
    hoja(`<h2>Más opciones</h2><p class="sub">Ajustes de tus turnos y limpieza del historial.</p>
      <button type="button" class="tn-fila-op" data-op="config"><span class="an-ico ic-azul">${ajIcono('sliders', 20)}</span><span><strong>Servicios, profesionales y reglas</strong><small>Duración de cada servicio, equipo y si aprobás cada turno.</small></span></button>
      <button type="button" class="tn-fila-op" data-op="horarios"><span class="an-ico ic-violeta">${ajIcono('clock', 20)}</span><span><strong>Horarios de atención</strong><small>Los días y horas en que se pueden reservar turnos.</small></span></button>
      <div class="tn-dia" style="margin-top:18px">Borrar turnos</div>
      ${[['dia', 'de hoy'], ['semana', 'de esta semana'], ['mes', 'de este mes']].map(([r, t]) => `<button type="button" class="tn-fila-op peligro" data-borrar-rango="${r}" data-t="${t}"><span class="an-ico ic-rojo">${ajIcono('trash', 20)}</span><span><strong>Borrar los turnos ${t}</strong><small>No se puede deshacer.</small></span></button>`).join('')}`, (h, cerrar) => {
      h.querySelector('[data-op="config"]').addEventListener('click', () => { cerrar(); setTimeout(() => { const n = document.querySelector('.app-navbar-item[data-seccion="negocio"]'); if (n) n.click(); ajAbrirFS('panel-turnos-config'); }, 200); });
      h.querySelector('[data-op="horarios"]').addEventListener('click', () => { cerrar(); setTimeout(() => { const n = document.querySelector('.app-navbar-item[data-seccion="negocio"]'); if (n) n.click(); setTimeout(() => { const b = document.getElementById('btn-abrir-edicion-negocio'); if (b) b.click(); }, 150); }, 200); });
      h.querySelectorAll('[data-borrar-rango]').forEach((b) => b.addEventListener('click', async () => {
        cerrar();
        if (!(await ajConfirmar({ titulo: `¿Borrar los turnos ${b.dataset.t}?`, texto: 'Se eliminan del panel y no se puede deshacer.', boton: 'Borrar', peligro: true, icono: 'trash' }))) return;
        try { const r = await fetch(`${API_URL}/turnos/bulk?rango=${b.dataset.borrarRango}`, { method: 'DELETE', headers: headersAuth() }); const d = await r.json(); ajToast(`Se borraron ${d.cantidad} turno(s).`); await refrescar(); }
        catch (e) { ajToast('No se pudieron borrar los turnos.', 'error'); }
      }));
    });
  }

  // ---------- Reemplazos de las funciones anteriores (misma firma, nuevo diseño) ----------
  window.renderizarTurnos = pintar;
  window.cargarFila = async function () {
    if (!raiz() || !negocioActual || negocioActual.tipoOperacion !== 'turnos') return;
    try { const r = await fetch(`${API_URL}/fila`, { headers: headersAuth(), cache: 'no-store' }); if (r.ok) fila = await r.json(); } catch (e) { /* se muestra lo que hay */ }
    pintar();
  };
  // cada 45 s se vuelve a pedir la lista completa (turnos nuevos que entraron por el chat)
  setInterval(() => { if (document.hidden || !negocioActual || negocioActual.tipoOperacion !== 'turnos') return; tick++; if (tick % 3 === 0) refrescar(); }, 15000);
})();
