const express = require('express');
const router = express.Router();
const Negocio = require('../models/Negocio');
const Cliente = require('../models/Cliente');
const Resena = require('../models/Resena');
const { requiereAdmin } = require('../middleware/auth');

// Arma la pregunta de seguimiento segun la calificacion. Es un mensaje fijo (no pasa por la IA)
// para que sea predecible, instantaneo y no gaste tokens en algo tan simple.
function preguntaSeguimiento(estrellas) {
  if (estrellas >= 3) {
    return '¡Muchas gracias por calificarnos! 🙌 ¿Qué fue lo que más te gustó?';
  }
  return 'Gracias por tu sinceridad 🙏 ¿Qué fue lo que no te gustó? Nos ayuda a mejorar.';
}

// POST /api/resenas/:codigoPublico -> el CLIENTE (desde el chat, sin login) califica con estrellas.
// body: { sesionClienteId, estrellas }
router.post('/:codigoPublico', async (req, res) => {
  try {
    const { codigoPublico } = req.params;
    const { sesionClienteId, estrellas } = req.body;
    const estrellasNum = Number(estrellas);

    if (!sesionClienteId || !estrellasNum || estrellasNum < 1 || estrellasNum > 5) {
      return res.status(400).json({ error: 'Faltan datos válidos (sesionClienteId y estrellas de 1 a 5)' });
    }

    const negocio = await Negocio.findOne({ codigoPublico, activo: true });
    if (!negocio) return res.status(404).json({ error: 'Asistente no encontrado' });

    const cliente = await Cliente.findOne({ negocioId: negocio._id, sesionClienteId });

    const resena = await Resena.create({
      negocioId: negocio._id,
      sesionClienteId,
      nombreCliente: cliente ? cliente.nombre : undefined,
      estrellas: estrellasNum,
    });

    res.status(201).json({ resenaId: resena._id, preguntaSeguimiento: preguntaSeguimiento(estrellasNum) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al guardar la calificación' });
  }
});

// PUT /api/resenas/:codigoPublico/:resenaId -> el CLIENTE contesta la pregunta de seguimiento
// (opcional - si no contesta, la reseña ya quedó guardada solo con las estrellas)
router.put('/:codigoPublico/:resenaId', async (req, res) => {
  try {
    const { codigoPublico, resenaId } = req.params;
    const { comentario } = req.body;
    if (!comentario || !comentario.trim()) {
      return res.status(400).json({ error: 'El comentario no puede estar vacío' });
    }

    const negocio = await Negocio.findOne({ codigoPublico, activo: true });
    if (!negocio) return res.status(404).json({ error: 'Asistente no encontrado' });

    const resena = await Resena.findOneAndUpdate(
      { _id: resenaId, negocioId: negocio._id },
      { comentario: comentario.trim() },
      { new: true }
    );
    if (!resena) return res.status(404).json({ error: 'Reseña no encontrada' });

    res.json({ mensaje: '¡Gracias por contarnos! 💙' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al guardar el comentario' });
  }
});

// GET /api/resenas -> el DUEÑO ve sus calificaciones y reseñas en el panel.
// Filtro opcional ?tipo=positivas (3-5 estrellas) o ?tipo=negativas (1-2 estrellas)
router.get('/', requiereAdmin, async (req, res) => {
  try {
    const filtro = { negocioId: req.negocio._id };
    if (req.query.tipo === 'positivas') filtro.estrellas = { $gte: 3 };
    if (req.query.tipo === 'negativas') filtro.estrellas = { $lte: 2 };

    const resenas = await Resena.find(filtro).sort({ createdAt: -1 }).limit(200);

    const todas = await Resena.find({ negocioId: req.negocio._id });
    const promedio = todas.length ? (todas.reduce((acc, r) => acc + r.estrellas, 0) / todas.length) : 0;

    res.json({
      resenas,
      resumen: {
        total: todas.length,
        promedio: Math.round(promedio * 10) / 10,
        positivas: todas.filter((r) => r.estrellas >= 3).length,
        negativas: todas.filter((r) => r.estrellas <= 2).length,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener las reseñas' });
  }
});

module.exports = router;
