// Inventario inteligente: stock que se descuenta solo al confirmar, reservas temporales y aviso de "por agotarse".
(function () {
  const ID = 'panel-inventario';
  const TITULO = 'Inventario';
  let datos = null;
  const ESTADO = { agotado: ['rojo', 'Agotado'], bajo: ['naranja', 'Por agotarse'], ok: ['verde', 'Bien'], sinControl: ['gris', 'Sin control'] };
  const MOV = {
    venta: ['package', 'azul', 'Venta confirmada'], reserva: ['clock', 'naranja', 'Apartado para un pedido'], liberacion: ['history', 'gris', 'Reserva liberada'],
    ajuste: ['sliders', 'violeta', 'Ajuste manual'], reposicion: ['download', 'verde', 'Reposición'], devolucion: ['history', 'naranja', 'Pedido devuelto a pendiente'],
  };
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  async function cargar() { datos = await ajApi('/inventario'); return datos; }

  // ---------- Pantalla principal ----------
  async function principal(panel) {
    ajHero(false);
    panel.innerHTML = ajEsqueleto(4);
    try { await cargar(); } catch (e) { return ajFalloCarga(panel, () => principal(panel)); }
    const r = datos.resumen;
    const reponer = r.agotados + r.bajos;

    if (!r.controlados) {
      panel.innerHTML = `<div class="an">${anVacio({ icono: 'package', titulo: 'Todavía no controlás tu stock', texto: 'Cargá cuántas unidades tenés de cada producto y tu asistente deja de ofrecer lo que se acabó, descuenta solo cuando confirmás una venta y te avisa antes de quedarte sin nada.', cta: 'Cargar el stock de mis productos', ctaId: 'inv-empezar' })}
        <div class="an-card"><div class="an-pasos">
          <div><b>1</b><span><strong>Apartado automático.</strong> Cuando el asistente toma un pedido, aparta las unidades para que no se las ofrezca a otro cliente.</span></div>
          <div><b>2</b><span><strong>Se descuenta al confirmar.</strong> Cuando confirmás el pedido, el stock baja solo.</span></div>
          <div><b>3</b><span><strong>Te avisa a tiempo.</strong> Cuando queda poco o se agota, recibís un aviso en el celular.</span></div></div></div></div>`;
      document.getElementById('inv-empezar').addEventListener('click', () => subProductos(panel));
      return;
    }

    panel.innerHTML = `<div class="an">
      <div class="an-hero">
        <small>${reponer ? 'Para reponer' : 'Estado del stock'}</small>
        <p class="an-hero-num">${reponer ? reponer : 'Todo en orden'}</p>
        <div class="an-hero-linea">${reponer ? `${r.agotados ? `<b>${r.agotados}</b> ${r.agotados === 1 ? 'agotado' : 'agotados'}` : ''}${r.agotados && r.bajos ? ' · ' : ''}${r.bajos ? `<b>${r.bajos}</b> por agotarse` : ''}. Tu asistente ya no ofrece lo que se agotó.` : `Llevás el stock de <b>${r.controlados}</b> ${r.controlados === 1 ? 'producto' : 'productos'}. Te avisamos cuando alguno esté por acabarse.`}</div>
      </div>
      <div class="an-kpis">
        <div class="an-kpi ${r.agotados ? 'rojo' : ''}"><b>${r.agotados}</b><small>Agotados</small></div>
        <div class="an-kpi ${r.bajos ? 'naranja' : ''}"><b>${r.bajos}</b><small>Por agotarse</small></div>
        <div class="an-kpi"><b>${AN_N(r.unidadesApartadas)}</b><small>Unidades apartadas</small></div>
      </div>
      ${ajGrupo('Tu stock', [
        ajFila({ icono: 'alert', color: reponer ? 'naranja' : 'verde', titulo: 'Para reponer', desc: reponer ? 'Lo que está por acabarse o ya se acabó.' : 'Nada por reponer ahora.', valor: reponer ? String(reponer) : '', accion: 'reponer' }),
        ajFila({ icono: 'package', color: 'azul', titulo: 'Stock de productos', desc: 'Ver y ajustar las unidades de cada uno.', valor: String(r.controlados), accion: 'productos' }),
        ajFila({ icono: 'clock', color: 'celeste', titulo: 'Reservas activas', desc: 'Pedidos esperando tu confirmación.', valor: datos.reservas.length ? String(datos.reservas.length) : '', accion: 'reservas' }),
        ajFila({ icono: 'history', color: 'violeta', titulo: 'Historial de movimientos', desc: 'Todo lo que subió o bajó, y por qué.', accion: 'historial' }),
      ].join(''))}
      ${ajGrupo('Configuración', [
        ajFila({ icono: 'sliders', color: 'gris', titulo: 'Reglas del inventario', desc: `Aparta ${datos.config.reservaMinutos} min · avisa desde ${datos.config.umbralDefecto} u.`, accion: 'reglas' }),
        ajFila({ icono: 'store', color: 'naranja', titulo: 'Disponibilidad de hoy', desc: 'Pausar algo solo por hoy, sin tocar el stock.', accion: 'hoy' }),
      ].join(''))}</div>`;
    ajEnlazar(panel, {
      reponer: () => subReponer(panel), productos: () => subProductos(panel), reservas: () => subReservas(panel), historial: () => subHistorial(panel), reglas: () => subReglas(panel),
      hoy: () => { cerrarPantallaCompleta(); ajAbrirFS('panel-disponibilidad'); },
    });
  }
  const sub = (panel, titulo, dibujar) => ajSub(panel, titulo, () => principal(panel), TITULO, dibujar);

  // ---------- Controles de stock (+ / −) ----------
  function stepper(id, variante, valor) {
    return `<div class="an-stepper" data-id="${id}" data-v="${ajEsc(variante || '')}"><button type="button" data-d="-1" aria-label="Quitar uno">−</button><input type="number" min="0" inputmode="numeric" value="${valor}" aria-label="Unidades"><button type="button" data-d="1" aria-label="Sumar uno">+</button></div>`;
  }
  function enlazarSteppers(raiz) {
    raiz.querySelectorAll('.an-stepper').forEach((st) => {
      const input = st.querySelector('input');
      let ultimo = input.value;
      const guardar = debounce(async () => {
        const v = Math.max(0, Math.floor(Number(input.value) || 0));
        input.value = v;
        if (String(v) === ultimo) return;
        try {
          await ajApi('/inventario/ajustar', { metodo: 'POST', cuerpo: { productoId: st.dataset.id, variante: st.dataset.v, nuevoStock: v, nota: 'Ajustado desde Inventario' } });
          ultimo = String(v);
          const fila = st.closest('[data-fila]'); if (fila) { const t = fila.querySelector('[data-quedan]'); if (t) t.textContent = v; }
          ajToast('Stock actualizado.');
        } catch (e) { input.value = ultimo; ajToast(e.message, 'error'); }
      }, 700);
      st.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { input.value = Math.max(0, (Number(input.value) || 0) + Number(b.dataset.d)); guardar(); }));
      input.addEventListener('change', guardar);
    });
  }
  const tag = (est) => `<span class="an-tag ${ESTADO[est][0]}">${ESTADO[est][1]}</span>`;

  function tarjetaStock(p) {
    const info = [`${tag(p.estado)}`, p.reservado ? `Apartadas: <b>${p.reservado}</b>` : '', `Aviso desde ${p.minimoEfectivo}`].filter(Boolean).join(' · ');
    const base = `<div class="an-prod" data-fila>${anFoto(p)}<div class="an-prod-txt"><strong>${ajEsc(p.nombre)}</strong><small>${info}</small></div>${p.conVariantes ? `<div style="text-align:right"><b style="font-size:1.1rem;color:var(--azul-oscuro)" data-quedan>${p.stock}</b><small style="display:block;font-size:.68rem;color:var(--gris-texto)">en total</small></div>` : stepper(p.id, '', p.stock)}</div>`;
    if (!p.conVariantes) return base;
    return base + `<div class="an-var">${p.variantes.filter((v) => v.stock !== null).map((v) => `<div class="an-var-fila" data-fila><span>${ajEsc(v.nombre)}${v.reservado ? ` <small style="color:var(--gris-texto);font-weight:600">· ${v.reservado} apartadas</small>` : ''}</span>${stepper(p.id, v.nombre, v.stock)}</div>`).join('')}</div>`;
  }

  // ---------- Para reponer ----------
  function subReponer(panel) {
    sub(panel, 'Para reponer', () => {
      const lista = datos.productos.filter((p) => p.estado === 'agotado' || p.estado === 'bajo').sort((a, b) => (a.estado === 'agotado' ? 0 : 1) - (b.estado === 'agotado' ? 0 : 1));
      if (!lista.length) { panel.innerHTML = `<div class="an">${anVacio({ icono: 'check', titulo: 'No hay nada por reponer', texto: 'Cuando un producto quede por debajo de su mínimo, aparece acá y te llega un aviso al celular.' })}</div>`; return; }
      panel.innerHTML = `<div class="an"><p class="an-sub">Tu asistente no ofrece lo que está agotado. Cuando cargues mercadería, el producto vuelve a estar disponible.</p><div class="an-lista">${lista.map((p) => `
        <div class="an-card" style="display:flex;flex-direction:column;gap:10px">
          <div class="an-cab">${anFoto(p)}<div><strong>${ajEsc(p.nombre)}</strong><small>${p.estado === 'agotado' ? 'Se agotó' : `Quedan <b>${p.stock}</b>`}${p.diasRestantes !== null && p.estado !== 'agotado' ? ` · alcanza para ~${p.diasRestantes} ${p.diasRestantes === 1 ? 'día' : 'días'} al ritmo actual` : ''}</small></div></div>
          <button type="button" class="aj-btn aj-btn-primario aj-btn-ancho" data-repo="${p.id}" data-n="${ajEsc(p.nombre)}" data-conv="${p.conVariantes ? 1 : 0}">Cargué mercadería</button>
        </div>`).join('')}</div></div>`;
      panel.querySelectorAll('[data-repo]').forEach((b) => b.addEventListener('click', async () => {
        if (b.dataset.conv === '1') { ajToast('Este producto tiene opciones: ajustalas en "Stock de productos".', 'aviso'); return; }
        const n = await anPedirNumero({ titulo: `¿Cuántas unidades llegaron?`, texto: b.dataset.n, etiqueta: 'Unidades que se suman', boton: 'Sumar al stock' });
        if (!n || n <= 0) return;
        try { await ajApi('/inventario/ajustar', { metodo: 'POST', cuerpo: { productoId: b.dataset.repo, delta: n, nota: 'Mercadería recibida' } }); ajToast('Stock sumado.'); await cargar(); subReponerRefrescar(panel); }
        catch (e) { ajToast(e.message, 'error'); }
      }));
    });
  }
  async function subReponerRefrescar(panel) { AJ.pila.pop(); subReponer(panel); }

  // ---------- Stock de productos ----------
  function subProductos(panel) {
    sub(panel, 'Stock de productos', () => {
      const con = datos.productos.filter((p) => p.controla), sin = datos.productos.filter((p) => !p.controla);
      panel.innerHTML = `<div class="an">
        <input type="search" class="an-buscar" id="inv-buscar" placeholder="Buscar producto" aria-label="Buscar producto">
        <p class="an-sub">Usá + y − o escribí el número. El stock baja solo cuando confirmás un pedido.</p>
        <div class="an-lista" id="inv-lista">${con.length ? con.map(tarjetaStock).join('') : '<p class="an-nota">Todavía no controlás el stock de ningún producto. Activalo abajo.</p>'}</div>
        ${sin.length ? `<h3 class="an-t">Sin control de stock</h3><p class="an-sub">Estos productos siempre se ofrecen. Activá el control para que se descuenten y se avise cuando falten.</p><div class="an-lista" id="inv-sin">${sin.map((p) => `<div class="an-prod" data-nom="${ajEsc(p.nombre.toLowerCase())}">${anFoto(p)}<div class="an-prod-txt"><strong>${ajEsc(p.nombre)}</strong><small>${p.categoria ? ajEsc(p.categoria) : 'Sin categoría'}</small></div><button type="button" class="aj-btn aj-btn-suave aj-btn-chico" data-ctl="${p.id}" data-n="${ajEsc(p.nombre)}">Controlar</button></div>`).join('')}</div>` : ''}</div>`;
      enlazarSteppers(panel);
      document.getElementById('inv-buscar').addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        panel.querySelectorAll('.an-lista .an-prod').forEach((c) => { const n = (c.querySelector('strong') || {}).textContent || ''; c.style.display = !q || n.toLowerCase().includes(q) ? '' : 'none'; const v = c.nextElementSibling; if (v && v.classList.contains('an-var')) v.style.display = c.style.display; });
      });
      panel.querySelectorAll('[data-ctl]').forEach((b) => b.addEventListener('click', async () => {
        const n = await anPedirNumero({ titulo: 'Stock inicial', texto: b.dataset.n, etiqueta: '¿Cuántas unidades tenés hoy?', boton: 'Empezar a controlar' });
        if (n === null) return;
        try { await ajApi('/inventario/ajustar', { metodo: 'POST', cuerpo: { productoId: b.dataset.ctl, nuevoStock: n, nota: 'Stock inicial' } }); ajToast('Listo, ya controlás este producto.'); await cargar(); AJ.pila.pop(); subProductos(panel); }
        catch (e) { ajToast(e.message, 'error'); }
      }));
    });
  }

  // ---------- Reservas ----------
  function subReservas(panel) {
    sub(panel, 'Reservas activas', () => {
      panel.innerHTML = `<div class="an"><p class="an-sub">Son pedidos que el asistente tomó y todavía esperan tu confirmación. Sus unidades están apartadas: nadie más puede pedirlas hasta que se confirmen o venza el tiempo.</p>
        ${datos.reservas.length ? `<div class="an-lista">${datos.reservas.map((r) => `<div class="an-card"><div class="an-cab"><span class="an-ico ic-celeste">${ajIcono('clock', 20)}</span><div><strong>${ajEsc(r.cliente)}</strong><small>Se libera ${AN_EN(r.venceEn)} si no confirmás</small></div></div><ul style="margin:10px 0 0;padding-left:18px;font-size:.84rem;color:var(--azul-oscuro);line-height:1.6">${r.items.map((i) => `<li>${ajEsc(i)}</li>`).join('')}</ul></div>`).join('')}</div><button type="button" class="aj-btn aj-btn-primario aj-btn-ancho" id="inv-ir-pedidos">Ir a confirmar pedidos</button>` : anVacio({ icono: 'check', titulo: 'No hay reservas activas', texto: 'Cuando el asistente tome un pedido, sus unidades van a aparecer acá hasta que lo confirmes.' })}</div>`;
      const b = document.getElementById('inv-ir-pedidos'); if (b) b.addEventListener('click', () => { cerrarPantallaCompleta(); const n = document.querySelector('.app-navbar-item[data-seccion="pedidos"]'); if (n) n.click(); });
    });
  }

  // ---------- Historial ----------
  function subHistorial(panel) {
    sub(panel, 'Historial de movimientos', async () => {
      panel.innerHTML = ajEsqueleto(5);
      try {
        const movs = await ajApi('/inventario/movimientos?limit=60');
        panel.innerHTML = `<div class="an"><p class="an-sub">Cada cambio queda registrado: ventas, reservas, correcciones y reposiciones.</p>${movs.length ? `<div class="aj-caja">${movs.map((m) => { const d = MOV[m.tipo] || MOV.ajuste; const pos = m.cantidad > 0; return `<div class="list-row aj-fila-info"><span class="list-row-icono ic-${d[1]}">${ajIcono(d[0], 20)}</span><span class="list-row-texto"><strong>${ajEsc(m.producto)}${m.variante ? ` (${ajEsc(m.variante)})` : ''}</strong><span>${d[2]}${m.nota ? ' · ' + ajEsc(m.nota) : ''} · ${AN_HACE(m.fecha)}</span></span><span class="aj-valor" style="font-weight:800;color:${m.tipo === 'reserva' || m.tipo === 'liberacion' ? 'var(--gris-texto)' : pos ? '#1f9d5c' : '#d1343f'}">${pos ? '+' : ''}${m.cantidad}</span></div>`; }).join('')}</div>` : anVacio({ icono: 'history', titulo: 'Todavía no hay movimientos', texto: 'Cuando se confirmen pedidos o ajustes el stock, van a aparecer acá.' })}</div>`;
      } catch (e) { ajFalloCarga(panel, () => subHistorial(panel)); }
    });
  }

  // ---------- Reglas ----------
  function subReglas(panel) {
    sub(panel, 'Reglas del inventario', () => {
      const c = datos.config;
      panel.innerHTML = `<div class="an">
        <div class="an-card an-form">
          <label for="inv-min">¿Cuánto tiempo se aparta el stock de un pedido sin confirmar?</label>
          <select id="inv-min">${[30, 60, 90, 120, 240, 720].map((m) => `<option value="${m}" ${m === c.reservaMinutos ? 'selected' : ''}>${m < 60 ? m + ' minutos' : m === 60 ? '1 hora' : (m / 60) + ' horas'}</option>`).join('')}</select>
          <p class="an-nota">Pasado ese tiempo, las unidades vuelven a estar disponibles. El pedido sigue ahí: si lo confirmás después, el stock se descuenta igual.</p>
          <label for="inv-umbral">Avisarme cuando queden… (o menos)</label>
          <div class="an-stepper" style="align-self:flex-start"><button type="button" id="inv-u-" aria-label="Menos">−</button><input id="inv-umbral" type="number" min="0" value="${c.umbralDefecto}"><button type="button" id="inv-u+" aria-label="Más">+</button></div>
          <p class="an-nota">Es el aviso general. Si un producto necesita otro número, lo cambiás en el formulario de ese producto.</p>
          <button type="button" class="aj-btn aj-btn-primario aj-btn-ancho" id="inv-guardar" style="margin-top:8px">Guardar reglas</button>
        </div>
        <div class="an-card"><div class="an-pasos">
          <div><b>1</b><span>El asistente <strong>aparta</strong> las unidades cuando toma un pedido, y no lo toma si no alcanzan.</span></div>
          <div><b>2</b><span>Al <strong>confirmar</strong> el pedido, el stock se descuenta solo.</span></div>
          <div><b>3</b><span>Si volvés un pedido a <strong>pendiente</strong>, las unidades vuelven al stock.</span></div>
          <div><b>4</b><span>Si un producto <strong>queda poco o se agota</strong>, te llega un aviso (una sola vez).</span></div></div></div></div>`;
      const u = document.getElementById('inv-umbral');
      document.getElementById('inv-u-').addEventListener('click', () => { u.value = Math.max(0, Number(u.value) - 1); });
      document.getElementById('inv-u+').addEventListener('click', () => { u.value = Number(u.value) + 1; });
      document.getElementById('inv-guardar').addEventListener('click', (ev) => ajConCarga(ev.currentTarget, 'Guardando', async () => {
        try { await ajApi('/operacion', { metodo: 'PUT', cuerpo: { inventario: { reservaMinutos: Number(document.getElementById('inv-min').value), umbralDefecto: Number(u.value) } } }); ajToast('Reglas guardadas.'); if (!ajVolver()) cerrarPantallaCompleta(); }
        catch (e) { ajToast(e.message, 'error'); }
      }));
    });
  }

  anRegistrar(ID, principal);
})();
