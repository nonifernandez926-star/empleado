const mongoose = require('mongoose');

const turnoSchema = new mongoose.Schema({
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true, index: true },
  sesionClienteId: { type: String }, // vacío cuando lo carga el dueño a mano

  fecha: { type: String, required: true }, // 'YYYY-MM-DD'
  hora: { type: String, required: true }, // 'HH:MM'
  duracionMinutos: { type: Number, required: true, default: 30 },

  motivo: { type: String, default: '' },
  profesional: { type: String, default: '' }, // vacío si el negocio tiene un solo profesional

  nombreCliente: { type: String, required: true },
  telefonoCliente: { type: String },
  notas: { type: String, default: '' },

  // pendiente: esperando que el dueño lo apruebe (solo si el negocio pidió aprobación manual)
  // confirmado: en firme (automático, o ya aprobado por el dueño)
  // rechazado: el dueño no lo aprobó
  // cancelado: se canceló después de estar confirmado (por el cliente o el dueño)
  estado: {
    type: String,
    enum: ['pendiente', 'confirmado', 'rechazado', 'cancelado'],
    default: 'pendiente',
  },

  // Quién lo cargó: el asistente (por chat) o el dueño (bloqueo manual, turno que le avisaron por otro medio)
  origen: { type: String, enum: ['asistente', 'dueño'], default: 'asistente' },
}, { timestamps: true });

// Un mismo profesional no puede tener dos turnos activos (pendiente o confirmado) a la misma hora
turnoSchema.index(
  { negocioId: 1, profesional: 1, fecha: 1, hora: 1 },
  { unique: true, partialFilterExpression: { estado: { $in: ['pendiente', 'confirmado'] } } }
);

module.exports = mongoose.model('Turno', turnoSchema);
