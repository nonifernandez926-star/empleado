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

## Qué NO incluye todavía (fase 2, para no comprometerte a algo poco realista)

- Cobro real de suscripciones (Mercado Pago / Stripe). Hoy el negocio queda
  en estado "prueba" para siempre; falta el webhook de pago que cambie el
  estado a "activa" o "vencida".
- Sistema de turnos/reservas con verificación de disponibilidad en tiempo
  real (es un desarrollo aparte, bastante más grande).
- Login con contraseña además del código admin (hoy el código ES la
  contraseña; alcanza para un MVP, pero conviene sumar más seguridad antes
  de tener negocios reales pagando).

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

## Próximos pasos sugeridos (fase 2)

1. Integrar Mercado Pago para el cobro real de la suscripción.
2. Migrar `rubros.js` a una colección de MongoDB, para poder editar rubros
   desde un panel sin tocar código ni redeployar.
3. Sumar el sistema de turnos/reservas para los rubros que lo necesiten.
4. Prompt caching en las llamadas a Claude para bajar aún más el costo por
   conversación.
