// Rentabilidad real: no solo cuánto vendés, sino cuánto te queda.
// Todo es una estimación mientras falten datos: la pantalla dice qué falta y qué tan confiable es el número.
(function () {
  const ID = 'panel-rentabilidad';
  const TITULO = 'Rentabilidad';
  const PERIODOS = [[7, '7 días'], [30, '30 días'], [90, '3 meses'], [365, '1 año']];
  const CATEG = { alquiler: ['store', 'azul', 'Alquiler'], sueldos: ['users', 'violeta', 'Sueldos'], servicios: ['zap', 'amarillo', 'Servicios'], marketing: ['sparkles', 'rosado', 'Publicidad'], insumos: ['package', 'naranja', 'Insumos'], impuestos: ['receipt', 'gris', 'Impuestos'], otros: ['tag', 'celeste', 'Otros'] };
  let dias = 30, d = null;
  try { dias = Number(localStorage.getItem('rentaDias')) || 30; } catch (e) { /* sin almacenamiento */ }
  const colorMargen = (p) => (p === null ? 'gris' : p >= 40 ? 'verde' : p >= 20 ? 'amarillo' : 'rojo');
  const sub = (panel, titulo, dibujar) => ajSub(panel, titulo, () => principal(panel), TITULO, dibujar);

  // ---------- Gráfico de ventas y ganancia ----------
  function grafico(serie) {
    if (!serie || !serie.length) return '';
    const W = 340, H = 252, PL = 46, PR = 10, PT = 14, BASE = 218;
    const corto = (v) => (v < 0 ? '-' + fmtCorto(-v) : fmtCorto(v));
    const maxV = Math.max(1, ...serie.map((s) => s.ventas));
    const minG = Math.min(0, ...serie.map((s) => s.ganancia));
    const paso = escalaBonita(maxV - minG, false).paso;
    const topV = paso * Math.ceil(maxV / paso);
    const botV = minG < 0 ? -paso * Math.ceil(-minG / paso) : 0;
    const y = (v) => PT + ((topV - v) / (topV - botV)) * (BASE - PT);
    const y0 = y(0);
    const n = serie.length, pasoX = (W - PL - PR) / n, bw = Math.max(3, Math.min(14, pasoX * 0.34));
    const rx = Math.min(4, bw / 2);
    const etiqueta = (s) => new Date(s.desde).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' });
    const marcas = new Set(n <= 5 ? serie.map((_, i) => i) : [0, Math.round((n - 1) / 4), Math.round((n - 1) / 2), Math.round(((n - 1) * 3) / 4), n - 1]);
    const ticks = []; for (let t = botV; t <= topV + 1e-6; t += paso) ticks.push(t);
    const grilla = ticks.map((t) => `<line x1="${PL}" x2="${W - PR}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}" stroke="${t === 0 ? '#c9d2e6' : '#e8ecf6'}" ${t === 0 ? '' : 'stroke-dasharray="3 5"'}/><text x="${PL - 8}" y="${(y(t) + 3.5).toFixed(1)}" text-anchor="end" font-size="10" font-weight="600" fill="#7a85a3">${corto(t)}</text>`).join('');
    const barras = serie.map((s, i) => {
      const cx = PL + pasoX * i + pasoX / 2;
      const gy = y(s.ganancia);
      return `<rect x="${(cx - bw - 1).toFixed(1)}" y="${y(s.ventas).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, y0 - y(s.ventas)).toFixed(1)}" rx="${rx}" fill="url(#gf-ventas)"/>
        <rect x="${(cx + 1).toFixed(1)}" y="${Math.min(gy, y0).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, Math.abs(gy - y0)).toFixed(1)}" rx="${rx}" fill="${s.ganancia >= 0 ? 'url(#gf-gana)' : '#d1343f'}"/>
        ${marcas.has(i) ? `<text x="${cx.toFixed(1)}" y="${H - 14}" text-anchor="${i === n - 1 && n > 1 ? 'end' : i === 0 && n > 1 ? 'start' : 'middle'}" font-size="10" font-weight="600" fill="#7a85a3">${etiqueta(s)}</text>` : ''}`;
    }).join('');
    return `<svg class="an-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ventas y ganancia por período">
      <defs>
        <linearGradient id="gf-ventas" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9db5fb"/><stop offset="1" stop-color="#cfdbfd"/></linearGradient>
        <linearGradient id="gf-gana" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2bbd78"/><stop offset="1" stop-color="#16874f"/></linearGradient>
      </defs>${grilla}${barras}</svg>
      <div class="an-chart-leyenda"><span><i style="background:#9db5fb"></i>Ventas</span><span><i style="background:#1f9d5c"></i>Ganancia estimada</span></div>`;
  }

  // ---------- Pantalla principal ----------
  async function principal(panel) {
    ajHero(false);
    panel.innerHTML = ajEsqueleto(4);
    try { d = await ajApi(`/rentabilidad?dias=${dias}`); } catch (e) { return ajFalloCarga(panel, () => principal(panel)); }
    const sinVentas = d.pedidos === 0;
    const base = d.ventas + d.ingresoEnvio;
    const otros = d.costoEntrega + d.embalaje + d.comisiones;
    const partes = [['Costo de productos', d.costoProductos, '#f0a030'], ['Envíos y cobro', otros, '#4fb7e8'], ['Gastos del negocio', d.gastos, '#9b7be6'], ['Te queda', Math.max(0, d.gananciaNeta), '#3fd08a']];
    const suma = partes.reduce((a, p) => a + p[1], 0) || 1;
    const CONF = { alta: ['#1f9d5c', 'Datos completos', 'Tiene todo lo necesario: este resultado es confiable.'], media: ['#e0a81e', 'Estimación razonable', 'Falta poco para tener el número exacto.'], baja: ['#d1343f', 'Estimación aproximada', 'Faltan datos importantes: tomalo como una referencia.'] };
    const cf = CONF[d.confianza];

    const hero = sinVentas
      ? anVacio({ icono: 'receipt', titulo: 'Todavía no hay ventas en este período', texto: 'Cuando confirmes pedidos, acá vas a ver cuánto vendiste y cuánto te quedó de verdad. Mientras tanto, podés ir cargando los costos de tus productos y tus gastos.' })
      : `<div class="an-hero">
          <small>Te quedó${d.estimado ? ' (aproximado)' : ''}</small>
          <p class="an-hero-num" style="font-size:2.35rem;color:${d.gananciaNeta >= 0 ? '#8be5b4' : '#ffb3b9'}">${d.estimado ? '≈ ' : ''}${AN_$(d.gananciaNeta)}</p>
          <p style="margin:2px 0 0;font-size:.9rem;color:#d6e1f7">de <b style="color:#fff">${AN_$(d.ventas)}</b> que vendiste</p>
          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            ${d.margenPct !== null ? `<span class="an-pill ${d.margenPct >= 20 ? 'ok' : d.margenPct < 0 ? 'mal' : ''}">${d.margenPct}% de margen</span>` : ''}
            ${d.estimado ? `<span class="an-estimado" style="margin-top:0">${ajIcono('alert', 12)} Estimación · faltan datos</span>` : ''}
          </div>
          <div class="an-pila" style="margin-top:14px">${partes.filter((p) => p[1] > 0).map((p) => `<i style="width:${((p[1] / suma) * 100).toFixed(1)}%;background:${p[2]}"></i>`).join('')}</div>
          <div class="an-leyenda">${partes.map((p) => `<div><i style="background:${p[2]}"></i>${p[0]}<b>${AN_$(p[1])}</b></div>`).join('')}</div>
          <div class="an-hero-linea">${d.gananciaNeta < 0 ? 'En este período tus costos y gastos superaron lo que vendiste.' : d.margenPct !== null ? `De cada <b>$100</b> que vendés, te quedan aproximadamente <b>$${Math.round(d.margenPct)}</b>.` : ''}${d.estimado ? ' Los números se afinan a medida que cargues más datos.' : ''}</div>
        </div>`;

    panel.innerHTML = `<div class="an">
      ${anSeg(PERIODOS, dias, 'dias')}
      ${hero}
      ${sinVentas ? '' : `
      <div class="an-card" style="display:flex;flex-direction:column;gap:12px">
        <div class="an-conf"><span class="an-conf-punto" style="background:${cf[0]}"></span><div><strong>${cf[1]}</strong><br><span>${cf[2]}</span></div></div>
        ${d.cobertura !== null ? `<div><div style="display:flex;justify-content:space-between;font-size:.76rem;font-weight:700;color:var(--gris-texto);margin-bottom:6px"><span>Costos cargados</span><span>${Math.round(d.cobertura)}% de tus ventas</span></div><div class="an-meter"><i style="width:${Math.round(d.cobertura)}%"></i></div></div>` : ''}
        ${d.faltantes.map((f) => `<button type="button" class="an-falta" data-falta="${f.clave}">${ajIcono('alert', 16)}<span>${ajEsc(f.texto)}</span><b>Completar</b></button>`).join('')}
      </div>
      <div class="an-card"><div class="an-cab" style="margin-bottom:10px"><div><strong>Ventas y ganancia</strong><small>${PERIODOS.find((p) => p[0] === dias)[1] === '1 año' ? 'Por mes' : dias <= 14 ? 'Por día' : 'Por semana'}</small></div></div>${grafico(d.serie)}</div>
      ${d.ideas.length ? `<h3 class="an-t">Lo que dicen tus números</h3><div class="an-lista">${d.ideas.map((i) => `<div class="an-idea ${i.tipo}"><span>${ajIcono(i.tipo === 'alerta' ? 'alert' : i.tipo === 'ok' ? 'check' : 'info', 18)}</span><div><strong>${ajEsc(i.titulo)}</strong><p>${ajEsc(i.texto)}</p></div></div>`).join('')}</div>` : ''}`}
      ${ajGrupo('Profundizá', [
        ajFila({ icono: 'star', color: 'verde', titulo: 'Qué producto deja más ganancia', desc: 'Ranking por margen, ventas y unidades.', accion: 'productos', valor: d.productos.length ? String(d.productos.length) : '' }),
        ajFila({ icono: 'tag', color: 'naranja', titulo: 'Costos de tus productos', desc: 'Cargá lo que te cuesta cada uno.', accion: 'costos', valor: d.sinCosto.length ? `${d.sinCosto.length} sin costo` : '' }),
        ajFila({ icono: 'receipt', color: 'violeta', titulo: 'Gastos del negocio', desc: 'Alquiler, sueldos, servicios y más.', accion: 'gastos', valor: d.configurado.gastos ? '' : 'Sin cargar' }),
        ajFila({ icono: 'map', color: 'celeste', titulo: 'Envíos, embalaje y cobro', desc: 'Lo que cuesta entregar y cobrar.', accion: 'entrega', valor: d.configurado.costoEntrega ? '' : 'Sin cargar' }),
      ].join(''))}
      <p class="an-nota">Solo vos ves estos números. Se calculan con los pedidos confirmados, los costos y los gastos que cargaste.</p></div>`;
    panel.querySelectorAll('[data-dias]').forEach((b) => b.addEventListener('click', () => { dias = Number(b.dataset.dias); try { localStorage.setItem('rentaDias', dias); } catch (e) { /* ok */ } principal(panel); }));
    panel.querySelectorAll('[data-falta]').forEach((b) => b.addEventListener('click', () => ({ costos: () => subCostos(panel), gastos: () => subGastos(panel), entrega: () => subEntrega(panel), precios: () => { cerrarPantallaCompleta(); ajAbrirFS('panel-productos'); } })[b.dataset.falta]()));
    ajEnlazar(panel, { productos: () => subProductos(panel), costos: () => subCostos(panel), gastos: () => subGastos(panel), entrega: () => subEntrega(panel) });
  }

  // ---------- Qué producto deja más ganancia ----------
  function subProductos(panel, orden = 'margen') {
    sub(panel, 'Ganancia por producto', () => {
      const lista = [...d.productos].sort((a, b) => orden === 'pct' ? (b.margenPct ?? -1e9) - (a.margenPct ?? -1e9) : orden === 'unidades' ? b.unidades - a.unidades : b.margen - a.margen);
      const maxM = Math.max(1, ...lista.map((p) => Math.abs(p.margen)));
      panel.innerHTML = `<div class="an">
        <p class="an-sub">Solo se incluyen los productos que tienen costo cargado, en los últimos ${dias === 365 ? '12 meses' : dias + ' días'}.</p>
        ${anSeg([['margen', 'Más ganancia'], ['pct', 'Mejor margen'], ['unidades', 'Más vendidos']], orden, 'ord')}
        ${lista.length ? `<div class="an-lista">${lista.map((p, i) => `<div class="an-prod" style="animation:mv-sube .3s ease ${Math.min(i, 8) * 0.03}s both"><span class="an-prod-foto" style="font-size:.9rem">${i + 1}</span><div class="an-prod-txt"><strong>${ajEsc(p.nombre)}</strong><small>${AN_N(p.unidades)} ${p.unidades === 1 ? 'unidad' : 'unidades'} · vendiste ${AN_$(p.ventas)}</small><div class="an-barra-fina"><i style="width:${Math.max(4, Math.round((Math.abs(p.margen) / maxM) * 100))}%;background:${p.margen >= 0 ? '#1f9d5c' : '#d1343f'}"></i></div></div><div class="an-margen-val"><b>${AN_$(p.margen)}</b><span class="an-tag ${colorMargen(p.margenPct)}">${p.margenPct}%</span></div></div>`).join('')}</div>` : anVacio({ icono: 'tag', titulo: 'Todavía no hay productos con costo', texto: 'Cargá lo que te cuesta cada producto para ver cuáles te dejan más ganancia.', cta: 'Cargar costos', ctaId: 'fin-ir-costos' })}
        ${d.sinCosto.length && lista.length ? `<button type="button" class="an-falta" id="fin-ir-costos2">${ajIcono('alert', 16)}<span>${d.sinCosto.length} ${d.sinCosto.length === 1 ? 'producto vendido no tiene' : 'productos vendidos no tienen'} costo cargado</span><b>Cargar</b></button>` : ''}</div>`;
      panel.querySelectorAll('[data-ord]').forEach((b) => b.addEventListener('click', () => { AJ.pila.pop(); subProductos(panel, b.dataset.ord); }));
      ['fin-ir-costos', 'fin-ir-costos2'].forEach((id) => { const e = document.getElementById(id); if (e) e.addEventListener('click', () => { AJ.pila.pop(); subCostos(panel); }); });
    });
  }

  // ---------- Costos de los productos ----------
  function subCostos(panel) {
    sub(panel, 'Costos de tus productos', async () => {
      panel.innerHTML = ajEsqueleto(5);
      let prods;
      try { prods = await ajApi('/productos'); } catch (e) { return ajFalloCarga(panel, () => subCostos(panel)); }
      prods.sort((a, b) => (typeof a.costo === 'number' ? 1 : 0) - (typeof b.costo === 'number' ? 1 : 0));
      const faltan = prods.filter((p) => typeof p.costo !== 'number').length;
      const margen = (p, c) => (typeof p.precio === 'number' && p.precio > 0 && c !== '' && c !== null ? `Ganás ${AN_$(p.precio - Number(c))} (${Math.round(((p.precio - Number(c)) / p.precio) * 100)}%)` : typeof p.precio === 'number' ? 'Cargá el costo' : 'Sin precio cargado');
      panel.innerHTML = `<div class="an"><p class="an-sub">Poné lo que te cuesta a vos cada unidad (materia prima, mercadería). Con eso se calcula cuánto ganás de verdad. ${faltan ? `Te faltan <b>${faltan}</b>.` : '¡Los cargaste todos!'}</p>
        ${prods.length ? `<div class="an-lista">${prods.map((p) => `<div class="an-prod" data-id="${p._id}">
          <span class="an-prod-foto">${p.fotos && p.fotos[0] ? `<img src="${ajEsc(p.fotos[0].url)}" alt="" loading="lazy">` : anInicial(p.nombre)}</span>
          <div class="an-prod-txt"><strong>${ajEsc(p.nombre)}</strong><small>${typeof p.precio === 'number' ? 'Precio ' + AN_$(p.precio) + ' · ' : ''}<span data-m>${margen(p, p.costo ?? '')}</span></small></div>
          <input class="an-costo-in" type="number" inputmode="decimal" min="0" placeholder="Costo" aria-label="Costo de ${ajEsc(p.nombre)}" value="${typeof p.costo === 'number' ? p.costo : ''}"></div>`).join('')}</div>` : anVacio({ icono: 'package', titulo: 'No tenés productos cargados', texto: 'Primero cargá tu catálogo y después volvé a poner los costos.', cta: 'Ir a Productos', ctaId: 'fin-ir-prod' })}</div>`;
      const b = document.getElementById('fin-ir-prod'); if (b) b.addEventListener('click', () => { cerrarPantallaCompleta(); ajAbrirFS('panel-productos'); });
      panel.querySelectorAll('.an-prod[data-id]').forEach((fila) => {
        const input = fila.querySelector('input'); const p = prods.find((x) => String(x._id) === fila.dataset.id);
        input.addEventListener('input', () => { fila.querySelector('[data-m]').textContent = margen(p, input.value); });
        input.addEventListener('change', async () => {
          try { await ajApi(`/productos/${p._id}`, { metodo: 'PUT', cuerpo: { costo: input.value } }); p.costo = input.value === '' ? null : Number(input.value); ajToast('Costo guardado.'); }
          catch (e) { ajToast(e.message, 'error'); }
        });
      });
    });
  }

  // ---------- Gastos ----------
  function subGastos(panel) {
    sub(panel, 'Gastos del negocio', async () => {
      panel.innerHTML = ajEsqueleto(4);
      let r;
      try { r = await ajApi('/rentabilidad/gastos'); } catch (e) { return ajFalloCarga(panel, () => subGastos(panel)); }
      panel.innerHTML = `<div class="an">
        <div class="an-card"><div class="an-cab"><span class="an-ico ic-violeta">${ajIcono('receipt', 20)}</span><div><strong>${AN_$(r.totalMensual)} por mes</strong><small>Gastos fijos que se restan de tus ventas</small></div></div></div>
        <button type="button" class="aj-btn aj-btn-primario aj-btn-ancho" id="gas-nuevo">+ Agregar un gasto</button>
        ${r.gastos.length ? `<div class="an-lista">${r.gastos.map((g) => { const c = CATEG[g.categoria] || CATEG.otros; return `<div class="an-gasto ${g.activo ? '' : 'pausado'}"><span class="an-ico ic-${c[1]}">${ajIcono(c[0], 20)}</span><div class="an-prod-txt"><strong>${ajEsc(g.concepto)}</strong><small>${c[2]} · ${g.frecuencia === 'mensual' ? 'Todos los meses' : 'Una sola vez'}${g.activo ? '' : ' · en pausa'}</small></div><div class="an-gasto-monto">${AN_$(g.monto)}<small>${g.frecuencia === 'mensual' ? 'por mes' : 'único'}</small></div><button type="button" class="aj-btn aj-btn-suave aj-btn-chico" data-g="${g._id}" data-activo="${g.activo ? 1 : 0}" aria-label="${g.activo ? 'Pausar' : 'Reactivar'}">${g.activo ? 'Pausar' : 'Activar'}</button></div>`; }).join('')}</div>` : anVacio({ icono: 'receipt', titulo: 'Todavía no cargaste gastos', texto: 'Alquiler, sueldos, luz, internet, publicidad… Cargarlos hace que el número que te queda sea mucho más real.' })}</div>`;
      document.getElementById('gas-nuevo').addEventListener('click', () => subNuevoGasto(panel));
      panel.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', async () => {
        try { await ajApi(`/rentabilidad/gastos/${b.dataset.g}`, { metodo: 'PUT', cuerpo: { activo: b.dataset.activo !== '1' } }); AJ.pila.pop(); subGastos(panel); }
        catch (e) { ajToast(e.message, 'error'); }
      }));
      // mantener apretado = borrar (con confirmación)
      panel.querySelectorAll('.an-gasto').forEach((f) => { let t; const id = f.querySelector('[data-g]').dataset.g; const nom = f.querySelector('strong').textContent;
        const borrar = async () => { if (await ajConfirmar({ titulo: `¿Borrar "${nom}"?`, texto: 'Se quita de tus gastos y deja de restarse.', boton: 'Borrar', peligro: true, icono: 'trash' })) { try { await ajApi(`/rentabilidad/gastos/${id}`, { metodo: 'DELETE' }); ajToast('Gasto borrado.'); AJ.pila.pop(); subGastos(panel); } catch (e) { ajToast(e.message, 'error'); } } };
        f.addEventListener('touchstart', () => { t = setTimeout(borrar, 650); }, { passive: true }); ['touchend', 'touchmove', 'touchcancel'].forEach((ev) => f.addEventListener(ev, () => clearTimeout(t), { passive: true }));
        f.addEventListener('contextmenu', (e) => { e.preventDefault(); borrar(); });
      });
      if (r.gastos.length) panel.insertAdjacentHTML('beforeend', '<p class="an-nota" style="margin-top:12px">Para borrar un gasto, mantenelo apretado.</p>');
    });
  }
  function subNuevoGasto(panel) {
    ajSub(panel, 'Nuevo gasto', () => subGastosVolver(panel), 'Gastos del negocio', () => {
      let freq = 'mensual', cat = 'servicios';
      panel.innerHTML = `<div class="an an-form"><label for="gn-con">¿En qué es?</label><input id="gn-con" type="text" maxlength="80" placeholder="Ej: Alquiler del local">
        <label>Categoría</label><div class="an-chips">${Object.entries(CATEG).map(([k, v]) => `<button type="button" class="an-chip ${k === cat ? 'sel' : ''}" data-cat="${k}">${v[2]}</button>`).join('')}</div>
        <label for="gn-monto">Monto</label><input id="gn-monto" type="number" inputmode="decimal" min="0" placeholder="0">
        <label>¿Cada cuánto?</label>${anSeg([['mensual', 'Todos los meses'], ['unico', 'Una sola vez']], freq, 'frec')}
        <div id="gn-msg"></div><button type="button" class="aj-btn aj-btn-primario aj-btn-ancho" id="gn-ok" style="margin-top:12px">Guardar gasto</button></div>`;
      panel.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { cat = b.dataset.cat; panel.querySelectorAll('[data-cat]').forEach((x) => x.classList.toggle('sel', x === b)); }));
      panel.querySelectorAll('[data-frec]').forEach((b) => b.addEventListener('click', () => { freq = b.dataset.frec; panel.querySelectorAll('[data-frec]').forEach((x) => x.classList.toggle('sel', x === b)); }));
      document.getElementById('gn-ok').addEventListener('click', (ev) => ajConCarga(ev.currentTarget, 'Guardando', async () => {
        try { await ajApi('/rentabilidad/gastos', { metodo: 'POST', cuerpo: { concepto: document.getElementById('gn-con').value, categoria: cat, monto: document.getElementById('gn-monto').value, frecuencia: freq } }); ajToast('Gasto guardado.'); ajVolver(); }
        catch (e) { document.getElementById('gn-msg').innerHTML = ajError(e.message); }
      }));
    });
  }
  const subGastosVolver = (panel) => { subGastos(panel); AJ.pila.pop(); };

  // ---------- Envíos, embalaje y cobro ----------
  function subEntrega(panel) {
    sub(panel, 'Envíos, embalaje y cobro', async () => {
      panel.innerHTML = ajEsqueleto(3);
      let o;
      try { o = await ajApi('/operacion'); } catch (e) { return ajFalloCarga(panel, () => subEntrega(panel)); }
      const f = o.finanzas;
      panel.innerHTML = `<div class="an an-form">
        <p class="an-sub">Son costos que se repiten en cada pedido. Dejá vacío lo que no uses.</p>
        <div class="an-card an-form"><label for="en-envio">¿Cuánto te cuesta cada envío a domicilio?</label><input id="en-envio" type="number" inputmode="decimal" min="0" placeholder="Ej: nafta, repartidor" value="${f.costoEntrega ?? ''}">
          <label for="en-emb">¿Cuánto gastás en embalaje por pedido?</label><input id="en-emb" type="number" inputmode="decimal" min="0" placeholder="Ej: bolsa, caja" value="${f.costoEmbalaje ?? ''}">
          <label for="en-com">Comisión del medio de cobro (%)</label><input id="en-com" type="number" inputmode="decimal" min="0" max="40" step="0.1" placeholder="Ej: 4 (tarjeta o billetera)" value="${f.comisionPct || ''}">
          <p class="an-nota">Se aplica solo a los pedidos que no se pagan en efectivo.</p></div>
        <label class="list-row aj-fila-switch" style="border-radius:16px;background:#fff;border:1px solid var(--linea)"><span class="list-row-icono ic-celeste">${ajIcono('map', 20)}</span><span class="list-row-texto"><strong>El cliente me paga el envío aparte</strong><span>Se suma como ingreso usando el precio promedio de tus zonas de delivery.</span></span>${ajSwitch('en-cobra', f.envioCobrado)}</label>
        <div id="en-msg"></div><button type="button" class="aj-btn aj-btn-primario aj-btn-ancho" id="en-ok" style="margin-top:8px">Guardar</button></div>`;
      document.getElementById('en-ok').addEventListener('click', (ev) => ajConCarga(ev.currentTarget, 'Guardando', async () => {
        try { await ajApi('/operacion', { metodo: 'PUT', cuerpo: { finanzas: { costoEntrega: document.getElementById('en-envio').value, costoEmbalaje: document.getElementById('en-emb').value, comisionPct: document.getElementById('en-com').value || 0, envioCobrado: panel.querySelector('[data-k="en-cobra"]').checked } } }); ajToast('Guardado.'); if (!ajVolver()) cerrarPantallaCompleta(); }
        catch (e) { document.getElementById('en-msg').innerHTML = ajError(e.message); }
      }));
    });
  }

  anRegistrar(ID, principal);
})();
