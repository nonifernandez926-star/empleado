const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const Negocio = require('../models/Negocio');
const Usuario = require('../models/Usuario');
const { generarToken, generarTokenUsuario, verificarToken } = require('../utils/jwt');
const { hashearContrasena, verificarContrasena } = require('../utils/contrasenas');
const { permitir, olvidar } = require('../utils/limitador');
const ActividadSeguridad = require('../models/ActividadSeguridad');
const { nombreDispositivo } = require('../utils/dispositivo');
const { normalizarUsuario, errorUsuario, errorContrasena, MSG_USUARIO_EN_USO } = require('../utils/usuarios');

// Deja anotado en el historial de seguridad cada inicio de sesión (con el nombre del dispositivo, nada más)
async function anotarAcceso(usuario, tipo, req, metodo) {
  try { await ActividadSeguridad.create({ usuarioId: usuario._id, tipo, dispositivo: nombreDispositivo(req.headers['user-agent']), metodo }); } catch (e) { /* no es crítico */ }
}

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// IDs de cliente de Google aceptados (el de Mi Asistente y el de Mi Zona comparten el mismo).
const ID_GOOGLE_WEB = '553562775987-ovo25d12tq3fhntvj34342nk3jlg7vtc.apps.googleusercontent.com';
const idsPermitidos = () => [process.env.GOOGLE_CLIENT_ID, ID_GOOGLE_WEB].filter(Boolean);

async function verificarIdTokenGoogle(idToken) {
  const ticket = await client.verifyIdToken({ idToken, audience: idsPermitidos() });
  const payload = ticket.getPayload();
  return { googleId: payload.sub, email: payload.email, nombre: payload.name };
}

// Verifica el access token que entrega la ventana "elegir cuenta" de Google.
async function verificarAccessTokenGoogle(accessToken) {
  const t = String(accessToken || '');
  if (t.length < 20 || t.length > 4096) throw new Error('Token de Google inválido');
  const info = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(t)}`);
  if (!info.ok) throw new Error('Token de Google vencido o inválido');
  const datos = await info.json();
  const permitidos = idsPermitidos();
  if (!permitidos.includes(datos.aud) && !permitidos.includes(datos.azp)) throw new Error('Wrong recipient: el ID de cliente de Google no coincide');
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${t}` } });
  if (!res.ok) throw new Error('No se pudo leer la cuenta de Google');
  const p = await res.json();
  if (!p?.sub || !p?.email || p.email_verified === false) throw new Error('Cuenta de Google sin email verificado');
  return { googleId: p.sub, email: String(p.email).toLowerCase(), nombre: p.name || '' };
}

const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const normalizarCorreo = (v) => String(v || '').trim().toLowerCase();
const ip = (req) => req.ip || 'sin-ip';

const usuarioPublico = (u) => ({ id: String(u._id), email: u.email, nombre: u.nombre, usuario: u.usuario || '', conClave: !!u.passwordHash });

async function respuestaSesion(usuario, extra = {}) {
  const negocio = await Negocio.findOne({ usuarioId: usuario._id }).select('_id');
  return {
    token: generarTokenUsuario(usuario),
    usuario: usuarioPublico(usuario),
    // Si falta el usuario o la contraseña, la web pide completarlos antes de entrar (PUT /api/auth/completar)
    pendiente: { usuario: !usuario.usuario, clave: !usuario.passwordHash },
    tieneNegocio: !!negocio,
    ...extra,
  };
}

