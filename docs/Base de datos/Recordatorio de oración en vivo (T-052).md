# Recordatorio de oración en vivo · T-052

Historia: HU-19 · Recibir el recordatorio de la oración en vivo. Rama `feature/push-notifications`.

El recordatorio es un aviso push que reciben solo quienes confirmaron asistencia a la oración en vivo
del día. Usa la misma cola, cron y Edge Function de T-051 (`docs/Base de datos/Avisos push automáticos (T-051).md`).
Encolarlo automáticamente a la hora correcta es T-053; esta tarea deja listo el tipo de aviso, el
mensaje y la recepción en la app.

## Mensaje

| Campo | Valor |
| --- | --- |
| Título | Nombre del oficio del día de la semana de la oración (misma regla que la tarjeta del feed, `obtenerOracionEnVivoDeHoy`); si no hay oficio, el `titulo` de `oraciones_en_vivo`. |
| Texto | «La oración en vivo es hoy a las 7:00 p. m. Toca para unirte.» (hora con `formatearHora`, igual que la app). |
| `pantalla` | `/` (feed, donde está la tarjeta con el enlace de Meet). |
| Canal Android | `recordatorios` («Recordatorios de oración en vivo»). |
| Destinatarios | Tokens de usuarios no bloqueados con fila en `asistencias` para esa oración. |

Si el recordatorio se procesa cuando la oración ya empezó (hora de Bogotá), se marca enviado sin
enviarse y la respuesta lo reporta como `vencido`.

## Base de datos

- `20261110045500_tipo_aviso_recordatorio.sql`: valor `recordatorio_oracion` del enum `tipo_aviso`.
- `20261110045600_avisos_recordatorio_oracion.sql`:
  - `avisos_push.oracion_en_vivo_id`, obligatoria en recordatorios; se borra en cascada con la oración.
  - Índice único parcial: un solo recordatorio por oración en vivo.
  - `tomar_avisos_pendientes()` se recrea (cambian sus columnas) y además devuelve `oracion_en_vivo_id`,
    `oracion_titulo`, `oracion_fecha` y `oracion_hora`.

## Edge Functions

- `_shared/push/fcm.ts`: `MensajePush.canal` opcional; se envía como `android.notification.channel_id`
  (`general` si no se indica). `enviar-push` y los avisos de T-051 siguen en `general`.
- `procesar-avisos`: arma el recordatorio, filtra por asistentes y descarta los vencidos.

## App

`src/lib/notificaciones.ts` crea dos canales Android con prioridad alta: `general` («Avisos de la
Escuela») y `recordatorios` («Recordatorios de oración en vivo»). El usuario puede silenciarlos por
separado en los ajustes de Android. Es solo JavaScript: no requiere recompilar el development build.

## Pruebas

- pgTAP: `supabase/tests/database/avisos_recordatorio_oracion.test.sql` (8 pruebas; 176 en total).
- Prueba en local (10 nov 2026, emulador Pixel 10 Pro XL API 37 con development build):
  1. `npx supabase start`, `npx supabase functions serve --env-file supabase/.env` y los secretos de Vault
     locales (ver T-051).
  2. Crear la oración en vivo de hoy 30 minutos adelante y confirmar asistencia desde la tarjeta del feed.
  3. Encolar el recordatorio a mano:
     ```sql
     insert into public.avisos_push (tipo, oracion_en_vivo_id)
     select 'recordatorio_oracion', id
     from public.oraciones_en_vivo
     where fecha = (now() at time zone 'America/Bogota')::date;
     ```
  4. Llegó «Oración a los Santos Ángeles · La oración en vivo es hoy a las 12:38 a. m. Toca para unirte.»
     en el canal «Recordatorios de oración en vivo»; `envios_push` con 1 destinatario (solo el asistente).
- iOS: pendiente hasta configurar APNs (cuenta de Apple Developer), igual que T-050.

## Producción

1. `npx supabase functions deploy procesar-avisos` y `npx supabase functions deploy enviar-push`
   (las dos usan `_shared/push/fcm.ts`).
2. `npx supabase db push --remote --dry-run` y luego `npx supabase db push --remote`.
3. No hay secretos nuevos: usa los de Vault de T-051.

## Pendientes

- T-053: encolar el recordatorio automáticamente (por ejemplo, 15 minutos antes) y moverlo o quitarlo si
  el administrador cambia la hora o elimina la oración.
- Confirmar con HU-19 cuánto antes debe llegar el recordatorio.
- T-054: abrir la pantalla de `data.pantalla` al tocar el aviso.
