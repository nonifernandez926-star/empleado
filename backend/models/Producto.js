const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true, index: true },

  nombre: { type: String, required: true },
  descripcion: { type: String, default: '' },
  categoria: { type: String, default: '' }, // ej: "Bebidas", "Calzado", "Cortes" - lo agrupa en el menu
  precio: { type: Number },

  // Determina que preguntas extra tiene sentido pedir (no le preguntamos el talle a una pizza)
  tipoProducto: {
    type: String,
    enum: ['ropa_calzado', 'comida_bebida', 'servicio', 'general'],
    default: 'general',
  },

  // Solo se completan si tipoProducto es 'comida_bebida'
  tamanoPorcion: { type: String, default: '' }, // ej: "Individual", "Para compartir (2-3 personas)"
  ingredientesPrincipales: { type: String, default: '' },
  aptoPara: { type: String, default: '' }, // ej: "Vegetariano, Sin TACC"

  // Solo se completan si tipoProducto es 'servicio'
  duracionEstimada: { type: String, default: '' }, // ej: "45 minutos"
  queIncluye: { type: String, default: '' },

  fotos: [{ url: String, publicId: String }],

  // null/undefined = no se trackea stock para este producto (siempre "disponible" salvo que se marque lo contrario)
  stock: { type: Number, default: null },

  // Variantes libres con su propio stock. El dueño elige el nombre segun lo que corresponda a SU
  // producto (ej: "Talle 42", "Color rojo" para ropa/calzado; "Chico"/"Grande" para comida; etc.)
  // Solo tiene sentido usarlas si tipoProducto es 'ropa_calzado', pero no esta bloqueado por si acaso.
  variantes: [{
    nombre: { type: String, required: true },
    stock: { type: Number, default: null },
  }],

  disponibleHoy: { type: Boolean, default: true }, // el dueño lo puede apagar para hoy sin borrar el producto
  recomendar: { type: Boolean, default: true }, // si el asistente puede sugerirlo activamente al cliente
  activo: { type: Boolean, default: true }, // "borrado" logico: false = ya no existe en el catalogo
}, { timestamps: true });

module.exports = mongoose.model('Producto', productoSchema);
