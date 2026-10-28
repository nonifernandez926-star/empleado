const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Negocio = require('../models/Negocio');
const Conversacion = require('../models/Conversacion');
const Cliente = require('../models/Cliente');
const Pedido = require('../models/Pedido');
const Turno = require('../models/Turno');
const Resena = require('../models/Resena');
const RecuperacionPendiente = require('../models/RecuperacionPendiente');
const PushSuscripcion = require('../models/PushSuscripcion');
const { cloudinary } = require('../config/cloudinary');
const Reclamo = require('../models/Reclamo');
const { avisarDueno } = require('../utils/avisos');

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

    // Mi Zona confirmó que esta MISMA cuenta (Google / correo) también está en Mi Zona: se habilitan las funciones que dependen de ella
    await Negocio.updateMany({ _id: { $in: negocios.map((n) => n._id) } }, { $set: { 'miZona.vinculado': true, 'miZona.ultimaConexion': new Date() } });

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

// ---------- Reclamos, devoluciones y cambios (los crea el cliente en Mi Zona) ----------
const TIPOS = ['reclamo', 'devolucion', 'cambio'];
const MOTIVOS = ['mal_estado', 'no_llego', 'incorrecto', 'calidad', 'demora', 'atencion', 'otro'];
const urlSegura = (u) => { try { const x = new URL(String(u)); return x.protocol === 'https:' ? x.toString().slice(0, 500) : null; } catch (e) { return null; } };
const texto = (v, n) => String(v == null ? '' : v).trim().slice(0, n);

// POST /api/integracion/reclamos
// { codigoPublico, refExterna, cliente:{ref, usuario}, tipo, motivo, producto, pedidoRef, monto, esComida, descripcion, fotos:[https://...] }
// Es idempotente: si Mi Zona reenvía el mismo refExterna, devuelve el que ya existe.
router.post('/reclamos', requiereClaveIntegracion, async (req, res) => {
  try {
    const b = req.body || {};
    const negocio = await Negocio.findOne({ codigoPublico: texto(b.codigoPublico, 40), activo: true });
    if (!negocio) return res.status(404).json({ error: 'Negocio no encontrado' });
    const refExterna = texto(b.refExterna, 80);
    if (!refExterna) return res.status(400).json({ error: 'Falta refExterna' });
    if (!TIPOS.includes(b.tipo)) return res.status(400).json({ error: 'Tipo inválido' });
    const descripcion = texto(b.descripcion, 1500);
    if (descripcion.length < 10) return res.status(400).json({ error: 'La descripción es muy corta' });

    const existente = await Reclamo.findOne({ negocioId: negocio._id, refExterna });
    if (existente) return res.json({ id: existente._id, estado: existente.estado, duplicado: true });

    const fotos = (Array.isArray(b.fotos) ? b.fotos : []).map(urlSegura).filter(Boolean).slice(0, 4).map((url) => ({ url }));
    const reclamo = await Reclamo.create({
      negocioId: negocio._id, refExterna,
      cliente: { ref: texto(b.cliente && b.cliente.ref, 80), usuario: texto(b.cliente && b.cliente.usuario, 40) },
      tipo: b.tipo, motivo: MOTIVOS.includes(b.motivo) ? b.motivo : 'otro',
      producto: texto(b.producto, 120), pedidoRef: texto(b.pedidoRef, 60),
      monto: Number.isFinite(Number(b.monto)) && Number(b.monto) >= 0 ? Number(b.monto) : undefined,
      esComida: !!b.esComida, descripcion, fotos,
    });
    await Negocio.updateOne({ _id: negocio._id }, { $set: { 'miZona.vinculado': true, 'miZona.ultimaConexion': new Date() } });
    const ETQ = { reclamo: 'un reclamo', devolucion: 'una devolución', cambio: 'un cambio' };
    avisarDueno(negocio._id, 'reclamos', { titulo: `Un cliente te hizo ${ETQ[reclamo.tipo]}`, cuerpo: `${reclamo.producto ? reclamo.producto + ' · ' : ''}${descripcion.slice(0, 90)}${fotos.length ? ' · con foto' : ''}`, url: '/admin.html?ir=reclamos' });
    res.status(201).json({ id: reclamo._id, estado: reclamo.estado });
  } catch (error) {
    console.error('Error en integración /reclamos:', error);
    res.status(500).json({ error: 'No se pudo registrar el reclamo' });
  }
});

// POST /api/integracion/reclamos/estado { refs: ["id1","id2"], codigoPublico? }
// Mi Zona consulta cómo van los reclamos de una persona (y lee la respuesta del dueño).
router.post('/reclamos/estado', requiereClaveIntegracion, async (req, res) => {
  try {
    const refs = (Array.isArray(req.body?.refs) ? req.body.refs : []).map((x) => texto(x, 80)).filter(Boolean).slice(0, 100);
    if (!refs.length) return res.json({ reclamos: [] });
    const lista = await Reclamo.find({ refExterna: { $in: refs } }).populate('negocioId', 'codigoPublico').lean();
    res.json({
      reclamos: lista.map((r) => ({
        refExterna: r.refExterna, codigoPublico: r.negocioId && r.negocioId.codigoPublico, estado: r.estado,
        respuesta: r.decision && r.decision.fecha ? { mensaje: r.decision.mensaje, solucion: r.decision.solucion, fecha: r.decision.fecha } : null,
      })),
    });
  } catch (error) {
    console.error('Error en integración /reclamos/estado:', error);
    res.status(500).json({ error: 'No se pudo consultar' });
  }
});

