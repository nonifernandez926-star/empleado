const Negocio = require('../models/Negocio');
const PushSuscripcion = require('../models/PushSuscripcion');

// Los dispositivos del dueño se guardan con este id fijo (el mismo que usan los recordatorios de la Agenda),
// para no mezclarse con los de sus clientes.
const SESION_DUENO = '__dueno__';
const { enviarPush } = require('./push');

// Qué tipos de aviso recibe el dueño en el celular. Todo viene prendido hasta que lo apague en Ajustes → Notificaciones.
const TIPOS_AVISO = ['pedidos', 'turnos', 'resenas', 'preguntas', 'suscripcion', 'soporte', 'comprobantes', 'agenda', 'stock', 'calidad', 'reclamos'];
const PREFS_DEFECTO = { pedidos: true, turnos: true, resenas: true, preguntas: true, suscripcion: true, soporte: true, comprobantes: true, agenda: true, stock: true, calidad: true, reclamos: true };

function prefsDe(negocio) {
  return { ...PREFS_DEFECTO, ...((negocio && negocio.notificaciones) || {}) };
}

// Manda un aviso push a todos los celulares del dueño de ese negocio. Nunca rompe el flujo que lo llama.
async function avisarDueno(negocioId, tipo, { titulo, cuerpo, url = '/admin.html', tag }) {
  try {
    const negocio = await Negocio.findById(negocioId).select('notificaciones');
    if (!negocio || prefsDe(negocio)[tipo] === false) return 0;
    const subs = await PushSuscripcion.find({ negocioId, sesionClienteId: SESION_DUENO });
    let enviados = 0;
    for (const s of subs) {
      const r = await enviarPush(s.subscription, { titulo, cuerpo, url, tag: tag || `${tipo}`, rol: 'dueno' });
      if (r.ok) enviados++;
      else if (r.expirada) await PushSuscripcion.deleteOne({ _id: s._id });
    }
    return enviados;
  } catch (error) {
    console.error('No se pudo avisar al dueño:', error.message);
    return 0;
  }
}

// Avisos de vencimiento: se revisan cada pocas horas y cada umbral (7, 3, 1 días, vencida) se avisa una sola vez.
async function revisarVencimientos() {
  try {
    const ahora = Date.now();
    const negocios = await Negocio.find({ 'suscripcion.estado': 'activa', 'suscripcion.fechaVencimiento': { $exists: true }, activo: true })
      .select('suscripcion avisosVencimiento formData');
    for (const n of negocios) {
      const dias = Math.ceil((new Date(n.suscripcion.fechaVencimiento).getTime() - ahora) / 86400000);
      const umbral = dias <= 0 ? 0 : dias <= 1 ? 1 : dias <= 3 ? 3 : dias <= 7 ? 7 : null;
      if (umbral === null) continue;
      const clave = `${new Date(n.suscripcion.fechaVencimiento).toISOString().slice(0, 10)}:${umbral}`;
      if (n.avisosVencimiento === clave) continue;
      const titulo = umbral === 0 ? 'Tu suscripción venció' : umbral === 1 ? 'Tu suscripción vence mañana' : `Tu suscripción vence en ${umbral} días`;
      const cuerpo = umbral === 0 ? 'Renová para que tu asistente siga atendiendo a tus clientes.' : 'Podés renovar cuando quieras: los meses nuevos se suman al tiempo que te queda.';
      await avisarDueno(n._id, 'suscripcion', { titulo, cuerpo, url: '/admin.html?ir=planes' });
      await Negocio.updateOne({ _id: n._id }, { $set: { avisosVencimiento: clave } });
    }
  } catch (error) {
    console.error('Error revisando vencimientos:', error.message);
  }
}

// Recordatorio de pedidos sin confirmar. Un cliente esperando sin respuesta es una venta en riesgo:
// se avisa al pasar N minutos (configurable, 10 por defecto) y se insiste hasta 2 veces más con más espacio entre avisos.
// Es un solo aviso por negocio (no uno por pedido), así el celular no se llena de notificaciones.
async function revisarPedidosPendientes() {
  try {
    const Pedido = require('../models/Pedido');
    const ahora = Date.now();
    const pendientes = await Pedido.find({ estado: 'pendiente', esPrueba: { $ne: true }, createdAt: { $gte: new Date(ahora - 24 * 3600 * 1000) } })
      .select('negocioId createdAt recordatorios ultimoRecordatorio').lean();
    const porNegocio = new Map();
    pendientes.forEach((p) => { const k = String(p.negocioId); if (!porNegocio.has(k)) porNegocio.set(k, []); porNegocio.get(k).push(p); });
    for (const [negocioId, lista] of porNegocio) {
      const negocio = await Negocio.findById(negocioId).select('avisoPedidoPendienteMin activo');
      if (!negocio || negocio.activo === false) continue;
      const minutos = typeof negocio.avisoPedidoPendienteMin === 'number' ? negocio.avisoPedidoPendienteMin : 10;
      if (minutos <= 0) continue;
      const toca = lista.filter((p) => {
        const edad = (ahora - new Date(p.createdAt).getTime()) / 60000;
        const desdeUltimo = p.ultimoRecordatorio ? (ahora - new Date(p.ultimoRecordatorio).getTime()) / 60000 : Infinity;
        if ((p.recordatorios || 0) === 0) return edad >= minutos;
        if (p.recordatorios === 1) return desdeUltimo >= minutos * 3;
        if (p.recordatorios === 2) return desdeUltimo >= minutos * 6;
        return false;
      });
      if (!toca.length) continue;
      const masViejo = Math.max(...lista.map((p) => (ahora - new Date(p.createdAt).getTime()) / 60000));
      const espera = masViejo >= 90 ? `${Math.round(masViejo / 60)} h` : `${Math.round(masViejo)} min`;
      const n = lista.length;
      await avisarDueno(negocioId, 'pedidos', {
        titulo: n === 1 ? 'Tenés 1 pedido sin confirmar' : `Tenés ${n} pedidos sin confirmar`,
        cuerpo: `El más antiguo espera hace ${espera}. Tu cliente está esperando que lo confirmes.`,
        url: '/admin.html?ir=pedidos', tag: 'pedidos-pendientes',
      });
      await Pedido.updateMany({ _id: { $in: toca.map((p) => p._id) } }, { $inc: { recordatorios: 1 }, $set: { ultimoRecordatorio: new Date() } });
    }
  } catch (error) {
    console.error('Error revisando pedidos pendientes:', error.message);
  }
}

module.exports = { avisarDueno, revisarVencimientos, revisarPedidosPendientes, prefsDe, TIPOS_AVISO, PREFS_DEFECTO, SESION_DUENO };