// POST /api/auth/google  { accessToken, modo }   modo "registro" crea la cuenta; modo "login" solo entra si ya existe
router.post('/google', async (req, res) => {
  try {
    const { accessToken } = req.body || {};
    const modo = req.body?.modo === 'login' ? 'login' : 'registro';
    if (!accessToken) return res.status(400).json({ error: 'Falta el token de Google' });
    const { googleId, email, nombre } = await verificarAccessTokenGoogle(accessToken);

    let usuario = await Usuario.findOne({ googleId });
    let yaExistia = !!usuario;
    if (!usuario) {
      // Si ya se había registrado con correo y contraseña, Google ahora verifica ese correo: pasa a ser la misma cuenta
      const porCorreo = await Usuario.findOne({ email, proveedor: 'email' });
      if (porCorreo) { porCorreo.googleId = googleId; porCorreo.proveedor = 'google'; porCorreo.passwordHash = ''; porCorreo.tokenVersion = (porCorreo.tokenVersion || 0) + 1; await porCorreo.save(); usuario = porCorreo; yaExistia = true; }
    }
    if (!usuario && modo === 'login') {
      return res.status(404).json({ error: 'cuenta_inexistente', mensaje: 'Todavía no te registraste con esta cuenta de Google. Tocá "Registrarme" para crear tu cuenta.' });
    }
    if (!usuario) usuario = await Usuario.create({ googleId, email, nombre });

    // Negocios creados antes de que existiera el login con cuenta: se unen por la cuenta de Google
    await Negocio.updateMany({ googleId, usuarioId: { $exists: false } }, { $set: { usuarioId: usuario._id } });
    await anotarAcceso(usuario, yaExistia ? 'inicio_sesion' : 'registro', req, 'google');
    res.json(await respuestaSesion(usuario, { yaExistia }));
  } catch (e) {
    console.error('Error en login con Google:', e.message);
    res.status(401).json({ error: 'No se pudo verificar la cuenta de Google', ...(process.env.DEBUG_AUTH === '1' ? { detalle: String(e.message || '').slice(0, 160) } : {}) });
  }
});

// POST /api/auth/correo { email } -> primer paso del ingreso con correo: dice qué hacer después
// paso: "crear" (no hay cuenta: hay que registrarse) | "clave" (cuenta vieja de correo: se pide la contraseña) | "google" (cuenta de Google)
router.post('/correo', async (req, res) => {
  try {
    if (!permitir(`correo|${ip(req)}`, 30, 15 * 60 * 1000)) return res.status(429).json({ error: 'Hiciste muchos intentos. Probá de nuevo en un rato.' });
    const email = normalizarCorreo(req.body?.email);
    if (!RE_CORREO.test(email) || email.length > 120) return res.status(400).json({ error: 'Escribí un correo válido.' });
    const usuario = await Usuario.findOne({ email });
    if (!usuario) return res.json({ paso: 'crear' });
    // "clave": cuenta vieja creada con correo y contraseña. "google": cuenta de Google (entra con Google; Google pide la contraseña del correo en su propia página).
    res.json({ paso: usuario.proveedor === 'email' && usuario.passwordHash ? 'clave' : 'google' });
  } catch (e) {
    console.error('Error al revisar el correo:', e.message);
    res.status(500).json({ error: 'No se pudo continuar. Probá de nuevo.' });
  }
});

// GET /api/auth/usuario-disponible?usuario=xxx -> avisa en vivo si el usuario es válido y está libre
router.get('/usuario-disponible', async (req, res) => {
  try {
    if (!permitir(`usuario-disp|${ip(req)}`, 80, 15 * 60 * 1000)) return res.status(429).json({ error: 'Hiciste muchos intentos. Probá de nuevo en un rato.' });
    const usuario = normalizarUsuario(req.query?.usuario);
    const motivo = errorUsuario(usuario);
    if (motivo) return res.json({ disponible: false, valido: false, mensaje: motivo });
    const existe = await Usuario.exists({ usuario });
    res.json({ disponible: !existe, valido: true, mensaje: existe ? MSG_USUARIO_EN_USO : '' });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo revisar el usuario.' });
  }
});

// PUT /api/auth/completar { usuario?, password? }  (con la sesión recién abierta con Google)
// Último paso del registro: primero el usuario, después la contraseña. Pide solo lo que falta.
router.put('/completar', async (req, res) => {
  try {
    const h = req.headers['authorization'] || '';
    const p = h.startsWith('Bearer ') ? verificarToken(h.slice(7)) : null;
    if (!p || !p.uid) return res.status(401).json({ error: 'Sesión inválida o vencida' });
    const usuario = await Usuario.findById(p.uid);
    if (!usuario || (p.v || 0) !== (usuario.tokenVersion || 0)) return res.status(401).json({ error: 'Sesión inválida o vencida' });
    if (!permitir(`completar|${usuario._id}`, 15, 15 * 60 * 1000)) return res.status(429).json({ error: 'Demasiados intentos. Esperá unos minutos.' });

    let nuevoUsuario = usuario.usuario || '';
    if (!usuario.usuario) {
      nuevoUsuario = normalizarUsuario(req.body?.usuario);
      const motivo = errorUsuario(nuevoUsuario);
      if (motivo) return res.status(400).json({ error: motivo });
      if (await Usuario.exists({ usuario: nuevoUsuario, _id: { $ne: usuario._id } })) return res.status(409).json({ error: MSG_USUARIO_EN_USO, codigo: 'usuario_en_uso' });
    }
    let hash = '';
    if (!usuario.passwordHash) {
      const password = String(req.body?.password || '');
      const motivo = errorContrasena(password, nuevoUsuario);
      if (motivo) return res.status(400).json({ error: motivo });
      hash = await hashearContrasena(password);
    }
    if (!usuario.usuario) usuario.usuario = nuevoUsuario;
    if (hash) usuario.passwordHash = hash;
    if (!usuario.nombre) usuario.nombre = nuevoUsuario;
    await usuario.save();
    await anotarAcceso(usuario, 'cambio_usuario', req, 'google');
    res.json(await respuestaSesion(usuario, { yaExistia: true }));
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: MSG_USUARIO_EN_USO, codigo: 'usuario_en_uso' });
    console.error('Error completando la cuenta:', e.message);
    res.status(500).json({ error: 'No se pudo guardar. Probá de nuevo.' });
  }
});

