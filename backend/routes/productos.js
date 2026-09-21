const express = require('express');
const router = express.Router();
const multer = require('multer');
const Producto = require('../models/Producto');
const { requiereAdmin } = require('../middleware/auth');
const { storage, cloudinary } = require('../config/cloudinary');

const upload = multer({ storage });

// GET /api/productos -> lista el catalogo del negocio autenticado (para el panel)
router.get('/', requiereAdmin, async (req, res) => {
  try {
    const productos = await Producto.find({ negocioId: req.negocio._id, activo: true }).sort({ createdAt: -1 });
    res.json(productos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el catálogo' });
  }
});

// POST /api/productos -> crea un producto/servicio nuevo
router.post('/', requiereAdmin, async (req, res) => {
  try {
    const {
      nombre, descripcion, categoria, precio, stock, variantes, disponibleHoy, recomendar,
      tipoProducto, tamanoPorcion, ingredientesPrincipales, aptoPara, duracionEstimada, queIncluye,
    } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const producto = await Producto.create({
      negocioId: req.negocio._id,
      nombre: nombre.trim(),
      descripcion: descripcion || '',
      categoria: categoria || '',
      precio: precio !== undefined && precio !== '' ? Number(precio) : undefined,
      stock: stock !== undefined && stock !== '' ? Number(stock) : null,
      variantes: Array.isArray(variantes) ? variantes : [],
      disponibleHoy: disponibleHoy !== undefined ? !!disponibleHoy : true,
      recomendar: recomendar !== undefined ? !!recomendar : true,
      tipoProducto: tipoProducto || 'general',
      // Cada campo solo se guarda si corresponde al tipo elegido, para no arrastrar datos que no aplican
      tamanoPorcion: tipoProducto === 'comida_bebida' ? (tamanoPorcion || '') : '',
      ingredientesPrincipales: tipoProducto === 'comida_bebida' ? (ingredientesPrincipales || '') : '',
      aptoPara: tipoProducto === 'comida_bebida' ? (aptoPara || '') : '',
      duracionEstimada: tipoProducto === 'servicio' ? (duracionEstimada || '') : '',
      queIncluye: tipoProducto === 'servicio' ? (queIncluye || '') : '',
    });

    res.status(201).json(producto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el producto' });
  }
});

// PUT /api/productos/:id -> edita cualquier campo del producto
router.put('/:id', requiereAdmin, async (req, res) => {
  try {
    const producto = await Producto.findOne({ _id: req.params.id, negocioId: req.negocio._id });
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    const campos = [
      'nombre', 'descripcion', 'categoria', 'precio', 'stock', 'variantes', 'disponibleHoy', 'recomendar',
      'tipoProducto', 'tamanoPorcion', 'ingredientesPrincipales', 'aptoPara', 'duracionEstimada', 'queIncluye',
    ];
    campos.forEach((campo) => {
      if (req.body[campo] !== undefined) producto[campo] = req.body[campo];
    });

    await producto.save();
    res.json(producto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el producto' });
  }
});

// DELETE /api/productos/:id -> lo saca del catalogo (borrado logico, no borra sus fotos de Cloudinary
// por si el dueño se arrepiente, pero deja de ser visible/usable)
router.delete('/:id', requiereAdmin, async (req, res) => {
  try {
    const producto = await Producto.findOneAndUpdate(
      { _id: req.params.id, negocioId: req.negocio._id },
      { activo: false },
      { new: true }
    );
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ mensaje: 'Producto eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
});

// POST /api/productos/:id/fotos -> sube una foto y la agrega al producto
router.post('/:id/fotos', requiereAdmin, upload.single('foto'), async (req, res) => {
  try {
    const producto = await Producto.findOne({ _id: req.params.id, negocioId: req.negocio._id });
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna foto' });

    producto.fotos.push({ url: req.file.path, publicId: req.file.filename });
    await producto.save();
    res.status(201).json(producto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al subir la foto' });
  }
});

// DELETE /api/productos/:id/fotos/:publicId -> saca una foto puntual de un producto
router.delete('/:id/fotos/:publicId', requiereAdmin, async (req, res) => {
  try {
    const producto = await Producto.findOne({ _id: req.params.id, negocioId: req.negocio._id });
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    await cloudinary.uploader.destroy(req.params.publicId).catch(() => {});
    producto.fotos = producto.fotos.filter((f) => f.publicId !== req.params.publicId);
    await producto.save();
    res.json(producto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al borrar la foto' });
  }
});

module.exports = router;
