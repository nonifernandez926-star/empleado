// Control de calidad del asistente.
// Revisa las conversaciones recientes de un negocio y detecta:
//   - respuestas INCORRECTAS (no coinciden con los datos reales del negocio)
//   - preguntas SIN RESPUESTA (el asistente no supo resolverlas)
//   - problemas RECURRENTES (la misma duda se repite)
//   - MEJORAS de trato o de cierre
// Cada caso trae un ATAJO para corregir la información del negocio (responder la pregunta, revisar un producto, horarios, etc.).
// Si no hay Claude disponible, igual se hace la parte de reglas (preguntas sin respuesta, repeticiones y reportes de clientes).
const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const Conversacion = require('../models/Conversacion');
const Producto = require('../models/Producto');
const PreguntaFrecuente = require('../models/PreguntaFrecuente');
const ReporteIA = require('../models/ReporteIA');
const CasoCalidad = require('../models/CasoCalidad');
const EvaluacionCalidad = require('../models/EvaluacionCalidad');
const Negocio = require('../models/Negocio');
const { avisarDueno } = require('./avisos');

const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
const MAX_CONVERSACIONES = 40;
const MAX_CHARS_ENTRADA = 26000;

const sinAcentos = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const huellaDe = (tipo, texto) => crypto.createHash('sha1').update(tipo + '|' + sinAcentos(texto).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70)).digest('hex').slice(0, 20);
// Privacidad: antes de mandar un texto a la IA se le sacan teléfonos, correos y números largos
const anonimizar = (t) => String(t || '').replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[correo]').replace(/\+?\d[\d\s().-]{6,}\d/g, '[número]');
const recortar = (t, n) => { t = String(t || '').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

// ---------- 1) Reglas (sin IA) ----------
async function casosPorReglas(negocio, conversaciones, desde) {
  const casos = [];
  // Preguntas que el asistente marcó como "no sé" (agrupadas por parecido)
  const grupos = new Map();
  for (const c of conversaciones) {
    c.mensajes.forEach((m, i) => {
      if (m.rol === 'cliente' && m.sinRespuesta) {
        const clave = sinAcentos(m.contenido).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2).slice(0, 5).join(' ');
        if (!clave) return;
        const g = grupos.get(clave) || { veces: 0, ejemplo: m.contenido, respuesta: (c.mensajes[i + 1] || {}).contenido || '' };
        g.veces++; grupos.set(clave, g);
      }
    });
  }
  const respondidas = await PreguntaFrecuente.find({ negocioId: negocio._id, respuesta: { $ne: '' } }).select('pregunta').lean();
  const yaRespondidas = new Set(respondidas.map((p) => sinAcentos(p.pregunta).replace(/[^a-z0-9 ]/g, ' ').trim()));
  for (const g of grupos.values()) {
    if (yaRespondidas.has(sinAcentos(g.ejemplo).replace(/[^a-z0-9 ]/g, ' ').trim())) continue;
    casos.push({
      tipo: g.veces >= 2 ? 'recurrente' : 'sin_respuesta', severidad: g.veces >= 3 ? 'alta' : 'media', origen: 'reglas', veces: g.veces,
      titulo: g.veces >= 2 ? `Varios clientes preguntaron lo mismo (${g.veces} veces)` : 'Un cliente hizo una pregunta que el asistente no supo responder',
      detalle: 'Si cargás la respuesta una vez, el asistente la va a usar con todos los clientes.',
      mensajeCliente: recortar(g.ejemplo, 300), respuestaAsistente: recortar(g.respuesta, 400),
      atajo: { tipo: 'faq', pregunta: recortar(g.ejemplo, 200), respuestaSugerida: '' },
    });
  }
  // Reportes que hicieron los clientes con el botón "Reportar"
  const reportes = await ReporteIA.find({ negocioId: negocio._id, estado: 'nuevo', createdAt: { $gte: desde } }).limit(10).lean();
  const MOTIVO = { incorrecta: 'Un cliente marcó una respuesta como incorrecta', ofensiva: 'Un cliente reportó una respuesta ofensiva', danina: 'Un cliente reportó una respuesta dañina', otro: 'Un cliente reportó una respuesta' };
  for (const r of reportes) {
    casos.push({
      tipo: 'reporte', severidad: r.motivo === 'incorrecta' ? 'alta' : 'media', origen: 'cliente', veces: 1,
      titulo: MOTIVO[r.motivo] || MOTIVO.otro, detalle: r.comentario ? `El cliente dijo: "${recortar(r.comentario, 200)}"` : 'Revisá si lo que dijo el asistente coincide con los datos de tu negocio.',
      respuestaAsistente: recortar(r.respuesta, 400), atajo: { tipo: r.motivo === 'incorrecta' ? 'info' : 'instrucciones' }, huellaExtra: String(r._id),
    });
  }
  return casos;
}

