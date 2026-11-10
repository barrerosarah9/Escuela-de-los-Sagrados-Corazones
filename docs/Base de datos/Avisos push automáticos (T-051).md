# Avisos push automáticos · T-051

Historia: HU-18 · Recibir avisos de contenido nuevo. Rama `feature/push-notifications`.

La app recibe un aviso push cuando se publica el contenido del día y cuando el portal crea una
publicación. Los avisos pasan por una cola en la base de datos y los envía la Edge Function
`procesar-avisos`, que reutiliza el envío con FCM de T-049.

## Flujo

1. Un trigger encola el aviso en `avisos_push`:
   - `publicaciones_aviso_push` (T-028): al crear una publicación → `publicacion_nueva`.
   - `calendario_dias_aviso_push` (T-051): cuando un día pasa a `vigente` (lo hace `publicar_dia()`
     a las 12:00 a. m., T-043) → `contenido_diario`, con `enviar_desde` a las 6:00 a. m. de Bogotá de
     ese día, o de inmediato si ya pasó esa hora.
2. El job de pg_cron `procesar-avisos-push` corre cada minuto. Solo si hay avisos listos
   (`enviado_en` vacío, `enviar_desde` cumplido y menos de 3 intentos) llama con pg_net a
   `procesar-avisos`, leyendo la URL y la clave de Vault.
3. `procesar-avisos` toma hasta 10 avisos con `tomar_avisos_pendientes()`, arma el mensaje, lo envía a
   todos los tokens de perfiles no bloqueados, borra los tokens inválidos, registra el envío en
   `envios_push` y marca el aviso con `enviado_en` y `envio_id`.

## Mensajes

| Tipo | Título | Texto | `pantalla` |
| --- | --- | --- | --- |
| `publicacion_nueva` | Nueva publicación de la Escuela | Texto de la publicación (máx. 240, sin saltos de línea); si solo tiene imágenes, «La Escuela compartió una nueva publicación.» | `/` |
| `contenido_diario` | La oración de hoy ya está disponible | Entra a Santifica el día y ora hoy con la Escuela. | `/oracion` |

Abrir esa pantalla al tocar el aviso es T-054.

## Base de datos

Migraciones `20261110032500_tipo_aviso_contenido_diario.sql` (valor nuevo del enum, va solo porque
Postgres no permite usarlo en la misma transacción) y `20261110032600_avisos_contenido_diario.sql`.

Columnas nuevas de `avisos_push`:

| Columna | Uso |
| --- | --- |
| `fecha` | Día publicado (obligatoria en `contenido_diario`). |
| `enviar_desde` | Momento desde el que puede enviarse. |
| `tomado_en` | Cuándo lo tomó `procesar-avisos`. |
| `intentos` | Veces que se ha tomado (máximo 3). |
| `envio_id` | Registro del envío en `envios_push`. |

Al aplicar la migración, los avisos de publicaciones pendientes desde T-028 se marcan como enviados
para que no lleguen todos de golpe.

## Sin duplicados

- Índices únicos parciales: un aviso por publicación y uno por fecha de contenido diario. Los triggers
  usan `on conflict do nothing`.
- El trigger diario solo se dispara cuando `vigente` pasa de falso a verdadero.
- `tomar_avisos_pendientes()` marca los avisos al tomarlos con `for update skip locked`: dos ejecuciones
  no toman el mismo aviso.
- Si `procesar-avisos` falla antes de marcarlo enviado (por ejemplo, error al pedir el token de Google),
  el aviso se vuelve a tomar a los 10 minutos, hasta 3 intentos. Los fallos de tokens sueltos no
  repiten el aviso: quedan en `envios_push.fallos`.

## Secretos (Vault)

El cron lee dos secretos de Vault; sus valores nunca van en el repositorio.

| Nombre | Local | Producción |
| --- | --- | --- |
| `avisos_push_url` | `http://kong:8000/functions/v1/procesar-avisos` | `https://mwmrcunefvapawpocvof.supabase.co/functions/v1/procesar-avisos` |
| `avisos_push_clave` | Clave secreta local (`npx supabase status`) | Clave secreta del proyecto (Settings → API Keys) |

Se crean desde el SQL Editor (Studio local o panel de producción):

```sql
select vault.create_secret('<url>', 'avisos_push_url', 'URL de procesar-avisos para el cron (T-051)');
select vault.create_secret('<clave>', 'avisos_push_clave', 'Clave secreta del cron de avisos (T-051)');
```

En local, `npx supabase db reset` los borra: hay que volver a crearlos. Para cambiar uno:
`select vault.update_secret((select id from vault.secrets where name = '<nombre>'), '<valor nuevo>');`

## Edge Function `procesar-avisos`

- `verify_jwt = false`; solo acepta `Authorization: Bearer <clave secreta del proyecto>` (igual que
  `enviar-push`). Sin clave responde `401 no_autorizado`.
- Respuesta: `{ "procesados": n, "avisos": [{ aviso_id, tipo, estado, destinatarios, enviados, invalidos, fallidos }] }`.
- Usa `enviarPush` de `supabase/functions/_shared/push/fcm.ts` y el secreto `FCM_CUENTA_SERVICIO` de T-049.

## Pruebas

- pgTAP: `supabase/tests/database/avisos_contenido_diario.test.sql` (19 pruebas; 168 en total con
  `npx supabase test db`).
- Prueba completa en local (9 nov 2026, emulador Pixel 10 Pro XL API 37 con development build):
  1. `npx supabase start` y `npx supabase functions serve --env-file supabase/.env`.
  2. Crear los dos secretos de Vault locales.
  3. App con `.env.development.local` apuntando al Supabase local; crear cuenta y aceptar notificaciones.
  4. Insertar una publicación → llegó «Nueva publicación de la Escuela» en menos de un minuto.
  5. `select public.publicar_dia();` dos veces → llegó un solo aviso «La oración de hoy ya está disponible».
- Diagnóstico: `cron.job_run_details` (si el cron corrió) y `net._http_response` (respuesta de la función).

## Producción

1. `npx supabase db push --remote --dry-run`, revisar que el `Target` sea producción y luego
   `npx supabase db push --remote`.
2. `npx supabase functions deploy procesar-avisos --project-ref mwmrcunefvapawpocvof`.
3. Crear los dos secretos de Vault en el SQL Editor del panel.
4. Crear una publicación de prueba desde el portal y revisar `envios_push`.

## Pendientes fuera de esta tarea

- T-054: abrir la pantalla indicada en `data.pantalla` al tocar el aviso.
- APNs para iOS cuando haya cuenta de Apple Developer.
- El aviso muestra «esc-mobile-app» como nombre de la app; corregir el nombre visible antes de publicar
  en las tiendas.
