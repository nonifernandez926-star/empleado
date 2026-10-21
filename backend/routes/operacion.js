const express = require('express');
const router = express.Router();
const { requiereAdmin } = require('../middleware/auth');

const num = (v, min, max, def) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
const numONull = (v, max) => (v === null || v === '' || v === undefined || !Number.isFinite(Number(v)) || Number(v) < 0 ? null : Math.min(max, Number(v)));
const COLOR = /^#[0-9a-fA-F]{6}$/;

// GET /api/operacion -> los ajustes de inventario, costos, calidad, chat y avisos de pedidos pendientes
router.get('/', requiereAdmin, (req, res) => {
  const n = req.negocio;
  res.json({
    inventario: { reservaMinutos: (n.inventario && n.inventario.reservaMinutos) || 90, umbralDefecto: (n.inventario && n.inventario.umbralDefecto) ?? 3 },
    finanzas: { costoEntrega: n.finanzas ? n.finanzas.costoEntrega ?? null : null, costoEmbalaje: n.finanzas ? n.finanzas.costoEmbalaje ?? null : null, comisionPct: (n.finanzas && n.finanzas.comisionPct) || 0, envioCobrado: !!(n.finanzas && n.finanzas.envioCobrado) },
    calidad: { auto: !n.calidad || n.calidad.auto !== false, frecuencia: (n.calidad && n.calidad.frecuencia) || 'semanal' },
    chat: { colorMarca: (n.chat && n.chat.colorMarca) || '', fondosExclusivos: !n.chat || n.chat.fondosExclusivos !== false, bienvenida: (n.chat && n.chat.bienvenida) || '' },
    avisoPedidoPendienteMin: typeof n.avisoPedidoPendienteMin === 'number' ? n.avisoPedidoPendienteMin : 10,
    zonasDelivery: n.zonasDelivery || [],
  });
});

// PUT /api/operacion  (se manda solo lo que cambia)
router.put('/', requiereAdmin, async (req, res) => {
  try {
    const n = req.negocio; const b = req.body || {};
    if (b.inventario) {
      n.inventario = n.inventario || {};
      if (b.inventario.reservaMinutos !== undefined) n.inventario.reservaMinutos = num(b.inventario.reservaMinutos, 10, 1440, 90);
      if (b.inventario.umbralDefecto !== undefined) n.inventario.umbralDefecto = num(b.inventario.umbralDefecto, 0, 1000, 3);
    }
    if (b.finanzas) {
      n.finanzas = n.finanzas || {};
      if (b.finanzas.costoEntrega !== undefined) n.finanzas.costoEntrega = numONull(b.finanzas.costoEntrega, 1e7);
      if (b.finanzas.costoEmbalaje !== undefined) n.finanzas.costoEmbalaje = numONull(b.finanzas.costoEmbalaje, 1e7);
      if (b.finanzas.comisionPct !== undefined) n.finanzas.comisionPct = num(b.finanzas.comisionPct, 0, 40, 0);
      if (b.finanzas.envioCobrado !== undefined) n.finanzas.envioCobrado = !!b.finanzas.envioCobrado;
    }
    if (b.calidad) {
      n.calidad = n.calidad || {};
      if (b.calidad.auto !== undefined) n.calidad.auto = !!b.calidad.auto;
      if (['diaria', 'semanal', 'manual'].includes(b.calidad.frecuencia)) n.calidad.frecuencia = b.calidad.frecuencia;
    }
    if (b.chat) {
      n.chat = n.chat || {};
      if (b.chat.colorMarca !== undefined) n.chat.colorMarca = COLOR.test(String(b.chat.colorMarca)) ? String(b.chat.colorMarca).toLowerCase() : '';
      if (b.chat.fondosExclusivos !== undefined) n.chat.fondosExclusivos = !!b.chat.fondosExclusivos;
      if (b.chat.bienvenida !== undefined) n.chat.bienvenida = String(b.chat.bienvenida || '').trim().slice(0, 160);
    }
    if (b.avisoPedidoPendienteMin !== undefined) n.avisoPedidoPendienteMin = num(b.avisoPedidoPendienteMin, 0, 240, 10);
    await n.save();
    res.json({ ok: true });
  } catch (error) {
    console.error('Error guardando ajustes de operación:', error);
    res.status(500).json({ error: 'No se pudo guardar' });
  }
});

module.exports = router;