// ---------- 2) Revisión con IA ----------
async function datosDelNegocio(negocio) {
  const { formatearHorarios, formatearFormData } = require('./claude');
  const [productos, faqs] = await Promise.all([
    Producto.find({ negocioId: negocio._id, activo: true }).limit(80).lean(),
    PreguntaFrecuente.find({ negocioId: negocio._id, respuesta: { $ne: '' } }).limit(40).lean(),
  ]);
  const lineas = [];
  lineas.push('INFORMACIÓN: ' + recortar(formatearFormData(negocio.formData), 1800));
  lineas.push('HORARIOS: ' + formatearHorarios(negocio.horarios));
  if (negocio.disponibilidadHoy) lineas.push('NO DISPONIBLE HOY: ' + negocio.disponibilidadHoy);
  lineas.push('CATÁLOGO: ' + (productos.length ? productos.map((p) => `${p.nombre}${typeof p.precio === 'number' ? ' $' + p.precio : ''}${p.disponibleHoy === false ? ' [no disponible hoy]' : ''}${typeof p.stock === 'number' && p.stock - (p.reservado || 0) <= 0 ? ' [sin stock]' : ''}`).join('; ') : 'sin productos cargados'));
  const promos = (negocio.promociones || []).filter((x) => x.activa).map((x) => x.titulo);
  lineas.push('PROMOCIONES ACTIVAS: ' + (promos.join('; ') || 'ninguna'));
  const zonas = (negocio.zonasDelivery || []).map((z) => `${z.zona} $${z.precio}`);
  lineas.push('ZONAS DE DELIVERY: ' + (zonas.join('; ') || 'no cargadas'));
  if (faqs.length) lineas.push('RESPUESTAS CARGADAS POR EL DUEÑO: ' + faqs.map((f) => `"${recortar(f.pregunta, 80)}" → ${recortar(f.respuesta, 120)}`).join(' | '));
  return recortar(lineas.join('\n'), 9000);
}

function transcripciones(conversaciones) {
  let total = 0; const out = [];
  conversaciones.forEach((c, i) => {
    const msgs = c.mensajes.slice(-14).map((m) => `${m.rol === 'cliente' ? 'CLIENTE' : 'ASISTENTE'}: ${anonimizar(recortar(m.contenido, 400))}`).join('\n');
    const bloque = `--- Conversación ${i + 1} ---\n${msgs}`;
    if (total + bloque.length > MAX_CHARS_ENTRADA) return;
    total += bloque.length; out.push(bloque);
  });
  return out.join('\n\n');
}

