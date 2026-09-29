const express = require('express');
const router = express.Router();
const PreguntaFrecuente = require('../models/PreguntaFrecuente');
const { requiereAdmin } = require('../middleware/auth');

router.get('/', requiereAdmin, async (req, res) => {
  try {
    const preguntas = await PreguntaFrecuente.find({ negocioId: req.negocio._id }).sort({ createdAt: -1 }).limit(200);
    res.json(preguntas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener las preguntas' });
  }
});

router.put('/:id', requiereAdmin, async (req, res) => {
  try {
    const { respuesta } = req.body;
    if (!respuesta || !respuesta.trim()) return res.status(400).json({ error: 'La respuesta no puede estar vacía' });

    const pregunta = await PreguntaFrecuente.findOneAndUpdate(
      { _id: req.params.id, negocioId: req.negocio._id },
      { respuesta: respuesta.trim() },
      { new: true }
    );
    if (!pregunta) return res.status(404).json({ error: 'Pregunta no encontrada' });
    res.json(pregunta);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al guardar la respuesta' });
  }
});

router.delete('/:id', requiereAdmin, async (req, res) => {
  try {
    const pregunta = await PreguntaFrecuente.findOneAndDelete({ _id: req.params.id, negocioId: req.negocio._id });
    if (!pregunta) return res.status(404).json({ error: 'Pregunta no encontrada' });
    res.json({ mensaje: 'Pregunta eliminada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar la pregunta' });
  }
});

module.exports = router;
