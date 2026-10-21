// "Para revisar hoy": lo que necesita la atención del dueño, ordenado por urgencia y sin ruido.
// Si no hay nada, lo dice con calma. También pone el contador en la pestaña Pedidos.
window.AtencionHub = (function () {
  let pedidosPend = null; // { n, espera (min) }
  let extra = null;       // respuesta de /api/atencion
  let turnosPend = null;  // { n, espera }
  const esTurnos = () => typeof negocioActual !== 'undefined' && negocioActual && negocioActual.tipoOperacion === 'turnos';

  function item({ icono, color, titulo, texto, n, urgente, ir, attrs = '' }) {
    return `<button type="button" class="hub-item ${urgente ? 'urgente' : ''}" data-hub="${ir}" ${attrs}><span class="hub-ico ic-${color}">${ajIcono(icono, 22)}</span><span class="hub-txt"><strong>${titulo}</strong><span>${texto}</span></span><span class="hub-n">${n}</span></button>`;
  }
  function render() {
    const cont = document.getElementById('atencion-hub');
    if (!cont) return;
    const items = [];
    if (!esTurnos() && pedidosPend && pedidosPend.n) {
      const e = pedidosPend.espera;
      items.push(item({ icono: 'package', color: 'naranja', titulo: pedidosPend.n === 1 ? '1 pedido por confirmar' : `${pedidosPend.n} pedidos por confirmar`, texto: `El más antiguo espera hace ${e >= 90 ? Math.round(e / 60) + ' h' : Math.max(1, Math.round(e)) + ' min'}.`, n: pedidosPend.n, urgente: e >= 10, ir: 'pedidos' }));
    }
    if (esTurnos() && turnosPend && turnosPend.n) items.push(item({ icono: 'calendarCheck', color: 'azul', titulo: turnosPend.n === 1 ? '1 turno por confirmar' : `${turnosPend.n} turnos por confirmar`, texto: 'Tus clientes esperan que los confirmes.', n: turnosPend.n, urgente: false, ir: 'turnos' }));
    if (extra) {
      if (extra.reclamos && extra.reclamos.disponible && extra.reclamos.abiertos) items.push(item({ icono: 'message', color: 'rojo', titulo: extra.reclamos.abiertos === 1 ? '1 reclamo por responder' : `${extra.reclamos.abiertos} reclamos por responder`, texto: 'Un cliente espera tu respuesta en Mi Zona.', n: extra.reclamos.abiertos, urgente: true, ir: 'panel-reclamos' }));
      const rep = extra.stock.agotados + extra.stock.bajos;
      if (!esTurnos() && rep) items.push(item({ icono: 'alert', color: 'amarillo', titulo: rep === 1 ? '1 producto para reponer' : `${rep} productos para reponer`, texto: `${extra.stock.agotados ? extra.stock.agotados + (extra.stock.agotados === 1 ? ' agotado' : ' agotados') : ''}${extra.stock.agotados && extra.stock.bajos ? ' · ' : ''}${extra.stock.bajos ? extra.stock.bajos + ' por agotarse' : ''}`, n: rep, urgente: extra.stock.agotados > 0, ir: 'panel-inventario' }));
      if (extra.calidad.total) items.push(item({ icono: 'sparkles', color: 'violeta', titulo: extra.calidad.total === 1 ? '1 respuesta para revisar' : `${extra.calidad.total} respuestas para revisar`, texto: 'Mejorá lo que contesta tu asistente.', n: extra.calidad.total, urgente: false, ir: 'panel-calidad' }));
      if (extra.preguntas) items.push(item({ icono: 'help', color: 'celeste', titulo: extra.preguntas === 1 ? '1 pregunta sin responder' : `${extra.preguntas} preguntas sin responder`, texto: 'Respondela una vez y el asistente ya la sabe.', n: extra.preguntas, urgente: false, ir: 'panel-calidad' }));
    }
    cont.innerHTML = `<div class="hub"><div class="hub-cab"><h2>Para revisar hoy</h2>${items.length ? `<small>${items.length} ${items.length === 1 ? 'tema' : 'temas'}</small>` : ''}</div>
      ${items.length ? items.join('') : `<div class="hub-ok">${ajIcono('check', 22)}<span>Todo al día. No hay nada urgente.</span></div>`}</div>`;
    cont.querySelectorAll('[data-hub]').forEach((b) => b.addEventListener('click', () => {
      const ir = b.dataset.hub;
      if (ir === 'pedidos') { const n = document.querySelector('.app-navbar-item[data-seccion="pedidos"]'); if (n) n.click(); if (typeof ajPendientes === 'function') setTimeout(ajPendientes, 60); }
      else if (ir === 'turnos') { const n = document.querySelector('.app-navbar-item[data-seccion="pedidos"]'); if (n) n.click(); if (typeof ajPendientes === 'function') setTimeout(ajPendientes, 60); }
      else ajAbrirFS(ir);
    }));
  }
  function badge(n) {
    document.querySelectorAll('.nav-badge').forEach((e) => e.remove());
    if (!n) return;
    const nav = document.querySelector('.app-navbar-item[data-seccion="pedidos"]'); // en negocios de turnos esta pestaña muestra los turnos
    if (nav) nav.insertAdjacentHTML('beforeend', `<span class="nav-badge" aria-label="${n} por confirmar">${n > 9 ? '9+' : n}</span>`);
  }
  return {
    pedidos(lista) {
      if (!Array.isArray(lista)) return;
      const pend = lista.filter((p) => p.estado === 'pendiente');
      pedidosPend = { n: pend.length, espera: pend.length ? Math.max(...pend.map((p) => (Date.now() - new Date(p.createdAt).getTime()) / 60000)) : 0 };
      if (!esTurnos()) badge(pend.length);
      render();
    },
    turnos(lista) {
      if (!Array.isArray(lista)) return;
      const pend = lista.filter((t) => t.estado === 'pendiente');
      turnosPend = { n: pend.length, espera: 0 };
      if (esTurnos()) badge(pend.length);
      render();
    },
    async refrescar() {
      try {
        const r = await ajApi('/atencion');
        extra = { stock: Object.assign({ agotados: 0, bajos: 0 }, r.stock), calidad: Object.assign({ total: 0, alta: 0 }, r.calidad), reclamos: Object.assign({ disponible: false, abiertos: 0 }, r.reclamos), preguntas: r.preguntas || 0 };
      } catch (e) { /* si falla, se mantiene lo anterior */ }
      render();
    },
    render,
  };
})();

// Al entrar al panel: se carga todo y se refresca cada minuto mientras la pantalla está visible
window.iniciarModulosNuevos = function () {
  const tick = () => { if (document.hidden) return; window.AtencionHub.refrescar(); if (window.Reclamos) window.Reclamos.estado(); };
  tick();
  setInterval(tick, 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
};
