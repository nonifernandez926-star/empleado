const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Negocio = require('../models/Negocio');
const Conversacion = require('../models/Conversacion');

// Endpoints PRIVADOS para que el servidor de Mi Zona pueda consultar a Mi Asistente.
// Se protegen con una clave compartida (INTEGRACION_KEY, la misma en los dos servidores).
// Nunca devuelven códigos de administración ni datos de facturación.
function requiereClaveIntegracion(req, res, next) {
  const esperada = process.env.INTEGRACION_KEY;
  if (!esperada) return res.status(503).json({ error: 'La integración con Mi Zona no está configurada (falta INTEGRACION_KEY).' });

  const recibida = String(req.headers['x-integracion-key'] || '');
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Clave de integración inválida' });
  }
  next();
}

function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// POST /api/integracion/cuenta   { googleId, email }
// Mi Zona ya verificó el token de Google de la persona; acá solo buscamos si esa cuenta tiene un
// negocio en Mi Asistente y si su suscripción está vigente.
router.post('/cuenta', requiereClaveIntegracion, async (req, res) => {
  try {
    const { googleId, email } = req.body || {};
    if (!googleId && !email) return res.status(400).json({ error: 'Falta googleId o email' });

    const condiciones = [];
    if (googleId) condiciones.push({ googleId: String(googleId) });
    if (email) condiciones.push({ emailPropietario: new RegExp(`^${escaparRegex(String(email).trim())}$`, 'i') });

    const negocios = await Negocio.find({ $or: condiciones, activo: true });
    if (!negocios.length) return res.json({ existe: false, suscripcionActiva: false });

    const ahora = new Date();
    // Si tiene más de un negocio, nos quedamos con el que tenga la suscripción vigente más larga
    const vigentes = negocios
      .filter((n) => n.suscripcion.estado === 'activa' && n.suscripcion.fechaVencimiento && n.suscripcion.fechaVencimiento > ahora)
      .sort((x, y) => y.suscripcion.fechaVencimiento - x.suscripcion.fechaVencimiento);

    const elegido = vigentes[0] || negocios[0];
    res.json({
      existe: true,
      suscripcionActiva: vigentes.length > 0,
      fechaVencimiento: vigentes[0] ? vigentes[0].suscripcion.fechaVencimiento : null,
      plan: elegido.suscripcion.plan,
      codigoPublico: elegido.codigoPublico,
      nombreNegocio: elegido.formData?.nombreNegocio || '',
    });
  } catch (error) {
    console.error('Error en integración /cuenta:', error);
    res.status(500).json({ error: 'No se pudo consultar la cuenta' });
  }
});

// POST /api/integracion/estado-asistentes   { codigos: ["ABC123", ...] }
// Mi Zona pregunta cuáles de esos asistentes tienen la suscripción vigente, para mostrar el chat solo a los que pagaron.
router.post('/estado-asistentes', requiereClaveIntegracion, async (req, res) => {
  try {
    const codigos = Array.isArray(req.body?.codigos) ? req.body.codigos.map(String).slice(0, 300) : [];
    if (!codigos.length) return res.json({ estados: {} });
    const ahora = new Date();
    const negocios = await Negocio.find({ codigoPublico: { $in: codigos } });
    const estados = {};
    codigos.forEach((c) => { estados[c] = false; });
    negocios.forEach((n) => {
      estados[n.codigoPublico] = !!n.activo && n.suscripcion.estado === 'activa' &&
        !!n.suscripcion.fechaVencimiento && n.suscripcion.fechaVencimiento > ahora;
    });
    res.json({ estados });
  } catch (error) {
    console.error('Error en integración /estado-asistentes:', error);
    res.status(500).json({ error: 'No se pudo consultar el estado' });
  }
});

// POST /api/integracion/conversaciones-cliente   { sesionClienteId }
// Las conversaciones que una persona tuvo con los negocios (para que Mi Zona se las muestre de nuevo en cualquier
// dispositivo). Las conversaciones NUNCA se borran al vencer una suscripción: cuando el negocio vuelve a pagar,
// el asistente retoma el historial y reaparecen en la lista del cliente.
router.post('/conversaciones-cliente', requiereClaveIntegracion, async (req, res) => {
  try {
    const sesionClienteId = String(req.body?.sesionClienteId || '');
    if (!sesionClienteId) return res.json({ conversaciones: [] });
    const conversaciones = await Conversacion.find({ sesionClienteId }).sort({ updatedAt: -1 }).limit(40);
    const negocios = await Negocio.find({ _id: { $in: conversaciones.map((c) => c.negocioId) } }).select('codigoPublico');
    const codigoPorId = {};
    negocios.forEach((n) => { codigoPorId[String(n._id)] = n.codigoPublico; });

    // Si el cliente tuvo varias conversaciones con el mismo negocio, las juntamos en orden
    const porCodigo = {};
    conversaciones.forEach((c) => {
      const codigo = codigoPorId[String(c.negocioId)];
      if (!codigo) return;
      (porCodigo[codigo] = porCodigo[codigo] || []).push(...c.mensajes.map((m) => ({ rol: m.rol, contenido: m.contenido, fecha: m.fecha })));
    });
    res.json({
      conversaciones: Object.entries(porCodigo).map(([codigoPublico, mensajes]) => ({
        codigoPublico,
        mensajes: mensajes.sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).slice(-60),
      })),
    });
  } catch (error) {
    console.error('Error en integración /conversaciones-cliente:', error);
    res.status(500).json({ error: 'No se pudieron traer las conversaciones' });
  }
});

module.exports = router;
