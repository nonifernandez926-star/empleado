// Envío de correos desde TU Gmail, gratis y sin registrarte en ningún otro servicio.
// 1) Entrá a script.google.com con la cuenta de Gmail desde la que querés enviar → Nuevo proyecto → pegá este código.
// 2) Engranaje "Configuración del proyecto" → Propiedades de la secuencia de comandos → agregá CLAVE = una clave larga inventada por vos.
// 3) Implementar → Nueva implementación → tipo "Aplicación web" → Ejecutar como: Yo → Quién tiene acceso: Cualquier persona → Implementar
//    (Google te pide autorizar el envío de correos: aceptá).
// 4) Copiá la URL que termina en /exec. En Render cargá APPS_SCRIPT_URL = esa URL y APPS_SCRIPT_CLAVE = la misma clave del paso 2.
// Límite de Gmail gratis: unos 100 correos por día (alcanza para empezar).
function doPost(e) {
  var salida = function (ok) { return ContentService.createTextOutput(JSON.stringify({ ok: ok })).setMimeType(ContentService.MimeType.JSON); };
  try {
    var d = JSON.parse(e.postData.contents);
    var clave = PropertiesService.getScriptProperties().getProperty('CLAVE');
    if (!clave || d.clave !== clave) return salida(false);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.para || '')) return salida(false);
    MailApp.sendEmail({ to: d.para, subject: String(d.asunto).slice(0, 150), body: d.texto, htmlBody: d.html, name: d.nombre || 'Mi Asistente' });
    return salida(true);
  } catch (err) { return salida(false); }
}