// POST /api/auth/login { usuario, password }   (también acepta el correo en lugar del usuario, por las cuentas anteriores)
router.post('/login', async (req, res) => {
  try {
    const identificador = String(req.body?.usuario || req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const clave = `login|${ip(req)}|${identificador}`;
    if (!permitir(clave, 8, 15 * 60 * 1000) || !permitir(`login|${ip(req)}`, 40, 15 * 60 * 1000)) {
      return res.status(429).json({ error: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.' });
    }
    if (!identificador || identificador.length > 120 || !password) return res.status(400).json({ error: 'Escribí tu usuario y tu contraseña.' });
    const conCorreo = identificador.includes('@');
    const usuario = await Usuario.findOne(conCorreo ? { email: identificador } : { usuario: identificador });
    // con el correo solo vale la contraseña de las cuentas viejas de correo; las de Google entran con Google o con su usuario
    if (usuario && (!usuario.passwordHash || (conCorreo && usuario.proveedor !== 'email'))) return res.status(400).json({ error: 'Esa cuenta entra con Google. Tocá "Acceder con Google".' });
    // aunque el usuario no exista hacemos el mismo trabajo, así no se nota la diferencia
    const ok = await verificarContrasena(password, usuario ? usuario.passwordHash : '00:00');
    if (!usuario || !ok) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    olvidar(clave);
    await anotarAcceso(usuario, 'inicio_sesion', req, 'correo');
    res.json(await respuestaSesion(usuario, { yaExistia: true }));
  } catch (e) {
    console.error('Error en login:', e.message);
    res.status(500).json({ error: 'No se pudo iniciar sesión. Probá de nuevo.' });
  }
});

// GET /api/auth/me -> quién es y si ya tiene negocio (para decidir si va al panel o a crear su asistente)
router.get('/me', async (req, res) => {
  try {
    const h = req.headers['authorization'] || '';
    const p = h.startsWith('Bearer ') ? verificarToken(h.slice(7)) : null;
    if (!p) return res.status(401).json({ error: 'Sesión inválida o vencida' });
    if (p.negocioId) return res.json({ tieneNegocio: true });
    const usuario = await Usuario.findById(p.uid);
    if (!usuario || (p.v || 0) !== (usuario.tokenVersion || 0)) return res.status(401).json({ error: 'Sesión inválida o vencida' });
    const negocio = await Negocio.findOne({ usuarioId: usuario._id }).select('_id');
    res.json({ usuario: usuarioPublico(usuario), pendiente: { usuario: !usuario.usuario, clave: !usuario.passwordHash }, tieneNegocio: !!negocio });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo leer la sesión.' });
  }
});

// POST /api/auth/google/login { idToken } -> forma anterior (botón de Google del panel), sigue funcionando
router.post('/google/login', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'Falta el token de Google' });
    const { googleId, email } = await verificarIdTokenGoogle(idToken);
    const negocio = await Negocio.findOne({ googleId });
    if (!negocio) {
      return res.status(404).json({ error: 'sin_negocio_vinculado', mensaje: 'Esta cuenta de Google todavía no tiene un negocio creado. Registrá tu negocio primero.', email });
    }
    res.json({ token: generarToken(negocio._id.toString()), negocioId: negocio._id });
  } catch (error) {
    console.error('Error en login con Google:', error);
    res.status(401).json({ error: 'No se pudo verificar la cuenta de Google' });
  }
});

module.exports = router;
module.exports.verificarIdTokenGoogle = verificarIdTokenGoogle;
