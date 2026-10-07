// Nombre legible del dispositivo a partir del User-Agent: "Chrome en Android". No guardamos nada más del navegador.
function nombreDispositivo(ua) {
  const s = String(ua || '');
  const so = /Android/i.test(s) ? 'Android' : /iPhone|iPad|iPod/i.test(s) ? 'iPhone/iPad' : /Windows/i.test(s) ? 'Windows' : /Mac OS X|Macintosh/i.test(s) ? 'Mac' : /Linux/i.test(s) ? 'Linux' : 'dispositivo';
  const nav = /Edg\//i.test(s) ? 'Edge' : /OPR\/|Opera/i.test(s) ? 'Opera' : /SamsungBrowser/i.test(s) ? 'Samsung Internet' : /Firefox|FxiOS/i.test(s) ? 'Firefox' : /Chrome|CriOS/i.test(s) ? 'Chrome' : /Safari/i.test(s) ? 'Safari' : 'Navegador';
  return `${nav} en ${so}`;
}
module.exports = { nombreDispositivo };
