const mongoose = require('mongoose');

// Agenda personal del dueño (Herramientas → Agenda). Un mismo modelo para dos cosas:
// 'evento' (reunión, turno, entrega, etc. - tiene hora) y 'tarea' (algo para marcar hecho,
// la hora es opcional). Fase 1: todo se carga a mano; más adelante se suma IA (foto, texto, recordatorios).
const eventoAgendaSchema = new mongoose.Schema({
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true, index: true },
  tipo: { type: String, enum: ['evento', 'tarea'], required: true },
  titulo: { type: String, required: true },
  fecha: { type: String, required: true }, // 'YYYY-MM-DD'
  hora: { type: String, default: '' }, // 'HH:MM', opcional
  duracionMinutos: { type: Number },
  personaRelacionada: { type: String, default: '' },
  categoria: { type: String, default: '' }, // ej: "Proveedores", "Stock" - sugeridas según el rubro, pero el dueño puede escribir otra
  notas: { type: String, default: '' },
  completada: { type: Boolean, default: false }, // solo se usa en tipo 'tarea'
  origen: { type: String, enum: ['manual'], default: 'manual' }, // a futuro: 'foto' | 'mensaje'
}, { timestamps: true });

eventoAgendaSchema.index({ negocioId: 1, fecha: 1 });

module.exports = mongoose.model('EventoAgenda', eventoAgendaSchema);
