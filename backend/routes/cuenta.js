const express = require('express');
const router = express.Router();
const { requiereAdmin } = require('../middleware/auth');
const Negocio = require('../models/Negocio');
const Usuario = require('../models/Usuario');
const Pedido = require('../models/Pedido');
const Turno = require('../models/Turno');
const Cliente = require('../models/Cliente');
const Conversacion = require('../models/Conversacion');
const Resena = require('../models/Resena');
const Producto = require('../models/Producto');
const PreguntaFrecuente = require('../models/PreguntaFrecuente');
const AgendaItem = require('../models/AgendaItem');
const PushSuscripcion = require('../models/PushSuscripcion');
const Consulta = require('../models/Consulta');
const ActividadSeguridad = require('../models/ActividadSeguridad');
const { generarTokenUsuario } = require('../utils/jwt');
const { hashearContrasena, verificarContrasena } = require('../utils/contrasenas');
const { permitir } = require('../utils/limitador');
const { nombreDispositivo } = require('../utils/dispositivo');
const { PREFS_DEFECTO, prefsDe, SESION_DUENO } = require('../utils/avisos');

let cloudinary = null;
try { cloudinary = require('../config/cloudinary').cloudinary; } catch (e) { /* sin Cloudinary configurado */ }

// Todas las rutas de acá son del dueño con sesión iniciada.
router.use(requiereAdmin);

async function usuarioDe(req) {
  if (!req.negocio.usuarioId) return null; // sesión antigua de negocio (sin cuenta de persona)
  return Usuario.findById(req.negocio.usuarioId);
}
const registrar = (usuario, tipo, req, metodo = '') =>
  ActividadSeguridad.create({ usuarioId: usuario._id, tipo, dispositivo: nombreDispositivo(req.headers['user-agent']), metodo }).catch(() => null);

