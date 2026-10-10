# Empleado Virtual IA — Plataforma SaaS de asistentes virtuales para negocios

MVP funcional: cada negocio elige su rubro, completa un formulario dinámico,
prueba gratis su asistente (con límite de mensajes) y luego puede activar
la suscripción. El asistente usa la API de Claude y **nunca inventa** datos
que el negocio no cargó.

## Qué incluye este MVP

- Sistema de rubros/subrubros **data-driven**: agregar un rubro nuevo es
  editar `backend/data/rubros.js`, sin tocar el resto del código. Viene
  precargado con 20 subrubros en 5 categorías (gastronomía, belleza, salud,
  comercio, servicios profesionales).
- Formulario de registro 100% dinámico según el subrubro elegido.
- Chat conectado a la API de Claude (modelo Haiku por defecto, el más
  económico, ideal para atención al cliente).
- Reglas anti-alucinación integradas en el prompt del sistema.
- Modo prueba privado con límite de mensajes (30 por defecto).
- Panel de administración con código único, edición de info y estadísticas
  básicas.
- Subida de fotos a Cloudinary.

## Qué NO incluye todavía

- Cobro real de suscripciones (Mercado Pago / Stripe). Hoy el negocio queda
  en estado "prueba" para siempre; falta el webhook de pago que cambie el
  estado a "activa" o "vencida".
- Login con contraseña además del código admin (hoy el código ES la
  contraseña; alcanza para un MVP, pero conviene sumar más seguridad antes
  de tener negocios reales pagando).
- Ranking de clientes con premios, fila virtual en tiempo real para turnos,
  y tendencias de mercado (ver "Próximos pasos" para el detalle de fase).

## Fases ya implementadas (resumen)

**Fase 0** — formularios dinámicos por subrubro, con `tipoOperacion`
`pedidos` o `turnos` y sus preguntas específicas.

**Fase 1** — sistema de turnos real: agenda con disponibilidad calculada
(no inventada), duración configurable por motivo de consulta, soporte
multi-profesional, aprobación manual o automática, bloqueo manual del
dueño (como un turno más, con `origen: 'dueño'`), e índice único en Mongo
para que dos clientes nunca terminen con el mismo horario aunque reserven
casi al mismo tiempo. Archivos clave: `backend/models/Turno.js`,
`backend/utils/turnos.js`, `backend/routes/turnos.js`.

**Fase 2** — catálogo real de productos/servicios (`backend/models/Producto.js`),
con preguntas específicas según el tipo (General / Ropa-calzado /
Comida-bebida / Servicio) en vez de un único formulario genérico. El
chatbot usa precios, stock y disponibilidad real del catálogo, nunca
inventa. Incluye edición y foto opcional por producto.

**Fase 3** — vendedor con memoria. En el panel, tarjeta "Vendedor y
memoria" (sección Negocio):
- **Modo vendedor** (suave / normal / agresivo): controla qué tan
  activamente el asistente empuja para cerrar el pedido/turno, sin nunca
  inventar disponibilidad/precios ni insistir después de un "no".
- **Memoria de clientes** (on/off): recuerda nombre, último pedido y
  último turno de cada cliente recurrente. Si el dueño la apaga, cada
  conversación se trata como la primera vez siempre.
- **Permisos del asistente**: 4 checkboxes con efecto real (no
  decorativos) — recomendar productos, mencionar promociones, tomar
  pedidos/turnos por su cuenta, guiar activamente hacia el cierre. Si se
  apaga "tomar pedidos/turnos", ni siquiera se le ofrecen esas
  herramientas a la IA, no es solo una instrucción de prompt.

**Fase 4** — ventas y recuperación (`backend/routes/oportunidades.js`,
`backend/models/RecuperacionPendiente.js`):
- Detecta clientes **indecisos** (hablaron, no llegaron a comprar/reservar)
  y **inactivos** (ya fueron clientes, pero no volvieron a hablar hace
  tiempo), con umbral configurable (día / semana / mes).
- Botón "Recuperar" (individual o para toda la lista) prepara un mensaje
  que el asistente entrega automáticamente apenas ese cliente vuelva a
  escribir — no existe forma de mandarle un mensaje sin que él escriba
  primero (no hay WhatsApp Business API ni push reales todavía), así que
  el sistema es honesto sobre esa limitación en vez de prometer algo que
  no puede cumplir.
- Promociones con reglas reales: fecha límite, horario en que aplica, a
  qué producto/servicio aplica, y cupo máximo de usos (con botón "+1 uso"
  para que el dueño lo sume a mano — no hay tracking automático todavía).

