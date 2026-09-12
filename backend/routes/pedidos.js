const express = require('express');
const router = express.Router();
const multer = require('multer');
const Pedido = require('../models/Pedido');
const { requiereAdmin } = require('../middleware/auth');
const { storage } = require('../config/cloudinary');

const upload = multer({ storage });
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

// POST /api/pedidos/:id/comprobante -> el CLIENTE adjunta la foto de la transferencia desde el chat
// (sin login: cualquiera con el link del pedido podría subir una foto, pero el pedido igual
// necesita revisión manual del dueño, así que no es un problema de seguridad crítico)
router.post('/:id/comprobante', upload.single('foto'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });

    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

    pedido.comprobante = { url: req.file.path, publicId: req.file.filename, fecha: new Date() };
    pedido.pagoDeclarado = true;
    pedido.estadoPago = 'comprobante_recibido';
    await pedido.save();

    res.json({ mensaje: 'Comprobante recibido, el negocio lo va a revisar', url: req.file.path });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al subir el comprobante' });
  }
});

// PUT /api/pedidos/:id/pago-verificado -> el DUEÑO confirma (o desconfirma) manualmente que la plata llegó
router.put('/:id/pago-verificado', requiereAdmin, async (req, res) => {
  try {
    const { verificado } = req.body;
    const pedido = await Pedido.findOne({ _id: req.params.id, negocioId: req.negocio._id });
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

    pedido.pagoVerificado = !!verificado;
    pedido.estadoPago = verificado ? 'verificado' : (pedido.comprobante && pedido.comprobante.url ? 'comprobante_recibido' : 'esperando_comprobante');
    await pedido.save();

    res.json({ mensaje: 'Actualizado', pedido });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el pago' });
  }
});

// PUT /api/pedidos/:id/pago-rechazado -> el DUEÑO marca que el comprobante no era válido (transferencia falsa, monto incorrecto, etc.)
router.put('/:id/pago-rechazado', requiereAdmin, async (req, res) => {
  try {
    const pedido = await Pedido.findOne({ _id: req.params.id, negocioId: req.negocio._id });
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

    pedido.pagoVerificado = false;
    pedido.estadoPago = 'rechazado';
    await pedido.save();

    res.json({ mensaje: 'Pago marcado como rechazado', pedido });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el pago' });
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
