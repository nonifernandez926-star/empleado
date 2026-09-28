const express = require('express');
const router = express.Router();
const Conversacion = require('../models/Conversacion');
const Pedido = require('../models/Pedido');
const Turno = require('../models/Turno');
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

    const esTurnos = req.negocio.tipoOperacion === 'turnos';
    const ModeloOperacion = esTurnos ? Turno : Pedido;

    const [conversacionesHoy, pedidosHoy] = await Promise.all([
      Conversacion.find({ negocioId, createdAt: { $gte: inicioHoy, $lte: finHoy } }),
      ModeloOperacion.find({ negocioId, createdAt: { $gte: inicioHoy, $lte: finHoy }, esPrueba: { $ne: true } }),
    ]);

    // Facturación de hoy (solo suma los pedidos que tienen total calculado, porque
    // algunos negocios no informan precios y ahí no hay total)
    const facturacionHoy = pedidosHoy.reduce((acc, p) => acc + (p.total || 0), 0);
    const pedidosConTotal = pedidosHoy.filter((p) => p.total).length;

    // Producto más pedido hoy
    const conteoProductos = {};
    pedidosHoy.forEach((p) => {
      (p.items || []).forEach((item) => {
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
    const pedidosSemana = await ModeloOperacion.find({ negocioId, createdAt: { $gte: hace7Dias, $lte: finHoy }, esPrueba: { $ne: true } });

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

    // ---- Datos para los gráficos del Inicio (últimos 30 días, sin contar pedidos/turnos de prueba) ----
    const hace30Dias = new Date(inicioHoy);
    hace30Dias.setDate(hace30Dias.getDate() - 29);

    const contar = (lista, clave) => {
      const conteo = {};
      lista.forEach((x) => { const k = clave(x); if (k) conteo[k] = (conteo[k] || 0) + 1; });
      return Object.entries(conteo).map(([nombre, valor]) => ({ nombre, valor })).sort((a, b) => b.valor - a.valor);
    };

    let distribuciones = {};
    if (req.negocio.tipoOperacion === 'turnos') {
      const turnos30 = await Turno.find({ negocioId, createdAt: { $gte: hace30Dias, $lte: finHoy }, esPrueba: { $ne: true } });
      distribuciones = {
        estado: contar(turnos30, (t) => t.estado),
        motivo: contar(turnos30, (t) => t.motivo || 'Sin motivo'),
        profesional: contar(turnos30, (t) => t.profesional || ''),
      };
    } else {
      const pedidos30 = await Pedido.find({ negocioId, createdAt: { $gte: hace30Dias, $lte: finHoy }, esPrueba: { $ne: true } });
      const conteoProd = {};
      pedidos30.forEach((p) => p.items.forEach((i) => { conteoProd[i.producto] = (conteoProd[i.producto] || 0) + i.cantidad; }));
      const productosOrdenados = Object.entries(conteoProd).map(([nombre, valor]) => ({ nombre, valor })).sort((a, b) => b.valor - a.valor);
      const top5 = productosOrdenados.slice(0, 5);
      const otros = productosOrdenados.slice(5).reduce((acc, p) => acc + p.valor, 0);
      if (otros > 0) top5.push({ nombre: 'Otros', valor: otros });

      distribuciones = {
        estado: contar(pedidos30, (p) => p.estado),
        entrega: contar(pedidos30, (p) => p.tipoEntrega),
        pago: contar(pedidos30, (p) => String(p.formaPago || '').trim().toLowerCase()),
        productos: top5,
      };
    }

    // Ingresos por día de los últimos 7 días (mismo orden que pedidosUltimos7Dias)
    const ingresosUltimos7Dias = pedidosUltimos7Dias.map((d, idx) => {
      const dia = new Date(inicioHoy);
      dia.setDate(dia.getDate() - (6 - idx));
      const diaSiguiente = new Date(dia);
      diaSiguiente.setDate(diaSiguiente.getDate() + 1);
      const monto = pedidosSemana
        .filter((p) => p.createdAt >= dia && p.createdAt < diaSiguiente)
        .reduce((acc, p) => acc + (p.total || 0), 0);
      return { etiqueta: d.etiqueta, monto };
    });

    // Conversaciones por hora del día (últimos 30 días), en hora Argentina
    const conversaciones30 = await Conversacion.find({ negocioId, createdAt: { $gte: hace30Dias, $lte: finHoy } }).select('createdAt');
    const actividadPorHora = new Array(24).fill(0);
    conversaciones30.forEach((c) => {
      const h = Number(new Date(c.createdAt).toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires', hour: 'numeric', hour12: false })) % 24;
      actividadPorHora[h] += 1;
    });

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
      ingresosUltimos7Dias,
      actividadPorHora,
      distribuciones,
      tipoOperacion: req.negocio.tipoOperacion,
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
