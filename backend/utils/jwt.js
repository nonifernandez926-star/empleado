const jwt = require('jsonwebtoken');

// Sesión de negocio (forma anterior, sigue funcionando)
function generarToken(negocioId) {
  return jwt.sign({ negocioId }, process.env.JWT_SECRET, { expiresIn: '90d' });
}

// Sesión de persona (Google o correo y contraseña)
function generarTokenUsuario(usuario) {
  return jwt.sign({ uid: String(usuario._id), v: usuario.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: '90d' });
}

function verificarToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

module.exports = { generarToken, generarTokenUsuario, verificarToken };
