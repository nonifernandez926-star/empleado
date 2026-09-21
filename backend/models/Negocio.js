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
  // Vinculación con cuenta de Google, para poder iniciar sesión sin el código admin
  googleId: { type: String, index: true, sparse: true },
  emailPropietario: { type: String },

  // Identificación
  codigoAdmin: { type: String, required: true, unique: true }, // ej: ADM-82KX-91PL-7QW (privado, del dueño, sirve como respaldo)
  codigoVinculacion: { type: String, unique: true, sparse: true }, // para vincular este negocio con su perfil en Mi Zona
  codigoPublico: { type: String, required: true, unique: true }, // id público para el widget de chat

  // Clasificación
  rubroCategoria: { type: String, required: true },
  rubroSubrubro: { type: String, required: true },

  // 'pedidos' (venden productos/servicios que se piden por chat) o 'turnos' (se agenda un horario:
  // médicos, peluquerías, talleres, etc). Se sugiere según el subrubro pero el dueño lo puede cambiar.
  tipoOperacion: { type: String, enum: ['pedidos', 'turnos'], default: 'pedidos' },

  // Solo se usa si tipoOperacion es 'turnos'
  profesionales: [{
    nombre: { type: String, required: true },
    activo: { type: Boolean, default: true },
  }],
  configTurnos: {
    // Motivos de consulta y cuánto dura cada uno (el dueño los carga en el registro o después en Ajustes)
    motivos: [{
      nombre: { type: String, required: true },
      duracionMinutos: { type: Number, required: true, default: 30 },
    }],
    // Si es true, cada turno queda "pendiente" hasta que el dueño lo apruebe a mano.
    // Si es false, se confirma solo apenas el cliente lo reserva por el chat.
    requiereAprobacionManual: { type: Boolean, default: true },
  },

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
    plan: { type: String, enum: ['basico', '1_mes', '3_meses', '5_meses'], default: 'basico' },
    mensajesUsadosPrueba: { type: Number, default: 0 },
    limiteMensajesPrueba: { type: Number, default: 30 },
    fechaInicio: { type: Date },
    fechaVencimiento: { type: Date },
    ultimoPagoId: { type: String }, // id del pago de Mercado Pago que activó/renovó la suscripción
  },

  // Disponibilidad del día: el dueño escribe acá lo que hoy no está disponible
  // (se agotó, no hay stock, etc.) para que el asistente nunca lo recomiende ni lo tome en un pedido.
  disponibilidadHoy: { type: String, default: '' },

  // Promociones que el dueño publica a mano (2x1, % de descuento, lo que se le ocurra).
  // El asistente las conoce y las puede mencionar a los clientes cuando charlan.
  promociones: [{
    titulo: { type: String, required: true },
    descripcion: { type: String, default: '' },
    activa: { type: Boolean, default: true },
    creadaEn: { type: Date, default: Date.now },

    // Reglas opcionales - si no se cargan, la promo vale siempre que este "activa"
    fechaHasta: { type: Date }, // despues de esta fecha, deja de mostrarse aunque siga "activa"
    horarioDesde: { type: String }, // 'HH:MM'
    horarioHasta: { type: String }, // 'HH:MM'
    aplicaA: { type: String, default: '' }, // ej: "Corte + barba" - a que producto/servicio aplica
    usosMaximos: { type: Number }, // ej: 20 usos y se acaba
    usosActuales: { type: Number, default: 0 }, // el dueño lo va sumando a mano cuando sabe que se uso
  }],

  // Si es true, el asistente SOLO responde con IA dentro del horario configurado;
  // fuera de horario contesta un mensaje fijo (sin gastar en la API). Si es false, responde 24hs.
  atencionSoloEnHorario: { type: Boolean, default: false },

  // --- FASE 3: vendedor con memoria ---

  // Qué tan activamente el asistente empuja para cerrar el pedido/turno.
  // No cambia la honestidad (nunca miente ni inventa), solo la insistencia.
  modoVendedor: { type: String, enum: ['suave', 'normal', 'agresivo'], default: 'normal' },

  // Si es false, el asistente nunca busca ni guarda el historial de un cliente recurrente
  // (cada conversación se trata como si fuera la primera vez). El dueño lo puede apagar.
  memoriaActiva: { type: Boolean, default: true },

  // Control del dueño sobre qué puede hacer la IA por su cuenta. Todo lo que no está acá
  // (aplicar descuentos, cancelar reservas, devolver dinero, etc.) el asistente nunca lo hace,
  // porque no existe la función todavía - estos son los permisos sobre funciones que sí existen.
  permisos: {
    recomendarProductos: { type: Boolean, default: true }, // sugerir productos/servicios de forma proactiva
    ofrecerPromociones: { type: Boolean, default: true },  // mencionar las promociones activas
    tomarPedidosOTurnos: { type: Boolean, default: true }, // registrar pedidos/turnos reales, no solo charlar
    intentarCerrarVenta: { type: Boolean, default: true }, // guiar activamente la charla hacia el cierre
  },

  // Zonas de delivery configuradas por el dueño, para que el asistente sepa cuanto cobrar de envio
  // segun a donde va el pedido, en vez de inventar un costo o no poder responder.
  zonasDelivery: [{
    zona: { type: String, required: true }, // ej: "Centro", "Villa Nueva", "Barrio Norte"
    precio: { type: Number, required: true, default: 0 },
  }],

  // Ranking de clientes (fase 6): que criterio se usa para el TOP 3, y que premio le corresponde
  // a cada puesto. El asistente le avisa al cliente cuando vuelve y esta en el TOP 3.
  ranking: {
    criterioActivo: { type: String, enum: ['dinero', 'compras', 'visitas', 'fidelidad'], default: 'compras' },
    premios: {
      top1: { type: String, default: '' },
      top2: { type: String, default: '' },
      top3: { type: String, default: '' },
    },
  },

  activo: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Negocio', negocioSchema);
