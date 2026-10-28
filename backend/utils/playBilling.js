const crypto = require('crypto');

// Verificación de compras de Google Play Billing, SIEMPRE desde el servidor (la app nunca decide si algo se pagó).
// Hace falta una cuenta de servicio de Google Cloud con permiso en Play Console. Variables de entorno:
//   PLAY_PACKAGE_NAME          -> id de la app en Play (el mismo que figura en Play Console)
//   PLAY_SERVICE_ACCOUNT_JSON  -> el JSON de la cuenta de servicio (completo, en una sola línea)
// Sin esas variables el servidor no acredita ninguna compra (responde que el cobro no está configurado).
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';
let tokenCache = { valor: '', vence: 0 };

function playConfigurado() {
  return Boolean(process.env.PLAY_PACKAGE_NAME && process.env.PLAY_SERVICE_ACCOUNT_JSON);
}

const b64u = (b) => Buffer.from(b).toString('base64url');

async function tokenDeAcceso() {
  if (tokenCache.valor && Date.now() < tokenCache.vence - 60000) return tokenCache.valor;
  let cuenta;
  try { cuenta = JSON.parse(process.env.PLAY_SERVICE_ACCOUNT_JSON); } catch { throw new Error('PLAY_SERVICE_ACCOUNT_JSON no es un JSON válido.'); }
  if (!cuenta.client_email || !cuenta.private_key) throw new Error('PLAY_SERVICE_ACCOUNT_JSON no tiene client_email o private_key.');
  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const cuerpo = b64u(JSON.stringify({
    iss: cuenta.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token', iat: ahora, exp: ahora + 3600,
  }));
  const firma = crypto.createSign('RSA-SHA256').update(`${cabecera}.${cuerpo}`).sign(cuenta.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${cabecera}.${cuerpo}.${firma}` }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`Google no dio acceso (${r.status}).`);
  tokenCache = { valor: j.access_token, vence: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
  return tokenCache.valor;
}

const urlCompra = (productoId, token) =>
  `${API}/${encodeURIComponent(process.env.PLAY_PACKAGE_NAME)}/purchases/products/${encodeURIComponent(productoId)}/tokens/${encodeURIComponent(token)}`;

// Consulta a Google la compra. Devuelve { valida, pendiente, orderId, reconocida } o lanza un error si Google no responde.
//   purchaseState: 0 = comprada, 1 = cancelada, 2 = pendiente
async function verificarCompra(productoId, purchaseToken) {
  const acceso = await tokenDeAcceso();
  const r = await fetch(urlCompra(productoId, purchaseToken), { headers: { Authorization: `Bearer ${acceso}` } });
  if (r.status === 404 || r.status === 410 || r.status === 400) return { valida: false, pendiente: false, motivo: 'Google no reconoce esta compra.' };
  if (!r.ok) throw new Error(`Google Play respondió ${r.status}.`);
  const c = await r.json();
  return {
    valida: c.purchaseState === 0,
    pendiente: c.purchaseState === 2,
    orderId: c.orderId || '',
    reconocida: c.acknowledgementState === 1,
  };
}

// Reconoce la compra (Google la reembolsa sola si no se reconoce en 3 días). La app después la consume para poder volver a comprar.
async function reconocerCompra(productoId, purchaseToken) {
  const acceso = await tokenDeAcceso();
  const r = await fetch(`${urlCompra(productoId, purchaseToken)}:acknowledge`, {
    method: 'POST', headers: { Authorization: `Bearer ${acceso}`, 'Content-Type': 'application/json' }, body: '{}',
  });
  if (!r.ok && r.status !== 409) throw new Error(`No se pudo reconocer la compra (${r.status}).`);
}

const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

module.exports = { playConfigurado, verificarCompra, reconocerCompra, hashToken };