**Fase 5** — calificación con estrellas + reseñas
(`backend/models/Resena.js`, `backend/routes/resenas.js`):
- Después de cerrar un pedido o turno, aparece un widget de 5 estrellas en
  el chat del cliente (estilo WhatsApp: tocás y se rellenan).
- Según la calificación (3 o más vs. 2 o menos), el asistente pregunta algo
  distinto ("¿qué te gustó?" vs. "¿qué no te gustó?") — es un mensaje fijo,
  no pasa por la IA, para que sea instantáneo y no gaste tokens en algo tan
  simple.
- Panel "Experiencia" (en Herramientas): promedio, total, reseñas
  positivas/negativas, y el listado completo con filtro.

---

## PASO A PASO PARA TENERLO FUNCIONANDO EN LA WEB

### 1. Crear la base de datos en MongoDB Atlas

1. Andá a https://www.mongodb.com/cloud/atlas y creá una cuenta (o usá la
   que ya tenés de Mi Zona).
2. Creá un cluster gratuito (M0).
3. En "Database Access" creá un usuario con contraseña.
4. En "Network Access" agregá `0.0.0.0/0` (permitir todas las IPs, más
   simple para empezar).
5. En "Database" → "Connect" → "Drivers", copiá el **connection string**
   (algo como `mongodb+srv://usuario:password@cluster.mongodb.net/...`).
   Lo vas a necesitar en el paso 3.

### 2. Crear la cuenta de Cloudinary

1. Andá a https://cloudinary.com y creá una cuenta (o usá la de Mi Zona).
2. En el Dashboard vas a ver: **Cloud name**, **API Key**, **API Secret**.
   Los necesitás en el paso 3.

### 3. Conseguir tu API Key de Claude

1. Andá a https://console.anthropic.com (necesitás una cuenta con
   facturación habilitada para producción).
2. Creá una API Key.
3. Guardala, la vas a necesitar en el paso 5.

### 4. Subir el proyecto a GitHub

1. Descomprimí el zip.
2. Creá un repositorio nuevo en GitHub (puede ser uno solo para todo el
   proyecto, con las carpetas `backend/` y `frontend/` adentro).
3. Subí todo el contenido del zip a ese repositorio (con GitHub Desktop o
   por consola: `git init`, `git add .`, `git commit -m "primer commit"`,
   `git remote add origin <tu-repo>`, `git push`).

### 5. Desplegar el backend (Render)

El backend necesita un servidor corriendo (no es un sitio estático), por
eso Netlify no alcanza para esta parte — se usa **Render** (tiene plan
gratuito, similar a lo que usarías para esto):

1. Andá a https://render.com y creá una cuenta.
2. "New" → "Web Service" → conectá tu repositorio de GitHub.
3. Configurá:
   - **Root directory**: `backend`
   - **Build command**: `npm install`
   - **Start command**: `npm start`
4. En "Environment", cargá las variables (mismas que `backend/.env.example`):
   - `MONGO_URI` (del paso 1)
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (del paso 2)
   - `ANTHROPIC_API_KEY` (del paso 3)
   - `CLAUDE_MODEL` = `claude-haiku-4-5-20251001`
   - `FRONTEND_URL` = la URL que te va a dar Netlify en el paso 6 (podés
     dejarlo en blanco al principio y completarlo después)
   - `JWT_SECRET` = cualquier texto largo y aleatorio
5. Deploy. Cuando termine, Render te da una URL tipo
   `https://tu-proyecto.onrender.com`. Guardala.

### 6. Desplegar el frontend (Netlify)

1. Antes de subir, editá `frontend/js/config.js` y reemplazá la URL por la
   de Render del paso 5:
   ```js
   const API_URL = 'https://tu-proyecto.onrender.com/api';
   ```
   Subí ese cambio a GitHub.
2. Andá a https://app.netlify.com → "Add new site" → "Import from GitHub".
3. Elegí el repositorio, y configurá:
   - **Base directory**: `frontend`
   - **Publish directory**: `frontend` (o vacío si ya seteaste base directory)
4. Deploy. Netlify te da una URL tipo `https://tu-proyecto.netlify.app`.
5. Volvé a Render y actualizá la variable `FRONTEND_URL` con esa URL, para
   que el backend acepte pedidos desde ahí (CORS).

### 7. Probar todo el flujo

1. Entrá a tu sitio de Netlify.
2. "Crear mi asistente" → elegí un rubro → completá el formulario.
3. Vas a recibir un código admin y un código público. Guardalos.
4. Probá el chat en `tu-sitio.netlify.app/chat.html?codigo=TU_CODIGO_PUBLICO`.
5. Entrá al panel en `tu-sitio.netlify.app/admin.html` con tu código admin.

---

## Cómo agregar un rubro o subrubro nuevo (sin programar)

