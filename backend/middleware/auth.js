const Negocio = require('../models/Negocio');
const { verificarToken } = require('../utils/jwt');

// Protege las rutas de administración. Acepta dos formas de identificarse:
// 1) Header "x-codigo-admin" con el código admin (forma clásica, sigue funcionando)
// 2) Header "Authorization: Bearer <token>" con la sesión que se genera al loguearse con Google
async function requiereAdmin(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = verificarToken(token);
      if (!payload) return res.status(401).json({ error: 'Sesión inválida o vencida, iniciá sesión de nuevo' });

      const negocio = await Negocio.findById(payload.negocioId);
      if (!negocio) return res.status(403).json({ error: 'Negocio no encontrado' });

      req.negocio = negocio;
      return next();
    }

    const codigo = req.headers['x-codigo-admin'];
    if (!codigo) {
      return res.status(401).json({ error: 'Falta autenticación (código de administración o sesión)' });
    }

    const negocio = await Negocio.findOne({ codigoAdmin: codigo });
    if (!negocio) {
      return res.status(403).json({ error: 'Código de administración inválido' });
    }

    req.negocio = negocio;
    next();
  } catch (error) {
    console.error('Error en requiereAdmin:', error);
    res.status(500).json({ error: 'Error de autenticación' });
  }
}

module.exports = { requiereAdmin };
