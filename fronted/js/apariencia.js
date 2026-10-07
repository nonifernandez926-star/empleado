// Apariencia del panel: tema (claro / oscuro / automático), color de acento y tamaño del texto.
// Se carga en el <head> para aplicarse antes de pintar la pantalla (sin parpadeo).
(function () {
  var CLAVE = 'miAsistenteApariencia';
  var ACENTOS = {
    azul:     { nombre: 'Azul',     main: '#2350f5', g1: '#3d6bff', g2: '#1a3bc4', suave: '#edf1ff', rgb: '35, 80, 245' },
    violeta:  { nombre: 'Violeta',  main: '#7a4fd0', g1: '#9168e6', g2: '#5b36b0', suave: '#f1eafd', rgb: '122, 79, 208' },
    verde:    { nombre: 'Verde',    main: '#1f9d5c', g1: '#2fb872', g2: '#157a46', suave: '#e4f5ec', rgb: '31, 157, 92' },
    naranja:  { nombre: 'Naranja',  main: '#e0731e', g1: '#f08a3a', g2: '#b85a12', suave: '#fff1e3', rgb: '224, 115, 30' },
    rosa:     { nombre: 'Rosa',     main: '#d6336c', g1: '#e64d85', g2: '#a82554', suave: '#fde8ef', rgb: '214, 51, 108' },
    grafito:  { nombre: 'Grafito',  main: '#374151', g1: '#4b5563', g2: '#1f2937', suave: '#eef0f4', rgb: '55, 65, 81' },
  };
  var TEXTOS = { normal: 100, grande: 108, extra: 116 };
  var DEFECTO = { tema: 'claro', acento: 'azul', texto: 'normal', movimiento: 'normal' };

  function leer() {
    try { return Object.assign({}, DEFECTO, JSON.parse(localStorage.getItem(CLAVE) || '{}')); } catch (e) { return Object.assign({}, DEFECTO); }
  }
  function aplicar(cfg) {
    var raiz = document.documentElement;
    var oscuro = cfg.tema === 'oscuro' || (cfg.tema === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    raiz.classList.toggle('tema-oscuro', oscuro);
    var a = ACENTOS[cfg.acento] || ACENTOS.azul;
    raiz.style.setProperty('--azul', a.main);
    raiz.style.setProperty('--azul-2', a.g2);
    raiz.style.setProperty('--azul-g1', a.g1);
    raiz.style.setProperty('--azul-g2', a.g2);
    raiz.style.setProperty('--azul-suave', a.suave);
    raiz.style.setProperty('--azul-claro', a.suave);
    raiz.style.setProperty('--azul-rgb', a.rgb);
    raiz.style.fontSize = (TEXTOS[cfg.texto] || 100) + '%';
    raiz.classList.toggle('sin-movimiento', cfg.movimiento === 'reducido');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', oscuro ? '#0b1437' : '#0b1437');
  }
  function guardar(parcial) {
    var cfg = Object.assign(leer(), parcial);
    try { localStorage.setItem(CLAVE, JSON.stringify(cfg)); } catch (e) { /* sin almacenamiento */ }
    aplicar(cfg);
    return cfg;
  }

  window.Apariencia = { ACENTOS: ACENTOS, leer: leer, guardar: guardar, aplicar: aplicar };
  aplicar(leer());
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var alCambiar = function () { if (leer().tema === 'auto') aplicar(leer()); };
    if (mq.addEventListener) mq.addEventListener('change', alCambiar);
  }
})();
