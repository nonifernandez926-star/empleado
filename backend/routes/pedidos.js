const express = require('express');
const router = express.Router();
const Pedido = require('../models/Pedido');
const { requiereAdmin } = require('../middleware/auth');

const ESTADOS_VALIDOS = ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'entregado'];

// GET /api/pedidos -> lista todos los pedidos del negocio autenticado, más recientes primero
router.get('/', requiereAdmin, async (req, res) => {
  try {
    const pedidos = await Pedido.find({ negocioId: req.negocio._id }).sort({ createdAt: -1 });
    res.json(pedidos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los pedidos' });
  }
});

// PUT /api/pedidos/:id/estado -> cambia el estado de un pedido (no incluye "cancelado" a propósito)
router.put('/:id/estado', requiereAdmin, async (req, res) => {
  try {
    const { estado } = req.body;
    if (!ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const pedido = await Pedido.findOne({ _id: req.params.id, negocioId: req.negocio._id });
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

    pedido.estado = estado;
    await pedido.save();

    res.json({ mensaje: 'Estado actualizado', pedido });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el pedido' });
  }
});

// DELETE /api/pedidos/:id -> elimina un pedido (pensado para usar una vez entregado, para no acumular basura)
router.delete('/:id', requiereAdmin, async (req, res) => {
  try {
    const pedido = await Pedido.findOneAndDelete({ _id: req.params.id, negocioId: req.negocio._id });
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json({ mensaje: 'Pedido eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el pedido' });
  }
});

module.exports = router;
