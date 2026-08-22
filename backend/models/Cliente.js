const mongoose = require('mongoose');

// Guarda quién es cada cliente recurrente de un negocio, para que el asistente
// lo "recuerde" en visitas futuras (mismo dispositivo/navegador vía sesionClienteId).
const clienteSchema = new mongoose.Schema({
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true, index: true },
  sesionClienteId: { type: String, required: true, index: true },

  nombre: { type: String },
  telefono: { type: String },

  totalPedidos: { type: Number, default: 0 },
  ultimoPedido: {
    fecha: { type: Date },
    items: [{ producto: String, cantidad: Number }],
    tipoEntrega: { type: String },
  },
}, { timestamps: true });

clienteSchema.index({ negocioId: 1, sesionClienteId: 1 }, { unique: true });

module.exports = mongoose.model('Cliente', clienteSchema);
