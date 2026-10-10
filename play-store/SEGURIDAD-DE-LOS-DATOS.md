# Seguridad de los datos (borrador para el formulario de Play Console)
> Es un borrador según lo que hace el código hoy. **Verificalo vos**: el formulario es una declaración legal tuya.

| Dato | ¿Se recopila? | ¿Para qué? | Opcional |
|---|---|---|---|
| Nombre | Sí (cuenta; clientes del chat) | Funcionamiento de la app, cuenta | No |
| Correo electrónico | Sí | Cuenta, avisos, soporte | No |
| Teléfono y dirección (clientes del chat) | Sí | Atender pedidos y turnos | Sí |
| Fotos | Sí (logo, productos, comprobantes) | Funcionamiento | Sí |
| Mensajes (chat con la IA, soporte) | Sí | Funcionamiento | No |
| Información de pagos | La suscripción se cobra en Mercado Pago; la app no guarda tarjetas. Los comprobantes son imágenes | Suscripción | Sí |
| Actividad en la app (pedidos, turnos, historial de accesos 90 días) | Sí | Funcionamiento, seguridad | No |
| Identificadores (suscripción push) | Sí | Avisos | Sí |
| Ubicación | **No** | — | — |
| Contactos, SMS, micrófono, cámara | **No** (la cámara/galería solo cuando elegís subir una foto) | — | — |

**Compartido con terceros que procesan por cuenta de Mi Asistente:** Anthropic (IA), Google (inicio de sesión), Mercado Pago (cobro), Cloudinary (imágenes), alojamiento y base de datos. No se venden datos ni se usan para publicidad.
**Cifrado en tránsito:** Sí (HTTPS).
**Pedido de eliminación:** Sí — en la app (Ajustes → Mi cuenta) y en la web `/eliminar-cuenta.html`.