const SISTEMA_AUDITOR = `Sos un auditor de calidad de asistentes virtuales de ventas para negocios pequeños. Recibís los DATOS REALES del negocio y conversaciones recientes entre clientes y el asistente.
Detectá SOLO problemas que se vean claramente en las conversaciones:
1) "incorrecta": el asistente dijo algo que contradice los datos (precio, horario, stock, promoción, zona, política) o inventó información o prometió algo que el negocio no ofrece.
2) "sin_respuesta": el cliente preguntó algo y el asistente no supo resolverlo o respondió con evasivas, aunque era algo que el negocio podría responder.
3) "recurrente": la misma duda o confusión aparece en varias conversaciones.
4) "mejora": una respuesta floja de trato o de cierre que probablemente hizo perder una venta (usalo poco).
Para cada caso indicá el ATAJO para corregirlo: "faq" (el dueño responde la pregunta una vez), "producto" (revisar un producto o su precio), "horarios", "info" (datos del negocio: dirección, medios de pago, etc.) o "instrucciones" (cómo debe comportarse). Si es "faq" y los datos del negocio alcanzan para redactar la respuesta, escribí un borrador en "respuestaSugerida"; si no alcanzan, dejalo vacío (NUNCA inventes datos).
Respondé SOLO con JSON válido, sin texto extra ni bloques de código:
{"puntaje":0-100,"resumen":"máximo 220 caracteres, en español rioplatense, tranquilo y concreto","casos":[{"tipo":"incorrecta|sin_respuesta|recurrente|mejora","severidad":"alta|media|baja","titulo":"máximo 100 caracteres","detalle":"qué pasó y por qué importa, máximo 280 caracteres","mensajeCliente":"texto textual del cliente","respuestaAsistente":"texto textual del asistente","veces":1,"atajo":{"tipo":"faq|producto|horarios|info|instrucciones|ninguno","producto":"nombre si aplica","pregunta":"si es faq: la pregunta","respuestaSugerida":"si es faq y hay datos"}}]}
Máximo 12 casos, de más a menos grave. Si todo está bien devolvé "casos":[] y un puntaje alto. No incluyas datos personales de clientes. No repitas el mismo problema dos veces.`;

async function casosConIA(negocio, conversaciones) {
  if (!anthropic || !conversaciones.length) return null;
  const datos = await datosDelNegocio(negocio);
  const resp = await anthropic.messages.create({
    model: MODEL, max_tokens: 3500, system: SISTEMA_AUDITOR,
    messages: [{ role: 'user', content: `DATOS DEL NEGOCIO:\n${datos}\n\nCONVERSACIONES RECIENTES:\n${transcripciones(conversaciones)}` }],
  });
  const texto = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const m = texto.match(/\{[\s\S]*\}/);
  if (!m) return null;
  const j = JSON.parse(m[0]);
  const TIPOS = ['incorrecta', 'sin_respuesta', 'recurrente', 'mejora'];
  const SEV = ['alta', 'media', 'baja'];
  const ATAJOS = ['faq', 'producto', 'horarios', 'info', 'instrucciones', 'ninguno'];
  const casos = (Array.isArray(j.casos) ? j.casos : []).slice(0, 12).filter((c) => c && TIPOS.includes(c.tipo) && c.titulo).map((c) => ({
    tipo: c.tipo, severidad: SEV.includes(c.severidad) ? c.severidad : 'media', origen: 'ia', veces: Math.max(1, Number(c.veces) || 1),
    titulo: recortar(c.titulo, 140), detalle: recortar(c.detalle, 600), mensajeCliente: recortar(c.mensajeCliente, 500), respuestaAsistente: recortar(c.respuestaAsistente, 800),
    atajo: { tipo: ATAJOS.includes(c.atajo && c.atajo.tipo) ? c.atajo.tipo : 'ninguno', producto: recortar(c.atajo && c.atajo.producto, 100), pregunta: recortar(c.atajo && c.atajo.pregunta, 200), respuestaSugerida: recortar(c.atajo && c.atajo.respuestaSugerida, 600) },
  }));
  return { puntaje: Math.max(0, Math.min(100, Math.round(Number(j.puntaje)))), resumen: recortar(j.resumen, 240), casos };
}

