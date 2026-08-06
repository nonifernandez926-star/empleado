const Negocio = require('../models/Negocio');

// Protege las rutas de administración: el negocio debe enviar su código admin
// en el header "x-codigo-admin"
async function requiereAdmin(req, res, next) {
  const codigo = req.headers['x-codigo-admin'];
  if (!codigo) {
    return res.status(401).json({ error: 'Falta el código de administración' });
  }

  const negocio = await Negocio.findOne({ codigoAdmin: codigo });
  if (!negocio) {
    return res.status(403).json({ error: 'Código de administración inválido' });
  }

  req.negocio = negocio;
  next();
}

module.exports = { requiereAdmin };
