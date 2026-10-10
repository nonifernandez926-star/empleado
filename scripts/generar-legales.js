// Genera las páginas públicas privacidad.html, terminos.html y eliminar-cuenta.html a partir de frontend/js/legal.js,
// así el texto de la app y el de la web (que pide Google Play) son SIEMPRE el mismo.
// Uso:  node scripts/generar-legales.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const front = path.join(__dirname, '..', 'frontend');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(front, 'js/legal.js'), 'utf8') + ';this.LEGAL = LEGAL;', ctx);
const cfg = {}; vm.createContext(cfg);
vm.runInContext(fs.readFileSync(path.join(front, 'js/config.js'), 'utf8') + ';this.EMAIL = SOPORTE_EMAIL;', cfg);
const LEGAL = ctx.LEGAL, EMAIL = cfg.EMAIL;

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const lin = (t) => esc(t).replace(EMAIL, `<a href="mailto:${EMAIL}">${EMAIL}</a>`);

const CSS = `*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:#f3f5fa;color:#0b1437;font-family:"Manrope",-apple-system,"Segoe UI",system-ui,Roboto,sans-serif;line-height:1.65;-webkit-font-smoothing:antialiased}
header{background:radial-gradient(420px 220px at 105% -20%,rgba(61,107,255,.55),transparent 60%),#0b1437;color:#fff;padding:calc(18px + env(safe-area-inset-top,0px)) 20px 34px}
.w{max-width:720px;margin:0 auto}
.marca{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:-.01em;color:#fff;text-decoration:none}
.marca i{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#5b8bff,#17c6ff);display:inline-block}
h1{margin:22px 0 4px;font-size:1.75rem;line-height:1.15;letter-spacing:-.03em}
.fecha{margin:0;color:#c3cdf0;font-size:.9rem}
main{padding:0 20px 56px}
.tarjeta{background:#fff;border:1px solid #e3e7f1;border-radius:22px;margin-top:-18px;padding:6px 22px 22px;box-shadow:0 12px 32px rgba(11,20,55,.08)}
h2{margin:26px 0 6px;font-size:1.05rem;letter-spacing:-.01em}
p,li{margin:0 0 8px;color:#2b3768;font-size:.97rem}
ol{padding-left:22px;margin:8px 0}
a{color:#2350f5;font-weight:600}
nav{display:flex;flex-wrap:wrap;gap:8px 18px;margin:22px 0 0;font-size:.9rem}
footer{max-width:720px;margin:0 auto;padding:0 20px 40px;color:#5b6482;font-size:.85rem}
.caja{background:#edf1ff;border-radius:14px;padding:14px 16px;margin:14px 0}
@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}`;

function pagina({ titulo, desc, cuerpo, canonical }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#0b1437">
<meta name="description" content="${esc(desc)}">
<title>${esc(titulo)} — Mi Asistente</title>
<link rel="icon" href="/img/icono-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;800&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<header><div class="w">
<a class="marca" href="/index.html"><i aria-hidden="true"></i> Mi Asistente</a>
<h1>${esc(titulo)}</h1>
<p class="fecha">Última actualización: ${esc(LEGAL.actualizado)} · versión ${esc(LEGAL.version)}</p>
</div></header>
<main><div class="w"><div class="tarjeta">
${cuerpo}
</div>
<nav><a href="/privacidad.html">Política de privacidad</a><a href="/terminos.html">Términos y condiciones</a><a href="/eliminar-cuenta.html">Eliminar mi cuenta</a><a href="/index.html">Volver a la app</a></nav>
</div></main>
<footer>© ${new Date().getFullYear()} Mi Asistente · Contacto: <a href="mailto:${EMAIL}">${EMAIL}</a></footer>
</body>
</html>
`;
}

const secciones = (lista) => lista.map(([t, x]) => `<h2>${esc(t)}</h2>\n<p>${lin(x)}</p>`).join('\n');

fs.writeFileSync(path.join(front, 'privacidad.html'), pagina({
  titulo: 'Política de privacidad', desc: 'Qué datos guarda Mi Asistente, para qué los usa, con quién los comparte y cómo podés controlarlos o borrarlos.',
  cuerpo: secciones(LEGAL.privacidad) + `\n<h2>Eliminar tu cuenta y tus datos</h2>\n<p>Podés hacerlo desde la app o pedirlo por correo. Mirá los pasos en <a href="/eliminar-cuenta.html">Eliminar mi cuenta</a>.</p>`,
}));
fs.writeFileSync(path.join(front, 'terminos.html'), pagina({
  titulo: 'Términos y condiciones', desc: 'Condiciones de uso de Mi Asistente, el asistente virtual con inteligencia artificial para negocios.',
  cuerpo: secciones(LEGAL.terminos),
}));
fs.writeFileSync(path.join(front, 'eliminar-cuenta.html'), pagina({
  titulo: 'Eliminar mi cuenta', desc: 'Cómo eliminar tu cuenta de Mi Asistente y qué datos se borran.',
  cuerpo: `<h2>Desde la app (lo más rápido)</h2>
<ol>
<li>Entrá a Mi Asistente con tu cuenta.</li>
<li>Andá a <b>Ajustes → Mi cuenta → Eliminar mi cuenta</b>.</li>
<li>Escribí el nombre de tu negocio, tu contraseña si corresponde, y confirmá.</li>
</ol>
<p>La eliminación es inmediata y no se puede deshacer.</p>
<h2>Si no podés entrar a la app</h2>
<p>Escribinos a <a href="mailto:${EMAIL}?subject=Eliminar%20mi%20cuenta%20de%20Mi%20Asistente">${EMAIL}</a> desde el correo con el que te registraste, con el asunto “Eliminar mi cuenta”. Verificamos que seas el titular y la borramos en un máximo de 30 días.</p>
<h2>Qué se borra</h2>
<p>Tu cuenta, tu negocio, el catálogo de productos, las conversaciones del chat, los pedidos y turnos, las fichas de clientes, las calificaciones, la agenda, las notificaciones y las consultas de soporte.</p>
<h2>Qué puede conservarse</h2>
<p>Copias de seguridad técnicas por un tiempo breve y los registros de pagos que la ley nos obliga a guardar.</p>
<div class="caja"><p style="margin:0"><b>¿Sos cliente de un negocio y querés que borren tus datos?</b> Pedíselo al negocio con el que chateaste (es quien decide sobre esos datos) o escribinos a <a href="mailto:${EMAIL}">${EMAIL}</a> y te ayudamos.</p></div>`,
}));
console.log('Páginas generadas: privacidad.html, terminos.html, eliminar-cuenta.html');
