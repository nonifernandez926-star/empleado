const express = require('express');
const router = express.Router();
const Conversacion = require('../models/Conversacion');
const { requiereAdmin } = require('../middleware/auth');

// GET /api/estadisticas -> resumen simple para el panel del negocio
router.get('/', requiereAdmin, async (req, res) => {
  try {
    const negocioId = req.negocio._id;

    const conversaciones = await Conversacion.find({ negocioId });
    const totalConversaciones = conversaciones.length;
    const totalMensajesCliente = conversaciones.reduce(
      (acc, c) => acc + c.mensajes.filter((m) => m.rol === 'cliente').length,
      0
    );

    res.json({
      totalConversaciones,
      totalMensajesCliente,
      suscripcion: req.negocio.suscripcion,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

module.exports = router;
