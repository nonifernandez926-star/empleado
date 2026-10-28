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
| **Pagos dentro de la app** | ✅ Con Google Play Billing (Fase 13). Falta crear los productos en Play Console y probarlo, ver sección 3 |

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
- ✅ **Pagos**: la suscripción se cobra con **Google Play Billing** (Fase 13): pago único por 1, 3 o 6 meses, sin renovación automática. ⚠️ Falta crear los 3 productos (`miasistente_1m`, `miasistente_3m`, `miasistente_6m`) y la cuenta de servicio en Play Console, cargar `PLAY_PACKAGE_NAME` y `PLAY_SERVICE_ACCOUNT_JSON`, y probar una compra de prueba (pasos en `play-store/GUIA-PLAY-STORE.md`, paso 9). Desde el navegador común solo se puede mirar el plan: pagar exige la app de Play. Los reembolsos que haga Google no descuentan el tiempo ya acreditado (hay que hacerlo a mano).
- ⚠️ `js/config.js`: `MI_ZONA_URL` todavía es un texto de ejemplo (`TU-DOMINIO-DE-MI-ZONA.com`). El botón "Registrar mi negocio en Mi Zona" no funciona hasta que lo cambies.
- ⚠️ Configurá `CRON_SECRET` para los recordatorios push de la agenda. `MP_WEBHOOK_SECRET` y `MP_ACCESS_TOKEN` solo hacen falta si quedó algún pago de Mercado Pago sin acreditar.
- ⚠️ El plazo de 30 días para borrar cuentas pedidas por correo (en `eliminar-cuenta.html`) es una promesa: cumplila o cambiala.
- 📌 `admin.js` tiene 3.200 líneas y `style.css` 1.800: conviene dividirlos. No lo hice a ciegas.
- 📌 El límite de intentos y de pedidos vive en la memoria del servidor: si escalás a más de una instancia, hay que pasarlo a Redis o Mongo.
- 📌 Los tokens de sesión (90 días) se guardan en `localStorage`. Es habitual en una PWA; el riesgo es XSS, por eso todo texto de clientes se escapa antes de mostrarse (revisalo si agregás pantallas).
- 📌 Sin pruebas automáticas, monitoreo de errores (Sentry) ni copias de seguridad programadas de MongoDB Atlas.
- 📌 Google Fonts: autoalojar la tipografía mejora velocidad, privacidad y modo sin conexión.
- 📌 La hoja de pago de Google Play solo aparece dentro de la app de Play con Chrome 101 o superior como navegador predeterminado: probalo en un celular real.
- 📌 Modo oscuro de la landing y del chat: hoy son una sola paleta.

## 4. Antes de publicar (en orden)
1. `cd backend && npm install`, cargar variables (`.env.example`), desplegar. 2. `node scripts/generar-legales.js` y desplegar el frontend. 3. Probar en celular. 4. Resolver pagos y tipo de cuenta. 5. Empaquetar, assetlinks, prueba interna → cerrada → producción (`play-store/GUIA-PLAY-STORE.md`).

---

## Fase 13 (27/10/2026): integración con Mi Zona y cobro con Google Play

- **Cobro con Google Play Billing** en lugar de Mercado Pago: `backend/utils/playBilling.js`, `backend/models/Compra.js` y `POST /api/suscripcion/compra` (el servidor le pregunta a Google si la compra es real, cada comprobante se acredita una sola vez y los meses se suman al vencimiento actual); en el panel, `frontend/js/play-billing.js` y el nuevo flujo de «Plan y facturación». `POST /crear-pago` ahora responde 410. El webhook de Mercado Pago queda solo para acreditar pagos viejos y ya no suma dos veces el mismo pago.
- **Aviso de pedido a Mi Zona** (`backend/utils/miZona.js`, llamado al cambiar el estado) y ruta `POST /api/integracion/pedidos-cliente` para «Mis pedidos» de Mi Zona. El parche viejo no entraba completo y se integró a mano.
- **Borrado de cliente:** ahora también deja los reclamos sin el vínculo con la cuenta ni el usuario y sin fotos.
- Botón «Registrar mi negocio en Mi Zona»: ya apunta a la dirección real (`js/config.js`) y no usa códigos (el vínculo es por la misma cuenta de Google).
- Textos, páginas legales y declaración de datos actualizados (Google Play en vez de Mercado Pago, planes de 1, 3 o 6 meses). El generador de páginas legales ahora conserva la sección «Si chateaste con negocios desde Mi Zona», que antes solo estaba escrita a mano en el HTML.
- **Pendiente / no verificado:** no se pudo ejecutar nada (sin internet): los archivos pasan `node --check`, pero no se probó contra Google, MongoDB ni Mi Zona. Los límites de intentos siguen en memoria (`utils/limitador.js`) y no se movieron a MongoDB.

