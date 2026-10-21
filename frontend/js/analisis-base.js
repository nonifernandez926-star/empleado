// Utilidades comunes de las pantallas de análisis y gestión.
window.PANELES_DINAMICOS = window.PANELES_DINAMICOS || {};
const AN_$ = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-AR');
const AN_N = (n) => Number(n || 0).toLocaleString('es-AR');
const AN_HACE = (f) => {
  const m = Math.floor((Date.now() - new Date(f).getTime()) / 60000);
  if (m < 1) return 'recién'; if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24); return d === 1 ? 'ayer' : d < 30 ? `hace ${d} días` : new Date(f).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
};
const AN_EN = (f) => { const m = Math.round((new Date(f).getTime() - Date.now()) / 60000); return m <= 0 ? 'ya venció' : m < 60 ? `en ${m} min` : `en ${Math.round(m / 60)} h`; };
const anSeg = (opciones, actual, attr) => `<div class="an-seg" role="tablist">${opciones.map(([v, t, n]) => `<button type="button" role="tab" class="${String(actual) === String(v) ? 'sel' : ''}" data-${attr}="${v}">${t}${n ? `<i>${n}</i>` : ''}</button>`).join('')}</div>`;
const anVacio = ({ icono, titulo, texto, cta, ctaId }) => `<div class="an-vacio"><span>${ajIcono(icono, 28)}</span><strong>${titulo}</strong><p>${texto}</p>${cta ? `<button type="button" class="aj-btn aj-btn-primario" id="${ctaId}">${cta}</button>` : ''}</div>`;
const anInicial = (t) => ajEsc(String(t || '?').trim().charAt(0).toUpperCase());
const anFoto = (p) => `<span class="an-prod-foto">${p.foto ? `<img src="${ajEsc(p.foto)}" alt="" loading="lazy">` : anInicial(p.nombre)}</span>`;
// Atajo: registra cómo se dibuja un panel cuando se abre
const anRegistrar = (id, fn) => { window.PANELES_DINAMICOS[id] = fn; };

// Hoja para pedir un número (stock, costo...). Devuelve el número o null si se cancela.
function anPedirNumero({ titulo, texto = '', valor = '', etiqueta = 'Cantidad', boton = 'Guardar', prefijo = '' }) {
  return new Promise((resolver) => {
    const fondo = document.createElement('div');
    fondo.className = 'aj-hoja-fondo';
    fondo.innerHTML = `<div class="aj-hoja" role="dialog" aria-modal="true" aria-label="${ajEsc(titulo)}"><div class="aj-hoja-asa"></div>
      <h3>${ajEsc(titulo)}</h3>${texto ? `<p>${ajEsc(texto)}</p>` : ''}
      <div class="an-form" style="text-align:left;margin:0 0 14px"><label for="an-num">${ajEsc(etiqueta)}</label><input id="an-num" type="number" inputmode="decimal" min="0" value="${ajEsc(valor)}" placeholder="0"></div>
      <button class="aj-btn aj-btn-primario" data-ok>${ajEsc(boton)}</button><button class="aj-btn aj-btn-suave" data-no>Cancelar</button></div>`;
    document.body.appendChild(fondo);
    requestAnimationFrame(() => { fondo.classList.add('visible'); const i = fondo.querySelector('#an-num'); i.focus(); i.select(); });
    const fin = (v) => { fondo.classList.remove('visible'); setTimeout(() => fondo.remove(), 250); resolver(v); };
    fondo.querySelector('[data-ok]').addEventListener('click', () => { const v = fondo.querySelector('#an-num').value; fin(v === '' ? null : Number(v)); });
    fondo.querySelector('[data-no]').addEventListener('click', () => fin(null));
    fondo.addEventListener('click', (e) => { if (e.target === fondo) fin(null); });
    fondo.querySelector('#an-num').addEventListener('keydown', (e) => { if (e.key === 'Enter') fondo.querySelector('[data-ok]').click(); });
  });
}

// Foto ampliada
function anVerFoto(url) {
  const v = document.createElement('div');
  v.className = 'an-visor';
  v.innerHTML = `<button type="button" aria-label="Cerrar">×</button><img src="${ajEsc(url)}" alt="Foto">`;
  v.addEventListener('click', () => v.remove());
  document.body.appendChild(v);
}
