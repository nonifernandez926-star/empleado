
const express = require('express');
const router = express.Router();
const Conversacion = require('../models/Conversacion');
const Pedido = require('../models/Pedido');
const { requiereAdmin } = require('../middleware/auth');

// GET /api/estadisticas -> resumen general (histórico) para el panel del negocio
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

// GET /api/estadisticas/resumen -> resumen del día de hoy: conversaciones, pedidos,
// facturación, producto más pedido, franja horaria pico y preguntas sin respuesta.
router.get('/resumen', requiereAdmin, async (req, res) => {
  try {
    const negocioId = req.negocio._id;

    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);
    const finHoy = new Date();
    finHoy.setHours(23, 59, 59, 999);

    const [conversacionesHoy, pedidosHoy] = await Promise.all([
      Conversacion.find({ negocioId, createdAt: { $gte: inicioHoy, $lte: finHoy } }),
      Pedido.find({ negocioId, createdAt: { $gte: inicioHoy, $lte: finHoy } }),
    ]);

    // Facturación de hoy (solo suma los pedidos que tienen total calculado, porque
    // algunos negocios no informan precios y ahí no hay total)
    const facturacionHoy = pedidosHoy.reduce((acc, p) => acc + (p.total || 0), 0);
    const pedidosConTotal = pedidosHoy.filter((p) => p.total).length;

    // Producto más pedido hoy
    const conteoProductos = {};
    pedidosHoy.forEach((p) => {
      p.items.forEach((item) => {
        conteoProductos[item.producto] = (conteoProductos[item.producto] || 0) + item.cantidad;
      });
    });
    const productoMasPedido = Object.entries(conteoProductos).sort((a, b) => b[1] - a[1])[0];

    // Franja horaria con más conversaciones iniciadas hoy
    const conteoHoras = {};
    conversacionesHoy.forEach((c) => {
      const hora = new Date(c.createdAt).getHours();
      conteoHoras[hora] = (conteoHoras[hora] || 0) + 1;
    });
    const horaPicoEntry = Object.entries(conteoHoras).sort((a, b) => b[1] - a[1])[0];
    const horaPico = horaPicoEntry ? `${horaPicoEntry[0]}:00 - ${Number(horaPicoEntry[0]) + 1}:00` : null;

    // Preguntas sin respuesta de hoy (mensajes del cliente marcados por el asistente)
    const preguntasSinRespuestaHoy = [];
    conversacionesHoy.forEach((c) => {
      c.mensajes.forEach((m) => {
        if (m.rol === 'cliente' && m.sinRespuesta) {
          preguntasSinRespuestaHoy.push({ texto: m.contenido, fecha: m.fecha });
        }
      });
    });

    // Pedidos por día de los últimos 7 días (para el gráfico de barras del panel)
    const hace7Dias = new Date(inicioHoy);
    hace7Dias.setDate(hace7Dias.getDate() - 6);
    const pedidosSemana = await Pedido.find({ negocioId, createdAt: { $gte: hace7Dias, $lte: finHoy } });

    const pedidosUltimos7Dias = [];
    for (let i = 6; i >= 0; i--) {
      const dia = new Date(inicioHoy);
      dia.setDate(dia.getDate() - i);
      const diaSiguiente = new Date(dia);
      diaSiguiente.setDate(diaSiguiente.getDate() + 1);

      const cantidad = pedidosSemana.filter((p) => p.createdAt >= dia && p.createdAt < diaSiguiente).length;
      pedidosUltimos7Dias.push({
        etiqueta: dia.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', ''),
        cantidad,
      });
    }

    res.json({
      fecha: inicioHoy.toISOString().slice(0, 10),
      conversacionesHoy: conversacionesHoy.length,
      pedidosHoy: pedidosHoy.length,
      facturacionHoy,
      pedidosConTotal,
      productoMasPedido: productoMasPedido ? { nombre: productoMasPedido[0], cantidad: productoMasPedido[1] } : null,
      horaPico,
      preguntasSinRespuestaHoy: preguntasSinRespuestaHoy.slice(-10).reverse(),
      pedidosUltimos7Dias,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar el resumen diario' });
  }
});

// GET /api/estadisticas/preguntas-sin-respuesta -> historial completo (últimos 30) para revisar y mejorar la info del negocio
router.get('/preguntas-sin-respuesta', requiereAdmin, async (req, res) => {
  try {
    const negocioId = req.negocio._id;
    const conversaciones = await Conversacion.find({ negocioId }).sort({ updatedAt: -1 }).limit(50);

    const preguntas = [];
    conversaciones.forEach((c) => {
      c.mensajes.forEach((m) => {
        if (m.rol === 'cliente' && m.sinRespuesta) {
          preguntas.push({ texto: m.contenido, fecha: m.fecha });
        }
      });
    });

    preguntas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    res.json(preguntas.slice(0, 30));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener preguntas sin respuesta' });
  }
});

module.exports = router;
