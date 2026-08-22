const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const Negocio = require('../models/Negocio');
const { generarToken } = require('../utils/jwt');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verificarIdTokenGoogle(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return { googleId: payload.sub, email: payload.email, nombre: payload.name };
}

// POST /api/auth/google/login -> el dueño ya tiene un negocio vinculado a su cuenta de Google
router.post('/google/login', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'Falta el token de Google' });

    const { googleId, email } = await verificarIdTokenGoogle(idToken);

    const negocio = await Negocio.findOne({ googleId });
    if (!negocio) {
      return res.status(404).json({
        error: 'sin_negocio_vinculado',
        mensaje: 'Esta cuenta de Google todavía no tiene un negocio creado. Registrá tu negocio primero.',
        email,
      });
    }

    const token = generarToken(negocio._id.toString());
    res.json({ token, negocioId: negocio._id });
  } catch (error) {
    console.error('Error en login con Google:', error);
    res.status(401).json({ error: 'No se pudo verificar la cuenta de Google' });
  }
});

module.exports = router;
module.exports.verificarIdTokenGoogle = verificarIdTokenGoogle;
