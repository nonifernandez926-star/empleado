const webpush = require('web-push');

// Todo el "protocolo" de mandar un push (firmar con la clave VAPID, cifrar el mensaje)
// lo resuelve la librería web-push. Nosotros solo necesitamos las 3 claves de acá abajo,
// que se generan UNA sola vez con: npx web-push generate-vapid-keys
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;

function estaConfigurado() {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

if (estaConfigurado()) {
  webpush.setVapidDetails(
    VAPID_SUBJECT || 'mailto:soporte@example.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

/**
 * Manda un push a UNA suscripción puntual.
 * Devuelve { ok: true } o { ok: false, expirada: true } si ese navegador ya no existe más
 * (el usuario desinstaló, borró los datos, etc.) para que el que llama borre esa suscripción.
 */
async function enviarPush(subscription, datos) {
  if (!estaConfigurado()) return { ok: false, expirada: false, motivo: 'sin_configurar' };
  try {
    await webpush.sendNotification(subscription, JSON.stringify(datos));
    return { ok: true };
  } catch (error) {
    const expirada = error.statusCode === 404 || error.statusCode === 410;
    if (!expirada) console.error('Error enviando push:', error.statusCode, error.body);
    return { ok: false, expirada };
  }
}

module.exports = { enviarPush, estaConfigurado, VAPID_PUBLIC_KEY };
