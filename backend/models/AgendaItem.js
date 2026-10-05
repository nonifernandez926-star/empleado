const mongoose = require('mongoose');

// Un elemento de la agenda personal del dueño: un evento (reunión, visita de un proveedor, entrega...) o una tarea (algo que
// tiene que hacer él). Los turnos de los clientes y los pedidos NO se guardan acá: ya viven en sus propias secciones.
const agendaItemSchema = new mongoose.Schema({
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true, index: true },

  tipo: { type: String, enum: ['evento', 'tarea'], default: 'evento' },
  titulo: { type: String, required: true, trim: true, maxlength: 140 },

  fecha: { type: String }, // 'YYYY-MM-DD'. En una tarea es opcional (puede ser "sin fecha")
  hora: { type: String },  // 'HH:MM'. Opcional (todo el día)
  duracionMinutos: { type: Number, default: 30, min: 5, max: 1440 },

  persona: { type: String, default: '', maxlength: 80 }, // con quién: cliente, proveedor, empleado
  notas: { type: String, default: '', maxlength: 600 },
  categoria: { type: String, default: 'general', maxlength: 40 }, // depende del rubro (reserva, proveedor, entrega...)

  // Cuántos minutos antes avisarle (null = sin aviso). Ej: 15, 60, 1440 (1 día), 4320 (3 días)
  recordatorioMinutos: { type: Number, default: null },
  recordatorioEnviado: { type: Boolean, default: false },

  completada: { type: Boolean, default: false },
  completadaEn: { type: Date },

  origen: { type: String, enum: ['manual', 'foto', 'mensaje'], default: 'manual' },
}, { timestamps: true });

agendaItemSchema.index({ negocioId: 1, fecha: 1 });

module.exports = mongoose.model('AgendaItem', agendaItemSchema);