Abrí `backend/data/rubros.js` y agregá un objeto nuevo dentro del array
`RUBROS`, siguiendo la misma estructura que los que ya están. No hace
falta tocar ningún otro archivo — el formulario del frontend se genera
solo a partir de esos datos.

## Cómo configurar el login con Google

1. Andá a https://console.cloud.google.com/apis/credentials
2. Creá un proyecto nuevo (o usá uno existente)
3. "Crear credenciales" → "ID de cliente de OAuth" → tipo de aplicación **"Aplicación web"**
4. En "Orígenes autorizados de JavaScript" agregá la URL de tu sitio en Netlify (ej: `https://empleado-digital.netlify.app`) y `http://localhost` si vas a probar local
5. Creá la credencial y copiá el **Client ID** (termina en `.apps.googleusercontent.com`)
6. Pegalo en dos lugares:
   - `frontend/js/config.js` → variable `GOOGLE_CLIENT_ID`
   - Render → variable de entorno `GOOGLE_CLIENT_ID`

El código admin sigue funcionando siempre como respaldo, así que no hay riesgo de quedarte afuera del panel si algo falla con Google.

## Ronda de arreglos + Fase 6 (esta entrega)

**Arreglos sobre la Fase 5:**
- El widget de estrellas ya no deja un mensaje duplicado de "gracias".
- La respuesta a "¿qué te gustó / no te gustó?" se escribe en el mismo
  cuadro de texto de siempre - antes se abría un input nuevo, se sacó.
- Pago por transferencia: ahora el pedido se registra (`registrar_pedido`)
  recién después de que el cliente confirma que ya transfirió o mandó el
  comprobante, nunca antes. Si la forma de pago no es transferencia, se
  registra al confirmar como siempre.
- El prompt ahora pide agrupar 3-4 datos por mensaje al tomar un pedido, en
  vez de uno por vez, para no gastar tantos mensajes ni cansar al cliente.

**Reorganización y diseño:**
- "Oportunidades de venta" y "Experiencia" se movieron de Herramientas a
  Negocio.
- Fila de "Oportunidades de venta" del mismo tamaño que sus vecinas (la
  descripción larga la hacía ver más alta).
- Panel de Experiencia rediseñado: "Todas" arriba ocupando todo el ancho,
  "Positivas"/"Negativas" abajo en dos columnas, sin emojis, texto
  centrado.

**Funciones nuevas:**
- **Zonas de delivery** (`Negocio.zonasDelivery`): el dueño carga zona +
  precio de envío, y el asistente lo usa para cobrar el envío según la
  dirección - nunca inventa un costo.
- **Aprendizaje de direcciones** (`Cliente.ultimaDireccion`): el asistente
  recuerda la última dirección de delivery de cada cliente y puede
  ofrecerle repetirla (siempre confirmando, nunca dándola por sentada).
- **Probar al asistente** (en Herramientas): simulación de conversación
  eligiendo el modo vendedor, sin tocar clientes/pedidos/turnos reales -
  las herramientas de registrar quedan apagadas para esa llamada.
- **Privacidad** (en Ajustes): qué datos se guardan y cómo apagar la
  memoria de clientes.
- **Invitá a otros negocios** (en Ajustes): link copiable a la página de
  registro.

**Fase 6 — Ranking de clientes y recompensas** (`backend/routes/ranking.js`,
`Cliente.totalGastado`, `Negocio.ranking`):
- TOP 10 por 4 criterios: dinero gastado, cantidad de compras, visitas
  (conversaciones distintas), o fidelidad (antigüedad como cliente).
- El dueño elige UN criterio "oficial" y el premio para 1°, 2° y 3° puesto.
- Cuando un cliente del top 3 vuelve a escribir, el asistente se lo hace
  saber de forma natural en algún momento de la charla.

### Sobre la recuperación de clientes "de verdad" (pendiente de decisión, no de código)

Ahora mismo "recuperar" un cliente solo puede *prepararle* un mensaje que
el asistente le dice la próxima vez que él escriba - no existe forma de
mandarle algo sin que escriba primero. Para que sea un mensaje real y
espontáneo (que le llegue una notificación sin que él abra el chat antes),
hacen falta specifically una de estas dos cosas, y ninguna es solo código:

1. **WhatsApp Business API**: requiere verificación de Meta como negocio,
   un número de teléfono dedicado, y tiene costo por mensaje enviado fuera
   de una conversación abierta. Es el camino más directo si los clientes
   dan su teléfono real.
2. **Notificaciones push de Mi Zona**: si el cliente usa la app y llegó a
   este negocio a través del chat de Mi Zona (no del link/QR suelto de
   este asistente), se le podría avisar por ahí. Pero es un canal distinto
   al chat web actual, y solo aplica a quien pasó por Mi Zona.

