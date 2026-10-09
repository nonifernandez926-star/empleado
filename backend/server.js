require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const rubrosRoutes = require('./routes/rubros');
const negociosRoutes = require('./routes/negocios');
const chatRoutes = require('./routes/chat');
const estadisticasRoutes = require('./routes/estadisticas');
const tendenciasRoutes = require('./routes/tendencias');
const pushRoutes = require('./routes/push');
const pedidosRoutes = require('./routes/pedidos');
const turnosRoutes = require('./routes/turnos');
const filaRoutes = require('./routes/fila');
const productosRoutes = require('./routes/productos');
const oportunidadesRoutes = require('./routes/oportunidades');
const resenasRoutes = require('./routes/resenas');
const rankingRoutes = require('./routes/ranking');
const preguntasRoutes = require('./routes/preguntas');
const suscripcionRoutes = require('./routes/suscripcion');
const authRoutes = require('./routes/auth');
const vinculacionRoutes = require('./routes/vinculacion');
const integracionRoutes = require('./routes/integracion');
const agendaRoutes = require('./routes/agenda');
const cuentaRoutes = require('./routes/cuenta');
const soporteRoutes = require('./routes/soporte');
const reportesRoutes = require('./routes/reportes');
const { revisarVencimientos } = require('./utils/avisos');

const app = express();

// Render (y casi cualquier hosting) pone un proxy delante de la app. Sin esto, req.ip es SIEMPRE la IP del proxy:
// el límite de pedidos y el de intentos de contraseña se compartían entre todos los usuarios.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Cabeceras de seguridad básicas (sin dependencias extra)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  next();
});

// FRONTEND_URL puede ser una o varias direcciones separadas por coma (la web, el dominio propio, la app de Play...).
// Si falta, en producción se rechaza todo origen de navegador en vez de abrir la API a cualquiera.
const origenesPermitidos = (process.env.FRONTEND_URL || '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
app.use(cors({
  origin(origen, cb) {
    if (!origen) return cb(null, true); // apps, Postman, cron: no mandan Origin
    if (origenesPermitidos.includes(origen.replace(/\/$/, ''))) return cb(null, true);
    if (!origenesPermitidos.length && process.env.NODE_ENV !== 'production') return cb(null, true);
    return cb(null, false);
  },
}));
app.use(express.json({ limit: '1mb' }));

// Límite general para evitar abuso de la API (se puede ajustar por plan más adelante)
const limiter = rateLimit({ windowMs: 60 * 1000, max: 60 }); // 60 requests por minuto por IP
app.use('/api/', limiter);

app.get('/', (req, res) => {
  res.json({ mensaje: 'API de Empleado Virtual IA funcionando correctamente' });
});
// Para monitores (UptimeRobot, Render) y para despertar el servidor gratuito antes de usar la app
app.get('/healthz', (req, res) => res.json({ ok: true, hora: new Date().toISOString() }));

app.use('/api/rubros', rubrosRoutes);
app.use('/api/negocios', negociosRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/tendencias', tendenciasRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/turnos', turnosRoutes);
app.use('/api/fila', filaRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/oportunidades', oportunidadesRoutes);
app.use('/api/resenas', resenasRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/preguntas', preguntasRoutes);
app.use('/api/suscripcion', suscripcionRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/vinculacion', vinculacionRoutes);
app.use('/api/integracion', integracionRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/cuenta', cuentaRoutes);
app.use('/api/soporte', soporteRoutes);
app.use('/api/reportes', reportesRoutes);

// Cualquier ruta /api que no existe responde JSON (no una página HTML de error)
app.use('/api', (req, res) => res.status(404).json({ error: 'No encontrado' }));
// Errores no atrapados (JSON mal formado, etc.): respuesta limpia, sin datos internos
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El mensaje enviado no es válido.' });
  if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'El mensaje es demasiado grande.' });
  console.error('Error no atrapado:', err && err.message);
  res.status(500).json({ error: 'Algo salió mal. Probá de nuevo en un momento.' });
});
process.on('unhandledRejection', (r) => console.error('Promesa rechazada sin atrapar:', r && r.message ? r.message : r));

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Servidor corriendo en el puerto ${PORT}`));
  // Avisos de vencimiento de suscripción al celular del dueño (7, 3 y 1 día antes, y al vencer): una sola vez por umbral
  setTimeout(revisarVencimientos, 60 * 1000);
  setInterval(revisarVencimientos, 6 * 60 * 60 * 1000).unref();
});
