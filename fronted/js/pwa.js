// Registra el service worker al abrir cualquier pantalla (antes solo se registraba al activar notificaciones)
// y avisa con una barra discreta cuando se pierde la conexión.
(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
  }
  var barra = null;
  function mostrar(hayRed) {
    if (hayRed) { if (barra) { barra.remove(); barra = null; } return; }
    if (barra) return;
    barra = document.createElement('div');
    barra.setAttribute('role', 'status');
    barra.textContent = 'Sin conexión. Algunas funciones no van a andar hasta que vuelva internet.';
    barra.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:99999;padding:11px 14px;border-radius:14px;background:#0b1437;color:#fff;font:600 13px/1.35 system-ui,sans-serif;box-shadow:0 10px 30px rgba(5,12,40,.35);text-align:center';
    document.body.appendChild(barra);
  }
  window.addEventListener('offline', function () { mostrar(false); });
  window.addEventListener('online', function () { mostrar(true); });
  document.addEventListener('DOMContentLoaded', function () { if (navigator.onLine === false) mostrar(false); });
})();
