const mongoose = require('mongoose');

// Gastos del negocio que no son el costo de un producto: alquiler, sueldos, luz, publicidad, etc.
const schema = new mongoose.Schema({
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true, index: true },
  concepto: { type: String, required: true, maxlength: 80 },
  categoria: { type: String, enum: ['alquiler', 'sueldos', 'servicios', 'marketing', 'insumos', 'impuestos', 'otros'], default: 'otros' },
  monto: { type: Number, required: true, min: 0 },
  // mensual: se cuenta todos los meses desde "desde" (hasta que se pause) | unico: se cuenta una vez, en su fecha
  frecuencia: { type: String, enum: ['mensual', 'unico'], default: 'mensual' },
  desde: { type: Date, default: Date.now },
  activo: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Gasto', schema);
