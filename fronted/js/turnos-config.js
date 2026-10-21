// Servicios, profesionales y reglas de los turnos. Antes solo se podían cargar al registrarse; ahora se editan desde el panel.
(function () {
  const ID = 'panel-turnos-config';
  const TITULO = 'Servicios y equipo';
  const sub = (panel, titulo, dibujar) => ajSub(panel, titulo, () => principal(panel), TITULO, dibujar);
  const cfg = () => negocioActual.configTurnos || { motivos: [], requiereAprobacionManual: true };
  const equipo = () => negocioActual.profesionales || [];
  const guardar = async (cuerpo) => {
    const r = await ajApi('/negocios/mi-negocio', { metodo: 'PUT', cuerpo });
    if (r && r.negocio) { negocioActual.configTurnos = r.negocio.configTurnos; negocioActual.profesionales = r.negocio.profesionales; }
    if (typeof renderizarTurnos === 'function') renderizarTurnos();
  };

  function principal(panel) {
    ajHero(false);
    const c = cfg(), eq = equipo();
    panel.innerHTML = `<div class="an">
      <div class="an-card"><div class="an-cab"><span class="an-ico ic-azul">${ajIcono('calendarCheck', 20)}</span><div><strong>Cómo reservan tus clientes</strong><small>Tu asistente usa esto para ofrecer horarios libres, calcular cuánto dura cada turno y no pisar a nadie.</small></div></div></div>
      ${ajGrupo('Tu agenda', [
        ajFila({ icono: 'tag', color: 'naranja', titulo: 'Servicios y duración', desc: 'Qué ofrecés y cuánto tarda cada uno.', valor: String((c.motivos || []).length), accion: 'servicios' }),
        ajFila({ icono: 'users', color: 'violeta', titulo: 'Profesionales', desc: eq.length > 1 ? 'Cada uno tiene su propia agenda.' : 'Si sos solo vos, no hace falta cargar a nadie.', valor: eq.length ? String(eq.filter((p) => p.activo !== false).length) : '', accion: 'equipo' }),
        ajFila({ icono: 'check', color: 'verde', titulo: 'Confirmación de turnos', desc: c.requiereAprobacionManual === false ? 'Se confirman solos.' : 'Los aprobás vos uno por uno.', valor: c.requiereAprobacionManual === false ? 'Automática' : 'Manual', accion: 'reglas' }),
        ajFila({ icono: 'clock', color: 'celeste', titulo: 'Horarios de atención', desc: 'Los días y horas en que se puede reservar.', accion: 'horarios' }),
      ].join(''))}</div>`;
    ajEnlazar(panel, {
      servicios: () => subServicios(panel), equipo: () => subEquipo(panel), reglas: () => subReglas(panel),
      horarios: () => { cerrarPantallaCompleta(); const n = document.querySelector('.app-navbar-item[data-seccion="negocio"]'); if (n) n.click(); setTimeout(() => { const b = document.getElementById('btn-abrir-edicion-negocio'); if (b) b.click(); }, 200); },
    });
  }

  // ---------- Servicios ----------
  function subServicios(panel) {
    sub(panel, 'Servicios y duración', () => {
      let items = (cfg().motivos || []).map((m) => ({ nombre: m.nombre, duracionMinutos: m.duracionMinutos }));
      const dibujar = () => {
        panel.innerHTML = `<div class="an an-form"><p class="an-sub">Poné cada servicio con lo que dura. Así el asistente sabe cuánto tiempo reservar y cuántos turnos entran en el día.</p>
          <div class="an-lista" id="sv-lista">${items.map((m, i) => `<div class="an-card an-form" data-i="${i}"><div style="display:flex;gap:10px;align-items:center"><input class="sv-nombre" type="text" maxlength="60" placeholder="Ej: Corte, Corte + barba" value="${ajEsc(m.nombre)}" aria-label="Nombre del servicio" style="flex:1"><button type="button" class="aj-btn aj-btn-suave aj-btn-chico" data-del="${i}" aria-label="Quitar servicio">${ajIcono('trash', 16)}</button></div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px"><span style="font-size:.82rem;font-weight:700;color:var(--gris-texto)">Dura</span><div class="an-stepper"><button type="button" data-d="-5" data-i="${i}" aria-label="Menos tiempo">−</button><input class="sv-dur" type="number" min="5" max="480" step="5" value="${m.duracionMinutos}" data-i="${i}" aria-label="Minutos" style="width:62px"><button type="button" data-d="5" data-i="${i}" aria-label="Más tiempo">+</button></div><span style="font-size:.8rem;font-weight:700;color:var(--gris-texto)">min</span></div></div>`).join('') || '<p class="an-nota">Todavía no cargaste servicios.</p>'}</div>
          <button type="button" class="aj-btn aj-btn-suave aj-btn-ancho" id="sv-add">+ Agregar servicio</button>
          <div id="sv-msg"></div><button type="button" class="aj-btn aj-btn-primario aj-btn-ancho" id="sv-ok" style="margin-top:6px">Guardar servicios</button></div>`;
        panel.querySelectorAll('.sv-nombre').forEach((inp) => inp.addEventListener('input', () => { items[Number(inp.closest('[data-i]').dataset.i)].nombre = inp.value; }));
        panel.querySelectorAll('.sv-dur').forEach((inp) => inp.addEventListener('change', () => { items[Number(inp.dataset.i)].duracionMinutos = Math.min(480, Math.max(5, Number(inp.value) || 30)); inp.value = items[Number(inp.dataset.i)].duracionMinutos; }));
        panel.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => { const m = items[Number(b.dataset.i)]; m.duracionMinutos = Math.min(480, Math.max(5, m.duracionMinutos + Number(b.dataset.d))); b.parentElement.querySelector('input').value = m.duracionMinutos; }));
        panel.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { items.splice(Number(b.dataset.del), 1); dibujar(); }));
        document.getElementById('sv-add').addEventListener('click', () => { items.push({ nombre: '', duracionMinutos: 30 }); dibujar(); const ins = panel.querySelectorAll('.sv-nombre'); if (ins.length) ins[ins.length - 1].focus(); });
        document.getElementById('sv-ok').addEventListener('click', (ev) => ajConCarga(ev.currentTarget, 'Guardando', async () => {
          const limpios = items.filter((m) => m.nombre.trim());
          if (!limpios.length) { document.getElementById('sv-msg').innerHTML = ajError('Cargá al menos un servicio con su nombre.'); return; }
          try { await guardar({ configTurnos: { motivos: limpios } }); ajToast('Servicios guardados. El asistente ya los usa.'); if (!ajVolver()) cerrarPantallaCompleta(); }
          catch (e) { document.getElementById('sv-msg').innerHTML = ajError(e.message); }
        }));
      };
      dibujar();
    });
  }

  // ---------- Equipo ----------
  function subEquipo(panel) {
    sub(panel, 'Profesionales', () => {
      let items = equipo().map((p) => ({ nombre: p.nombre, activo: p.activo !== false }));
      const dibujar = () => {
        panel.innerHTML = `<div class="an an-form"><p class="an-sub">Si tenés más de una persona atendiendo, cada una tiene su agenda y el cliente elige con quién. Si un profesional no está, pausalo y deja de recibir turnos.</p>
          <div class="an-lista">${items.map((p, i) => `<div class="an-card" data-i="${i}"><div style="display:flex;gap:10px;align-items:center"><input class="eq-nombre" type="text" maxlength="40" placeholder="Nombre" value="${ajEsc(p.nombre)}" aria-label="Nombre del profesional" style="flex:1"><button type="button" class="aj-btn aj-btn-suave aj-btn-chico" data-del="${i}" aria-label="Quitar">${ajIcono('trash', 16)}</button></div>
            <label class="list-row aj-fila-switch" style="padding:10px 0 0;border:0;background:none"><span class="list-row-texto"><strong style="font-size:.86rem">Recibe turnos</strong><span>${p.activo ? 'Activo' : 'En pausa'}</span></span>${ajSwitch('eq-' + i, p.activo)}</label></div>`).join('') || '<p class="an-nota">No cargaste profesionales: se agenda como un solo equipo.</p>'}</div>
          <button type="button" class="aj-btn aj-btn-suave aj-btn-ancho" id="eq-add">+ Agregar profesional</button>
          <p class="an-nota">Si cambiás un nombre, los turnos que ya están agendados conservan el nombre anterior.</p>
          <div id="eq-msg"></div><button type="button" class="aj-btn aj-btn-primario aj-btn-ancho" id="eq-ok">Guardar equipo</button></div>`;
        panel.querySelectorAll('.eq-nombre').forEach((inp) => inp.addEventListener('input', () => { items[Number(inp.closest('[data-i]').dataset.i)].nombre = inp.value; }));
        items.forEach((p, i) => { const sw = panel.querySelector(`[data-k="eq-${i}"]`); if (sw) sw.addEventListener('change', () => { p.activo = sw.checked; const t = sw.closest('label').querySelector('.list-row-texto span'); if (t) t.textContent = p.activo ? 'Activo' : 'En pausa'; }); });
        panel.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { items.splice(Number(b.dataset.del), 1); dibujar(); }));
        document.getElementById('eq-add').addEventListener('click', () => { items.push({ nombre: '', activo: true }); dibujar(); const ins = panel.querySelectorAll('.eq-nombre'); if (ins.length) ins[ins.length - 1].focus(); });
        document.getElementById('eq-ok').addEventListener('click', (ev) => ajConCarga(ev.currentTarget, 'Guardando', async () => {
          try { await guardar({ profesionales: items.filter((p) => p.nombre.trim()) }); ajToast('Equipo guardado.'); if (!ajVolver()) cerrarPantallaCompleta(); }
          catch (e) { document.getElementById('eq-msg').innerHTML = ajError(e.message); }
        }));
      };
      dibujar();
    });
  }

  // ---------- Reglas ----------
  function subReglas(panel) {
    sub(panel, 'Confirmación de turnos', () => {
      let manual = cfg().requiereAprobacionManual !== false;
      panel.innerHTML = `<div class="an"><div class="an-card"><div class="an-chips" style="flex-direction:column;gap:10px">
        <button type="button" class="tn-fila-op ${manual ? '' : ''}" data-m="1" style="margin:0;border:2px solid ${manual ? 'var(--azul)' : 'var(--linea)'}"><span class="an-ico ic-azul">${ajIcono('check', 20)}</span><span><strong>Los apruebo yo</strong><small>Cada turno queda "por confirmar" hasta que lo aprobés. Ideal si querés controlar tu agenda.</small></span></button>
        <button type="button" class="tn-fila-op" data-m="0" style="margin:0;border:2px solid ${manual ? 'var(--linea)' : 'var(--azul)'}"><span class="an-ico ic-verde">${ajIcono('zap', 20)}</span><span><strong>Se confirman solos</strong><small>Apenas el cliente reserva, el turno queda confirmado. Menos trabajo para vos.</small></span></button></div></div>
        <div id="rg-msg"></div><button type="button" class="aj-btn aj-btn-primario aj-btn-ancho" id="rg-ok">Guardar</button></div>`;
      panel.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => { manual = b.dataset.m === '1'; panel.querySelectorAll('[data-m]').forEach((x) => { x.style.borderColor = x === b ? 'var(--azul)' : 'var(--linea)'; }); }));
      document.getElementById('rg-ok').addEventListener('click', (ev) => ajConCarga(ev.currentTarget, 'Guardando', async () => {
        try { await guardar({ configTurnos: { requiereAprobacionManual: manual } }); ajToast('Guardado.'); if (!ajVolver()) cerrarPantallaCompleta(); }
        catch (e) { document.getElementById('rg-msg').innerHTML = ajError(e.message); }
      }));
    });
  }

  anRegistrar(ID, principal);
})();