Ninguna la puedo implementar sin que el dueño tome antes esa decisión
(cuenta de WhatsApp Business, presupuesto por mensaje, o priorizar el
canal de Mi Zona) - por eso quedó afuera de esta ronda.

## Navegación de "Negocio" y ranking en podio (esta entrega)

- Las opciones dentro de **Negocio** (Productos, Fotos, Promociones,
  Zonas de delivery, Vendedor y memoria, Oportunidades, Experiencia,
  Clientes destacados) ahora abren en **pantalla completa** al tocarlas,
  en vez de desplegarse hacia abajo como en Herramientas/Ajustes. Para
  volver, tienen su flechita arriba a la derecha.
- **Clientes destacados** ahora se ve como un podio real (1°, 2° y 3°
  puesto con su medalla, el 1° más grande y elevado), inspirado en el
  diseño que pediste y en el ranking que ya tiene Mi Zona
  (`src/App.jsx` → `RankingScreen`). Los premios (texto + % de
  descuento opcional) se escriben ahí mismo, debajo del podio.
- El **% de descuento es real, no solo un texto**: cuando un cliente del
  top 3 vuelve a comprar, el asistente calcula el precio con el
  descuento ya aplicado y le dice los dos montos (original y final) -
  no es la IA "acordándose" de memoria, es una instrucción explícita en
  el prompt con el número exacto que cargó el dueño.

## Próximos pasos sugeridos (Fase 7 en adelante)

**Fase 7 — Fila virtual en tiempo real** (para negocios de turnos): número
de orden, "cuántos faltan antes que vos", reasignación automática de
turnos cancelados a una lista de espera.

**Fase 8 — Tendencias de mercado**: internas (datos reales de los negocios
que usan la plataforma) primero, por ser las únicas verificables sin
riesgo de inventar un dato; externas (Argentina, noticias, clima) después,
mostrando siempre fuente, período y nivel de confianza.

Aparte de las fases:
1. Integrar Mercado Pago para el cobro real de la suscripción.
2. Migrar `rubros.js` a una colección de MongoDB, para poder editar rubros
   desde un panel sin tocar código ni redeployar.
3. Prompt caching en las llamadas a Claude para bajar aún más el costo por
   conversación.
4. Decidir el camino de WhatsApp Business API o push de Mi Zona para que
   la recuperación de clientes mande mensajes de verdad (ver sección de
   arriba).

---

## Ronda de arreglos (fase 6c)

- **Ranking:** se pueden activar y desactivar varios criterios a la vez sin que se pisen ni se pierdan los premios que se están escribiendo. El servidor acepta `GET /api/ranking/activos?criterios=a,b`.
- **Suscripciones:** planes Mensual $20.000, Trimestral $54.000 (10% OFF, $18.000/mes) y Semestral $96.000 (20% OFF, $16.000/mes), con frase de ahorro. El plan viejo de 5 meses queda solo como compatibilidad para pagos ya hechos. Variable nueva en el `.env`: `PRECIO_6_MESES`.
- **Tiempo restante y avisos:** anillo con los días que quedan, aviso en Inicio desde 7 días antes de vencer (y si ya venció), notificación del navegador una vez por día mientras el panel esté abierto, y botón para renovar antes (los meses nuevos se suman al final).
- **Inicio:** tarjetas del día, gráfico circular interactivo (estado, entrega, pago y productos; en turnos, estado y motivo), barras de la semana con pedidos/ingresos, y actividad por hora.
- **Pantalla completa:** ahora cubre también la barra inferior, va centrada y cada opción trae un encabezado con ícono y descripción para que las de poco contenido no se vean vacías.
- **Probar al asistente:** se puede simular ser cliente TOP 1°, 2° o 3° para ver el aviso del premio y el cálculo del descuento.
- **Turnos:** el Inicio de negocios con turnos ahora cuenta turnos (antes contaba pedidos y daba siempre 0).


## Fase 7: fila virtual del día + nombre en el primer pedido (fase 7)

**Fila virtual (solo negocios de turnos)**
- El dueño ve una tarjeta "Fila de hoy" arriba de Turnos: quién se está atendiendo, quién sigue y en qué orden. Botones **Atender**, **Finalizar** y **No vino**. Se refresca sola cada 15 segundos.
- Si hay varios profesionales, cada uno tiene su propia fila.
- La fila NO se guarda: se calcula cada vez a partir de los turnos de hoy. Por eso, cuando alguien cancela, no viene o termina, los de atrás avanzan solos. Si alguien cancela y el siguiente tiene el turno mucho más tarde, se le avisa que puede adelantarse al hueco.
- El cliente ve su lugar en un cartel arriba de su chat ("2 personas antes que vos", "Sos el siguiente", "Te están atendiendo"), que se actualiza solo cada 20 segundos mientras tenga el chat abierto. Además el asistente tiene la herramienta `consultar_mi_fila` para responder "¿cuánto falta?".
- El chat NUNCA se pone en espera: el asistente atiende a todos los clientes a la vez. La fila es solo del local físico.
- Límite: sin notificaciones push ni WhatsApp Business API, no se le puede avisar a alguien que cerró el chat. Lo ve apenas vuelve a abrir el chat o a escribir.
- Archivos: `backend/utils/fila.js`, `backend/routes/fila.js`, campos `atencion`/`inicioAtencion`/`finAtencion` en `models/Turno.js`.

