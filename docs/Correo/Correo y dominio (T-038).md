# Correo y dominio · Escuela de los Sagrados Corazones

Configuración de T-038 (HT-05): dominio propio, Resend con SPF, DKIM y DMARC, SMTP propio en Supabase Auth
y plantillas de los correos de la app. Este documento se actualiza en el mismo PR que cambie algo de esto.

## Cuentas y servicios

| Servicio | Uso | Cuenta |
| --- | --- | --- |
| Cloudflare Registrar y DNS | Dominio `escuelasagradoscorazones.com` (comprado el 7 nov 2026, renovación automática anual) | `escuelasagradoscorazones.app@gmail.com`, con app autenticadora y códigos de respaldo |
| Cloudflare Workers | Página del dominio (`sitio-web/`) | La misma |
| Resend | Envío de correos, región São Paulo (`sa-east-1`) | La misma |
| Supabase | Secretos de las Edge Functions y SMTP de Auth | Proyecto `mwmrcunefvapawpocvof` |

El titular del dominio es la Escuela (datos del cliente). La privacidad de WHOIS está activa.

## Registros DNS

Creados a mano en Cloudflare (Resend → *Manual setup*), todos con TTL automático:

| Tipo | Nombre | Contenido | Proxy | Para qué |
| --- | --- | --- | --- | --- |
| TXT | `resend._domainkey` | Llave pública `p=…` que da Resend | — | DKIM |
| CNAME | `rsend` | `rsend-sae1.forge.rmta.net` | DNS only | SPF y rebotes (lo administra Resend) |
| CNAME | `send` | `send.forge.rmta.net` | DNS only | SPF y rebotes (lo administra Resend) |
| TXT | `_dmarc` | `v=DMARC1; p=none;` | — | DMARC en modo observación |
| Worker | `escuelasagradoscorazones.com` y `www` | Worker `sitio-escuela-sagrados-corazones` | — | Página del dominio (los crea Wrangler) |

Los CNAME deben quedar en **DNS only**. Con el proxy de Cloudflare activo, Resend no los puede verificar.

Para comprobarlos desde la terminal:

```bash
dig +short TXT resend._domainkey.escuelasagradoscorazones.com @1.1.1.1
dig +short CNAME rsend.escuelasagradoscorazones.com @1.1.1.1
dig +short CNAME send.escuelasagradoscorazones.com @1.1.1.1
dig +short TXT send.escuelasagradoscorazones.com @1.1.1.1
dig +short TXT _dmarc.escuelasagradoscorazones.com @1.1.1.1
```

## Claves de Resend

| Nombre | Permiso | Dónde se usa |
| --- | --- | --- |
| `supabase-produccion` | Sending access, solo el dominio | Secreto `RESEND_API_KEY` de las Edge Functions |
| `supabase-auth-smtp` | Sending access, solo el dominio | Contraseña del SMTP de Auth (panel de Supabase) |

Ninguna clave está en el repositorio. Para rotar una: crear la nueva en Resend, reemplazarla en Supabase y
borrar la vieja. Para el secreto de las funciones, sin que la clave quede en el historial de la terminal:

```bash
read -rsp "API key de Resend: " RESEND_API_KEY && echo
npx supabase secrets set RESEND_API_KEY="$RESEND_API_KEY"
unset RESEND_API_KEY
```

## Secretos de las Edge Functions

| Secreto | Obligatorio | Uso |
| --- | --- | --- |
| `RESEND_API_KEY` | Sí | Clave `supabase-produccion` |
| `CORREO_REMITENTE` | No | Cambia el remitente. Por defecto: `Escuela de los Sagrados Corazones <notificaciones@escuelasagradoscorazones.com>` |
| `CORREO_CONTACTO` | No | Cuando exista, los correos muestran «Escríbenos a …» y las respuestas llegan a esa dirección |

## Correos de la app

Están en `supabase/functions/_shared/correos/` y se envían con la API de Resend desde las Edge Functions.

| Archivo | Función | Diseño de T-004 |
| --- | --- | --- |
| `comprobante-donacion.ts` | `comprobanteDonacion()` | Comprobante de donación única o mensual |
| `comprobante-compra.ts` | `comprobanteCompra()` | Comprobante de compra en la tienda |
| `recordatorio-pago.ts` | `recordatorioPagoRechazado()` | Recordatorio de pago rechazado de la donación mensual |
| `base.ts` | Marco común, formatos y piezas del diseño | — |
| `enviar.ts` | `enviarCorreo()` | — |

Ejemplo de uso desde una función (por ejemplo, el webhook de Wompi):

