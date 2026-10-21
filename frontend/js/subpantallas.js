// Subpantallas de las funciones del panel y piezas de "QR y enlace" y "Descargá Mi Zona".
//
// Cómo se arma una función con subpantallas (solo las que tienen bastante información para ordenar):
//   <div class="list-row-panel" id="panel-xxx">
//     <p class="ayuda sp-intro">…texto que se ve solo en el menú…</p>
//     <div class="sp-sub" data-sp-titulo="…" data-sp-desc="…" data-sp-icono="…" data-sp-color="…" data-sp-valor="clave">…contenido…</div>
//     <div class="sp-pie">…botón Guardar (se ve solo dentro de una subpantalla)…</div>
//   </div>
// Al abrir la función se muestra un menú con una fila por cada .sp-sub; al tocar una fila se abre esa subpantalla
// y la flecha de volver regresa al menú (usa la misma pila de navegación que Ajustes).

const $sp = (id) => document.getElementById(id);
const spContar = (sel) => document.querySelectorAll(sel).length;
const spCargando = (id) => { const e = $sp(id); return !e || /Cargando/i.test(e.textContent); };

// Texto corto que se muestra a la derecha de cada fila (estado actual de lo que hay adentro).
const SP_VALOR = {
  'modo-vendedor': () => ({ suave: 'Suave', normal: 'Normal', agresivo: 'Activo' })[$sp('select-modo-vendedor').value] || '',
  memoria: () => ($sp('check-memoria-activa').checked ? 'Activa' : 'Apagada'),
  permisos: () => `${['recomendar', 'promos', 'tomar', 'cerrar'].filter((k) => $sp(`check-permiso-${k}`).checked).length} de 4`,
  'promos-lista': () => String(spContar('#lista-promociones .promo-card')),
  indecisos: () => (spCargando('lista-indecisos') ? '' : String(spContar('#lista-indecisos .oportunidad-card'))),
  'rk-premios': () => { let n = 0; criteriosActivosActual.forEach((c) => { const pr = premiosParaMostrar(c); [1, 2, 3].forEach((i) => { const x = pr && pr['top' + i]; if (x && (x.texto || x.descuentoPorcentaje)) n++; }); }); return n ? `${n} cargados` : 'Sin premios'; },
  'rk-criterios': () => `${criteriosActivosActual.length} ${criteriosActivosActual.length === 1 ? 'activo' : 'activos'}`,
  inactivos: () => (spCargando('lista-inactivos') ? '' : String(spContar('#lista-inactivos .oportunidad-card'))),
};

function spRefrescar(panel) {
  panel.querySelectorAll('.sp-menu [data-sp-valor]').forEach((el) => {
    const f = SP_VALOR[el.dataset.spValor];
    let t = '';
    try { t = f ? f() : ''; } catch (e) { /* si algo no está listo, la fila queda sin valor */ }
    if (el.textContent !== t) el.textContent = t;
  });
}

function spMostrarMenu(panel) {
  panel.dataset.spVista = 'menu';
  panel.querySelectorAll(':scope > .sp-sub').forEach((s) => s.classList.remove('sp-abierta'));
  if (typeof ajHero === 'function') ajHero(!panel.hasAttribute('data-sp-sin-hero'));
  panel.dataset.spPie = 'si';
  spRefrescar(panel);
}

function spAbrir(panel, sub) {
  const tituloActual = $sp('pantalla-completa-titulo').textContent;
  ajSub(panel, sub.dataset.spTitulo, () => spMostrarMenu(panel), tituloActual, () => {
    panel.dataset.spVista = 'sub';
    panel.dataset.spPie = sub.hasAttribute('data-sp-sin-pie') ? 'no' : 'si';
    panel.querySelectorAll(':scope > .sp-sub').forEach((s) => s.classList.toggle('sp-abierta', s === sub));
  });
}

