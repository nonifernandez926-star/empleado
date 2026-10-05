// Límite de intentos en memoria (frena a quien prueba contraseñas sin parar).
const registros = new Map();

function permitir(clave, max, ventanaMs) {
  const ahora = Date.now();
  const r = registros.get(clave);
  if (!r || ahora - r.desde > ventanaMs) { registros.set(clave, { n: 1, desde: ahora }); return true; }
  r.n += 1;
  return r.n <= max;
}
function olvidar(clave) { registros.delete(clave); }

setInterval(() => {
  const ahora = Date.now();
  for (const [k, r] of registros) if (ahora - r.desde > 3600 * 1000) registros.delete(k);
}, 10 * 60 * 1000).unref();

module.exports = { permitir, olvidar };
