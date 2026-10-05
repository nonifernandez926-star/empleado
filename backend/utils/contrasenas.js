const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);

// Nunca se guarda la contraseña: solo un hash con sal propia. Formato: "<sal>:<hash>".
async function hashearContrasena(contrasena) {
  const sal = crypto.randomBytes(16).toString('hex');
  const hash = (await scrypt(contrasena, sal, 64)).toString('hex');
  return `${sal}:${hash}`;
}

async function verificarContrasena(contrasena, guardada) {
  const [sal, hashGuardado] = String(guardada || '').split(':');
  if (!sal || !hashGuardado) return false;
  const hash = await scrypt(contrasena, sal, 64);
  const esperado = Buffer.from(hashGuardado, 'hex');
  return esperado.length === hash.length && crypto.timingSafeEqual(esperado, hash);
}

module.exports = { hashearContrasena, verificarContrasena };
