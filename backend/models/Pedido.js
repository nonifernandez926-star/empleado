const mongoose = require('mongoose');

const itemPedidoSchema = new mongoose.Schema({
  producto: { type: String, required: true },
  cantidad: { type: Number, required: true, min: 1 },
  precioUnitario: { type: Number }, // opcional: solo si el negocio muestra precios
  productoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' }, // se completa si el nombre coincide con un producto del catálogo
  variante: { type: String }, // ej: "Talle 42" (si el producto tiene variantes con stock)
}, { _id: false });

// Unidades apartadas mientras el pedido espera confirmación.
const reservaSchema = new mongoose.Schema({
  // activa: stock apartado | confirmada: ya se descontó del stock | liberada: se devolvió (venció o se revirtió) | ninguna: no había stock controlado
  estado: { type: String, enum: ['ninguna', 'activa', 'confirmada', 'liberada'], default: 'ninguna' },
  venceEn: { type: Date },
  motivoLiberacion: { type: String, enum: ['', 'vencio', 'revertido', 'eliminado'], default: '' },
  lineas: [{ productoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' }, variante: { type: String, default: '' }, cantidad: { type: Number, min: 1 }, _id: false }],
}, { _id: false });

const pedidoSchema = new mongoose.Schema({
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true, index: true },
  esPrueba: { type: Boolean, default: false }, // pedido generado desde "Probar al asistente", no es real
  sesionClienteId: { type: String, required: true },

  items: { type: [itemPedidoSchema], default: [] },
  total: { type: Number }, // opcional, se calcula si hay precios cargados

  nombreCliente: { type: String, required: true },
  telefonoCliente: { type: String, required: true }, // siempre se pide: sirve como respaldo ante cualquier problema (ej. transferencia falsa)

  tipoEntrega: { type: String, enum: ['delivery', 'retiro'], required: true },
  direccionEntrega: { type: String },

  formaPago: { type: String, required: true },
  observaciones: { type: String },

  // Comprobante de transferencia: el cliente lo adjunta en el chat. NUNCA se marca
  // como verificado automáticamente — el dueño lo revisa a mano contra su propia
  // cuenta bancaria y lo confirma desde el panel.
  comprobante: {
    url: { type: String },
    publicId: { type: String },
    fecha: { type: Date },
  },
  pagoDeclarado: { type: Boolean, default: false }, // el cliente dijo que ya transfirió / mandó comprobante
  pagoVerificado: { type: Boolean, default: false }, // el DUEÑO confirmó manualmente que la plata llegó

  // Estado detallado del pago (solo relevante si formaPago es transferencia):
  // esperando_comprobante -> comprobante_recibido -> verificado | rechazado
  estadoPago: {
    type: String,
    enum: ['no_aplica', 'esperando_comprobante', 'comprobante_recibido', 'verificado', 'rechazado'],
    default: 'no_aplica',
  },

  // Sin "cancelado": una vez que el asistente lo toma, el negocio lo gestiona hasta entregarlo.
  // Si algo no está disponible, se resuelve ANTES de tomar el pedido (ver disponibilidadHoy del negocio).
  estado: {
    type: String,
    enum: ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'entregado'],
    default: 'pendiente',
  },

  reserva: { type: reservaSchema, default: () => ({}) },
  stockDescontado: { type: Boolean, default: false }, // ya se restaron las unidades del inventario (una sola vez)
  sinStockAlConfirmar: { type: Boolean, default: false }, // al confirmar no alcanzaba el stock: el dueño debe revisar

  // Recordatorios al dueño mientras el pedido sigue sin confirmar
  recordatorios: { type: Number, default: 0 },
  ultimoRecordatorio: { type: Date },
}, { timestamps: true });

pedidoSchema.index({ negocioId: 1, estado: 1, createdAt: -1 });

module.exports = mongoose.model('Pedido', pedidoSchema);
