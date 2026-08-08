const mongoose = require('mongoose');

const bloqueHorarioSchema = new mongoose.Schema({
  apertura: { type: String, required: true }, // "09:00"
  cierre: { type: String, required: true },   // "13:00"
}, { _id: false });

const horarioDiaSchema = new mongoose.Schema({
  dia: { type: String, enum: ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'], required: true },
  activo: { type: Boolean, default: false },
  bloques: { type: [bloqueHorarioSchema], default: [] }, // permite horario partido (ej: mañana y tarde)
}, { _id: false });

const negocioSchema = new mongoose.Schema({
  // Identificación
  codigoAdmin: { type: String, required: true, unique: true }, // ej: ADM-82KX-91PL-7QW (privado, del dueño)
  codigoPublico: { type: String, required: true, unique: true }, // id público para el widget de chat

  // Clasificación
  rubroCategoria: { type: String, required: true },
  rubroSubrubro: { type: String, required: true },

  // Datos del formulario (comunes + específicos del subrubro), guardados como mapa clave-valor
  formData: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Horarios
  horarios: { type: [horarioDiaSchema], default: [] },

  // Fotos (Cloudinary). categoria sirve para que el chat sepa cuáles mostrar
  // cuando el cliente pide el menú (ej: 'menu', 'local', 'producto').
  fotos: [{ url: String, publicId: String, categoria: { type: String, default: 'general' } }],

  // Personalidad del asistente
  personalidad: {
    formalidad: { type: Number, min: 0, max: 10, default: 5 }, // 0 = formal, 10 = casual
    energia: { type: Number, min: 0, max: 10, default: 5 },    // 0 = serio, 10 = divertido
    conversacion: { type: Number, min: 0, max: 10, default: 5 }, // 0 = directo, 10 = conversador
    estilo: {
      type: String,
      enum: ['profesional_cercano', 'amable_carismatico', 'juvenil_energetico', 'elegante_exclusivo', 'tranquilo_confiable'],
      default: 'amable_carismatico',
    },
    descripcionLibre: { type: String, default: '' },
  },

  // Suscripción
  suscripcion: {
    estado: { type: String, enum: ['prueba', 'activa', 'vencida'], default: 'prueba' },
    plan: { type: String, enum: ['basico', 'profesional', 'empresarial'], default: 'basico' },
    mensajesUsadosPrueba: { type: Number, default: 0 },
    limiteMensajesPrueba: { type: Number, default: 30 },
    fechaInicio: { type: Date },
    fechaVencimiento: { type: Date },
  },

  // Disponibilidad del día: el dueño escribe acá lo que hoy no está disponible
  // (se agotó, no hay stock, etc.) para que el asistente nunca lo recomiende ni lo tome en un pedido.
  disponibilidadHoy: { type: String, default: '' },

  activo: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Negocio', negocioSchema);