// Se llama cada vez que se abre una función en pantalla completa.
function spPreparar(panelId, panel) {
  const subs = [...panel.querySelectorAll(':scope > .sp-sub')];
  if (!subs.length) return;
  if (!panel.querySelector(':scope > .sp-menu')) {
    const menu = document.createElement('div');
    menu.className = 'sp-menu';
    menu.innerHTML = `<div class="aj-grupo"><div class="aj-caja">${subs.map((s, i) => `
      <button type="button" class="list-row sp-fila" data-sp="${i}">
        <span class="list-row-icono ic-${s.dataset.spColor || 'azul'}">${ajIcono(s.dataset.spIcono || 'info', 20)}</span>
        <span class="list-row-texto"><strong>${ajEsc(s.dataset.spTitulo)}</strong>${s.dataset.spDesc ? `<span>${ajEsc(s.dataset.spDesc)}</span>` : ''}</span>
        <span class="aj-valor" data-sp-valor="${ajEsc(s.dataset.spValor || '')}"></span>
        <span class="list-row-flecha">${ajIcono('chevron', 17)}</span>
      </button>`).join('')}</div></div>`;
    panel.insertBefore(menu, subs[0]);
    menu.addEventListener('click', (e) => { const f = e.target.closest('.sp-fila'); if (f) spAbrir(panel, subs[Number(f.dataset.sp)]); });
    // las listas (promociones, oportunidades) se cargan después: cuando cambian, se actualizan los números del menú
    let pendiente = null;
    new MutationObserver((cambios) => {
      if (panel.dataset.spVista !== 'menu' || cambios.every((c) => c.target.closest && c.target.closest('.sp-menu'))) return;
      clearTimeout(pendiente); pendiente = setTimeout(() => spRefrescar(panel), 120);
    }).observe(panel, { childList: true, subtree: true });
  }
  spMostrarMenu(panel);
}

// =====================================================================
// QR y enlace del chat
// =====================================================================
let cmpListo = false;
function cmpAviso(texto, tipo = 'ok') {
  const a = $sp('cmp-aviso'); if (!a) return;
  a.textContent = texto; a.className = `cmp-aviso ${tipo} visible`;
  clearTimeout(cmpAviso.t); cmpAviso.t = setTimeout(() => a.classList.remove('visible'), 2600);
}

function cmpPreparar(negocio, linkChat) {
  $sp('link-chat').textContent = linkChat;
  $sp('qr-chat').src = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=10&data=${encodeURIComponent(linkChat)}`;
  $sp('btn-abrir-chat').href = linkChat;
  mzPreparar(negocio);
  if (cmpListo) return;
  cmpListo = true;

  $sp('btn-copiar-link').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(linkChat); cmpAviso('Enlace copiado. Ya podés pegarlo donde quieras.'); }
    catch (e) {
      // algunos navegadores no dejan copiar solos: dejamos el texto seleccionado para copiarlo a mano
      const r = document.createRange(); r.selectNodeContents($sp('link-chat'));
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      cmpAviso('Mantené apretado el enlace y elegí "Copiar".', 'aviso');
    }
  });

  const compartir = $sp('btn-compartir-link');
  if (!navigator.share) { compartir.style.display = 'none'; compartir.parentElement.classList.add('solo-uno'); } // sin menú de compartir del sistema, queda solo "Copiar"
  compartir.addEventListener('click', async () => {
    try { await navigator.share({ title: 'Chateá con nuestro asistente', text: 'Escribinos por acá:', url: linkChat }); }
    catch (e) { /* si cerró el menú de compartir, no pasa nada */ }
  });

  $sp('btn-descargar-qr').addEventListener('click', async (ev) => {
    const btn = ev.currentTarget, url = $sp('qr-chat').src, original = btn.innerHTML;
    btn.disabled = true; btn.textContent = 'Preparando...';
    try {
      const blob = await (await fetch(url)).blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'qr-de-mi-chat.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      cmpAviso('QR descargado.');
    } catch (e) {
      window.open(url, '_blank', 'noopener'); // si el navegador no deja bajarlo directo, se abre la imagen para guardarla
      cmpAviso('Se abrió el QR: mantené apretada la imagen para guardarla.', 'aviso');
    }
    btn.disabled = false; btn.innerHTML = original;
  });
}

// =====================================================================
// Descargá Mi Zona
// =====================================================================
function mzPreparar(negocio) {
  const el = $sp('mz-estado'); if (!el) return;
  const estado = negocio && negocio.suscripcion && negocio.suscripcion.estado;
  const hasta = negocio && negocio.suscripcion && negocio.suscripcion.fechaVencimiento;
  if (estado === 'activa') {
    el.className = 'cmp-estado ok';
    el.innerHTML = `<strong>Tu Mi Asistente está activo${hasta ? ` hasta el ${new Date(hasta).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}.</strong><span>Si entrás a Mi Zona con la misma cuenta de Google, tu primer negocio se publica sin costo adicional.</span>`;
  } else {
    el.className = 'cmp-estado';
    el.innerHTML = '<strong>Todavía no tenés Mi Asistente activo.</strong><span>Podés publicar igual en Mi Zona eligiendo un plan. Con Mi Asistente activo, tu primer negocio se publica sin costo extra.</span>';
  }
}
