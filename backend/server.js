require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const rubrosRoutes = require('./routes/rubros');
const negociosRoutes = require('./routes/negocios');
const chatRoutes = require('./routes/chat');
const estadisticasRoutes = require('./routes/estadisticas');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Límite general para evitar abuso de la API (se puede ajustar por plan más adelante)
const limiter = rateLimit({ windowMs: 60 * 1000, max: 60 }); // 60 requests por minuto por IP
app.use('/api/', limiter);

app.get('/', (req, res) => {
  res.json({ mensaje: 'API de Empleado Virtual IA funcionando correctamente' });
});

app.use('/api/rubros', rubrosRoutes);
app.use('/api/negocios', negociosRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/estadisticas', estadisticasRoutes);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Servidor corriendo en el puerto ${PORT}`));
});
