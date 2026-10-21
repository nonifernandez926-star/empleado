# Reclamos, devoluciones y cambios: cómo se conectan Mi Zona y Mi Asistente

Los clientes hacen el reclamo **en Mi Zona**. Mi Asistente recibe el reclamo, el dueño lo ve en
*Herramientas → Atención a tus clientes → Cambios y reclamos*, decide si lo acepta o lo rechaza y **responde con un mensaje obligatorio**.
Esa respuesta vuelve a Mi Zona para que la persona la vea.

> Esta parte de Mi Asistente ya está lista y probada. **Mi Zona todavía tiene que enviar los reclamos y mostrar las respuestas**
> (esa app no se modificó). Abajo está todo lo que necesita.

## Cuándo aparece la función en Mi Asistente
Solo si el negocio ya está en Mi Zona **con la misma cuenta**. Mi Asistente lo marca (`negocio.miZona.vinculado = true`) cuando:
- Mi Zona llama a `POST /api/integracion/cuenta` y esa cuenta (Google o correo) coincide con la de un negocio, o
- Mi Zona envía el primer reclamo de ese negocio.

Si no está vinculado, la fila "Cambios y reclamos" queda oculta y no se muestran avisos.

## Autenticación
Igual que el resto de la integración: header `x-integracion-key` con el valor de `INTEGRACION_KEY`.

## 1) Crear un reclamo
`POST /api/integracion/reclamos`

```json
{
  "codigoPublico": "ABC123",          // código público del negocio (el mismo del enlace del chat)
  "refExterna": "reclamo_8f2c",       // id del reclamo en Mi Zona (se usa para no duplicar y para consultar después)
  "cliente": { "ref": "usuario_id", "usuario": "maria_gomez" },   // solo el usuario público
  "tipo": "reclamo | devolucion | cambio",
  "motivo": "mal_estado | no_llego | incorrecto | calidad | demora | atencion | otro",
  "producto": "Pizza Muzzarella",     // opcional
  "pedidoRef": "#1042",               // opcional
  "monto": 9000,                      // opcional: lo que pagó
  "esComida": true,                   // si es comida solo se devuelve el dinero (no hay cambio de producto)
  "descripcion": "Texto del cliente (mínimo 10 caracteres)",
  "fotos": ["https://.../foto1.jpg"]  // hasta 4, solo https. Mi Zona las sube a su almacenamiento y manda las URLs
}
```
Respuesta `201`: `{ "id": "...", "estado": "nuevo" }`. Si se reenvía el mismo `refExterna`, responde `200` con `"duplicado": true`.
Al llegar, el dueño recibe un aviso al celular (si lo tiene activado en Ajustes → Notificaciones).

## 2) Consultar cómo van (y leer la respuesta del dueño)
`POST /api/integracion/reclamos/estado`

```json
{ "refs": ["reclamo_8f2c", "reclamo_91aa"] }
```
Respuesta:
```json
{ "reclamos": [{
  "refExterna": "reclamo_8f2c", "codigoPublico": "ABC123",
  "estado": "nuevo | en_revision | aceptado | rechazado",
  "respuesta": { "mensaje": "…", "solucion": "reembolso|cambio|reposicion|compensacion|ninguna", "fecha": "…" }   // null si todavía no respondió
}] }
```
`estado`: `nuevo` (lo envió), `en_revision` (el dueño lo abrió), `aceptado` / `rechazado` (ya respondió, con `respuesta.mensaje`).

## 3) (Opcional) Aviso inmediato cuando el dueño responde
Si definís `MIZONA_WEBHOOK_URL`, Mi Asistente hace `POST` a esa URL (con el header `x-integracion-key`) apenas el dueño responde:
```json
{ "evento": "reclamo.decidido", "refExterna": "…", "codigoPublico": "…", "estado": "aceptado|rechazado", "solucion": "…", "mensaje": "…", "fecha": "…" }
```
Si no se configura (o falla), no pasa nada: Mi Zona puede usar la consulta del punto 2.

## Reglas que ya aplica Mi Asistente
- El dueño **no puede resolver sin escribir un mensaje** (mínimo 10 caracteres) y una vez respondido **no se puede cambiar**.
- En comida (`esComida: true`) la solución "cambio" se convierte en devolución del dinero.
- Solo se guarda el **usuario público** del cliente (no nombre, teléfono ni correo).
- Las fotos solo se aceptan por `https` y hasta 4.