// GET /api/cuenta/novedades -> centro de notificaciones del dueño.
// Nada se inventa: cada aviso sale de un dato real (un pedido, un turno, una reseña, una pregunta sin responder, tu suscripción...).
// Lo único que guarda el panel en el celular es cuáles ya leíste y cuáles borraste.
router.get('/novedades', async (req, res) => {
  try {
    const n = req.negocio;
    const id = n._id;
    const esTurnos = n.tipoOperacion === 'turnos';
    const hace14d = new Date(Date.now() - 14 * 86400000);
    const hoyISO = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10); // fecha en Argentina (UTC-3)
    const out = [];

    if (!esTurnos) {
      const pedidos = await Pedido.find({ negocioId: id, esPrueba: { $ne: true }, createdAt: { $gte: hace14d } }).sort({ createdAt: -1 }).limit(40);
      for (const p of pedidos) {
        const cant = (p.items || []).reduce((a, i) => a + i.cantidad, 0);
        out.push({
          id: `pedido:${p._id}`, tipo: 'pedido', destino: 'pedidos', pendiente: p.estado === 'pendiente',
          titulo: p.estado === 'pendiente' ? `Pedido nuevo de ${p.nombreCliente}` : `Pedido de ${p.nombreCliente}`,
          descripcion: `${cant} ${cant === 1 ? 'producto' : 'productos'}${p.total ? ` · $${Number(p.total).toLocaleString('es-AR')}` : ''} · ${p.tipoEntrega === 'delivery' ? 'delivery' : 'retira en el local'}`,
          fecha: p.createdAt,
        });
        if (p.estadoPago === 'comprobante_recibido' && p.comprobante && p.comprobante.fecha) {
          out.push({ id: `comprobante:${p._id}`, tipo: 'comprobante', destino: 'pedidos', pendiente: true, titulo: 'Comprobante de pago para revisar', descripcion: `${p.nombreCliente} adjuntó la transferencia. Confirmá si la plata llegó.`, fecha: p.comprobante.fecha });
        }
      }
    } else {
      const turnos = await Turno.find({ negocioId: id, esPrueba: { $ne: true }, origen: 'asistente', createdAt: { $gte: hace14d } }).sort({ createdAt: -1 }).limit(40);
      for (const t of turnos) {
        out.push({
          id: `turno:${t._id}:${t.estado}`, tipo: 'turno', destino: 'agenda', pendiente: t.estado === 'pendiente',
          titulo: t.estado === 'pendiente' ? `Turno por confirmar: ${t.nombreCliente}` : t.estado === 'cancelado' ? `Turno cancelado: ${t.nombreCliente}` : `Turno nuevo: ${t.nombreCliente}`,
          descripcion: `${t.fecha.split('-').reverse().slice(0, 2).join('/')} · ${t.hora} hs${t.motivo ? ` · ${t.motivo}` : ''}`,
          fecha: t.updatedAt || t.createdAt,
        });
      }
      const deHoy = await Turno.find({ negocioId: id, esPrueba: { $ne: true }, fecha: hoyISO, estado: 'confirmado', atencion: 'esperando' }).sort({ hora: 1 }).limit(10);
      for (const t of deHoy) {
        out.push({ id: `turnohoy:${t._id}:${hoyISO}`, tipo: 'agenda', destino: 'agenda', titulo: `Hoy ${t.hora} hs: ${t.nombreCliente}`, descripcion: t.motivo || 'Turno confirmado para hoy.', fecha: new Date(`${hoyISO}T06:00:00-03:00`) });
      }
    }

    const resenas = await Resena.find({ negocioId: id, createdAt: { $gte: hace14d } }).sort({ createdAt: -1 }).limit(15);
    for (const r of resenas) {
      out.push({
        id: `resena:${r._id}${r.comentario ? ':c' : ''}`, tipo: r.estrellas <= 2 ? 'alerta' : 'resena', destino: 'resenas',
        titulo: `${r.estrellas <= 2 ? 'Calificación baja' : 'Nueva calificación'}: ${'★'.repeat(r.estrellas)}${'☆'.repeat(5 - r.estrellas)}`,
        descripcion: r.comentario ? (r.comentario.length > 110 ? `${r.comentario.slice(0, 110)}…` : r.comentario) : `${r.nombreCliente || 'Un cliente'} calificó tu atención.`,
        fecha: r.updatedAt || r.createdAt,
      });
    }

    const preguntas = await PreguntaFrecuente.find({ negocioId: id, respuesta: '' }).sort({ createdAt: -1 }).limit(10);
    for (const q of preguntas) {
      out.push({ id: `pregunta:${q._id}`, tipo: 'pregunta', destino: 'preguntas', pendiente: true, titulo: 'Tu asistente no supo responder esto', descripcion: q.pregunta.length > 110 ? `${q.pregunta.slice(0, 110)}…` : q.pregunta, fecha: q.createdAt });
    }

    // suscripción: el id cambia solo al pasar de un umbral a otro, así el aviso reaparece como "sin leer" únicamente en esos momentos
    const s = n.suscripcion;
    const ahora = new Date();
    if (s.estado === 'prueba') {
      const quedan = Math.max(0, (s.limiteMensajesPrueba || 0) - (s.mensajesUsadosPrueba || 0));
      if (quedan <= 5) out.push({ id: `susc:prueba:${quedan}`, tipo: 'suscripcion', destino: 'planes', pendiente: true, titulo: quedan === 0 ? 'Se acabaron los mensajes de prueba' : `Te quedan ${quedan} ${quedan === 1 ? 'mensaje' : 'mensajes'} de prueba`, descripcion: 'Activá un plan para que tu asistente siga atendiendo a tus clientes.', fecha: ahora });
    } else if (s.fechaVencimiento) {
      const dias = Math.ceil((new Date(s.fechaVencimiento).getTime() - ahora.getTime()) / 86400000);
      if (s.estado === 'vencida' || dias <= 0) {
        out.push({ id: `susc:${new Date(s.fechaVencimiento).toISOString().slice(0, 10)}:0`, tipo: 'suscripcion', destino: 'planes', pendiente: true, titulo: 'Tu suscripción venció', descripcion: 'Tu asistente dejó de atender. Renová para volver a activarlo.', fecha: ahora });
      } else if (dias <= 7) {
        const umbral = dias <= 1 ? 1 : dias <= 3 ? 3 : 7;
        out.push({ id: `susc:${new Date(s.fechaVencimiento).toISOString().slice(0, 10)}:${umbral}`, tipo: 'suscripcion', destino: 'planes', titulo: dias === 1 ? 'Tu suscripción vence mañana' : `Tu suscripción vence en ${dias} días`, descripcion: 'Podés renovar cuando quieras: los meses nuevos se suman al tiempo que te queda.', fecha: ahora });
      }
    }

    const respuestas = await Consulta.find({ negocioId: id, estado: 'respondida', respuestaVista: false }).sort({ respondidaEn: -1 }).limit(5);
    for (const c of respuestas) {
      out.push({ id: `soporte:${c._id}`, tipo: 'soporte', destino: 'soporte', pendiente: true, titulo: 'Respondimos tu consulta', descripcion: c.respuesta.length > 110 ? `${c.respuesta.slice(0, 110)}…` : c.respuesta, fecha: c.respondidaEn || c.updatedAt });
    }

    const usuario = await usuarioDe(req);
    if (usuario) {
      const actual = nombreDispositivo(req.headers['user-agent']);
      const accesos = await ActividadSeguridad.find({ usuarioId: usuario._id, tipo: { $in: ['inicio_sesion', 'cambio_clave', 'cierre_global'] }, createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } }).sort({ createdAt: -1 }).limit(8);
      for (const a of accesos) {
        if (a.tipo === 'inicio_sesion' && a.dispositivo === actual) continue; // el propio dispositivo no es novedad
        out.push({
          id: `seg:${a._id}`, tipo: 'seguridad', destino: 'seguridad', fecha: a.createdAt,
          titulo: a.tipo === 'inicio_sesion' ? 'Inicio de sesión en otro dispositivo' : a.tipo === 'cambio_clave' ? 'Cambiaste tu contraseña' : 'Cerraste sesión en todos los dispositivos',
          descripcion: a.tipo === 'inicio_sesion' ? `${a.dispositivo}. Si no fuiste vos, cerrá las sesiones desde Seguridad.` : a.dispositivo,
        });
      }
    }

    out.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    res.json(out.slice(0, 80));
  } catch (error) {
    console.error('Error en /cuenta/novedades:', error.message);
    res.status(500).json({ error: 'No se pudieron leer las novedades.' });
  }
});