**Nombre en el primer pedido**
- En negocios de pedidos, si el asistente todavía no sabe cómo se llama el cliente, se lo pregunta apenas quiere pedir (antes de los demás datos) y lo llama por su nombre.
- Ese nombre queda guardado en el perfil del cliente y es el que aparece en el ranking. Si después pide para otra persona, el nombre del ranking no cambia.
- Requiere que la "memoria de clientes" del negocio esté activada (sin memoria no hay perfil y el cliente no entra al ranking).


## Fase 8A: tendencias internas (fase 8)

Panel **Herramientas > Tendencias**. Todo sale de los datos reales del negocio: no usa internet, no usa IA y no tiene costo extra. Si hay pocos datos, lo dice en vez de inventar.

- **Esta semana contra la anterior:** los últimos 7 días contra los 7 previos (pedidos o turnos, ingresos con precio cargado, conversaciones y, en turnos, ausentes).
- **Qué producto/servicio sube o baja:** compara las dos semanas; solo cuenta los que tuvieron movimiento suficiente (mínimo 4 en total, cambio de 25% o más y al menos 2 unidades).
- **Días y horas más flojos:** promedio por día de la semana y por hora en los últimos 28 días completos, contando solo los días y horas dentro del horario de atención. Se activa con 20 pedidos o turnos.
- **Cambios de precio (solo pedidos):** detecta cambios sostenidos del precio registrado en los pedidos (últimos 90 días) y compara 14 días antes contra 14 días después. Avisa que la temporada o las promociones también influyen.
- **Ausentismo (solo turnos):** % de turnos que quedaron en "No vino" sobre los ya cerrados, últimos 28 días.
- Los pedidos y turnos de prueba no se cuentan. Los turnos cancelados o rechazados tampoco.
- Archivos: `backend/utils/tendencias.js` (cálculo), `backend/routes/tendencias.js` (`GET /api/tendencias`), panel en `frontend/admin.html`, `frontend/js/admin.js` y `frontend/css/style.css`.
- Las tendencias externas (8B, búsqueda web) quedan descartadas por ahora.

**Arreglo incluido:** `backend/utils/turnos.js` usaba `DIAS_SEMANA` sin definirlo, lo que rompía la consulta de horarios disponibles en negocios de turnos. Ya está definido.

**Pendiente detectado (no se tocó):** `calcularHorariosDisponibles` compara con la hora del servidor (UTC) en vez de la hora argentina, y al asistente no se le pasa la fecha de hoy. Ver `docs/investigacion-y-decisiones.md`.


## Webhook de Mercado Pago: validación de firma (seguridad)

El webhook (`POST /api/suscripcion/webhook`) ahora valida el header `x-signature` que envía Mercado Pago, usando `backend/utils/firmaWebhookMP.js`. Antes, cualquiera que conociera la URL podía simular un pago aprobado y activar una suscripción gratis.

- Configurar `MP_WEBHOOK_SECRET` en el `.env` con la Clave secreta del Panel de Mercado Pago (Tus integraciones → tu app → Webhooks → Configurar notificaciones).
- Si `MP_WEBHOOK_SECRET` no está configurado, el webhook sigue funcionando pero sin protección (queda un aviso en el log del servidor). Configurarla antes de cobrar de verdad.


## Confirmación real al volver del pago (fase 8)

- **Espera de confirmación real:** antes, al volver de Mercado Pago, el panel mostraba el estado que tuviera guardado en ese momento, que podía no reflejar un pago recién aprobado si el webhook todavía no había llegado. Ahora `admin.html` distingue `?pago=exito|pendiente|fallo` en la URL (viene de `back_urls` en `routes/suscripcion.js`) y, si no está ya activa, consulta de nuevo cada 3 segundos durante 30 segundos hasta ver la suscripción activada. Si tarda más, avisa que puede demorar unos minutos y sugiere recargar. Archivo: `frontend/js/admin.js` (`esperarConfirmacionPago`, `mostrarToast`).
- **Sin QR para pagar:** se probó y se sacó. Un QR con el link de pago no cobra solo al escanearlo: igual hay que abrir el Checkout de Mercado Pago y confirmar el pago ahí. Queda solo el botón con el link, como estaba.


