// El script de Google (accounts.google.com/gsi/client) carga con "async", así que no hay
// garantía de que ya esté disponible cuando se dispara DOMContentLoaded. Si se intenta usar
// "google.accounts.id" antes de tiempo, el botón de Google nunca aparece y no se ve ningún
// error claro. Esta función reintenta por unos segundos antes de rendirse.
function esperarGoogleListo(callback, intentos = 40) {
  if (window.google && window.google.accounts && window.google.accounts.id) {
    callback();
    return;
  }
  if (intentos <= 0) {
    console.error('No se pudo cargar accounts.google.com/gsi/client (revisá la conexión o si algo lo está bloqueando).');
    return;
  }
  setTimeout(() => esperarGoogleListo(callback, intentos - 1), 125); // hasta 5 segundos en total
}
