// Envío de correos por API HTTP (Render gratis bloquea SMTP, por eso no se usa nodemailer).
// Proveedor preferido: Brevo (gratis, sin dominio propio: solo se verifica el correo remitente).
// Alternativa: Resend. Si no hay ninguno configurado y NO es producción, el código se muestra en la consola del servidor.
const esProduccion = () => process.env.NODE_ENV === "production" || !!process.env.RENDER;

const correoConfigurado = () => !!(process.env.APPS_SCRIPT_URL || process.env.BREVO_API_KEY || process.env.RESEND_API_KEY);

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function remitente() {
  const raw = process.env.CORREO_REMITENTE || "";
  const m = raw.match(/^(.*)<\s*([^>]+)\s*>$/);
  if (m) return { nombre: m[1].trim().replace(/^"|"$/g, "") || "Mi Asistente", email: m[2].trim() };
  return { nombre: process.env.CORREO_NOMBRE || "Mi Asistente", email: raw.trim() };
}

async function enviar({ para, asunto, html, texto }) {
  const de = remitente();
  if (process.env.APPS_SCRIPT_URL) {
    // Gmail propio vía Google Apps Script (gratis, sin registrarse en otro servicio). Ver correo-apps-script.gs
    const r = await fetch(process.env.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "content-type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ clave: process.env.APPS_SCRIPT_CLAVE || "", para, asunto, html, texto, nombre: de.nombre }),
      redirect: "follow",
    });
    const t = await r.text();
    let ok = false;
    try { ok = JSON.parse(t).ok === true; } catch { /* respuesta que no es JSON */ }
    if (!r.ok || !ok) throw new Error(`Apps Script no envió el correo (${r.status}): ${t.slice(0, 120)}`);
    return;
  }
  if (process.env.BREVO_API_KEY) {
    if (!de.email) throw new Error("Falta CORREO_REMITENTE (el correo verificado en Brevo)");
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { name: de.nombre, email: de.email }, to: [{ email: para }], subject: asunto, htmlContent: html, textContent: texto }),
    });
    if (!r.ok) throw new Error(`Brevo respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return;
  }
  if (process.env.RESEND_API_KEY) {
    if (!de.email) throw new Error("Falta CORREO_REMITENTE");
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: `${de.nombre} <${de.email}>`, to: [para], subject: asunto, html, text: texto }),
    });
    if (!r.ok) throw new Error(`Resend respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return;
  }
  if (esProduccion()) throw new Error("No hay proveedor de correo configurado (APPS_SCRIPT_URL, BREVO_API_KEY o RESEND_API_KEY)");
  console.log(`\n[DESARROLLO] Correo para ${para}: ${asunto}\n${texto}\n`);
}

async function enviarCodigoIngreso(para, codigo, app = "Mi Asistente") {
  const texto = `Tu código para entrar a ${app} es ${codigo}. Vence en 10 minutos. Si no lo pediste vos, ignorá este correo.`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;color:#1a1a1a">
<h2 style="margin:0 0 12px">${esc(app)}</h2>
<p>Usá este código para entrar:</p>
<p style="font-size:34px;letter-spacing:8px;font-weight:700;background:#f3f4f6;border-radius:12px;padding:14px;text-align:center;margin:16px 0">${esc(codigo)}</p>
<p style="color:#555;font-size:14px">Vence en 10 minutos. Si no lo pediste vos, ignorá este correo: nadie puede entrar sin el código.</p></div>`;
  await enviar({ para, asunto: `${codigo} es tu código de ${app}`, html, texto });
}
module.exports = { correoConfigurado, enviarCodigoIngreso };