## Google real y mejora de diseño general (fase 8)

- **Client ID real de Google cargado:** ya está puesto en `backend/.env.example` (`GOOGLE_CLIENT_ID`) y en `frontend/js/config.js`. Falta que en tu `.env` real (no el `.env.example`) también lo cargues, y confirmar en Google Cloud Console que el dominio real donde va a vivir el frontend esté en "Orígenes autorizados de JavaScript".
- **Rediseño general (`frontend/css/style.css`):** como es una sola hoja de estilos compartida por todas las páginas, esto se nota en toda la app:
  - Títulos (`h1`-`h4`) unificados: antes la mayoría de los `h2`/`h3` de los paneles no tenían estilo propio y quedaban con el diseño por defecto del navegador (distinto tamaño/peso en cada pantalla). Ahora todos parten de la misma base.
  - Botones, tarjetas, inputs, filas de lista, pestañas, accesos rápidos y tarjetas seleccionables ahora reaccionan al tocarlos (antes varias quedaban estáticas) y comparten las mismas transiciones y sombras.
  - Header y pantalla de inicio con más profundidad (capas de degradado sutiles) en vez de un color plano.
  - Foco visible para navegación por teclado (accesibilidad), sin ensuciar el look al tocar con el dedo o hacer clic con el mouse.
  - Colores repetidos sueltos (como el celeste de selección) unificados en una sola variable.


## Notificaciones push reales (fase 8)

Ya estaba la lógica que detecta clientes "indecisos" (hablaron y no compraron/reservaron) e "inactivos" (Herramientas → Oportunidades en el panel), pero el aviso solo se entregaba si ese cliente volvía a escribir por su cuenta. Ahora, si el cliente activó notificaciones, se le manda un push real apenas el dueño toca "Recuperar":

- **Archivos nuevos:** `backend/models/PushSuscripcion.js`, `backend/utils/push.js`, `backend/routes/push.js`, `frontend/sw.js`.
- **Se pide permiso recién después de la primera respuesta del asistente** (no apenas se abre el chat, para no ser invasivo) y como mucho una vez por navegador.
- **Si el cliente no tiene notificaciones activadas** (las rechazó, o su navegador no las soporta), no pasa nada raro: el mensaje se le sigue mostrando apenas vuelva a escribir, exactamente como antes.
- **Configuración necesaria:** correr `npx web-push generate-vapid-keys` (una sola vez) y cargar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` en el `.env` real. Sin esto, el sistema sigue funcionando pero solo con el aviso "al volver a escribir" de siempre.
- **Importante para Play Store:** esto es Web Push (Service Worker + Push API), el mismo mecanismo que usa cualquier sitio web. Funciona sin cambios si publicás la app como **TWA** (Trusted Web Activity, con Bubblewrap o PWABuilder — la forma estándar de subir un sitio web a Play Store). Si en cambio la empaquetás como un WebView nativo simple (por ejemplo con una herramienta tipo Median o un WebView a mano), este mecanismo NO alcanza: ahí hace falta integrar Firebase Cloud Messaging (FCM) en la parte nativa, que es otra implementación aparte.
- **Falta:** íconos reales para la notificación (`frontend/img/icono-192.png` y `icono-96.png`, hoy no existen en el proyecto — sin ellos, la notificación se muestra con el ícono por defecto del navegador, no rompe nada).


## Manifest + íconos, para publicar gratis con TWA (fase 8)

- `frontend/manifest.json` + `frontend/img/icono-192.png` / `icono-512.png` / `icono-96.png` (generados a partir del mismo robot de la marca). Vinculados en `index.html`, `admin.html`, `registro.html` y `chat.html`.
- Esto es lo que hacía falta para dos cosas a la vez: que el ícono de las notificaciones push no salga en blanco, y que una herramienta como Bubblewrap o PWABuilder pueda empaquetar el sitio como app para Play Store (TWA), que es el camino gratis (aparte de los 25 USD de la cuenta de desarrollador).
- Falta: subir el sitio a su dominio final (Bubblewrap necesita una URL real, no funciona con `file://`), y el archivo `assetlinks.json` que confirma que el dominio y la app son tuyos (eso se genera recién al final, con la clave de firma que crea Bubblewrap).


## Agenda del dueño (nueva)

Pestaña **Agenda** del panel: un centro de organización personal del dueño, que se adapta al rubro del negocio.

