const express = require('express');
const router = express.Router();
const Producto = require('../models/Producto');
const Pedido = require('../models/Pedido');
const MovimientoStock = require('../models/MovimientoStock');
const { requiereAdmin } = require('../middleware/auth');
const { ajustarStock, estadoStock, tieneVariantesConStock, revisarAlertaStock } = require('../utils/inventario');

const esNumero = (n) => typeof n === 'number' && Number.isFinite(n);

// GET /api/inventario -> todo el estado del stock: productos con control, unidades apartadas, alertas y reservas activas
router.get('/', requiereAdmin, async (req, res) => {
  try {
    const negocio = req.negocio;
    const umbralDefecto = (negocio.inventario && negocio.inventario.umbralDefecto) ?? 3;
    const productos = await Producto.find({ negocioId: negocio._id, activo: true }).sort({ nombre: 1 }).lean();

    // Ventas de las últimas 2 semanas por producto: sirve para estimar cuántos días de stock quedan
    const desde = new Date(Date.now() - 14 * 86400000);
    const ventas = await MovimientoStock.aggregate([
      { $match: { negocioId: negocio._id, tipo: 'venta', createdAt: { $gte: desde } } },
      { $group: { _id: '$productoId', unidades: { $sum: { $abs: '$cantidad' } } } },
    ]);
    const vendido = {};
    ventas.forEach((v) => { vendido[String(v._id)] = v.unidades; });

    const lista = productos.map((p) => {
      const { fisico, estado, umbral } = estadoStock(p, umbralDefecto);
      const conVariantes = tieneVariantesConStock(p);
      const reservado = conVariantes ? (p.variantes || []).reduce((a, v) => a + (esNumero(v.stock) ? (v.reservado || 0) : 0), 0) : (p.reservado || 0);
      const disponible = fisico === null ? null : Math.max(0, fisico - reservado);
      const v14 = vendido[String(p._id)] || 0;
      const porDia = v14 / 14;
      return {
        id: p._id, nombre: p.nombre, categoria: p.categoria || '', foto: p.fotos && p.fotos[0] ? p.fotos[0].url : null,
        controla: fisico !== null, conVariantes,
        stock: fisico, reservado, disponible, minimo: esNumero(p.stockMinimo) ? p.stockMinimo : null, minimoEfectivo: umbral ?? umbralDefecto,
        estado: fisico === null ? 'sinControl' : estado,
        disponibleHoy: p.disponibleHoy !== false,
        variantes: (p.variantes || []).map((v) => ({ nombre: v.nombre, stock: esNumero(v.stock) ? v.stock : null, reservado: v.reservado || 0, disponible: esNumero(v.stock) ? Math.max(0, v.stock - (v.reservado || 0)) : null })),
        vendido14d: v14,
        diasRestantes: disponible !== null && porDia > 0 ? Math.floor(disponible / porDia) : null,
      };
    });

    // Reservas: pedidos que esperan confirmación y tienen unidades apartadas
    const reservas = await Pedido.find({ negocioId: negocio._id, estado: 'pendiente', 'reserva.estado': 'activa', esPrueba: { $ne: true } }).sort({ 'reserva.venceEn': 1 }).limit(30).lean();

    res.json({
      productos: lista,
      resumen: {
        controlados: lista.filter((p) => p.controla).length,
        sinControl: lista.filter((p) => !p.controla).length,
        agotados: lista.filter((p) => p.estado === 'agotado').length,
        bajos: lista.filter((p) => p.estado === 'bajo').length,
        unidadesApartadas: lista.reduce((a, p) => a + (p.reservado || 0), 0),
      },
      reservas: reservas.map((r) => ({ id: r._id, cliente: r.nombreCliente, venceEn: r.reserva.venceEn, items: r.items.map((i) => `${i.cantidad}x ${i.producto}${i.variante ? ' (' + i.variante + ')' : ''}`) })),
      config: { reservaMinutos: (negocio.inventario && negocio.inventario.reservaMinutos) || 90, umbralDefecto },
    });
  } catch (error) {
    console.error('Error en inventario:', error);
    res.status(500).json({ error: 'No se pudo cargar el inventario' });
  }
});

// POST /api/inventario/ajustar { productoId, variante?, nuevoStock? | delta?, nota? }
router.post('/ajustar', requiereAdmin, async (req, res) => {
  try {
    const { productoId, variante, nuevoStock, delta, nota } = req.body || {};
    const hayNuevo = nuevoStock !== undefined && nuevoStock !== null && nuevoStock !== '';
    if (!productoId || (!hayNuevo && !Number.isFinite(Number(delta)))) return res.status(400).json({ error: 'Faltan datos para ajustar el stock.' });
    const p = await ajustarStock(req.negocio._id, {
      productoId, variante: variante || '',
      nuevoStock: hayNuevo ? Number(nuevoStock) : undefined,
      delta: hayNuevo ? undefined : Number(delta),
      nota: String(nota || '').slice(0, 200),
    });
    res.json({ ok: true, stock: p.stock, variantes: p.variantes });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error ajustando stock:', error);
    res.status(500).json({ error: 'No se pudo ajustar el stock' });
  }
});

// PUT /api/inventario/producto/:id { stockMinimo?, controlar? }  -> aviso propio del producto, o dejar de controlar su stock
router.put('/producto/:id', requiereAdmin, async (req, res) => {
  try {
    const p = await Producto.findOne({ _id: req.params.id, negocioId: req.negocio._id });
    if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
    if (req.body.stockMinimo !== undefined) {
      const v = req.body.stockMinimo;
      p.stockMinimo = v === null || v === '' ? null : Math.max(0, Math.min(100000, Number(v) || 0));
    }
    if (req.body.controlar === false) { // deja de llevar el stock de este producto (el catálogo no se toca)
      p.stock = null; p.reservado = 0; p.alertaStock = 'ok';
      p.variantes.forEach((v) => { v.stock = null; v.reservado = 0; });
    }
    await p.save();
    await revisarAlertaStock(p, { silencioso: true });
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo guardar' });
  }
});

// GET /api/inventario/movimientos?productoId=&limit=
router.get('/movimientos', requiereAdmin, async (req, res) => {
  try {
    const filtro = { negocioId: req.negocio._id };
    if (req.query.productoId) filtro.productoId = req.query.productoId;
    const limite = Math.min(100, Math.max(1, Number(req.query.limit) || 40));
    const movs = await MovimientoStock.find(filtro).sort({ createdAt: -1 }).limit(limite).lean();
    res.json(movs.map((m) => ({ id: m._id, producto: m.productoNombre, variante: m.variante, tipo: m.tipo, cantidad: m.cantidad, stock: m.stockResultante, nota: m.nota, fecha: m.createdAt })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo cargar el historial' });
  }
});

module.exports = router;
