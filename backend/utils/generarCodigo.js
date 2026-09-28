const { customAlphabet } = require('nanoid');

const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos (0/O, 1/I)
const generarSegmento = customAlphabet(alfabeto, 4);

// Genera algo como: ADM-82KX-91PL-7QW3
function generarCodigoAdmin() {
  return `ADM-${generarSegmento()}-${generarSegmento()}-${generarSegmento()}`;
}

// Código público más corto, para usar en la URL del widget de chat
function generarCodigoPublico() {
  const nanoidCorto = customAlphabet(alfabeto, 10);
  return nanoidCorto();
}

// Código para vincular este negocio con su perfil en Mi Zona (formato corto, fácil de tipear/pegar)
function generarCodigoVinculacion() {
  return `${generarSegmento()}-${generarSegmento()}-${generarSegmento()}`;
}

module.exports = { generarCodigoAdmin, generarCodigoPublico, generarCodigoVinculacion };
