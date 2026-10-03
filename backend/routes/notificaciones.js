const express = require('express');
const router = express.Router();
const Notificacion = require('../models/Notificacion');
const { requiereAdmin } = require('../middleware/auth');

// GET /api/notificaciones -> las últimas 50, más nuevas primero
router.get('/', requiereAdmin, async (req, res) => {
  try {
    const notificaciones = await Notificacion.find({ negocioId: req.negocio._id }).sort({ createdAt: -1 }).limit(50);
    const noLeidas = await Notificacion.countDocuments({ negocioId: req.negocio._id, leida: false });
    res.json({ notificaciones, noLeidas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudieron cargar las notificaciones.' });
  }
});

// PUT /api/notificaciones/:id/leer -> marca una como leída (se usa al tocarla)
router.put('/:id/leer', requiereAdmin, async (req, res) => {
  try {
    await Notificacion.updateOne({ _id: req.params.id, negocioId: req.negocio._id }, { leida: true });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo actualizar la notificación.' });
  }
});

// PUT /api/notificaciones/leer-todas -> marca todas como leídas
router.put('/leer-todas', requiereAdmin, async (req, res) => {
  try {
    await Notificacion.updateMany({ negocioId: req.negocio._id, leida: false }, { leida: true });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron actualizar las notificaciones.' });
  }
});

// DELETE /api/notificaciones/:id -> se usa al deslizarla hacia la derecha
router.delete('/:id', requiereAdmin, async (req, res) => {
  try {
    await Notificacion.deleteOne({ _id: req.params.id, negocioId: req.negocio._id });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo eliminar la notificación.' });
  }
});

module.exports = router;
