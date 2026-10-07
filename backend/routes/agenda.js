const express = require('express');
const multer = require('multer');
const router = express.Router();
const AgendaItem = require('../models/AgendaItem');
const Turno = require('../models/Turno');
const Negocio = require('../models/Negocio');
const PushSuscripcion = require('../models/PushSuscripcion');
const { requiereAdmin } = require('../middleware/auth');
const { ahoraArgentina } = require('../utils/fila');
const { perfilAgenda } = require('../utils/agendaPerfiles');
const { interpretar, responderSobreAgenda } = require('../utils/agendaIA');
const { enviarPush } = require('../utils/push');
const { prefsDe } = require('../utils/avisos');

// Suscripción push del DUEÑO (no de un cliente): mismo modelo que ya existía para avisarle
// a los clientes, pero con este sesionClienteId fijo para distinguirlas.
const SESION_DUENO = '__dueno__';

// La foto de la agenda se analiza en memoria y se descarta: no se guarda en ningún lado
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const minutosDe = (hora) => { const [h, m] = hora.split(':').map(Number); return h * 60 + m; };
const sumarDias = (fecha, n) => { const d = new Date(`${fecha}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const nombreDia = (fecha) => DIAS[new Date(`${fecha}T12:00:00Z`).getUTCDay()];

// Las funciones con IA cuestan plata: un tope por negocio por hora (en memoria) evita abusos o loops
const usoIA = new Map();
function dentroDelLimiteIA(negocioId) {
  const ahora = Date.now();
  const lista = (usoIA.get(String(negocioId)) || []).filter((t) => ahora - t < 3600 * 1000);
  if (lista.length >= 40) return false;
  lista.push(ahora);
  usoIA.set(String(negocioId), lista);
  return true;
}

// Procesar una foto cuesta bastante más que un mensaje de texto, así que además del límite
// general de arriba, las fotos tienen su propio tope: 2 por día por negocio (hora argentina).
// Nota: como es en memoria, si el servidor se reinicia el conteo del día vuelve a cero
// (mismo límite que ya tenía el tope general de arriba).
const LIMITE_FOTOS_POR_DIA = 2;
const usoFotosIA = new Map(); // negocioId -> { fecha: 'YYYY-MM-DD', usadas: n }
function dentroDelLimiteFotos(negocioId) {
  const hoy = ahoraArgentina().fecha;
  const clave = String(negocioId);
  const actual = usoFotosIA.get(clave);
  if (!actual || actual.fecha !== hoy) {
    usoFotosIA.set(clave, { fecha: hoy, usadas: 1 });
    return true;
  }
  if (actual.usadas >= LIMITE_FOTOS_POR_DIA) return false;
  actual.usadas += 1;
  return true;
}
function validarIA(req, res) {
  if (!process.env.ANTHROPIC_API_KEY) { res.status(503).json({ error: 'La inteligencia artificial todavía no está configurada en el servidor.' }); return false; }
  if (req.negocio.suscripcion && req.negocio.suscripcion.estado === 'vencida') { res.status(402).json({ error: 'Tu suscripción está vencida: renovala para usar las funciones con IA.' }); return false; }
  if (!dentroDelLimiteIA(req.negocio._id)) { res.status(429).json({ error: 'Usaste muchas funciones con IA en poco tiempo. Probá de nuevo en un rato.' }); return false; }
  return true;
}

// Toma los datos que manda el panel y deja solo los campos permitidos, con formato válido
function sanearItem(b, parcial = false) {
  const out = {};
  if (!parcial || b.titulo !== undefined) {
    const titulo = String(b.titulo || '').replace(/\s+/g, ' ').trim().slice(0, 140);
    if (!titulo) return { error: 'Escribí un título.' };
    out.titulo = titulo;
  }
  if (b.tipo !== undefined) out.tipo = b.tipo === 'tarea' ? 'tarea' : 'evento';
  if (b.fecha !== undefined) {
    if (b.fecha === '' || b.fecha === null) out.fecha = undefined;
    else if (!RE_FECHA.test(b.fecha)) return { error: 'La fecha no es válida.' };
    else out.fecha = b.fecha;
  }
  if (b.hora !== undefined) {
    if (b.hora === '' || b.hora === null) out.hora = undefined;
    else if (!RE_HORA.test(b.hora)) return { error: 'La hora no es válida.' };
    else out.hora = b.hora;
  }
  if (b.duracionMinutos !== undefined) { const d = Number(b.duracionMinutos); out.duracionMinutos = Number.isFinite(d) ? Math.min(1440, Math.max(5, Math.round(d))) : 30; }
  if (b.persona !== undefined) out.persona = String(b.persona || '').trim().slice(0, 80);
  if (b.notas !== undefined) out.notas = String(b.notas || '').trim().slice(0, 600);
  if (b.categoria !== undefined) out.categoria = String(b.categoria || 'general').trim().slice(0, 40) || 'general';
  if (b.recordatorioMinutos !== undefined) {
    const r = Number(b.recordatorioMinutos);
    out.recordatorioMinutos = b.recordatorioMinutos === null || b.recordatorioMinutos === '' || !Number.isFinite(r) || r < 0 ? null : Math.min(r, 60 * 24 * 14);
    out.recordatorioEnviado = false; // si cambió el aviso, vuelve a quedar pendiente
  }
  if (b.origen !== undefined && ['manual', 'foto', 'mensaje'].includes(b.origen)) out.origen = b.origen;
  return { datos: out };
}

// Junta todo lo del día: eventos propios + turnos de clientes (si el negocio trabaja con turnos) + tareas pendientes
async function armarDia(negocio, fecha) {
  const negocioId = negocio._id;
  const [propios, tareas] = await Promise.all([
    AgendaItem.find({ negocioId, tipo: 'evento', fecha }).lean(),
    AgendaItem.find({ negocioId, tipo: 'tarea', completada: false, $or: [{ fecha: { $lte: fecha } }, { fecha: { $exists: false } }, { fecha: null }, { fecha: '' }] }).lean(),
  ]);

  let turnos = [];
  if (negocio.tipoOperacion === 'turnos') {
    const lista = await Turno.find({ negocioId, fecha, estado: { $in: ['pendiente', 'confirmado'] }, esPrueba: { $ne: true } }).lean();
    turnos = lista.map((t) => ({
      _id: `turno-${t._id}`, tipo: 'turno', titulo: `Turno: ${t.nombreCliente}`, fecha: t.fecha, hora: t.hora, duracionMinutos: t.duracionMinutos || 30,
      persona: t.nombreCliente, notas: [t.motivo, t.profesional].filter(Boolean).join(' · '), categoria: 'turno', soloLectura: true, estadoTurno: t.estado,
    }));
  }

  const eventos = [...propios, ...turnos].sort((a, b) => {
    if (!a.hora && !b.hora) return 0;
    if (!a.hora) return -1; // los "todo el día" van arriba
    if (!b.hora) return 1;
    return minutosDe(a.hora) - minutosDe(b.hora);
  });

  // Avisos: eventos que se pisan o que quedan con muy poco margen entre uno y otro
  const avisos = [];
  const conHora = eventos.filter((e) => e.hora);
  for (let i = 0; i < conHora.length - 1; i++) {
    const a = conHora[i], b = conHora[i + 1];
    const margen = minutosDe(b.hora) - (minutosDe(a.hora) + (a.duracionMinutos || 30));
    if (margen < 0) avisos.push(`"${a.titulo}" (${a.hora}) se superpone con "${b.titulo}" (${b.hora}).`);
    else if (margen < 30) avisos.push(`Tenés solo ${margen} min entre "${a.titulo}" y "${b.titulo}".`);
  }
  const vencidas = tareas.filter((t) => t.fecha && t.fecha < fecha);
  if (vencidas.length) avisos.push(`Tenés ${vencidas.length} ${vencidas.length === 1 ? 'tarea vencida' : 'tareas vencidas'} sin completar.`);

  return { fecha, diaSemana: nombreDia(fecha), eventos, tareas, vencidas: vencidas.length, avisos };
}

// GET /api/agenda/perfil -> tipos de evento y tareas sugeridas para el rubro del negocio
router.get('/perfil', requiereAdmin, (req, res) => {
  res.json(perfilAgenda(req.negocio.rubroCategoria));
});

// GET /api/agenda/hoy -> la vista "Hoy"
router.get('/hoy', requiereAdmin, async (req, res) => {
  try {
    res.json(await armarDia(req.negocio, ahoraArgentina().fecha));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo cargar tu día' });
  }
});

// GET /api/agenda/semana -> los próximos 7 días (eventos agrupados por día) + todas las tareas abiertas
router.get('/semana', requiereAdmin, async (req, res) => {
  try {
    const hoy = ahoraArgentina().fecha;
    const fechas = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i));
    const dias = [];
    for (const f of fechas) {
      const d = await armarDia(req.negocio, f);
      dias.push({ fecha: f, diaSemana: d.diaSemana, eventos: d.eventos });
    }
    const tareas = await AgendaItem.find({ negocioId: req.negocio._id, tipo: 'tarea', completada: false }).sort({ fecha: 1 }).lean();
    res.json({ dias, tareas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo cargar la semana' });
  }
});

// GET /api/agenda/tareas -> pendientes y las completadas hace poco
router.get('/tareas', requiereAdmin, async (req, res) => {
  try {
    const hace7 = new Date(Date.now() - 7 * 86400 * 1000);
    const [pendientes, hechas] = await Promise.all([
      AgendaItem.find({ negocioId: req.negocio._id, tipo: 'tarea', completada: false }).lean(),
      AgendaItem.find({ negocioId: req.negocio._id, tipo: 'tarea', completada: true, completadaEn: { $gte: hace7 } }).sort({ completadaEn: -1 }).limit(30).lean(),
    ]);
    // primero las que tienen fecha más cercana; las "sin fecha" al final
    pendientes.sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999'));
    res.json({ pendientes, hechas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudieron cargar las tareas' });
  }
});

// POST /api/agenda -> crear un evento o una tarea a mano
router.post('/', requiereAdmin, async (req, res) => {
  try {
    const { datos, error } = sanearItem(req.body || {});
    if (error) return res.status(400).json({ error });
    if ((datos.tipo || 'evento') === 'evento' && !datos.fecha) return res.status(400).json({ error: 'Un evento necesita una fecha.' });
    const item = await AgendaItem.create({ ...datos, negocioId: req.negocio._id });
    res.status(201).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo guardar' });
  }
});

// POST /api/agenda/guardar-propuestas -> guarda varios elementos a la vez, los que el dueño ya revisó y confirmó
router.post('/guardar-propuestas', requiereAdmin, async (req, res) => {
  try {
    const lista = Array.isArray(req.body?.items) ? req.body.items.slice(0, 40) : [];
    const origen = ['foto', 'mensaje'].includes(req.body?.origen) ? req.body.origen : 'manual';
    const docs = [];
    for (const x of lista) {
      const { datos, error } = sanearItem({ ...x, origen });
      if (error) continue;
      if ((datos.tipo || 'evento') === 'evento' && !datos.fecha) continue;
      docs.push({ ...datos, negocioId: req.negocio._id });
    }
    const creados = docs.length ? await AgendaItem.insertMany(docs) : [];
    res.status(201).json({ guardados: creados.length, omitidos: lista.length - creados.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo guardar' });
  }
});

// PUT /api/agenda/:id -> editar
router.put('/:id', requiereAdmin, async (req, res) => {
  try {
    const { datos, error } = sanearItem(req.body || {}, true);
    if (error) return res.status(400).json({ error });
    const item = await AgendaItem.findOneAndUpdate({ _id: req.params.id, negocioId: req.negocio._id }, { $set: datos }, { new: true });
    if (!item) return res.status(404).json({ error: 'No se encontró' });
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo guardar' });
  }
});

// PUT /api/agenda/:id/completar   { completada }
router.put('/:id/completar', requiereAdmin, async (req, res) => {
  try {
    const completada = req.body?.completada !== false;
    const item = await AgendaItem.findOneAndUpdate(
      { _id: req.params.id, negocioId: req.negocio._id },
      { $set: { completada, completadaEn: completada ? new Date() : undefined } },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'No se encontró' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo actualizar' });
  }
});

// DELETE /api/agenda/:id
router.delete('/:id', requiereAdmin, async (req, res) => {
  try {
    await AgendaItem.deleteOne({ _id: req.params.id, negocioId: req.negocio._id });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo eliminar' });
  }
});

// Recordatorios de un negocio que ya llegaron a su hora y todavía no se avisaron.
// La usan dos caminos distintos: el panel (mientras está abierto) y el cron de push (de fondo).
async function buscarRecordatoriosDebidos(negocioId) {
  const candidatos = await AgendaItem.find({
    negocioId, completada: false, recordatorioEnviado: false, recordatorioMinutos: { $ne: null }, fecha: { $exists: true, $ne: '' },
  }).lean();
  const ahora = Date.now();
  return candidatos.filter((i) => {
    const momento = Date.parse(`${i.fecha}T${i.hora || '09:00'}:00-03:00`); // Argentina no tiene horario de verano
    if (Number.isNaN(momento)) return false;
    return momento - i.recordatorioMinutos * 60000 <= ahora && momento + 6 * 3600000 >= ahora; // no avisamos de cosas que ya pasaron hace mucho
  });
}

// GET /api/agenda/recordatorios -> avisos que ya llegaron a su hora (el panel los consulta cada minuto y los muestra)
router.get('/recordatorios', requiereAdmin, async (req, res) => {
  try {
    const debidos = await buscarRecordatoriosDebidos(req.negocio._id);
    if (debidos.length) await AgendaItem.updateMany({ _id: { $in: debidos.map((d) => d._id) } }, { $set: { recordatorioEnviado: true } });
    res.json({ recordatorios: debidos.map((d) => ({ id: d._id, titulo: d.titulo, tipo: d.tipo, fecha: d.fecha, hora: d.hora, persona: d.persona })) });
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron revisar los recordatorios' });
  }
});

// POST /api/agenda/push-dueno -> el dueño activa notificaciones para SU agenda desde el panel
// (con su sesión de admin; usa un sesionClienteId fijo para no mezclarse con las de sus clientes).
router.post('/push-dueno', requiereAdmin, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) return res.status(400).json({ error: 'Falta la suscripción.' });
    await PushSuscripcion.findOneAndUpdate(
      { negocioId: req.negocio._id, endpoint: subscription.endpoint },
      { negocioId: req.negocio._id, sesionClienteId: SESION_DUENO, endpoint: subscription.endpoint, subscription },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo guardar la suscripción.' });
  }
});

// POST /api/agenda/recordatorios/enviar-push -> no la llama el navegador: la llama un cron externo
// (Render Cron Jobs, cron-job.org, etc.) cada 10-15 minutos. Recorre todos los negocios y, para los
// recordatorios ya vencidos, manda un push real si el dueño activó notificaciones. Si no las activó,
// NO lo marca como avisado: queda disponible para que el panel lo muestre si en algún momento lo abre.
router.post('/recordatorios/enviar-push', async (req, res) => {
  try {
    if (!process.env.CRON_SECRET || req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'No autorizado.' });
    }

    const negocios = await Negocio.find({ 'suscripcion.estado': { $in: ['prueba', 'activa'] } }).select('_id formData notificaciones');
    let enviados = 0;

    for (const negocio of negocios) {
      if (prefsDe(negocio).agenda === false) continue; // el dueño apagó los avisos de agenda: queda para el panel
      const debidos = await buscarRecordatoriosDebidos(negocio._id);
      if (!debidos.length) continue;

      const suscripciones = await PushSuscripcion.find({ negocioId: negocio._id, sesionClienteId: SESION_DUENO });
      if (!suscripciones.length) continue; // nadie activó avisos en el panel: lo deja para el fallback en pantalla

      const nombreNegocio = (negocio.formData && negocio.formData.nombreNegocio) || 'Tu agenda';
      for (const item of debidos) {
        const cuerpo = `${item.hora ? item.hora + ' — ' : ''}${item.titulo}${item.persona ? ' (' + item.persona + ')' : ''}`;
        let huboExito = false;
        await Promise.all(suscripciones.map(async (s) => {
          const resultado = await enviarPush(s.subscription, { titulo: nombreNegocio, cuerpo, url: '/admin.html' });
          if (resultado.ok) huboExito = true;
          if (resultado.expirada) await PushSuscripcion.deleteOne({ _id: s._id });
        }));
        if (huboExito) {
          await AgendaItem.updateOne({ _id: item._id }, { $set: { recordatorioEnviado: true } });
          enviados++;
        }
      }
    }

    res.json({ ok: true, recordatoriosEnviados: enviados });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudieron procesar los recordatorios.' });
  }
});

// POST /api/agenda/interpretar   { texto }  -> "El jueves a las 16 reunión con Martín" => eventos/tareas propuestos
router.post('/interpretar', requiereAdmin, async (req, res) => {
  try {
    const texto = String(req.body?.texto || '').trim().slice(0, 2500);
    if (texto.length < 3) return res.status(400).json({ error: 'Escribí qué querés agendar.' });
    if (!validarIA(req, res)) return;
    const r = await interpretar({ texto, hoy: ahoraArgentina().fecha, perfil: perfilAgenda(req.negocio.rubroCategoria) });
    res.json(r);
  } catch (error) {
    console.error('Error interpretando texto de agenda:', error.message);
    res.status(500).json({ error: 'No pude interpretar el mensaje. Probá de nuevo.' });
  }
});

// POST /api/agenda/interpretar-foto  (multipart, campo "foto") -> foto de una agenda de papel => eventos/tareas propuestos
router.post('/interpretar-foto', requiereAdmin, (req, res) => {
  upload.single('foto')(req, res, async (errorSubida) => {
    try {
      if (errorSubida) return res.status(400).json({ error: errorSubida.code === 'LIMIT_FILE_SIZE' ? 'La foto es muy pesada (máximo 5 MB).' : 'No se pudo recibir la foto.' });
      if (!req.file) return res.status(400).json({ error: 'Falta la foto.' });
      if (!TIPOS_IMAGEN.includes(req.file.mimetype)) return res.status(400).json({ error: 'Subí una imagen JPG, PNG o WEBP.' });
      if (!validarIA(req, res)) return;
      if (!dentroDelLimiteFotos(req.negocio._id)) {
        return res.status(429).json({ error: `Ya usaste tus ${LIMITE_FOTOS_POR_DIA} fotos de hoy. Probá de nuevo mañana, o cargá el evento a mano.` });
      }
      const r = await interpretar({
        imagenBase64: req.file.buffer.toString('base64'), mediaType: req.file.mimetype,
        hoy: ahoraArgentina().fecha, perfil: perfilAgenda(req.negocio.rubroCategoria),
      });
      res.json(r);
    } catch (error) {
      console.error('Error interpretando foto de agenda:', error.message);
      res.status(500).json({ error: 'No pude leer la foto. Probá con una más nítida y bien iluminada.' });
    }
  });
});

// POST /api/agenda/organizar-dia   { fecha? } -> resumen del día con avisos
router.post('/organizar-dia', requiereAdmin, async (req, res) => {
  try {
    const fecha = RE_FECHA.test(String(req.body?.fecha || '')) ? req.body.fecha : ahoraArgentina().fecha;
    const dia = await armarDia(req.negocio, fecha);
    const datos = {
      fecha, diaSemana: dia.diaSemana,
      eventos: dia.eventos.map((e) => ({ hora: e.hora || 'todo el día', duracionMin: e.duracionMinutos, titulo: e.titulo, persona: e.persona, notas: e.notas })),
      tareasPendientes: dia.tareas.slice(0, 20).map((t) => ({ titulo: t.titulo, fecha: t.fecha || 'sin fecha' })),
      avisosDetectados: dia.avisos,
    };

    // Texto de respaldo (sin IA), por si Claude no responde o no hay nada que organizar
    const respaldo = () => {
      if (!dia.eventos.length && !dia.tareas.length) return 'Tu día está libre: no tenés eventos ni tareas pendientes. 🎉';
      const lineas = [];
      dia.eventos.forEach((e) => lineas.push(`• ${e.hora || 'Todo el día'} — ${e.titulo}${e.persona ? ` (${e.persona})` : ''}`));
      if (dia.tareas.length) lineas.push(`• ${dia.tareas.length} ${dia.tareas.length === 1 ? 'tarea pendiente' : 'tareas pendientes'}`);
      dia.avisos.forEach((a) => lineas.push(`⚠️ ${a}`));
      return lineas.join('\n');
    };

    if (!dia.eventos.length && !dia.tareas.length) return res.json({ resumen: respaldo(), avisos: dia.avisos });
    let resumen = respaldo();
    if (process.env.ANTHROPIC_API_KEY && validarIA(req, { status: () => ({ json: () => {} }) })) {
      try {
        resumen = await responderSobreAgenda({
          instruccion: 'Organizá mi día: armá un plan corto en orden de horarios, marcá lo más urgente y advertime si hay poco tiempo entre una cosa y otra. Terminá con una frase de ánimo corta.',
          datos, hoy: fecha,
        }) || resumen;
      } catch (e) { console.error('Error organizando el día:', e.message); }
    }
    res.json({ resumen, avisos: dia.avisos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo organizar tu día' });
  }
});

// POST /api/agenda/preguntar   { pregunta } -> "¿Qué tengo pendiente esta semana?"
router.post('/preguntar', requiereAdmin, async (req, res) => {
  try {
    const pregunta = String(req.body?.pregunta || '').trim().slice(0, 300);
    if (pregunta.length < 3) return res.status(400).json({ error: 'Escribí tu pregunta.' });
    if (!validarIA(req, res)) return;
    const hoy = ahoraArgentina().fecha;
    const hasta = sumarDias(hoy, 30);
    const [eventos, tareas] = await Promise.all([
      AgendaItem.find({ negocioId: req.negocio._id, tipo: 'evento', fecha: { $gte: sumarDias(hoy, -2), $lte: hasta } }).sort({ fecha: 1, hora: 1 }).limit(80).lean(),
      AgendaItem.find({ negocioId: req.negocio._id, tipo: 'tarea', completada: false }).limit(80).lean(),
    ]);
    const datos = {
      hoy, diaSemanaHoy: nombreDia(hoy),
      eventos: eventos.map((e) => ({ fecha: e.fecha, dia: nombreDia(e.fecha), hora: e.hora || 'todo el día', titulo: e.titulo, persona: e.persona, notas: e.notas })),
      tareasPendientes: tareas.map((t) => ({ titulo: t.titulo, fecha: t.fecha || 'sin fecha', notas: t.notas })),
    };
    const respuesta = await responderSobreAgenda({ instruccion: `Respondé esta pregunta del dueño usando solo su agenda: "${pregunta}"`, datos, hoy });
    res.json({ respuesta: respuesta || 'No encontré nada en tu agenda para esa consulta.' });
  } catch (error) {
    console.error('Error respondiendo sobre la agenda:', error.message);
    res.status(500).json({ error: 'No pude consultar tu agenda en este momento.' });
  }
});

module.exports = router;