- **Hoy / Semana / Tareas:** eventos con título, fecha, hora, duración, persona, notas y recordatorio; tareas que se marcan como hechas. En "Hoy" también se ven (solo lectura) los turnos de clientes si el negocio trabaja con turnos. Los pedidos NO están acá: siguen en su sección.
- **Adaptación por rubro:** tipos de evento y tareas sugeridas distintas para gastronomía, salud, hogar, automotor, belleza, comercio, servicios profesionales, educación y eventos (`backend/utils/agendaPerfiles.js`).
- **Importar desde foto:** el dueño sube una foto de su agenda de papel; Claude propone los eventos y tareas que ve y el dueño los revisa, edita y confirma antes de guardar (nada se guarda solo). La foto no se almacena: se analiza y se descarta.
- **Agregar desde un mensaje:** "El jueves a las 16 reunión con Martín" → propuesta para confirmar.
- **Organizar mi día** (plan del día con avisos si hay poco margen entre eventos) y **preguntarle a la agenda** ("¿qué tengo pendiente esta semana?").
- **Recordatorios:** el panel los revisa cada minuto mientras está abierto y avisa dentro de la app y, si el dueño lo permite, con una notificación del navegador.
- Las funciones con IA usan `ANTHROPIC_API_KEY` y `CLAUDE_MODEL` (ya configuradas en Render), con un tope de 40 usos por hora por negocio.
- Rutas nuevas: `/api/agenda/*` (todas requieren sesión de administrador del negocio). Modelo: `AgendaItem`.

## Integración con Mi Zona

Rutas privadas `/api/integracion/*`, protegidas con `INTEGRACION_KEY` (la misma clave en los dos servidores): `cuenta`, `estado-asistentes` y `conversaciones-cliente`. Las conversaciones de los clientes nunca se borran al vencer la suscripción: al renovar, el asistente retoma el historial.

---

## Centro de notificaciones, avisos al celular y Ajustes (v3)

- **Notificaciones del dueño** (campana): el servidor arma la lista en `GET /api/cuenta/novedades` a partir de datos reales (pedidos, comprobantes, turnos, reseñas, preguntas sin responder, suscripción, respuestas de soporte, accesos). El panel solo guarda en el celular qué avisos leíste o borraste. Se actualiza solo cada 40 s y al volver a la pestaña.
- **Avisos al celular (push) para el dueño:** se activan por dispositivo en Ajustes → Notificaciones. Usan la misma tabla de dispositivos que ya usaban los recordatorios de la Agenda (`PushSuscripcion` con `sesionClienteId: '__dueno__'`) y requieren las claves VAPID. Cada tipo de aviso se puede apagar (`Negocio.notificaciones`). Los vencimientos de suscripción (7, 3, 1 día y al vencer) se revisan cada 6 h dentro del propio servidor (`utils/avisos.js`); en planes gratuitos de hosting que duermen el servidor, conviene tenerlo despierto.
- **Ajustes:** Mi cuenta, Notificaciones, Apariencia (tema claro/oscuro/automático, 6 colores de acento, tamaño de texto, reducir animaciones; se guarda en el dispositivo), Seguridad (cambiar contraseña, cerrar las demás sesiones, actividad de 90 días), Privacidad (memoria de clientes, qué se guarda, descargar y borrar datos), Centro de ayuda (`frontend/js/ayuda-contenido.js`), Soporte (consultas con respuesta; panel del equipo en `/api/soporte/panel`) y Acerca de (`frontend/js/legal.js`: texto base de términos y privacidad, **conviene que lo revise un abogado**).
- **Rutas nuevas:** `/api/cuenta/*`, `/api/soporte/*`, `/api/push/dueno/*`.
- **Seguridad:** al vincular con Google una cuenta que ya existía con correo, se borra la contraseña anterior y se cierran sus sesiones. Ninguna respuesta de la API devuelve ya el código de administración.

---

## Cambios de esta versión

**Cuenta y acceso** (mismo flujo que Mi Zona)
- **Registrarme** (texto azul): abre directo la lista de cuentas de Google. Después se crea el **usuario** y, por último, la **contraseña**. El correo es el de la cuenta de Google elegida.
- **Acceder con Google**: se elige la cuenta y se entra al panel.
- **Usuario y contraseña**: se escribe el usuario y, en el paso siguiente, la contraseña.
- **Con el correo**: se escribe el correo y es lo mismo que "Acceder con Google" pero con ese correo ya cargado (Google pide la contraseña en su propia página; Mi Asistente nunca la ve). Las cuentas viejas creadas con correo y contraseña siguen entrando con esa contraseña.
- Las cuentas que ya existían sin usuario o contraseña ven un "último paso" al entrar (con opción de salir).
- **Reglas** (iguales a Mi Zona, en `backend/utils/usuarios.js` y `frontend/js/credenciales.js`): usuario de 5 a 20 caracteres, empieza con letra, puede no tener números, sin tildes ni espacios. Contraseña de 8 o más caracteres, sin espacios y sin contener el usuario; puede ser solo números, solo letras o una mezcla. Si el usuario ya está en uso, avisa en vivo.
- Ajustes → Mi cuenta: se pueden editar nombre, usuario, correo (solo cuentas viejas de correo; el de Google se cambia desde Google) y contraseña.
- Si ya hay una sesión guardada, la web entra directo al panel. Si el servidor está dormido o no hay conexión, no se cierra la sesión: se ofrece reintentar. Cerrar sesión siempre pregunta (Confirmar / Cancelar).
- Servidor: `GET /api/auth/usuario-disponible`, `PUT /api/auth/completar`, `POST /api/auth/login` (usuario; el correo solo para cuentas viejas), `PUT /api/cuenta/usuario`, `PUT /api/cuenta/correo`, `POST /api/cuenta/contrasena` (también crea la contraseña si falta). Se quitó el registro abierto por correo (`/auth/registro`): el correo no se verificaba.

