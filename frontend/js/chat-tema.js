// Personalizá tu chat: cada cliente elige el fondo, el color de sus mensajes y el tamaño de la letra.
// Algunos fondos son libres y otros se desbloquean al comprar más veces en ese negocio (un motivo lindo para volver).
// Las elecciones se guardan en este dispositivo, por negocio.
(function () {
  const FONDOS = [
    { id: 'clasico', nombre: 'Clásico', req: 0 }, { id: 'menta', nombre: 'Menta', req: 0 },
    { id: 'atardecer', nombre: 'Atardecer', req: 0 }, { id: 'noche', nombre: 'Noche', req: 0 },
    { id: 'cafe', nombre: 'Café', req: 1 }, { id: 'oceano', nombre: 'Océano', req: 3 },
    { id: 'bosque', nombre: 'Bosque', req: 5 }, { id: 'dorado', nombre: 'Dorado VIP', req: 8 },
  ];
  const COLORES = ['#2350f5', '#7a4fd0', '#1f9d5c', '#0e8fa3', '#e0731e', '#d1343f', '#d6336c', '#374151'];
  const TAMANOS = { s: ['Chica', '13.5px'], m: ['Normal', '15px'], l: ['Grande', '17px'] };
  const IC_CHECK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>';
  const IC_LOCK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  const widget = document.querySelector('.chat-widget');
  const clave = () => `chatPersonal:${new URLSearchParams(location.search).get('codigo') || 'general'}`;
  let estado = { fondo: 'clasico', color: 'marca', tamano: 'm' };
  try { estado = Object.assign(estado, JSON.parse(localStorage.getItem(clave()) || '{}')); } catch (e) { /* sin datos guardados */ }

  const compras = () => (window.__chatCliente && window.__chatCliente.pedidos) || 0;
  const libre = (f) => f.req === 0 || (window.__chatInfo && window.__chatInfo.fondosExclusivos === false) || compras() >= f.req;
  const guardar = () => { try { localStorage.setItem(clave(), JSON.stringify(estado)); } catch (e) { /* sin almacenamiento */ } };

  function aplicar() {
    const f = FONDOS.find((x) => x.id === estado.fondo) || FONDOS[0];
    widget.dataset.fondo = libre(f) ? f.id : 'clasico'; // si todavía no lo desbloqueó, se ve el clásico (la elección queda guardada)
    if (estado.color !== 'marca' && /^#[0-9a-f]{6}$/i.test(estado.color)) {
      widget.style.setProperty('--ch-own1', estado.color);
      widget.style.setProperty('--ch-own2', `color-mix(in srgb, ${estado.color} 72%, #000)`);
    } else { widget.style.removeProperty('--ch-own1'); widget.style.removeProperty('--ch-own2'); }
    document.documentElement.style.setProperty('--ch-fs', (TAMANOS[estado.tamano] || TAMANOS.m)[1]);
  }
  aplicar();

  function toast(t) {
    let el = document.querySelector('.ch-toast');
    if (!el) { el = document.createElement('div'); el.className = 'ch-toast'; document.body.appendChild(el); }
    el.textContent = t; el.classList.add('visible');
    clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('visible'), 2400);
  }

  let fondoEl, hoja;
  function armar() {
    if (hoja) return;
    fondoEl = document.createElement('div'); fondoEl.className = 'ch-hoja-fondo';
    hoja = document.createElement('div'); hoja.className = 'ch-hoja'; hoja.setAttribute('role', 'dialog'); hoja.setAttribute('aria-label', 'Personalizá tu chat');
    document.body.appendChild(fondoEl); document.body.appendChild(hoja);
    fondoEl.addEventListener('click', cerrar);
  }
  function pintar() {
    const n = compras();
    const proximo = FONDOS.filter((f) => !libre(f)).sort((a, b) => a.req - b.req)[0];
    const exclusivos = !(window.__chatInfo && window.__chatInfo.fondosExclusivos === false);
    hoja.innerHTML = `<div class="ch-asa"></div>
      <h2>Personalizá tu chat</h2><p class="ch-sub">Elegí cómo querés ver tus conversaciones. Se guarda en este dispositivo.</p>
      <div class="ch-sec" style="margin-top:6px">Fondo</div>
      <div class="ch-fondos">${FONDOS.map((f) => { const ok = libre(f); return `<button type="button" class="ch-fondo ${estado.fondo === f.id && ok ? 'sel' : ''} ${ok ? '' : 'bloqueado'}" data-fondo="${f.id}" data-id="${f.id}" aria-label="${f.nombre}${ok ? '' : ' (bloqueado)'}"><span class="ch-fondo-nombre">${f.nombre}</span><span class="ch-fondo-check">${IC_CHECK}</span>${ok ? '' : `<span class="ch-fondo-candado">${IC_LOCK}<span>${f.req}ª compra</span></span>`}</button>`; }).join('')}</div>
      ${exclusivos ? `<div class="ch-progreso">${proximo
        ? `<strong>${n === 0 ? 'Desbloqueá más fondos comprando' : `Llevás ${n} ${n === 1 ? 'compra' : 'compras'}`}</strong><span>Con ${proximo.req - n} ${proximo.req - n === 1 ? 'compra más' : 'compras más'} desbloqueás el fondo <b>${proximo.nombre}</b>.</span><div class="ch-barra"><i style="width:${Math.min(100, Math.round((n / proximo.req) * 100))}%"></i></div>`
        : '<strong>¡Desbloqueaste todos los fondos! 🎉</strong><span>Gracias por elegirnos tantas veces.</span>'}</div>` : ''}
      <div class="ch-sec">Color de tus mensajes</div>
      <div class="ch-colores"><button type="button" class="ch-color ${estado.color === 'marca' ? 'sel' : ''}" data-color="marca" style="--c:${getComputedStyle(document.documentElement).getPropertyValue('--ch-brand').trim() || '#2350f5'}" aria-label="Color del negocio">${IC_CHECK}</button>
        ${COLORES.map((c) => `<button type="button" class="ch-color ${estado.color === c ? 'sel' : ''}" data-color="${c}" style="--c:${c}" aria-label="Color ${c}">${IC_CHECK}</button>`).join('')}</div>
      <div class="ch-sec">Tamaño de la letra</div>
      <div class="ch-seg">${Object.entries(TAMANOS).map(([k, v]) => `<button type="button" class="${estado.tamano === k ? 'sel' : ''}" data-tam="${k}">${v[0]}</button>`).join('')}</div>
      <button type="button" class="ch-listo">Listo</button>`;
    hoja.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => {
      const f = FONDOS.find((x) => x.id === b.dataset.id);
      if (!libre(f)) return toast(`Se desbloquea con tu ${f.req}ª compra en este negocio`);
      estado.fondo = f.id; guardar(); aplicar(); pintar();
    }));
    hoja.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => { estado.color = b.dataset.color; guardar(); aplicar(); pintar(); }));
    hoja.querySelectorAll('[data-tam]').forEach((b) => b.addEventListener('click', () => { estado.tamano = b.dataset.tam; guardar(); aplicar(); pintar(); }));
    hoja.querySelector('.ch-listo').addEventListener('click', cerrar);
  }
  function abrir() { armar(); pintar(); requestAnimationFrame(() => { fondoEl.classList.add('abierta'); hoja.classList.add('abierta'); }); }
  function cerrar() { if (!hoja) return; fondoEl.classList.remove('abierta'); hoja.classList.remove('abierta'); }

  document.addEventListener('click', (e) => { if (e.target.closest('#btn-tema-chat')) abrir(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
  // Cuando llegan los datos del negocio y del cliente se vuelve a aplicar (por si el fondo guardado todavía no estaba desbloqueado)
  window.addEventListener('chat-listo', aplicar);
})();
