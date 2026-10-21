// Chat de tus clientes (lado del dueño): color de marca, mensaje de bienvenida y fondos exclusivos para clientes frecuentes.
(function () {
  const COLORES = ['#2350f5', '#7a4fd0', '#1f9d5c', '#0e8fa3', '#e0731e', '#d1343f', '#d6336c', '#374151'];
  const DESBLOQUEOS = [['Café', 1, 'linear-gradient(160deg,#f7ecdf,#efdcc4)'], ['Océano', 3, 'linear-gradient(170deg,#1e6fb8,#6fd0e0)'], ['Bosque', 5, 'linear-gradient(165deg,#1f6b4a,#79b98a)'], ['Dorado VIP', 8, 'linear-gradient(170deg,#0b0b0d,#3a2f12)']];
  const IC_OK = ajIcono('check', 16);

  anRegistrar('panel-chat-config', async (panel) => {
    ajHero(false);
    panel.innerHTML = ajEsqueleto(4);
    let o;
    try { o = await ajApi('/operacion'); } catch (e) { return ajFalloCarga(panel, () => window.PANELES_DINAMICOS['panel-chat-config'](panel)); }
    const c = o.chat;
    let color = c.colorMarca || '', excl = c.fondosExclusivos;
    const nombre = (negocioActual && negocioActual.formData && negocioActual.formData.nombreNegocio) || 'Tu negocio';
    const efectivo = () => color || '#2350f5';

    panel.innerHTML = `<div class="an">
      <p class="an-sub" style="margin:0 2px">Así ven tus clientes el chat con tu asistente. Cada cliente además puede elegir su propio fondo.</p>
      <div class="an-prev" id="cc-prev" style="--p:${efectivo()}"><div class="an-prev-cab"><i>${ajEsc(nombre.charAt(0).toUpperCase())}</i><div><strong>${ajEsc(nombre)}</strong><small>Asistente virtual · En línea</small></div></div>
        <div class="an-prev-cuerpo"><div class="asi" id="cc-bienv">${ajEsc(c.bienvenida || 'Mirá lo que tenemos, consultá o hacé tu pedido.')}</div><div class="cli">Quiero ver el menú</div><div class="asi">¡Dale! Te cuento lo de hoy 🍕</div></div></div>

      <div class="an-card an-form"><label>Color de tu marca</label>
        <p class="an-nota" style="margin:0">Pinta el encabezado, los mensajes de tus clientes y los botones del chat.</p>
        <div class="an-colores" id="cc-colores" style="margin-top:6px">${COLORES.map((x) => `<button type="button" class="an-color ${efectivo().toLowerCase() === x ? 'sel' : ''}" data-c="${x}" style="--c:${x}" aria-label="Color ${x}">${IC_OK}</button>`).join('')}
          <label class="an-color ${color && !COLORES.includes(color.toLowerCase()) ? 'sel' : ''}" id="cc-propio" style="--c:${color || '#9b7be6'};background:${color && !COLORES.includes(color.toLowerCase()) ? color : 'conic-gradient(#e64d4d,#f0a030,#e8d53a,#3fbf5a,#2fb0d4,#4d6bf0,#a653d6,#e64d4d)'}" title="Elegir otro color">${IC_OK}<input type="color" value="${efectivo()}" aria-label="Elegir un color propio"></label></div></div>

      <div class="an-card an-form"><label for="cc-bv">Mensaje de bienvenida <span style="font-weight:600;color:var(--gris-texto)">(opcional)</span></label>
        <input id="cc-bv" type="text" maxlength="160" placeholder="Ej: ¡Bienvenido! Hoy tenemos 2x1 en pizzas." value="${ajEsc(c.bienvenida)}"><p class="an-nota"><span id="cc-n">${c.bienvenida.length}</span>/160 · Se muestra arriba, cuando el cliente abre el chat.</p></div>

      <div class="an-card"><label class="list-row aj-fila-switch" style="padding:0;border:0;background:none"><span class="list-row-icono ic-violeta">${ajIcono('sparkles', 20)}</span><span class="list-row-texto"><strong>Fondos exclusivos para clientes frecuentes</strong><span>Se desbloquean al comprar más veces. Es un motivo lindo para volver.</span></span>${ajSwitch('cc-excl', excl)}</label>
        <div id="cc-desb" style="margin-top:14px;${excl ? '' : 'display:none'}"><div class="an-desbloqueos">${DESBLOQUEOS.map((d) => `<div class="an-desb"><i style="background:${d[2]}"></i>${d[0]}<br><span style="font-weight:700;opacity:.8">${d[1]}ª compra</span></div>`).join('')}</div>
        <p class="an-nota" style="margin-top:10px">Además hay 4 fondos libres para todos. Si lo apagás, todos los fondos quedan disponibles desde el primer día.</p></div></div>

      <div id="cc-msg"></div>
      <button type="button" class="aj-btn aj-btn-primario aj-btn-ancho" id="cc-guardar">Guardar cambios</button>
      <a class="aj-btn aj-btn-suave aj-btn-ancho" id="cc-probar" href="chat.html?codigo=${encodeURIComponent((negocioActual && negocioActual.codigoPublico) || '')}" target="_blank" rel="noopener" style="text-align:center;text-decoration:none">Ver mi chat como cliente</a></div>`;

    const aplicar = () => {
      document.getElementById('cc-prev').style.setProperty('--p', efectivo());
      panel.querySelectorAll('#cc-colores [data-c]').forEach((b) => b.classList.toggle('sel', b.dataset.c === efectivo().toLowerCase()));
      const propio = document.getElementById('cc-propio'); const esPropio = color && !COLORES.includes(color.toLowerCase());
      propio.classList.toggle('sel', !!esPropio); propio.style.background = esPropio ? color : 'conic-gradient(#e64d4d,#f0a030,#e8d53a,#3fbf5a,#2fb0d4,#4d6bf0,#a653d6,#e64d4d)'; propio.style.setProperty('--c', esPropio ? color : '#9b7be6');
    };
    panel.querySelectorAll('#cc-colores [data-c]').forEach((b) => b.addEventListener('click', () => { color = b.dataset.c === '#2350f5' ? '' : b.dataset.c; aplicar(); }));
    panel.querySelector('#cc-propio input').addEventListener('input', (e) => { color = e.target.value; aplicar(); });
    const bv = document.getElementById('cc-bv');
    bv.addEventListener('input', () => { document.getElementById('cc-n').textContent = bv.value.length; document.getElementById('cc-bienv').textContent = bv.value.trim() || 'Mirá lo que tenemos, consultá o hacé tu pedido.'; });
    panel.querySelector('[data-k="cc-excl"]').addEventListener('change', (e) => { excl = e.target.checked; document.getElementById('cc-desb').style.display = excl ? '' : 'none'; });
    document.getElementById('cc-guardar').addEventListener('click', (ev) => ajConCarga(ev.currentTarget, 'Guardando', async () => {
      try { await ajApi('/operacion', { metodo: 'PUT', cuerpo: { chat: { colorMarca: color, fondosExclusivos: excl, bienvenida: bv.value } } }); ajToast('Listo: tus clientes ya ven los cambios.'); }
      catch (e) { document.getElementById('cc-msg').innerHTML = ajError(e.message); }
    }));
  });
})();
