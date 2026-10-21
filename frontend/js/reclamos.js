// Cambios, devoluciones y reclamos. Los clientes los hacen en Mi Zona; acá el dueño los ve (con fotos), decide si los acepta o no
// y responde con un mensaje que le llega a la persona en Mi Zona. La función solo aparece si el negocio ya está en Mi Zona con esta misma cuenta.
(function () {
  const ID = 'panel-reclamos';
  const TITULO = 'Cambios y reclamos';
  const TIPO = { reclamo: ['alert', 'rojo', 'Reclamo'], devolucion: ['history', 'naranja', 'Devolución'], cambio: ['package', 'azul', 'Cambio'] };
  const MOTIVO = { mal_estado: 'Producto en mal estado', no_llego: 'No llegó el pedido', incorrecto: 'Producto equivocado', calidad: 'Mala calidad', demora: 'Demora en la entrega', atencion: 'Mala atención', otro: 'Otro motivo' };
  const ESTADO = { nuevo: ['rojo', 'Nuevo'], en_revision: ['naranja', 'En revisión'], aceptado: ['verde', 'Aceptado'], rechazado: ['gris', 'Rechazado'] };
  const SOLUCION = { reembolso: 'Devolver el dinero', cambio: 'Cambio del producto', reposicion: 'Reponer en el próximo pedido', compensacion: 'Compensación o descuento', ninguna: '' };
  const PLANTILLAS = {
    aceptado: ['Lamentamos lo que pasó. Te devolvemos el dinero por el mismo medio de pago que usaste.', 'Tenés razón, disculpá el inconveniente. Te hacemos el cambio sin costo, escribinos para coordinarlo.', 'Gracias por avisarnos. Te vamos a reponer el producto en tu próximo pedido.'],
    rechazado: ['Revisamos tu caso y el producto salió en buenas condiciones, por eso no podemos aceptar el reclamo. Si tenés más datos o fotos, contanos.', 'Lamentamos la experiencia, pero este tipo de producto no admite devoluciones una vez entregado.'],
  };
  let grupo = 'abiertos', lista = null;
  const sub = (panel, titulo, volver, dibujar) => ajSub(panel, titulo, volver, TITULO, dibujar);

  // ---------- Estado general: ¿aparece la función? + cuántos hay para responder ----------
  async function estado() {
    try {
      const e = await ajApi('/reclamos/estado');
      window.__reclamosDisponible = !!e.disponible;
      const fila = document.getElementById('fila-reclamos'); if (fila) fila.style.display = e.disponible ? '' : 'none';
      const n = document.getElementById('reclamos-n'); if (n) { n.textContent = e.nuevos; n.style.display = e.nuevos ? '' : 'none'; }
      return e;
    } catch (err) { return { disponible: false, nuevos: 0 }; }
  }
  window.Reclamos = { estado };

  const tarjeta = (r) => `<button type="button" class="an-rec ${r.leido ? '' : 'nuevo'}" data-rec="${r.id}">
    ${r.leido ? '' : '<span class="an-rec-punto" aria-label="Sin leer"></span>'}
    <div class="an-caso-top"><span class="an-tag ${TIPO[r.tipo][1]}">${TIPO[r.tipo][2]}</span><span class="an-tag ${ESTADO[r.estado][0]}">${ESTADO[r.estado][1]}</span></div>
    <strong>${ajEsc(r.producto || MOTIVO[r.motivo])}</strong><p>${ajEsc(r.resumen)}${r.resumen.length >= 120 ? '…' : ''}</p>
    <div class="an-rec-pie"><span>@${ajEsc(r.cliente)}</span><span>·</span><span>${AN_HACE(r.fecha)}</span>${r.cantFotos ? `<span>·</span><span style="display:inline-flex;align-items:center;gap:3px">${ajIcono('image', 13)} ${r.cantFotos}</span>` : ''}</div></button>`;

  // ---------- Pantalla principal ----------
  async function principal(panel) {
    ajHero(false);
    panel.innerHTML = ajEsqueleto(4);
    try { lista = await ajApi(`/reclamos?grupo=${grupo}`); } catch (e) { return ajFalloCarga(panel, () => principal(panel)); }
    if (!lista.disponible) { panel.innerHTML = `<div class="an">${anVacio({ icono: 'message', titulo: 'Disponible cuando estés en Mi Zona', texto: 'Esta función se activa cuando tu negocio está publicado en Mi Zona con esta misma cuenta. Ahí tus clientes pueden hacerte reclamos y devoluciones.' })}</div>`; return; }
    const c = lista.conteos;
    panel.innerHTML = `<div class="an">
      <div class="an-card"><div class="an-cab"><span class="an-ico ic-azul">${ajIcono('message', 20)}</span><div><strong>Lo que te escriben tus clientes</strong><small>Llegan desde Mi Zona. Vos decidís si los aceptás y le respondés a la persona.</small></div></div></div>
      <div class="an-kpis"><div class="an-kpi ${c.abiertos ? 'rojo' : ''}"><b>${c.abiertos}</b><small>Para responder</small></div><div class="an-kpi verde"><b>${c.resueltos}</b><small>Resueltos</small></div><div class="an-kpi ${c.sinLeer ? 'naranja' : ''}"><b>${c.sinLeer}</b><small>Sin leer</small></div></div>
      ${anSeg([['abiertos', 'Para responder', c.abiertos || ''], ['resueltos', 'Resueltos']], grupo, 'grupo')}
      ${lista.reclamos.length ? `<div class="an-lista">${lista.reclamos.map(tarjeta).join('')}</div>` : anVacio({ icono: grupo === 'abiertos' ? 'check' : 'history', titulo: grupo === 'abiertos' ? 'No tenés reclamos pendientes' : 'Todavía no resolviste ninguno', texto: grupo === 'abiertos' ? 'Cuando un cliente te haga un reclamo, una devolución o un cambio desde Mi Zona, te llega un aviso y aparece acá.' : 'Los reclamos que respondas van a quedar guardados acá.' })}</div>`;
    panel.querySelectorAll('[data-grupo]').forEach((b) => b.addEventListener('click', () => { grupo = b.dataset.grupo; principal(panel); }));
    panel.querySelectorAll('[data-rec]').forEach((b) => b.addEventListener('click', () => detalle(panel, b.dataset.rec)));
  }

  // ---------- Detalle y decisión ----------
  function detalle(panel, id) {
    sub(panel, 'Reclamo', () => principal(panel), async () => {
      panel.innerHTML = ajEsqueleto(4);
      let r;
      try { r = await ajApi(`/reclamos/${id}`); } catch (e) { return ajFalloCarga(panel, () => detalle(panel, id)); }
      estado(); // el contador baja al leerlo
      dibujarDetalle(panel, r);
    });
  }

  function dibujarDetalle(panel, r) {
    const cerrado = r.estado === 'aceptado' || r.estado === 'rechazado';
    const t = TIPO[r.tipo];
    panel.innerHTML = `<div class="an">
      <div class="an-card"><div class="an-cab"><span class="an-ico ic-${t[1]}">${ajIcono(t[0], 20)}</span><div><strong>${t[2]}: ${ajEsc(MOTIVO[r.motivo])}</strong><small>@${ajEsc(r.cliente)} · ${AN_HACE(r.fecha)}</small></div><span class="an-tag ${ESTADO[r.estado][0]}" style="margin-left:auto">${ESTADO[r.estado][1]}</span></div>
        <div class="an-datos" style="margin-top:14px">
          ${r.producto ? `<div><small>Producto</small><b>${ajEsc(r.producto)}</b></div>` : ''}${r.pedidoRef ? `<div><small>Pedido</small><b>${ajEsc(r.pedidoRef)}</b></div>` : ''}${r.monto !== null ? `<div><small>Pagó</small><b>${AN_$(r.monto)}</b></div>` : ''}${r.esComida ? '<div><small>Tipo</small><b>Comida</b></div>' : ''}</div></div>
      <div><h3 class="an-t">Lo que cuenta el cliente</h3><div class="an-card" style="margin-top:8px"><p style="margin:0;font-size:.9rem;line-height:1.55;color:var(--azul-oscuro);white-space:pre-wrap">${ajEsc(r.descripcion)}</p></div></div>
      ${r.fotos && r.fotos.length ? `<div><h3 class="an-t">Fotos que adjuntó (${r.fotos.length})</h3><div class="an-fotos" style="margin-top:8px">${r.fotos.map((u) => `<button type="button" data-foto="${ajEsc(u)}" aria-label="Ver foto"><img src="${ajEsc(u)}" alt="Foto del reclamo" loading="lazy"></button>`).join('')}</div></div>` : ''}
      ${cerrado ? `<div><h3 class="an-t">Tu respuesta</h3><div class="an-respuesta ${r.estado === 'aceptado' ? 'si' : 'no'}" style="margin-top:8px"><strong>${r.estado === 'aceptado' ? 'Aceptaste el reclamo' : 'Rechazaste el reclamo'}${r.decision.solucion && SOLUCION[r.decision.solucion] ? ' · ' + SOLUCION[r.decision.solucion] : ''}</strong><p>${ajEsc(r.decision.mensaje)}</p><small style="display:block;margin-top:8px;font-size:.74rem;font-weight:700;color:var(--gris-texto)">${r.decision.fecha ? AN_HACE(r.decision.fecha) : ''} · ${r.avisadoAlCliente ? 'El cliente ya la recibió en Mi Zona.' : 'El cliente la va a ver en Mi Zona.'}</small></div></div>`
        : `<div><h3 class="an-t">¿Qué decidís?</h3><p class="an-sub" style="margin-top:6px">Tenés que explicarle al cliente tu decisión: tu mensaje le llega a Mi Zona.</p>
          <div class="an-decide" style="margin-top:10px"><button type="button" class="si" data-res="aceptado"><span>${ajIcono('check', 20)}</span>Aceptar</button><button type="button" class="no" data-res="rechazado"><span>${ajIcono('x', 20)}</span>Rechazar</button></div>
          <div id="rec-form"></div></div>`}</div>`;
    panel.querySelectorAll('[data-foto]').forEach((b) => b.addEventListener('click', () => anVerFoto(b.dataset.foto)));
    panel.querySelectorAll('[data-res]').forEach((b) => b.addEventListener('click', () => {
      panel.querySelectorAll('[data-res]').forEach((x) => x.classList.toggle('sel', x === b));
      formulario(panel, r, b.dataset.res);
    }));
  }

  function formulario(panel, r, res) {
    const aceptar = res === 'aceptado';
    const soluciones = r.esComida ? ['reembolso', 'compensacion'] : ['reembolso', 'cambio', 'reposicion', 'compensacion'];
    let sol = aceptar ? soluciones[0] : '';
    const caja = document.getElementById('rec-form');
    caja.innerHTML = `<div class="an-form" style="margin-top:14px">
      ${aceptar && r.esComida ? `<div class="an-falta" style="cursor:default;background:#edf1ff;border-color:#d4defa;color:#1a3bc4">${ajIcono('info', 16)}<span>Es comida: no se devuelve el producto, solo se reintegra el dinero o se compensa.</span></div>` : ''}
      ${aceptar ? `<label>¿Cómo lo vas a resolver?</label><div class="an-chips">${soluciones.map((s) => `<button type="button" class="an-chip ${s === sol ? 'sel' : ''}" data-sol="${s}">${SOLUCION[s]}</button>`).join('')}</div>` : ''}
      <label for="rec-msg">Mensaje para el cliente <span style="font-weight:600;color:var(--gris-texto)">(obligatorio)</span></label>
      <textarea id="rec-msg" rows="5" maxlength="1000" placeholder="${aceptar ? 'Contale qué vas a hacer y cómo seguir…' : 'Explicale con respeto por qué no podés aceptarlo…'}"></textarea>
      <div class="an-chips">${PLANTILLAS[res].map((p, i) => `<button type="button" class="an-chip" data-tpl="${i}">${aceptar ? 'Ejemplo ' : 'Ejemplo '}${i + 1}</button>`).join('')}</div>
      <p class="an-nota">Tocá un ejemplo para usarlo como base y editalo a tu gusto.</p>
      <div id="rec-err"></div>
      <button type="button" class="aj-btn ${aceptar ? 'aj-btn-primario' : 'aj-btn-peligro'} aj-btn-ancho" id="rec-enviar" style="margin-top:6px">${aceptar ? 'Aceptar y enviar respuesta' : 'Rechazar y enviar respuesta'}</button></div>`;
    caja.querySelectorAll('[data-sol]').forEach((b) => b.addEventListener('click', () => { sol = b.dataset.sol; caja.querySelectorAll('[data-sol]').forEach((x) => x.classList.toggle('sel', x === b)); }));
    caja.querySelectorAll('[data-tpl]').forEach((b) => b.addEventListener('click', () => { const ta = document.getElementById('rec-msg'); ta.value = PLANTILLAS[res][Number(b.dataset.tpl)]; ta.focus(); }));
    document.getElementById('rec-enviar').addEventListener('click', async (ev) => {
      const msg = document.getElementById('rec-msg').value.trim();
      const err = document.getElementById('rec-err');
      if (msg.length < 10) { err.innerHTML = ajError('Escribí un mensaje para el cliente explicando tu decisión.'); return; }
      err.innerHTML = '';
      const ok = await ajConfirmar({ titulo: aceptar ? '¿Aceptar este reclamo?' : '¿Rechazar este reclamo?', texto: 'Tu respuesta le va a llegar al cliente en Mi Zona y no se puede cambiar después.', boton: 'Enviar respuesta', peligro: !aceptar, icono: aceptar ? 'check' : 'alert' });
      if (!ok) return;
      await ajConCarga(ev.currentTarget, 'Enviando', async () => {
        try { const nuevo = await ajApi(`/reclamos/${r.id}/decision`, { metodo: 'PUT', cuerpo: { resultado: res, mensaje: msg, solucion: sol } }); ajToast('Respuesta enviada.'); estado(); dibujarDetalle(panel, nuevo); panel.scrollTop = 0; document.getElementById('pantalla-completa').scrollTop = 0; }
        catch (e) { err.innerHTML = ajError(e.message); }
      });
    });
  }

  anRegistrar(ID, principal);
})();
