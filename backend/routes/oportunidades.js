const express = require('express');
const router = express.Router();
const Conversacion = require('../models/Conversacion');
const Cliente = require('../models/Cliente');
const RecuperacionPendiente = require('../models/RecuperacionPendiente');
const { requiereAdmin } = require('../middleware/auth');

// Arma un mensaje de recupero simple y controlado (sin llamar a la IA, para que sea
// predecible y no invente nada). Si hay una promo vigente, la menciona.
function armarMensajeRecuperacion(negocio, tipo) {
  const nombreNegocio = (negocio.formData && negocio.formData.nombreNegocio) || 'nuestro negocio';
  const promoVigente = (negocio.promociones || []).find((p) => p.activa);

  let mensaje;
  if (tipo === 'indeciso') {
    mensaje = `¡Hola! 👋 Vimos que hace poco preguntaste por ${nombreNegocio}.`;
  } else {
    mensaje = `¡Hola! 👋 Hace un tiempo que no hablamos, ¿cómo estás?`;
  }
  if (promoVigente) {
    mensaje += ` Te cuento que tenemos esta promo: ${promoVigente.titulo}${promoVigente.descripcion ? ' — ' + promoVigente.descripcion : ''}.`;
  }
  mensaje += ' ¿Querés que te ayude a resolverlo ahora?';
  return mensaje;
}

// GET /api/oportunidades?dias=7 -> lista clientes indecisos (hablaron, no compraron/reservaron)
// y clientes inactivos (ya compraron/reservaron antes, pero no volvieron a hablar hace "dias")
router.get('/', requiereAdmin, async (req, res) => {
  try {
    const dias = parseInt(req.query.dias, 10) || 7;
    const limite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

    // Todas las conversaciones del negocio, la más reciente de cada sesión
    const conversaciones = await Conversacion.aggregate([
      { $match: { negocioId: req.negocio._id } },
      { $sort: { updatedAt: -1 } },
      { $group: { _id: '$sesionClienteId', ultimaFecha: { $first: '$updatedAt' }, ultimoMensajeCliente: { $first: { $arrayElemAt: [{ $filter: { input: '$mensajes', as: 'm', cond: { $eq: ['$$m.rol', 'cliente'] } } }, -1] } } } },
    ]);

    const clientes = await Cliente.find({ negocioId: req.negocio._id });
    const sesionesConCliente = new Set(clientes.map((c) => c.sesionClienteId));

    // Indecisos: hablaron pero nunca llegaron a tener un Cliente (nunca completaron pedido/turno),
    // y ya pasó el tiempo mínimo elegido - si no, alguien escribiendo hace 2 minutos ya apareceria
    // como "abandonado" antes de siquiera terminar de preguntar.
    const indecisos = conversaciones
      .filter((c) => !sesionesConCliente.has(c._id))
      .filter((c) => new Date(c.ultimaFecha) < limite)
      .map((c) => ({
        sesionClienteId: c._id,
        ultimaFecha: c.ultimaFecha,
        ultimoMensaje: c.ultimoMensajeCliente ? c.ultimoMensajeCliente.contenido : '',
      }))
      .sort((a, b) => new Date(b.ultimaFecha) - new Date(a.ultimaFecha));

    // Inactivos: ya son clientes (compraron/reservaron antes) pero su última conversación es vieja
    const conversacionPorSesion = {};
    conversaciones.forEach((c) => { conversacionPorSesion[c._id] = c; });

    const inactivos = clientes
      .filter((c) => c.totalPedidos > 0 || c.totalTurnos > 0)
      .map((c) => {
        const conv = conversacionPorSesion[c.sesionClienteId];
        return {
          sesionClienteId: c.sesionClienteId,
          nombre: c.nombre,
          telefono: c.telefono,
          totalPedidos: c.totalPedidos,
          totalTurnos: c.totalTurnos,
          ultimaFecha: conv ? conv.ultimaFecha : c.updatedAt,
        };
      })
      .filter((c) => new Date(c.ultimaFecha) < limite)
      .sort((a, b) => new Date(a.ultimaFecha) - new Date(b.ultimaFecha));

    // Marcamos si ya tienen un mensaje de recupero preparado sin enviar todavía
    const pendientes = await RecuperacionPendiente.find({ negocioId: req.negocio._id, enviado: false });
    const sesionesConPendiente = new Set(pendientes.map((p) => p.sesionClienteId));

    indecisos.forEach((c) => { c.recuperacionPendiente = sesionesConPendiente.has(c.sesionClienteId); });
    inactivos.forEach((c) => { c.recuperacionPendiente = sesionesConPendiente.has(c.sesionClienteId); });

    res.json({ indecisos, inactivos, diasUmbral: dias });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al calcular oportunidades' });
  }
});

// POST /api/oportunidades/recuperar -> prepara el mensaje de recupero para UN cliente puntual
router.post('/recuperar', requiereAdmin, async (req, res) => {
  try {
    const { sesionClienteId, tipo } = req.body;
    if (!sesionClienteId || !['indeciso', 'inactivo'].includes(tipo)) {
      return res.status(400).json({ error: 'Faltan datos válidos' });
    }

    const mensaje = armarMensajeRecuperacion(req.negocio, tipo);
    await RecuperacionPendiente.findOneAndUpdate(
      { negocioId: req.negocio._id, sesionClienteId },
      { mensaje, tipo, enviado: false },
      { upsert: true, new: true }
    );

    res.json({ mensaje: 'Mensaje de recuperación preparado. Se va a entregar apenas ese cliente vuelva a escribir.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al preparar la recuperación' });
  }
});

// POST /api/oportunidades/recuperar-todos -> prepara el mensaje para TODA la lista actual (indecisos o inactivos)
router.post('/recuperar-todos', requiereAdmin, async (req, res) => {
  try {
    const { tipo, sesiones } = req.body;
    if (!['indeciso', 'inactivo'].includes(tipo) || !Array.isArray(sesiones) || !sesiones.length) {
      return res.status(400).json({ error: 'Faltan datos válidos' });
    }

    const mensaje = armarMensajeRecuperacion(req.negocio, tipo);
    await Promise.all(sesiones.map((sesionClienteId) =>
      RecuperacionPendiente.findOneAndUpdate(
        { negocioId: req.negocio._id, sesionClienteId },
        { mensaje, tipo, enviado: false },
        { upsert: true }
      )
    ));

    res.json({ mensaje: `Se prepararon ${sesiones.length} mensaje(s) de recuperación.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al preparar las recuperaciones' });
  }
});

module.exports = router;
