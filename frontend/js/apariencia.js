// Apariencia del panel: la persona elige cómo quiere ver su app.
//  - tema (claro / oscuro / automático) y color de acento (de la lista o uno propio)
//  - cuánto color se usa en la app (sutil / equilibrado / intenso)
//  - forma de las esquinas, tipografía, tamaño del texto, densidad, barra inferior y movimiento
// Se carga en el <head> para aplicarse antes de pintar la pantalla (sin parpadeo).
(function () {
  var CLAVE = 'miAsistenteApariencia';
  var ACENTOS = {
    azul:     { nombre: 'Azul',     main: '#2350f5', g1: '#3d6bff', g2: '#1a3bc4', suave: '#edf1ff', rgb: '35, 80, 245' },
    violeta:  { nombre: 'Violeta',  main: '#7a4fd0', g1: '#9168e6', g2: '#5b36b0', suave: '#f1eafd', rgb: '122, 79, 208' },
    verde:    { nombre: 'Verde',    main: '#1f9d5c', g1: '#2fb872', g2: '#157a46', suave: '#e4f5ec', rgb: '31, 157, 92' },
    turquesa: { nombre: 'Turquesa', main: '#0e8fa3', g1: '#1fb0c6', g2: '#096879', suave: '#e1f5f8', rgb: '14, 143, 163' },
    naranja:  { nombre: 'Naranja',  main: '#e0731e', g1: '#f08a3a', g2: '#b85a12', suave: '#fff1e3', rgb: '224, 115, 30' },
    rojo:     { nombre: 'Rojo',     main: '#d1343f', g1: '#e5505a', g2: '#a3222c', suave: '#fdeaec', rgb: '209, 52, 63' },
    rosa:     { nombre: 'Rosa',     main: '#d6336c', g1: '#e64d85', g2: '#a82554', suave: '#fde8ef', rgb: '214, 51, 108' },
    grafito:  { nombre: 'Grafito',  main: '#374151', g1: '#4b5563', g2: '#1f2937', suave: '#eef0f4', rgb: '55, 65, 81' },
  };
  var TEXTOS = { normal: 100, grande: 108, extra: 116 };
  var DEFECTO = { tema: 'claro', acento: 'azul', acentoPersonal: '#2350f5', nivel: 'equilibrado', forma: 'suave', fuente: 'moderna', texto: 'normal', densidad: 'comoda', barra: 'texto', movimiento: 'normal' };

  // A partir de un color elegido a mano se arman las variantes (clara, oscura y de fondo suave).
  function derivar(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return ACENTOS.azul;
    var n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      var rr = r / 255, gg = g / 255, bb = b / 255;
      h = mx === rr ? (gg - bb) / d + (gg < bb ? 6 : 0) : mx === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4;
      h *= 60;
    }
    function hsl(hh, ss, ll) { ll = Math.min(0.92, Math.max(0.08, ll)); return 'hsl(' + Math.round(hh) + ', ' + Math.round(ss * 100) + '%, ' + Math.round(ll * 100) + '%)'; }
    // un color muy claro no se ve bien como acento: se oscurece lo justo para que el texto blanco se lea
    var base = l > 0.55 ? l - 0.2 : l;
    return { nombre: 'Personalizado', main: hsl(h, s, base), g1: hsl(h, s, base + 0.08), g2: hsl(h, s, base - 0.1), suave: hsl(h, Math.min(1, s), 0.95), rgb: [r, g, b].join(', ') };
  }

  function leer() {
    try { return Object.assign({}, DEFECTO, JSON.parse(localStorage.getItem(CLAVE) || '{}')); } catch (e) { return Object.assign({}, DEFECTO); }
  }
  function aplicar(cfg) {
    var raiz = document.documentElement;
    var oscuro = cfg.tema === 'oscuro' || (cfg.tema === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    raiz.classList.toggle('tema-oscuro', oscuro);
    var a = cfg.acento === 'personal' ? derivar(cfg.acentoPersonal) : (ACENTOS[cfg.acento] || ACENTOS.azul);
    raiz.style.setProperty('--azul', a.main);
    raiz.style.setProperty('--azul-2', a.g2);
    raiz.style.setProperty('--azul-g1', a.g1);
    raiz.style.setProperty('--azul-g2', a.g2);
    raiz.style.setProperty('--azul-suave', a.suave);
    raiz.style.setProperty('--azul-claro', a.suave);
    raiz.style.setProperty('--azul-rgb', a.rgb);
    raiz.style.fontSize = (TEXTOS[cfg.texto] || 100) + '%';
    raiz.classList.toggle('sin-movimiento', cfg.movimiento === 'reducido');
    raiz.dataset.nivel = cfg.nivel; raiz.dataset.forma = cfg.forma; raiz.dataset.fuente = cfg.fuente;
    raiz.dataset.densidad = cfg.densidad; raiz.dataset.barra = cfg.barra;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#0b1437');
    try { window.dispatchEvent(new CustomEvent('apariencia-cambio')); } catch (e) { /* navegador viejo */ }
  }
  function guardar(parcial) {
    var cfg = Object.assign(leer(), parcial);
    try { localStorage.setItem(CLAVE, JSON.stringify(cfg)); } catch (e) { /* sin almacenamiento */ }
    aplicar(cfg);
    return cfg;
  }

  window.Apariencia = { ACENTOS: ACENTOS, DEFECTO: DEFECTO, leer: leer, guardar: guardar, aplicar: aplicar, derivar: derivar };
  aplicar(leer());
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var alCambiar = function () { if (leer().tema === 'auto') aplicar(leer()); };
    if (mq.addEventListener) mq.addEventListener('change', alCambiar);
  }
})();
