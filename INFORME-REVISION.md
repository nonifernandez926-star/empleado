# Mi Asistente — Informe de revisión para Google Play (9 de octubre de 2026)

## Cómo leer esto
✅ Corregido en este paquete · ⚠️ Decisión o trámite tuyo (puede bloquear la publicación) · 📌 Recomendado, no hecho.
**Importante:** en este entorno no pude conectar la base de datos, ni Claude, ni Mercado Pago, ni Google. Verifiqué la sintaxis de todos los archivos (`node --check`) y renderizé las pantallas del frontend con datos simulados. **Probá todo en un celular real antes de publicar.**

## 1. Requisitos de Google Play
| Requisito | Estado |
|---|---|
| Política de privacidad pública | ✅ `privacidad.html` (se genera desde el mismo texto de la app). ⚠️ Revisala con un abogado |
| Eliminar cuenta dentro de la app | ✅ Ya existía |
| Enlace web para eliminar cuenta | ✅ Nuevo: `eliminar-cuenta.html` |
| Apps con IA generativa: poder reportar respuestas | ✅ Nuevo: botón "Reportar" bajo cada respuesta de la IA + aviso "Te responde una IA" + `POST /api/reportes/ia/:codigo` + listado para el equipo |
| Términos y privacidad visibles al ingresar | ✅ Enlaces en la pantalla de acceso |
| Aviso a clientes del chat sobre IA y datos | ✅ En el chat y en la política |
| Ícono 512, gráfico 1024×500, textos de ficha | ✅ `play-store/` (capturas: las sacás vos) |
| Seguridad de los datos | ✅ Borrador en `play-store/SEGURIDAD-DE-LOS-DATOS.md` (verificalo) |
| Verificación de enlaces (assetlinks) | ⚠️ Plantilla lista; falta la huella SHA-256 de Play App Signing |
| Acceso para revisores | ⚠️ Crear usuario y contraseña de prueba |
| Cuenta personal nueva: prueba cerrada previa | ⚠️ Confirmalo en tu Play Console |
| **Pagos con Mercado Pago dentro de la app** | ⚠️ **Riesgo alto**, ver sección 3 |

## 2. Errores encontrados y corregidos
1. **El límite de pedidos y el de intentos de contraseña eran compartidos por TODOS los usuarios** (el servidor detrás de Render veía siempre la misma IP). Con 60 pedidos por minuto en total, la app se bloqueaba sola con poco uso. Ahora `trust proxy` toma la IP real.
2. **El login con Google devolvía el motivo técnico del error** al navegador. Ahora responde genérico (`DEBUG_AUTH=1` lo muestra al depurar).
3. **CORS abierto a cualquier sitio** si faltaba `FRONTEND_URL`. Ahora, en producción, solo acepta los orígenes de `FRONTEND_URL` (se admiten varios separados por coma).
4. Sin cabeceras de seguridad, sin respuesta JSON para rutas inexistentes ni para JSON mal formado, sin `/healthz`, sin registro de errores no atrapados. Todo agregado.
5. `package.json` apuntaba a un script `seed` que no existe; se quitó. Versión 1.1.0 y `engines` (Node ≥ 18).
6. **El service worker solo existía para notificaciones**: sin conexión la app mostraba el error del navegador. Ahora hay caché de la estructura, pantalla "Sin conexión" y aviso al perder internet.
7. Manifest: `id`, idioma, categorías, atajo y íconos *maskable* separados. `viewport-fit=cover` en el chat (la barra de entrada ya usaba el área segura).
8. Páginas inexistentes devolvían la portada con código 404 sin explicación: ahora hay `404.html`. Cabeceras de seguridad y caché en `netlify.toml`.
9. Panel: 4 lugares mostraban texto cargado por el negocio sin escapar (riesgo de XSS). Corregido.
10. El texto legal no mencionaba edad mínima, conservación de datos, clientes del chat ni Google Fonts. Completado (versión 1.1).

## 3. Lo que sigue pendiente
- ⚠️ **Pagos**: la suscripción se cobra con Mercado Pago. Google Play exige su sistema de facturación para bienes digitales consumidos en la app, con excepciones según país y tipo de servicio. Opciones: (a) Play Billing, (b) la app de Play no vende y la suscripción se paga fuera (revisá las reglas vigentes de "steering"), (c) programa de facturación alternativa si aplica a tu región. Es decisión de negocio; verificalo en el Centro de ayuda de Play antes de enviar.
- ⚠️ `js/config.js`: `MI_ZONA_URL` todavía es un texto de ejemplo (`TU-DOMINIO-DE-MI-ZONA.com`). El botón "Registrar mi negocio en Mi Zona" no funciona hasta que lo cambies.
- ⚠️ Mercado Pago: configurá `MP_WEBHOOK_SECRET` (sin él el webhook no valida la firma) y `CRON_SECRET` para los recordatorios push de la agenda.
- ⚠️ El plazo de 30 días para borrar cuentas pedidas por correo (en `eliminar-cuenta.html`) es una promesa: cumplila o cambiala.
- 📌 `admin.js` tiene 3.200 líneas y `style.css` 1.800: conviene dividirlos. No lo hice a ciegas.
- 📌 El límite de intentos y de pedidos vive en la memoria del servidor: si escalás a más de una instancia, hay que pasarlo a Redis o Mongo.
- 📌 Los tokens de sesión (90 días) se guardan en `localStorage`. Es habitual en una PWA; el riesgo es XSS, por eso todo texto de clientes se escapa antes de mostrarse (revisalo si agregás pantallas).
- 📌 Sin pruebas automáticas, monitoreo de errores (Sentry) ni copias de seguridad programadas de MongoDB Atlas.
- 📌 Google Fonts: autoalojar la tipografía mejora velocidad, privacidad y modo sin conexión.
- 📌 Tras pagar en Mercado Pago, el regreso puede abrir Chrome en vez de la app (limitación de las TWA). Probalo.
- 📌 Modo oscuro de la landing y del chat: hoy son una sola paleta.

## 4. Antes de publicar (en orden)
1. `cd backend && npm install`, cargar variables (`.env.example`), desplegar. 2. `node scripts/generar-legales.js` y desplegar el frontend. 3. Probar en celular. 4. Resolver pagos y tipo de cuenta. 5. Empaquetar, assetlinks, prueba interna → cerrada → producción (`play-store/GUIA-PLAY-STORE.md`).
