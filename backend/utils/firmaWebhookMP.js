const crypto = require('crypto');

// Verifica que el webhook realmente venga de Mercado Pago (documentación oficial: "Validar origen de las notificaciones webhook").
// Firma: header x-signature = "ts=...,v1=..."; se recalcula un hash HMAC-SHA256 sobre "id:<dataId>;request-id:<xRequestId>;ts:<ts>;"
// usando la Clave secreta del webhook (Panel de MP → Tus integraciones → tu app → Webhooks) y se compara con v1.
function webhookEsValido({ xSignature, xRequestId, dataId, secret }) {
  if (!secret) return true; // si todavía no configuraste la clave, no bloqueamos (ver aviso en consola)
  if (!xSignature || !dataId) return false;

  const partes = {};
  xSignature.split(',').forEach((p) => {
    const [k, v] = p.split('=').map((s) => s && s.trim());
    if (k && v) partes[k] = v;
  });
  const { ts, v1 } = partes;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId || ''};ts:${ts};`;
  const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  if (v1.length !== hash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(v1));
}

module.exports = { webhookEsValido };
