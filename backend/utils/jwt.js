const jwt = require('jsonwebtoken');

function generarToken(negocioId) {
  return jwt.sign({ negocioId }, process.env.JWT_SECRET, { expiresIn: '90d' });
}

function verificarToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

module.exports = { generarToken, verificarToken };
