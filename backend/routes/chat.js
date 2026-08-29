const express = require('express');
const router = express.Router();
const Negocio = require('../models/Negocio');
const Conversacion = require('../models/Conversacion');
const { generarRespuesta } = require('../utils/claude');

const DIAS_ORDEN = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

// Devuelve { abierto: boolean, proximaAperturaTexto: string } comparando la hora actual (Argentina)
// contra los horarios cargados por el negocio.
function chequearHorario(horarios) {
  const ahora = new Date();
  // Ajustamos a hora Argentina (UTC-3) sin depender de librerías externas
  const ahoraArg = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const diaHoy = DIAS_ORDEN[ahoraArg.getDay()];
  const minutosAhora = ahoraArg.getHours() * 60 + ahoraArg.getMinutes();

  const horarioHoy = (horarios || []).find((h) => h.dia === diaHoy);
  if (horarioHoy && horarioHoy.activo && horarioHoy.bloques && horarioHoy.bloques.length) {
    const estaEnAlgunBloque = horarioHoy.bloques.some((b) => {
      const [hA, mA] = (b.apertura || '00:00').split(':').map(Number);
      const [hC, mC] = (b.cierre || '00:00').split(':').map(Number);
      const minApertura = hA * 60 + mA;
      const minCierre = hC * 60 + mC;
      return minutosAhora >= minApertura && minutosAhora < minCierre;
    });
    if (estaEnAlgunBloque) return { abierto: true };
  }

  return {
    abierto: false,
    mensaje: 'En este momento estamos fuera de nuestro horario de atención. Podés dejar tu consulta y te respondemos apenas abramos, o volver a escribirnos dentro del horario.',
  };
}

// POST /api/chat/:codigoPublico
// body: { mensaje: string, sesionClienteId: string }
router.post('/:codigoPublico', async (req, res) => {
  try {
    const { codigoPublico } = req.params;
    const { mensaje, sesionClienteId } = req.body;

    if (!mensaje || !sesionClienteId) {
      return res.status(400).json({ error: 'Faltan datos: mensaje y sesionClienteId son obligatorios' });
    }

    const negocio = await Negocio.findOne({ codigoPublico, activo: true });
    if (!negocio) return res.status(404).json({ error: 'Asistente no encontrado' });

    // Modo dueño: estos códigos admin nunca pasan por control de suscripción (para probar sin pagar)
    const codigosOwner = (process.env.CODIGOS_OWNER || '').split(',').map((c) => c.trim()).filter(Boolean);
    const esModoOwner = codigosOwner.includes(negocio.codigoAdmin);

    if (!esModoOwner) {
      // Si el plan pago ya venció, lo marcamos como vencido automáticamente
      if (negocio.suscripcion.estado === 'activa' && negocio.suscripcion.fechaVencimiento && negocio.suscripcion.fechaVencimiento < new Date()) {
        negocio.suscripcion.estado = 'vencida';
        await negocio.save();
      }

      // Control de suscripción
      if (negocio.suscripcion.estado === 'vencida') {
        return res.status(402).json({
          error: 'suscripcion_vencida',
          mensaje: 'Este asistente está pausado temporalmente.',
        });
      }

      if (negocio.suscripcion.estado === 'prueba') {
        if (negocio.suscripcion.mensajesUsadosPrueba >= negocio.suscripcion.limiteMensajesPrueba) {
          return res.status(402).json({
            error: 'limite_prueba_alcanzado',
            mensaje: 'Se alcanzó el límite de mensajes de la prueba. El negocio debe activar su suscripción.',
          });
        }
      }
    }

    // Si el negocio pidió responder SOLO en su horario, chequeamos antes de gastar en Claude
    if (negocio.atencionSoloEnHorario) {
      const { abierto, mensaje: mensajeFueraDeHorario } = chequearHorario(negocio.horarios);
      if (!abierto) {
        return res.json({ respuesta: mensajeFueraDeHorario, pedidoCreado: null, imagenes: [] });
      }
    }

    // Buscamos (o creamos) la conversación de esta sesión
    let conversacion = await Conversacion.findOne({
      negocioId: negocio._id,
      sesionClienteId,
      finalizada: false,
    });
    if (!conversacion) {
      conversacion = await Conversacion.create({
        negocioId: negocio._id,
        sesionClienteId,
        mensajes: [],
      });
    }

    // Le pasamos a Claude solo los últimos mensajes para no gastar tokens de más
    const historialReciente = conversacion.mensajes.slice(-10).map((m) => ({
      rol: m.rol,
      contenido: m.contenido,
    }));

    const respuestaTexto = await generarRespuesta(negocio, historialReciente, mensaje, sesionClienteId);

    // Si el mensaje parece pedir el menú/carta y hay fotos cargadas con esa categoría, las adjuntamos
    const pideMenu = /men[uú]|carta|cat[aá]logo|qu[eé] tienen|qu[eé] productos|qu[eé] venden/i.test(mensaje);
    const fotosMenu = pideMenu ? negocio.fotos.filter((f) => f.categoria === 'menu').map((f) => f.url) : [];

    conversacion.mensajes.push({ rol: 'cliente', contenido: mensaje, sinRespuesta: !!respuestaTexto.sinRespuesta });
    conversacion.mensajes.push({ rol: 'asistente', contenido: respuestaTexto.textoRespuesta });
    await conversacion.save();

    if (negocio.suscripcion.estado === 'prueba') {
      negocio.suscripcion.mensajesUsadosPrueba += 1;
      await negocio.save();
    }

    res.json({
      respuesta: respuestaTexto.textoRespuesta,
      pedidoCreado: respuestaTexto.pedidoCreado || null,
      imagenes: fotosMenu,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar la respuesta del asistente' });
  }
});

module.exports = router;
