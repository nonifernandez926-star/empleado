const express = require('express');
const router = express.Router();
const Negocio = require('../models/Negocio');
const Conversacion = require('../models/Conversacion');
const { generarRespuesta } = require('../utils/claude');

// POST /api/chat/:codigoPublico
// body: { mensaje: string, sesionClienteId: string }
router.post('/:codigoPublico', async (req, res) => {
  try {
    const { codigoPublico } = req.params;
    const { mensaje, sesionClienteId } = req.body;

    if (!mensaje || !sesionClienteId) {
      return res.status(400).json({ error: 'Faltan datos: mensaje y sesionClienteId son obligatorios' });
    }

    const negocio = await Negocio.findOne({ codigoPublico, activo: true });
    if (!negocio) return res.status(404).json({ error: 'Asistente no encontrado' });

    // Control de suscripción
    if (negocio.suscripcion.estado === 'vencida') {
      return res.status(402).json({
        error: 'suscripcion_vencida',
        mensaje: 'Este asistente está pausado temporalmente.',
      });
    }

    if (negocio.suscripcion.estado === 'prueba') {
      if (negocio.suscripcion.mensajesUsadosPrueba >= negocio.suscripcion.limiteMensajesPrueba) {
        return res.status(402).json({
          error: 'limite_prueba_alcanzado',
          mensaje: 'Se alcanzó el límite de mensajes de la prueba. El negocio debe activar su suscripción.',
        });
      }
    }

    // Buscamos (o creamos) la conversación de esta sesión
    let conversacion = await Conversacion.findOne({
      negocioId: negocio._id,
      sesionClienteId,
      finalizada: false,
    });
    if (!conversacion) {
      conversacion = await Conversacion.create({
        negocioId: negocio._id,
        sesionClienteId,
        mensajes: [],
      });
    }

    // Le pasamos a Claude solo los últimos mensajes para no gastar tokens de más
    const historialReciente = conversacion.mensajes.slice(-10).map((m) => ({
      rol: m.rol,
      contenido: m.contenido,
    }));

    const respuestaTexto = await generarRespuesta(negocio, historialReciente, mensaje);

    conversacion.mensajes.push({ rol: 'cliente', contenido: mensaje });
    conversacion.mensajes.push({ rol: 'asistente', contenido: respuestaTexto });
    await conversacion.save();

    if (negocio.suscripcion.estado === 'prueba') {
      negocio.suscripcion.mensajesUsadosPrueba += 1;
      await negocio.save();
    }

    res.json({ respuesta: respuestaTexto });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar la respuesta del asistente' });
  }
});

module.exports = router;
