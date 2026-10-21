const mongoose = require('mongoose');

// Historial del inventario: cada vez que cambia el stock de un producto queda una línea.
const schema = new mongoose.Schema({
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true, index: true },
  productoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true, index: true },
  productoNombre: { type: String, default: '' },
  variante: { type: String, default: '' },
  // venta: se descontó al confirmar | reserva / liberacion: se aparta o se devuelve temporalmente | ajuste: el dueño lo corrigió
  // reposicion: llegó mercadería | devolucion: se revirtió una venta
  tipo: { type: String, enum: ['venta', 'reserva', 'liberacion', 'ajuste', 'reposicion', 'devolucion'], required: true },
  cantidad: { type: Number, required: true },        // positivo = entra, negativo = sale (en reservas, lo que se aparta)
  stockResultante: { type: Number },                 // stock físico después del movimiento
  pedidoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pedido' },
  nota: { type: String, default: '', maxlength: 200 },
}, { timestamps: true });

schema.index({ negocioId: 1, createdAt: -1 });

module.exports = mongoose.model('MovimientoStock', schema);
