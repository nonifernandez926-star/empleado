// Envío de la respuesta del dueño a Mi Zona (webhook opcional). Si no está configurado o falla, no pasa nada:
// Mi Zona también puede consultar el estado cuando quiera (GET /api/integracion/reclamos).
async function avisarClienteMiZona(negocio, reclamo) {
  const url = process.env.MIZONA_WEBHOOK_URL;
  const clave = process.env.INTEGRACION_KEY;
  if (!url || !clave) return false;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(url, {
      method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', 'x-integracion-key': clave },
      body: JSON.stringify({ evento: 'reclamo.decidido', refExterna: reclamo.refExterna, codigoPublico: negocio.codigoPublico, estado: reclamo.estado, solucion: reclamo.decision.solucion, mensaje: reclamo.decision.mensaje, fecha: reclamo.decision.fecha }),
    });
    clearTimeout(t);
    return r.ok;
  } catch (e) {
    console.error('No se pudo avisar a Mi Zona de la respuesta al reclamo:', e.message);
    return false;
  }
}

module.exports = { avisarClienteMiZona };
