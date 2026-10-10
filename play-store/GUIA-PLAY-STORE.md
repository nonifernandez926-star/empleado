# Guía: de la web a Google Play (Mi Asistente como TWA)

1. **Publicá el frontend** en Netlify (carpeta `frontend`). Antes: corré `node scripts/generar-legales.js` y revisá que `js/config.js` tenga tus datos reales (`API_URL`, `MI_ZONA_URL`, `SOPORTE_EMAIL`).
2. **Publicá el backend** (Render) con las variables de `backend/.env.example`. `FRONTEND_URL` y `JWT_SECRET` son obligatorias. Probá `https://TU-API/healthz`.
3. **Probá en un celular real**: entrar con Google, registrar un negocio, chatear, pedido, turno, notificaciones, modo avión (debe salir "Sin conexión"), Reportar una respuesta, eliminar una cuenta de prueba.
4. **Empaquetá** con Bubblewrap o PWABuilder (usan la versión actual y apuntan al nivel de API que Google exige hoy). Partí de `play-store/twa-manifest.json.plantilla`. Guardá la clave de firma (`.keystore`) en un lugar seguro: si la perdés no podés actualizar.
5. **Subí el `.aab`** a Play Console con *Play App Signing*. Copiá la huella SHA-256 de "Integridad de la app" a `frontend/.well-known/assetlinks.json` (renombrá la plantilla, quitá `.plantilla`) y volvé a publicar el frontend. Sin esto la app abre con barra de Chrome.
6. **Ficha y declaraciones**: usá `FICHA-TIENDA.md` y `SEGURIDAD-DE-LOS-DATOS.md`. Cargá la URL de privacidad y la de eliminación de cuenta.
7. **Acceso para revisores**: la app exige cuenta. Creá un usuario de prueba con contraseña (no uses solo Google) y cargalo en "Acceso a la app".
8. **Pruebas**: probá primero en prueba interna. Si tu cuenta de desarrollador es personal y nueva, Google puede pedir una prueba cerrada con testers durante un período antes de producción: confirmalo en Play Console.
9. **Pagos**: leé la sección 3 del informe antes de enviar a revisión.