// GET /api/cuenta/resumen -> todo lo que Mi Asistente tiene de esta cuenta y de su negocio
router.get('/resumen', async (req, res) => {
  try {
    const n = req.negocio;
    const usuario = await usuarioDe(req);
    const id = n._id;
    const [conversaciones, clientes, pedidos, turnos, resenas, productos, preguntas, agenda, dispositivosPush] = await Promise.all([
      Conversacion.countDocuments({ negocioId: id }),
      Cliente.countDocuments({ negocioId: id }),
      Pedido.countDocuments({ negocioId: id, esPrueba: { $ne: true } }),
      Turno.countDocuments({ negocioId: id, esPrueba: { $ne: true } }),
      Resena.countDocuments({ negocioId: id }),
      Producto.countDocuments({ negocioId: id }),
      PreguntaFrecuente.countDocuments({ negocioId: id }),
      AgendaItem.countDocuments({ negocioId: id }),
      PushSuscripcion.countDocuments({ negocioId: id, sesionClienteId: SESION_DUENO }),
    ]);
    const pruebas = (await Pedido.countDocuments({ negocioId: id, esPrueba: true })) + (await Turno.countDocuments({ negocioId: id, esPrueba: true }));
    res.json({
      cuenta: {
        nombre: usuario ? usuario.nombre : '',
        email: usuario ? usuario.email : n.emailPropietario || '',
        proveedor: usuario ? usuario.proveedor : 'google',
        creadaEn: usuario ? usuario.createdAt : n.createdAt,
        conClave: !!(usuario && usuario.passwordHash),
        conCuenta: !!usuario,
      },
      negocio: {
        nombre: (n.formData && n.formData.nombreNegocio) || 'Mi negocio',
        tipoOperacion: n.tipoOperacion,
        rubro: n.rubroCategoria,
        creadoEn: n.createdAt,
        suscripcion: {
          estado: n.suscripcion.estado,
          plan: n.suscripcion.plan,
          fechaVencimiento: n.suscripcion.fechaVencimiento,
          mensajesUsadosPrueba: n.suscripcion.mensajesUsadosPrueba,
          limiteMensajesPrueba: n.suscripcion.limiteMensajesPrueba,
        },
        memoriaActiva: n.memoriaActiva !== false,
        fotos: (n.fotos || []).length,
      },
      cantidades: { conversaciones, clientes, pedidos, turnos, resenas, productos, preguntas, agenda, pruebas },
      dispositivosPush,
    });
  } catch (error) {
    console.error('Error en /cuenta/resumen:', error.message);
    res.status(500).json({ error: 'No se pudo leer tu cuenta.' });
  }
});