**Panel**
- Subpantallas en: Vendedor y memoria, Promociones, Oportunidades de venta y Mi cuenta (se arman con `.sp-sub`, ver `frontend/js/subpantallas.js`).
- "QR y enlace del chat" ahora es una sola función con explicación, descarga del QR, copiar/compartir el enlace y consejos de uso.
- "Descargá Mi Zona": explica qué es Mi Zona, qué gana el negocio, cómo empezar y el costo. El botón usa `MI_ZONA_URL` de `frontend/js/config.js`.
- Fotos del negocio: el logo se cambia o se quita tocando la foto de arriba a la derecha (con un modal rediseñado).
- Filtro de pedidos: Delivery / Local y Efectivo / Transferencia, con íconos y desplegable compacto.
- Apariencia: color propio, intensidad del color, esquinas, tipografía, espaciado y barra inferior, además de tema, tamaño de texto y movimiento.
- Movimiento al abrir funciones, entrar/volver de subpantallas y cambiar de sección (se desactiva con "Reducir animaciones").

**Clientes destacados (ranking) y seguridad**
- El ranking ahora tiene el estilo del de Mi Zona: portada con título y datos, podio con corona para los 3 primeros (con el premio de cada puesto), selector de criterio, lista del 4° al 10° con barra de progreso y un "¿Cómo se calcula?". Premios y criterios están en sus propias subpantallas.
- Corrección de seguridad: los nombres, comentarios, notas, direcciones y mensajes que escriben los clientes (pedidos, turnos, reseñas y oportunidades) se mostraban sin escapar en el panel del dueño, lo que permitía meter código desde el chat. Ahora se escapan.


---

## Publicación en Google Play
Mirá `INFORME-REVISION.md` (qué se corrigió y qué falta) y la carpeta `play-store/`. Las páginas `privacidad.html`, `terminos.html` y `eliminar-cuenta.html` se generan con `node scripts/generar-legales.js` a partir de `frontend/js/legal.js`.

## Entrar con código al correo + elegir la ubicación en el mapa

- **Entrar con el correo:** al escribir un correo en el acceso, se manda un código de 6 números a ese correo y se entra con él (sin contraseña). Solo para cuentas existentes; crear cuenta sigue siendo "Registrarme" (Google). Rutas: `POST /api/auth/codigo/enviar` y `POST /api/auth/codigo/verificar`.
- **Configurar el envío (una sola vez):** Render gratis no permite SMTP, se envía por API con **Brevo** (gratis, sin dominio): creá cuenta en brevo.com → Remitentes (verificá tu correo) → SMTP y API → API Keys, y cargá en Render `BREVO_API_KEY` y `CORREO_REMITENTE` (ej.: `Mi Asistente <tu-correo@gmail.com>`).
- **Cuentas viejas de correo sin verificar:** al entrar por primera vez con un código se les borra la contraseña vieja y se cierran sus sesiones.
- **Mapa para la dirección:** en el registro y en "Editar mi negocio", el campo Dirección tiene el botón **Elegir en el mapa** (pin que se arrastra + Confirmar). Escribe la dirección sola, completa la localidad si estaba vacía y guarda las coordenadas en `negocio.ubicacion`. Leaflet se carga desde unpkg la primera vez. `netlify.toml` ahora permite la ubicación del dispositivo (`geolocation=(self)`).
- **Sin Brevo (más simple):** se puede enviar desde tu propio Gmail con un script de Google gratis. Abrí `backend/correo-apps-script.gs` y seguí los 4 pasos de los comentarios; después cargá en Render `APPS_SCRIPT_URL` y `APPS_SCRIPT_CLAVE`. Gmail gratis permite unos 100 correos por día. Si está cargado, tiene prioridad sobre Brevo.
