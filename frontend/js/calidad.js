// Control de calidad del asistente: revisión periódica de las conversaciones, casos para revisar y atajos para corregir.
(function () {
  const ID = 'panel-calidad';
  const TITULO = 'Calidad del asistente';
  const TIPO = { incorrecta: ['rojo', 'Respuesta incorrecta'], sin_respuesta: ['naranja', 'Sin respuesta'], recurrente: ['violeta', 'Se repite'], reporte: ['azul', 'Reporte de un cliente'], mejora: ['azul', 'Para mejorar'] };
  const SEV = { alta: 'Importante', media: 'Moderado', baja: 'Menor' };
  let d = null;
  const sub = (panel, titulo, dibujar) => ajSub(panel, titulo, () => principal(panel), TITULO, dibujar);
  const colorScore = (n) => (n >= 85 ? '#3fd08a' : n >= 65 ? '#f5b83d' : '#ff7a85');
  const etiquetaScore = (n) => (n >= 85 ? 'Muy bien' : n >= 65 ? 'Bien, con detalles' : n >= 40 ? 'Para mejorar' : 'Necesita atención');

  function anillo(n) {
    const C = 2 * Math.PI * 38, v = Math.max(0, Math.min(100, n));
    return `<div class="an-ring"><svg viewBox="0 0 92 92"><circle cx="46" cy="46" r="38" fill="none" stroke="#ffffff22" stroke-width="9"/><circle cx="46" cy="46" r="38" fill="none" stroke="${colorScore(n)}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - v / 100)).toFixed(1)}" style="transition:stroke-dashoffset .8s ease"/></svg><b>${v}</b></div>`;
  }
  const tarjetaCaso = (c) => `<button type="button" class="an-caso ${c.severidad}" data-caso="${c.id}">
    <div class="an-caso-top"><span class="an-tag ${TIPO[c.tipo][0]}">${TIPO[c.tipo][1]}</span><span class="an-tag gris">${SEV[c.severidad]}</span>${c.veces > 1 ? `<span class="an-tag violeta">${c.veces} veces</span>` : ''}</div>
    <strong>${ajEsc(c.titulo)}</strong>${c.detalle ? `<p>${ajEsc(c.detalle.length > 130 ? c.detalle.slice(0, 129) + '…' : c.detalle)}</p>` : ''}
    <small style="display:block;margin-top:8px;font-size:.72rem;font-weight:700;color:var(--gris-texto)">${AN_HACE(c.fecha)}</small></button>`;

  async function evaluar(btn, panel) {
    await ajConCarga(btn, 'Revisando conversaciones', async () => {
      try {
        const r = await ajApi('/calidad/evaluar', { metodo: 'POST' });
        ajToast(r.conversaciones ? (r.casosNuevos ? `Encontramos ${r.casosNuevos} ${r.casosNuevos === 1 ? 'tema nuevo' : 'temas nuevos'} para revisar.` : 'Todo se ve bien en las conversaciones.') : 'Todavía no hay conversaciones para revisar.');
        principal(panel);
      } catch (e) { ajToast(e.message, 'error'); }
    });
  }

  // ---------- Pantalla principal ----------
  async function principal(panel) {
    ajHero(false);
    panel.innerHTML = ajEsqueleto(4);
    try { d = await ajApi('/calidad'); } catch (e) { return ajFalloCarga(panel, () => principal(panel)); }
    const u = d.ultima;
    let delta = null;
    if (d.historial.length >= 2) delta = d.historial[d.historial.length - 1].puntaje - d.historial[d.historial.length - 2].puntaje;
    const top = d.casos.slice(0, 3);

    panel.innerHTML = `<div class="an">
      ${u ? `<div class="an-hero"><div class="an-score">${anillo(u.puntaje)}<div><strong>${etiquetaScore(u.puntaje)}</strong><p>${ajEsc(u.resumen || '')}</p></div></div>
        <div class="an-hero-linea">Revisamos <b>${u.conversaciones}</b> ${u.conversaciones === 1 ? 'conversación' : 'conversaciones'} · ${AN_HACE(u.fecha)}${delta ? ` · <span class="an-pill ${delta > 0 ? 'ok' : 'mal'}">${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)} pts</span>` : ''}${u.conIA ? '' : '<br><span style="opacity:.8">Revisión básica (sin análisis con IA).</span>'}</div></div>`
        : anVacio({ icono: 'sparkles', titulo: 'Todavía no revisamos tu asistente', texto: d.conversacionesSemana ? `Tuviste ${d.conversacionesSemana} ${d.conversacionesSemana === 1 ? 'conversación' : 'conversaciones'} esta semana. Revisémoslas para detectar respuestas incorrectas y preguntas que no supo resolver.` : 'Cuando tus clientes empiecen a escribirle, vamos a revisar las conversaciones para detectar respuestas incorrectas y preguntas sin resolver.' })}
      <button type="button" class="aj-btn aj-btn-primario aj-btn-ancho" id="cal-eval">${u ? 'Revisar ahora' : 'Hacer la primera revisión'}</button>
      ${u ? `<div class="an-kpis"><div class="an-kpi ${d.conteos.nuevo ? 'naranja' : ''}"><b>${d.conteos.nuevo}</b><small>Para revisar</small></div><div class="an-kpi verde"><b>${d.conteos.resuelto}</b><small>Resueltos</small></div><div class="an-kpi"><b>${d.conteos.ignorado}</b><small>Ignorados</small></div></div>` : ''}
      ${top.length ? `<h3 class="an-t">Lo primero para mirar</h3><div class="an-lista">${top.map(tarjetaCaso).join('')}</div>` : (u ? `<div class="an-hero-ok hub-ok" style="margin-top:2px">${ajIcono('check', 20)}<span>No tenés casos pendientes. ¡Tu asistente está respondiendo bien!</span></div>` : '')}
      ${ajGrupo('Revisá y corregí', [
        ajFila({ icono: 'alert', color: d.conteos.nuevo ? 'naranja' : 'verde', titulo: 'Casos para revisar', desc: 'Respuestas dudosas y temas que se repiten.', valor: d.conteos.nuevo ? String(d.conteos.nuevo) : '', accion: 'casos' }),
        ajFila({ icono: 'help', color: 'violeta', titulo: 'Preguntas sin responder', desc: 'Lo que el asistente no supo. Respondelo una vez.', valor: d.preguntasSinResponder ? String(d.preguntasSinResponder) : '', accion: 'preguntas' }),
        ajFila({ icono: 'check', color: 'verde', titulo: 'Casos resueltos e ignorados', desc: 'Lo que ya revisaste.', accion: 'archivo' }),
      ].join(''))}
      ${ajGrupo('Configuración', ajFila({ icono: 'sliders', color: 'gris', titulo: 'Cómo funciona la revisión', desc: d.config.auto && d.config.frecuencia !== 'manual' ? `Automática · ${d.config.frecuencia === 'diaria' ? 'cada día' : 'cada semana'}` : 'Solo cuando vos la pedís', accion: 'config' }))}</div>`;
    document.getElementById('cal-eval').addEventListener('click', (e) => evaluar(e.currentTarget, panel));
    panel.querySelectorAll('[data-caso]').forEach((b) => b.addEventListener('click', () => subCaso(panel, d.casos.find((c) => c.id === b.dataset.caso))));
    ajEnlazar(panel, { casos: () => subCasos(panel), preguntas: () => subPreguntas(panel), archivo: () => subArchivo(panel), config: () => subConfig(panel) });
  }

  // ---------- Lista de casos ----------
  function subCasos(panel) {
    sub(panel, 'Casos para revisar', () => {
      panel.innerHTML = `<div class="an">${d.casos.length ? `<p class="an-sub">Ordenados de más a menos importante. Tocá uno para ver la conversación y corregirlo.</p><div class="an-lista">${d.casos.map(tarjetaCaso).join('')}</div>` : anVacio({ icono: 'check', titulo: 'No hay casos para revisar', texto: 'Cuando la revisión encuentre algo para corregir, va a aparecer acá.' })}</div>`;
      panel.querySelectorAll('[data-caso]').forEach((b) => b.addEventListener('click', () => subCaso(panel, d.casos.find((c) => c.id === b.dataset.caso), () => subCasos(panel))));
    });
  }

  // ---------- Detalle de un caso + atajo para corregirlo ----------
  const irAFila = (id) => { cerrarPantallaCompleta(); setTimeout(() => ajAbrirFS(id), 120); };
  const irANegocio = () => { cerrarPantallaCompleta(); const nav = document.querySelector('.app-navbar-item[data-seccion="negocio"]'); if (nav) nav.click(); setTimeout(() => { const b = document.getElementById('btn-abrir-edicion-negocio'); if (b) b.click(); }, 200); };
  function irAProducto(nombre) {
    cerrarPantallaCompleta(); setTimeout(() => ajAbrirFS('panel-productos'), 120);
    setTimeout(() => { const q = String(nombre || '').toLowerCase(); const card = [...document.querySelectorAll('#lista-productos .btn-editar-producto')].find((b) => { const c = b.closest('div[class*="producto"]') || b.parentElement; return q && c && c.textContent.toLowerCase().includes(q); }); if (card) card.click(); }, 900);
  }

  function subCaso(panel, c, volverA) {
    if (!c) return;
    ajSub(panel, 'Revisar caso', volverA || (() => principal(panel)), volverA ? 'Casos para revisar' : TITULO, () => {
      const a = c.atajo || {};
      let atajoHtml = '';
      if (a.tipo === 'faq') {
        atajoHtml = `<h3 class="an-t">Cómo corregirlo</h3><div class="an-card an-form"><label for="cal-resp">Respuesta que va a dar tu asistente</label>
          <p class="an-nota" style="margin:0">Pregunta: <b>“${ajEsc(a.pregunta || c.mensajeCliente || c.titulo)}”</b></p>
          <textarea id="cal-resp" rows="5" maxlength="1200" placeholder="Escribí la respuesta correcta…">${ajEsc(a.respuestaSugerida || '')}</textarea>
          ${a.respuestaSugerida ? '<p class="an-nota">Es un borrador armado con los datos de tu negocio. Revisalo antes de guardar.</p>' : '<p class="an-nota">Escribila una vez y el asistente la va a usar con todos tus clientes.</p>'}
          <div id="cal-msg"></div><button type="button" class="aj-btn aj-btn-primario aj-btn-ancho" id="cal-faq">Guardar respuesta</button></div>`;
      } else if (a.tipo === 'producto') {
        atajoHtml = `<h3 class="an-t">Cómo corregirlo</h3><div class="an-card"><p class="an-nota" style="margin:0 0 10px">Revisá el precio, la descripción y la disponibilidad${a.producto ? ` de <b>${ajEsc(a.producto)}</b>` : ''}.</p><button type="button" class="aj-btn aj-btn-primario aj-btn-ancho" id="cal-ir">Abrir el producto</button></div>`;
      } else if (a.tipo === 'horarios' || a.tipo === 'info') {
        atajoHtml = `<h3 class="an-t">Cómo corregirlo</h3><div class="an-card"><p class="an-nota" style="margin:0 0 10px">${a.tipo === 'horarios' ? 'Revisá los horarios de atención.' : 'Revisá los datos de tu negocio (dirección, medios de pago, detalles).'}</p><button type="button" class="aj-btn aj-btn-primario aj-btn-ancho" id="cal-ir">Abrir información del negocio</button></div>`;
      } else if (a.tipo === 'instrucciones') {
        atajoHtml = `<h3 class="an-t">Cómo corregirlo</h3><div class="an-card"><p class="an-nota" style="margin:0 0 10px">Ajustá cómo se comporta tu asistente con tus clientes.</p><button type="button" class="aj-btn aj-btn-primario aj-btn-ancho" id="cal-ir">Abrir vendedor y memoria</button></div>`;
      }
      panel.innerHTML = `<div class="an">
        <div><div class="an-caso-top"><span class="an-tag ${TIPO[c.tipo][0]}">${TIPO[c.tipo][1]}</span><span class="an-tag gris">${SEV[c.severidad]}</span>${c.veces > 1 ? `<span class="an-tag violeta">${c.veces} veces</span>` : ''}</div>
          <h2 style="margin:6px 0 0;font-size:1.12rem;font-weight:800;letter-spacing:-.02em;color:var(--azul-oscuro);line-height:1.3">${ajEsc(c.titulo)}</h2>
          ${c.detalle ? `<p class="an-sub" style="margin:8px 0 0">${ajEsc(c.detalle)}</p>` : ''}</div>
        ${c.mensajeCliente || c.respuestaAsistente ? `<h3 class="an-t">Qué pasó</h3><div class="an-dialogo">
          ${c.mensajeCliente ? `<div class="an-burb cli"><small>Cliente</small>${ajEsc(c.mensajeCliente)}</div>` : ''}
          ${c.respuestaAsistente ? `<div class="an-burb asi ${c.tipo === 'incorrecta' || c.tipo === 'reporte' ? 'mal' : ''}"><small>Tu asistente</small>${ajEsc(c.respuestaAsistente)}</div>` : ''}</div>` : ''}
        ${atajoHtml}
        <div class="an-accion-pie"><button type="button" class="aj-btn aj-btn-suave aj-btn-ancho" id="cal-res">Ya lo resolví</button><button type="button" class="aj-btn aj-btn-suave aj-btn-ancho" id="cal-ign" style="color:var(--gris-texto)">Ignorar este caso</button></div></div>`;
      const cambiar = (estado, msg) => async (ev) => { await ajConCarga(ev.currentTarget, 'Guardando', async () => { try { await ajApi(`/calidad/casos/${c.id}`, { metodo: 'PUT', cuerpo: { estado } }); ajToast(msg); ajVolver(); } catch (e) { ajToast(e.message, 'error'); } }); };
      document.getElementById('cal-res').addEventListener('click', cambiar('resuelto', 'Caso marcado como resuelto.'));
      document.getElementById('cal-ign').addEventListener('click', cambiar('ignorado', 'Caso ignorado.'));
      const faq = document.getElementById('cal-faq');
      if (faq) faq.addEventListener('click', (ev) => ajConCarga(ev.currentTarget, 'Guardando', async () => {
        try { await ajApi(`/calidad/casos/${c.id}/faq`, { metodo: 'POST', cuerpo: { respuesta: document.getElementById('cal-resp').value } }); ajToast('Listo: tu asistente ya sabe responderlo.'); ajVolver(); }
        catch (e) { document.getElementById('cal-msg').innerHTML = ajError(e.message); }
      }));
      const ir = document.getElementById('cal-ir');
      if (ir) ir.addEventListener('click', () => (a.tipo === 'producto' ? irAProducto(a.producto) : a.tipo === 'instrucciones' ? irAFila('panel-vendedor-memoria') : irANegocio()));
    });
  }

  // ---------- Preguntas sin responder (antes era una función aparte) ----------
  function subPreguntas(panel) {
    sub(panel, 'Preguntas sin responder', () => {
      panel.innerHTML = `<div class="an"><p class="an-sub">Cuando un cliente pregunta algo que el asistente no sabe, aparece acá. Escribí la respuesta una vez y el asistente ya la sabe para la próxima. Si no te sirve la pregunta, podés quitarla.</p><div id="lista-preguntas-frecuentes"><p class="ayuda">Cargando...</p></div></div>`;
      if (typeof cargarPreguntasFrecuentes === 'function') cargarPreguntasFrecuentes();
    });
  }

  // ---------- Casos resueltos / ignorados ----------
  function subArchivo(panel, estado = 'resuelto') {
    sub(panel, 'Casos revisados', async () => {
      panel.innerHTML = ajEsqueleto(3);
      try {
        const lista = await ajApi(`/calidad/casos?estado=${estado}`);
        panel.innerHTML = `<div class="an">${anSeg([['resuelto', `Resueltos (${d.conteos.resuelto})`], ['ignorado', `Ignorados (${d.conteos.ignorado})`]], estado, 'est')}
          ${lista.length ? `<div class="an-lista">${lista.map((c) => `<div class="an-card"><div class="an-caso-top"><span class="an-tag ${TIPO[c.tipo][0]}">${TIPO[c.tipo][1]}</span></div><strong style="font-size:.9rem;color:var(--azul-oscuro)">${ajEsc(c.titulo)}</strong><div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px"><small style="color:var(--gris-texto);font-weight:700">${AN_HACE(c.fecha)}</small><button type="button" class="aj-btn aj-btn-suave aj-btn-chico" data-reabrir="${c.id}">Volver a revisar</button></div></div>`).join('')}</div>` : anVacio({ icono: 'check', titulo: 'No hay casos acá', texto: estado === 'resuelto' ? 'Los casos que marques como resueltos van a quedar guardados acá.' : 'Los casos que ignores van a quedar guardados acá.' })}</div>`;
        panel.querySelectorAll('[data-est]').forEach((b) => b.addEventListener('click', () => { AJ.pila.pop(); subArchivo(panel, b.dataset.est); }));
        panel.querySelectorAll('[data-reabrir]').forEach((b) => b.addEventListener('click', async () => { try { await ajApi(`/calidad/casos/${b.dataset.reabrir}`, { metodo: 'PUT', cuerpo: { estado: 'nuevo' } }); ajToast('El caso volvió a la lista.'); d = await ajApi('/calidad'); AJ.pila.pop(); subArchivo(panel, estado); } catch (e) { ajToast(e.message, 'error'); } }));
      } catch (e) { ajFalloCarga(panel, () => subArchivo(panel, estado)); }
    });
  }

  // ---------- Cómo funciona / configuración ----------
  function subConfig(panel) {
    sub(panel, 'Cómo funciona la revisión', () => {
      let freq = d.config.auto ? d.config.frecuencia : 'manual';
      panel.innerHTML = `<div class="an">
        <div class="an-card"><div class="an-pasos">
          <div><b>1</b><span>Leemos las conversaciones recientes de tu asistente con tus clientes.</span></div>
          <div><b>2</b><span>Buscamos <strong>respuestas incorrectas</strong>, <strong>preguntas sin resolver</strong> y <strong>dudas que se repiten</strong>, comparando con los datos reales de tu negocio.</span></div>
          <div><b>3</b><span>Te mostramos cada caso con la conversación y un <strong>atajo para corregirlo</strong>.</span></div></div></div>
        <div class="an-card an-form"><label>¿Cada cuánto querés que se revise?</label>${anSeg([['diaria', 'Cada día'], ['semanal', 'Cada semana'], ['manual', 'Solo si lo pido']], freq, 'frec')}
          <p class="an-nota">Solo se revisa si hubo conversaciones nuevas. Antes de analizarlas se ocultan teléfonos y correos de tus clientes.</p>
          <div id="cc-msg"></div><button type="button" class="aj-btn aj-btn-primario aj-btn-ancho" id="cc-ok" style="margin-top:8px">Guardar</button></div></div>`;
      panel.querySelectorAll('[data-frec]').forEach((b) => b.addEventListener('click', () => { freq = b.dataset.frec; panel.querySelectorAll('[data-frec]').forEach((x) => x.classList.toggle('sel', x === b)); }));
      document.getElementById('cc-ok').addEventListener('click', (ev) => ajConCarga(ev.currentTarget, 'Guardando', async () => {
        try { await ajApi('/operacion', { metodo: 'PUT', cuerpo: { calidad: { auto: freq !== 'manual', frecuencia: freq } } }); ajToast('Guardado.'); if (!ajVolver()) cerrarPantallaCompleta(); }
        catch (e) { document.getElementById('cc-msg').innerHTML = ajError(e.message); }
      }));
    });
  }

  anRegistrar(ID, principal);
})();