// PUT /api/cuenta/nombre { nombre }
router.put('/nombre', async (req, res) => {
  try {
    const usuario = await usuarioDe(req);
    if (!usuario) return res.status(400).json({ error: 'Esta sesión no tiene una cuenta de persona asociada.' });
    const nombre = String(req.body?.nombre || '').replace(/\s+/g, ' ').trim();
    if (nombre.length < 2 || nombre.length > 60) return res.status(400).json({ error: 'Escribí tu nombre (entre 2 y 60 letras).' });
    usuario.nombre = nombre;
    await usuario.save();
    res.json({ nombre });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo guardar el nombre.' });
  }
});

// POST /api/cuenta/contrasena { actual, nueva }  (solo cuentas con correo y contraseña)
router.post('/contrasena', async (req, res) => {
  try {
    const usuario = await usuarioDe(req);
    if (!usuario) return res.status(400).json({ error: 'Esta sesión no tiene una cuenta de persona asociada.' });
    if (!usuario.passwordHash) return res.status(400).json({ error: 'Tu cuenta entra con Google: la contraseña se administra desde tu cuenta de Google.' });
    if (!permitir(`clave|${usuario._id}`, 8, 15 * 60 * 1000)) return res.status(429).json({ error: 'Demasiados intentos. Esperá unos minutos.' });
    const actual = String(req.body?.actual || '');
    const nueva = String(req.body?.nueva || '');
    if (!(await verificarContrasena(actual, usuario.passwordHash))) return res.status(401).json({ error: 'La contraseña actual no es correcta.' });
    if (nueva.length < 8) return res.status(400).json({ error: 'La contraseña nueva tiene que tener al menos 8 caracteres.' });
    if (nueva.length > 100) return res.status(400).json({ error: 'La contraseña es demasiado larga (máximo 100).' });
    if (nueva === actual) return res.status(400).json({ error: 'La contraseña nueva tiene que ser distinta de la actual.' });
    usuario.passwordHash = await hashearContrasena(nueva);
    usuario.tokenVersion = (usuario.tokenVersion || 0) + 1; // cierra las demás sesiones
    await usuario.save();
    await registrar(usuario, 'cambio_clave', req);
    res.json({ ok: true, token: generarTokenUsuario(usuario) }); // este dispositivo sigue adentro con el token nuevo
  } catch (error) {
    console.error('Error cambiando contraseña:', error.message);
    res.status(500).json({ error: 'No se pudo cambiar la contraseña.' });
  }
});

// POST /api/cuenta/cerrar-sesiones -> cierra la sesión en TODOS los demás dispositivos (este sigue adentro)
router.post('/cerrar-sesiones', async (req, res) => {
  try {
    const usuario = await usuarioDe(req);
    if (!usuario) return res.status(400).json({ error: 'Esta sesión no tiene una cuenta de persona asociada.' });
    usuario.tokenVersion = (usuario.tokenVersion || 0) + 1;
    await usuario.save();
    await registrar(usuario, 'cierre_global', req);
    res.json({ ok: true, token: generarTokenUsuario(usuario) });
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron cerrar las sesiones.' });
  }
});

// GET /api/cuenta/actividad -> movimientos de seguridad de los últimos 90 días
router.get('/actividad', async (req, res) => {
  const usuario = await usuarioDe(req);
  if (!usuario) return res.json([]);
  const filas = await ActividadSeguridad.find({ usuarioId: usuario._id }).sort({ createdAt: -1 }).limit(40);
  res.json(filas.map((f) => ({ id: f._id, tipo: f.tipo, dispositivo: f.dispositivo, metodo: f.metodo, fecha: f.createdAt })));
});

// GET / PUT /api/cuenta/notificaciones -> qué avisos recibe en el celular
router.get('/notificaciones', (req, res) => res.json(prefsDe(req.negocio)));
router.put('/notificaciones', async (req, res) => {
  const actuales = prefsDe(req.negocio);
  const nuevas = {};
  for (const k of Object.keys(PREFS_DEFECTO)) {
    nuevas[k] = typeof req.body?.[k] === 'boolean' ? req.body[k] : actuales[k];
  }
  await Negocio.updateOne({ _id: req.negocio._id }, { $set: { notificaciones: nuevas } });
  res.json(nuevas);
});