// POST /api/integracion/pedidos-cliente   { sesionClienteId }
// Los pedidos que hizo esa persona (de cualquier negocio) con su estado actual, para la pantalla "Mis pedidos" de Mi Zona.
// No incluye pedidos de prueba ni datos de contacto: solo lo que el cliente necesita ver.
router.post('/pedidos-cliente', requiereClaveIntegracion, async (req, res) => {
  try {
    const sesionClienteId = String(req.body?.sesionClienteId || '');
    if (!sesionClienteId) return res.json({ pedidos: [] });
    const pedidos = await Pedido.find({ sesionClienteId, esPrueba: { $ne: true } }).sort({ createdAt: -1 }).limit(60);
    const negocios = await Negocio.find({ _id: { $in: pedidos.map((p) => p.negocioId) } }).select('nombre codigoPublico');
    const porId = {};
    negocios.forEach((n) => { porId[String(n._id)] = { nombre: n.nombre, codigoPublico: n.codigoPublico }; });
    res.json({
      pedidos: pedidos.map((p) => ({
        id: String(p._id),
        negocio: porId[String(p.negocioId)] || { nombre: 'Negocio', codigoPublico: '' },
        estado: p.estado,
        items: (p.items || []).map((i) => ({ producto: i.producto, cantidad: i.cantidad, precioUnitario: i.precioUnitario })),
        total: p.total,
        tipoEntrega: p.tipoEntrega,
        direccionEntrega: p.direccionEntrega || '',
        formaPago: p.formaPago,
        estadoPago: p.estadoPago,
        pagoVerificado: !!p.pagoVerificado,
        observaciones: p.observaciones || '',
        creado: p.createdAt,
        actualizado: p.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error en integración /pedidos-cliente:', error);
    res.status(500).json({ error: 'No se pudieron traer los pedidos' });
  }
});

// POST /api/integracion/borrar-cliente   { sesionClienteId }
// Mi Zona lo llama cuando una persona elimina su cuenta (Google exige borrar los datos asociados). Se borra todo lo que es de la persona
// (chats, memoria del cliente, avisos, recuperaciones) y lo que el negocio necesita conservar para su propia gestión (pedidos, turnos y reseñas)
// queda SIN datos personales: sin nombre, teléfono, dirección ni vínculo con la cuenta. Es repetible: si se llama dos veces, la segunda no encuentra nada.
router.post('/borrar-cliente', requiereClaveIntegracion, async (req, res) => {
  try {
    const sesionClienteId = String(req.body?.sesionClienteId || '');
    // Solo ids con la forma que genera Mi Zona (evita que un valor vacío o genérico borre de más)
    if (!/^sesion-[a-f0-9]{16,64}$/i.test(sesionClienteId)) return res.status(400).json({ error: 'Id de cliente inválido' });
    const anonimo = `eliminado-${crypto.randomBytes(8).toString('hex')}`;
    const filtro = { sesionClienteId };

    const [conv, cli, rec, push] = await Promise.all([
      Conversacion.deleteMany(filtro),
      Cliente.deleteMany(filtro),
      RecuperacionPendiente.deleteMany(filtro),
      PushSuscripcion.deleteMany(filtro),
    ]);
    // Comprobantes de transferencia (fotos con datos bancarios de la persona): se borran de Cloudinary
    const conComprobante = await Pedido.find({ ...filtro, 'comprobante.publicId': { $exists: true, $ne: null } }).select('comprobante.publicId');
    let comprobantes = 0;
    for (const p of conComprobante) {
      try { await cloudinary.uploader.destroy(p.comprobante.publicId, { invalidate: true }); comprobantes++; }
      catch (e) { console.error('No se pudo borrar un comprobante de Cloudinary:', e.message); return res.status(502).json({ error: 'No se pudieron borrar los comprobantes' }); }
    }
    if (conComprobante.length) await Pedido.updateMany(filtro, { $unset: { comprobante: '' } });
    // Registros del negocio: se conservan, pero ya no dicen de quién son
    const [ped, tur, res_, recl] = await Promise.all([
      Pedido.updateMany(filtro, { $set: { sesionClienteId: anonimo, nombreCliente: 'Cliente eliminado', telefonoCliente: '', direccionEntrega: '', observaciones: '' } }),
      Turno.updateMany(filtro, { $set: { sesionClienteId: anonimo, nombreCliente: 'Cliente eliminado', telefonoCliente: '', notas: '' } }),
      Resena.updateMany(filtro, { $set: { sesionClienteId: anonimo, nombreCliente: '' } }),
      // Reclamos: el negocio conserva el caso (texto, respuesta), pero sin el vínculo con la cuenta ni el usuario; las fotos se quitan
      // (Mi Zona ya borró los archivos). Mi Zona manda el mismo sesionClienteId como cliente.ref al crear el reclamo.
      Reclamo.updateMany({ 'cliente.ref': sesionClienteId }, { $set: { 'cliente.ref': '', 'cliente.usuario': 'Cliente eliminado', fotos: [] } }),
    ]);
    res.json({
      ok: true,
      borrados: { conversaciones: conv.deletedCount || 0, clientes: cli.deletedCount || 0, recuperaciones: rec.deletedCount || 0, avisos: push.deletedCount || 0 },
      comprobantesBorrados: comprobantes,
      anonimizados: { pedidos: ped.modifiedCount || 0, turnos: tur.modifiedCount || 0, resenas: res_.modifiedCount || 0, reclamos: recl.modifiedCount || 0 },
    });
  } catch (error) {
    console.error('Error en integración /borrar-cliente:', error);
    res.status(500).json({ error: 'No se pudieron borrar los datos' });
  }
});

module.exports = router;
