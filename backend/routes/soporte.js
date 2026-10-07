const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { requiereAdmin } = require('../middleware/auth');
const Consulta = require('../models/Consulta');
const { avisarDueno } = require('../utils/avisos');
const { permitir } = require('../utils/limitador');

const TEMAS = ['cuenta', 'suscripcion', 'asistente', 'pedidos', 'error', 'otro'];

// ---------- Del dueño ----------

// POST /api/soporte  { tema, mensaje }
router.post('/', requiereAdmin, async (req, res) => {
  try {
    if (!permitir(`soporte|${req.negocio._id}`, 6, 3600 * 1000)) return res.status(429).json({ error: 'Mandaste varias consultas seguidas. Esperá un rato y probá de nuevo.' });
    const mensaje = String(req.body?.mensaje || '').trim();
    const tema = TEMAS.includes(req.body?.tema) ? req.body.tema : 'otro';
    if (mensaje.length < 10) return res.status(400).json({ error: 'Contanos un poco más (mínimo 10 letras) para poder ayudarte.' });
    if (mensaje.length > 2000) return res.status(400).json({ error: 'El mensaje es muy largo (máximo 2000 letras).' });
    const consulta = await Consulta.create({
      negocioId: req.negocio._id, usuarioId: req.negocio.usuarioId, email: req.negocio.emailPropietario || '',
      negocioNombre: (req.negocio.formData && req.negocio.formData.nombreNegocio) || '', tema, mensaje,
    });
    if (process.env.SOPORTE_AVISO_URL) { // aviso opcional (Slack, Discord, Make...) cuando entra una consulta nueva
      fetch(process.env.SOPORTE_AVISO_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: `Nueva consulta de Mi Asistente (${consulta.negocioNombre || 'sin nombre'}, ${tema}): ${mensaje.slice(0, 300)}` }) }).catch(() => null);
    }
    res.status(201).json({ ok: true, id: consulta._id });
  } catch (error) {
    console.error('Error en soporte:', error.message);
    res.status(500).json({ error: 'No se pudo enviar tu consulta. Probá de nuevo.' });
  }
});

// GET /api/soporte/mias -> mis consultas con sus respuestas
router.get('/mias', requiereAdmin, async (req, res) => {
  const filas = await Consulta.find({ negocioId: req.negocio._id }).sort({ createdAt: -1 }).limit(30);
  res.json(filas.map((c) => ({ id: c._id, tema: c.tema, mensaje: c.mensaje, estado: c.estado, respuesta: c.respuesta, respondidaEn: c.respondidaEn, creadaEn: c.createdAt, nueva: !c.respuestaVista })));
});

// POST /api/soporte/vistas -> marca las respuestas como vistas
router.post('/vistas', requiereAdmin, async (req, res) => {
  await Consulta.updateMany({ negocioId: req.negocio._id, respuestaVista: false }, { $set: { respuestaVista: true } });
  res.json({ ok: true });
});

// ---------- Del equipo (panel con clave) ----------
function claveValida(req) {
  const esperada = process.env.SOPORTE_ADMIN_KEY || '';
  const recibida = String(req.headers['x-clave-soporte'] || '');
  if (!esperada || esperada.length < 12 || recibida.length !== esperada.length) return false;
  return crypto.timingSafeEqual(Buffer.from(recibida), Buffer.from(esperada));
}

router.get('/admin/consultas', async (req, res) => {
  if (!permitir(`soporte-admin|${req.ip}`, 30, 15 * 60 * 1000)) return res.status(429).json({ error: 'Demasiados intentos.' });
  if (!claveValida(req)) return res.status(401).json({ error: 'Clave incorrecta o sin configurar.' });
  const filtro = req.query.estado === 'respondida' ? { estado: 'respondida' } : { estado: 'abierta' };
  res.json(await Consulta.find(filtro).sort({ createdAt: -1 }).limit(100));
});

router.post('/admin/:id/responder', async (req, res) => {
  if (!claveValida(req)) return res.status(401).json({ error: 'Clave incorrecta o sin configurar.' });
  const respuesta = String(req.body?.respuesta || '').trim();
  if (respuesta.length < 2 || respuesta.length > 3000) return res.status(400).json({ error: 'Escribí la respuesta.' });
  const c = await Consulta.findByIdAndUpdate(req.params.id, { respuesta, estado: 'respondida', respondidaEn: new Date(), respuestaVista: false }, { new: true });
  if (!c) return res.status(404).json({ error: 'No encontrada.' });
  if (c.negocioId) avisarDueno(c.negocioId, 'soporte', { titulo: 'Respondimos tu consulta', cuerpo: respuesta.slice(0, 120), url: '/admin.html?ir=soporte' });
  res.json({ ok: true });
});

router.get('/panel', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Soporte · Mi Asistente</title>
<style>body{font-family:system-ui;max-width:720px;margin:0 auto;padding:16px;background:#f3f5fa;color:#0b1437}input,textarea,button{font:inherit;padding:10px;border-radius:10px;border:1px solid #cfd6e8}button{background:#0b1437;color:#fff;border:0;cursor:pointer}.c{background:#fff;border:1px solid #e3e7f1;border-radius:14px;padding:14px;margin:12px 0}small{color:#5b6482}textarea{width:100%;box-sizing:border-box}</style>
<h2>Consultas de Mi Asistente</h2><p><input id="k" type="password" placeholder="Clave de soporte"> <button onclick="cargar('abierta')">Abiertas</button> <button onclick="cargar('respondida')">Respondidas</button></p><div id="l"></div>
<script>
const e=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function cargar(est){const r=await fetch('admin/consultas?estado='+est,{headers:{'x-clave-soporte':k.value}});const d=await r.json();if(!r.ok){l.innerHTML='<p>'+e(d.error)+'</p>';return}
l.innerHTML=d.length?d.map(c=>'<div class="c"><b>'+e(c.negocioNombre||'Sin nombre')+'</b> · '+e(c.tema)+'<br><small>'+e(c.email)+' · '+new Date(c.createdAt).toLocaleString()+'</small><p>'+e(c.mensaje)+'</p>'+(c.respuesta?'<p><b>Respuesta:</b> '+e(c.respuesta)+'</p>':'<textarea id="r'+c._id+'" rows="3" placeholder="Tu respuesta"></textarea><p><button onclick="resp(\\''+c._id+'\\')">Responder</button></p>')+'</div>').join(''):'<p>No hay consultas.</p>'}
async function resp(id){const r=await fetch('admin/'+id+'/responder',{method:'POST',headers:{'Content-Type':'application/json','x-clave-soporte':k.value},body:JSON.stringify({respuesta:document.getElementById('r'+id).value})});if(r.ok)cargar('abierta');else alert((await r.json()).error)}
</script>`);
});

module.exports = router;