// GET /api/cuenta/descargar -> copia de todos los datos del negocio (JSON)
router.get('/descargar', async (req, res) => {
  try {
    const id = req.negocio._id;
    const negocio = req.negocio.toObject();
    delete negocio.codigoAdmin;
    const [pedidos, turnos, clientes, resenas, productos, preguntas, agenda, conversaciones] = await Promise.all([
      Pedido.find({ negocioId: id }).lean(), Turno.find({ negocioId: id }).lean(), Cliente.find({ negocioId: id }).lean(),
      Resena.find({ negocioId: id }).lean(), Producto.find({ negocioId: id }).lean(), PreguntaFrecuente.find({ negocioId: id }).lean(),
      AgendaItem.find({ negocioId: id }).lean(), Conversacion.find({ negocioId: id }).lean(),
    ]);
    const usuario = await usuarioDe(req);
    res.setHeader('Content-Disposition', 'attachment; filename="mis-datos-mi-asistente.json"');
    res.json({ generadoEn: new Date().toISOString(), cuenta: usuario ? { nombre: usuario.nombre, email: usuario.email, proveedor: usuario.proveedor, creadaEn: usuario.createdAt } : null, negocio, productos, pedidos, turnos, clientes, resenas, preguntas, agenda, conversaciones });
  } catch (error) {
    console.error('Error en descarga de datos:', error.message);
    res.status(500).json({ error: 'No se pudo preparar la descarga.' });
  }
});

// DELETE /api/cuenta/datos/:que  -> borra una parte de los datos (conversaciones | clientes | resenas | agenda | pruebas)
router.delete('/datos/:que', async (req, res) => {
  try {
    const id = req.negocio._id;
    let borrados = 0;
    switch (req.params.que) {
      case 'conversaciones': borrados = (await Conversacion.deleteMany({ negocioId: id })).deletedCount; break;
      case 'clientes': borrados = (await Cliente.deleteMany({ negocioId: id })).deletedCount; break;
      case 'resenas': borrados = (await Resena.deleteMany({ negocioId: id })).deletedCount; break;
      case 'agenda': borrados = (await AgendaItem.deleteMany({ negocioId: id })).deletedCount; break;
      case 'pruebas':
        borrados = (await Pedido.deleteMany({ negocioId: id, esPrueba: true })).deletedCount + (await Turno.deleteMany({ negocioId: id, esPrueba: true })).deletedCount;
        break;
      default: return res.status(400).json({ error: 'Dato desconocido.' });
    }
    res.json({ ok: true, borrados });
  } catch (error) {
    console.error('Error borrando datos:', error.message);
    res.status(500).json({ error: 'No se pudo borrar.' });
  }
});

// DELETE /api/cuenta { confirmacion, password? } -> elimina la cuenta, el negocio y TODOS sus datos
router.delete('/', async (req, res) => {
  try {
    const n = req.negocio;
    const usuario = await usuarioDe(req);
    const nombreNegocio = String((n.formData && n.formData.nombreNegocio) || '').trim();
    const confirmacion = String(req.body?.confirmacion || '').trim();
    if (!nombreNegocio || confirmacion.toLowerCase() !== nombreNegocio.toLowerCase()) {
      return res.status(400).json({ error: 'Para confirmar, escribí el nombre de tu negocio tal cual está.' });
    }
    if (usuario && usuario.passwordHash) {
      if (!permitir(`eliminar|${usuario._id}`, 5, 15 * 60 * 1000)) return res.status(429).json({ error: 'Demasiados intentos. Esperá unos minutos.' });
      if (!(await verificarContrasena(String(req.body?.password || ''), usuario.passwordHash))) return res.status(401).json({ error: 'La contraseña no es correcta.' });
    }
    const id = n._id;
    if (cloudinary) for (const f of n.fotos || []) { if (f.publicId) await cloudinary.uploader.destroy(f.publicId).catch(() => null); }
    await Promise.all([
      Pedido.deleteMany({ negocioId: id }), Turno.deleteMany({ negocioId: id }), Cliente.deleteMany({ negocioId: id }),
      Conversacion.deleteMany({ negocioId: id }), Resena.deleteMany({ negocioId: id }), Producto.deleteMany({ negocioId: id }),
      PreguntaFrecuente.deleteMany({ negocioId: id }), AgendaItem.deleteMany({ negocioId: id }),
      PushSuscripcion.deleteMany({ negocioId: id }), Consulta.deleteMany({ negocioId: id }),
    ]);
    await Negocio.deleteOne({ _id: id });
    if (usuario) { await ActividadSeguridad.deleteMany({ usuarioId: usuario._id }); await Usuario.deleteOne({ _id: usuario._id }); }
    res.json({ ok: true });
  } catch (error) {
    console.error('Error eliminando cuenta:', error.message);
    res.status(500).json({ error: 'No se pudo eliminar la cuenta. Probá de nuevo.' });
  }
});

module.exports = router;