```ts
import { formatoMedioPago } from '../_shared/correos/base.ts';
import { comprobanteDonacion } from '../_shared/correos/comprobante-donacion.ts';
import { enviarCorreo } from '../_shared/correos/enviar.ts';

await enviarCorreo({
  para: perfil.correo,
  correo: comprobanteDonacion({
    nombre: perfil.nombre,
    numero: transaccion.referencia,
    fecha: transaccion.creado_en,
    montoCentavos: transaccion.monto_centavos,
    tipo: 'mensual',
    metodoPago: formatoMedioPago('tarjeta', '4242'),
    donante: perfil.nombre,
    proximoCobro: donacion.proximo_cobro,
  }),
  idempotencia: `comprobante-${transaccion.referencia}`,
});
```

Reglas de las plantillas:

- Los montos llegan en centavos, como en la base de datos, y se muestran como `$50.000 COP`.
- Las fechas se muestran en hora de Bogotá. Las fechas sin hora (`date`, como `proximo_cobro`) no se desplazan de día.
- Todo dato del usuario se escapa antes de ir al HTML.
- Cada correo lleva versión HTML y versión de texto.
- Los botones apuntan a `https://escuelasagradoscorazones.com/<ruta>` (`URL_APP` en `base.ts`).
- `idempotencia` evita enviar dos veces el mismo comprobante si el webhook llega repetido.

## Correos de Auth (SMTP)

En el proyecto remoto, Supabase Auth envía por el SMTP de Resend. Se configuró en el panel
(**Authentication → Emails → SMTP Settings**):

| Campo | Valor |
| --- | --- |
| Sender email | `notificaciones@escuelasagradoscorazones.com` |
| Sender name | `Escuela de los Sagrados Corazones` |
| Host / Port | `smtp.resend.com` / `465` |
| Username | `resend` |
| Password | Clave `supabase-auth-smtp` |
| Límite (Rate Limits) | 30 correos por hora |

En `supabase/config.toml` el bloque `[auth.email.smtp]` tiene los mismos datos pero queda en
`enabled = false`: en local los correos van a Mailpit. **No se usa `supabase config push`**, porque subiría
también la configuración local (Site URL, límites) al proyecto remoto.

Las 5 plantillas de Auth están en `supabase/templates/` y también están pegadas en el panel
(**Authentication → Emails → Templates**). Si se cambia una, hay que pegarla otra vez en el panel.

## Página del dominio

`sitio-web/` es un Worker de Cloudflare con archivos estáticos. Cualquier ruta (`/donaciones`,
`/pedidos/<id>`) muestra la misma página, y su botón abre la app en `sagradoscorazones://<ruta>`.

```bash
npx wrangler@4 login
cd sitio-web && npx wrangler@4 deploy; cd ..
```

## Función de prueba

`supabase/functions/correo-prueba` envía las tres plantillas con datos de ejemplo y el asunto con `[Prueba]`.
Solo la puede usar un administrador (máximo 3 destinatarios). Se llama con `POST` y el token de sesión de un
administrador, con el cuerpo `{"para": ["correo@ejemplo.com"]}`.

## Resultados de las pruebas (7 nov 2026)

SPF, DKIM y DMARC pasan en Gmail y en Outlook (`compauth=pass`).

| Correo | Gmail | Outlook (Microsoft 365, Javeriana) | Outlook.com (Hotmail) |
| --- | --- | --- | --- |
| Comprobante de donación | Principal | Prioritarios | Correo no deseado |
| Recordatorio de pago rechazado | Principal | Prioritarios | Correo no deseado |
| Comprobante de compra | Principal | No llegó al buzón | Correo no deseado |
| Restablecer contraseña (Auth) | Principal | — | — |
| Invitación (Auth) | — | Prioritarios | — |

## Pendientes y riesgos

- **Outlook.com (Hotmail):** los correos llegan a no deseado (SCL 5) aunque la autenticación pasa. La causa es
  la reputación de un dominio recién creado. Repetir la prueba en unos días sin marcar los anteriores como
  «no es correo no deseado».
- **Comprobante de compra en Microsoft 365:** Resend lo marca entregado, pero no aparece en el buzón ni en la
  cuarentena visible para el usuario. Repetir la prueba cuando el dominio tenga historial.
- **Imágenes en Outlook:** Outlook bloquea las imágenes de remitentes que la persona no ha marcado como
  seguros, así que el logo no se ve hasta «Mostrar contenido bloqueado». Mejora posible: enviar el logo
  incrustado en el correo.
- **Plan gratis de Resend:** 100 correos al día y 3.000 al mes, compartidos entre Auth y los comprobantes.
- **DMARC:** está en `p=none` y sin reportes. Pasar a `p=quarantine` con dirección de reportes cuando haya
  historial de envíos.
- **Por definir con el cliente:** correo de contacto (`CORREO_CONTACTO`) y regla de reintento del cobro mensual.
- **Universal links:** cuando la app esté publicada, configurar `.well-known/` en `sitio-web/` para que los
  enlaces `https` abran la app directamente.