// ---------- 3) Evaluar un negocio ----------
async function evaluarNegocio(negocio, { disparo = 'manual', dias = 7 } = {}) {
  const desde = new Date(Date.now() - dias * 86400000);
  const conversaciones = await Conversacion.find({ negocioId: negocio._id, updatedAt: { $gte: desde } }).sort({ updatedAt: -1 }).limit(MAX_CONVERSACIONES).lean();
  const reglas = await casosPorReglas(negocio, conversaciones, desde);
  let ia = null, usoIA = false;
  try { ia = await casosConIA(negocio, conversaciones); usoIA = !!ia; } catch (e) { console.error('Revisión con IA falló, se usan solo reglas:', e.message); }

  // Se juntan las dos listas sin repetir
  const todos = [...(ia ? ia.casos : []), ...reglas];
  let nuevos = 0, altas = 0;
  const vistos = new Set();
  for (const c of todos) {
    const huella = huellaDe(c.tipo === 'recurrente' || c.tipo === 'sin_respuesta' ? 'duda' : c.tipo, c.huellaExtra || c.mensajeCliente || c.titulo);
    if (vistos.has(huella)) continue; vistos.add(huella);
    const previo = await CasoCalidad.findOne({ negocioId: negocio._id, huella, $or: [{ estado: { $in: ['nuevo', 'ignorado'] } }, { estado: 'resuelto', updatedAt: { $gte: new Date(Date.now() - 30 * 86400000) } }] });
    if (previo) { if (previo.estado === 'nuevo' && c.veces > previo.veces) { previo.veces = c.veces; await previo.save(); } continue; }
    const { huellaExtra, ...datos } = c; // eslint-disable-line no-unused-vars
    await CasoCalidad.create({ negocioId: negocio._id, ...datos, huella });
    nuevos++; if (c.severidad === 'alta') altas++;
  }

  const abiertos = await CasoCalidad.find({ negocioId: negocio._id, estado: 'nuevo' }).select('severidad').lean();
  const penal = abiertos.reduce((a, c) => a + (c.severidad === 'alta' ? 12 : c.severidad === 'media' ? 6 : 2), 0);
  const puntaje = ia ? Math.min(ia.puntaje, 100 - Math.min(60, penal)) : Math.max(20, 100 - penal);
  const resumen = ia && ia.resumen ? ia.resumen : (!conversaciones.length ? 'Todavía no hay conversaciones recientes para revisar.' : abiertos.length ? `Hay ${abiertos.length} ${abiertos.length === 1 ? 'tema' : 'temas'} para revisar.` : 'No encontramos problemas en las conversaciones recientes.');

  await EvaluacionCalidad.create({ negocioId: negocio._id, puntaje, resumen, conversaciones: conversaciones.length, casosNuevos: nuevos, conIA: usoIA, disparo });
  await Negocio.updateOne({ _id: negocio._id }, { $set: { 'calidad.ultimaEvaluacion': new Date(), 'calidad.ultimoPuntaje': puntaje, 'calidad.ultimoResumen': resumen, 'calidad.ultimasRevisadas': conversaciones.length, 'calidad.usoIA': usoIA } });
  if (disparo === 'auto' && nuevos > 0) {
    await avisarDueno(negocio._id, 'calidad', { titulo: altas ? 'Tu asistente tiene respuestas para corregir' : 'Revisamos las conversaciones de tu asistente', cuerpo: `${nuevos} ${nuevos === 1 ? 'tema nuevo' : 'temas nuevos'} para revisar. Corregirlos mejora las próximas ventas.`, url: '/admin.html?ir=calidad' });
  }
  return { puntaje, resumen, conversaciones: conversaciones.length, casosNuevos: nuevos, usoIA };
}

// Revisión programada: se corre cada pocas horas y evalúa a quien le toca (semanal o diaria) y tuvo conversaciones nuevas.
async function revisarCalidadProgramada() {
  try {
    const ahora = Date.now();
    const negocios = await Negocio.find({ activo: true, 'suscripcion.estado': { $in: ['activa', 'prueba'] }, 'calidad.auto': { $ne: false }, 'calidad.frecuencia': { $ne: 'manual' } }).limit(300);
    let hechos = 0;
    for (const n of negocios) {
      if (hechos >= 5) break; // pocos por vuelta, para cuidar el consumo
      const cada = ((n.calidad && n.calidad.frecuencia) === 'diaria' ? 1 : 7) * 86400000;
      const ultima = n.calidad && n.calidad.ultimaEvaluacion ? new Date(n.calidad.ultimaEvaluacion).getTime() : 0;
      if (ahora - ultima < cada) continue;
      const nuevas = await Conversacion.countDocuments({ negocioId: n._id, updatedAt: { $gte: new Date(ultima || ahora - 7 * 86400000) } });
      if (nuevas < 3) continue;
      await evaluarNegocio(n, { disparo: 'auto', dias: Math.max(1, Math.min(14, Math.ceil(cada / 86400000))) });
      hechos++;
    }
  } catch (error) {
    console.error('Error en la revisión de calidad programada:', error.message);
  }
}

module.exports = { evaluarNegocio, revisarCalidadProgramada };
