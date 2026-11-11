# Notificaciones push con FCM · T-049

Edge Function que envía avisos push por Firebase Cloud Messaging (FCM), borra los tokens inválidos, reintenta y
registra cada envío.
Historia: HU-57 · Caso de uso: CU-29 (pasos 2–5, E1 y E2) · Tarea de fase: F4-07 · Issue: #49.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `supabase/migrations/20261109023000_envios_push.sql` | Tabla `envios_push` con RLS (solo lectura del administrador). |
| `supabase/tests/database/envios_push.test.sql` | 5 pruebas pgTAP de la tabla. |
| `supabase/functions/_shared/push/fcm.ts` | Token de acceso de Google, envío por FCM HTTP v1, clasificación de errores y reintentos. |
| `supabase/functions/enviar-push/index.ts` | Edge Function: valida, busca los tokens, envía, borra inválidos y registra. |
| `supabase/config.toml` | Registra `enviar-push` con `verify_jwt = false`. |
| `supabase/.env.example` | Agrega el nombre del secreto `FCM_CUENTA_SERVICIO`. |

## Firebase

- Firebase está agregado al proyecto de Google Cloud que ya existía, `escuela-sagrados-corazones` (número
  933494753799, el mismo de Google Sign-In de T-011), con el plan gratuito Spark.
- App Android registrada: `com.sagradoscorazones.app` («Escuela SSCC Android»). El `google-services.json` se descarga
  en T-050.
- API de Firebase Cloud Messaging (V1) habilitada. La API heredada no se usa.
- Cuenta de servicio: *Firebase Admin SDK* (Configuración del proyecto → Cuentas de servicio → Generar nueva clave
  privada). Su JSON es un secreto: no va en el repo ni en el chat.
- La cuenta del proyecto no deja entrar desde equipos nuevos; Manu se agregó como propietario del proyecto de Google
  Cloud (IAM) en T-049 para configurar Firebase con su cuenta.
- **iOS / APNs: pendiente.** Hace falta la cuenta de Apple Developer para crear la llave de APNs (.p8) y subirla en
  Configuración del proyecto → Cloud Messaging → Configuración de apps de Apple. Hasta entonces los avisos solo llegan a
  Android. El mensaje ya incluye el bloque `apns`, así que la función no cambia.

## Secreto `FCM_CUENTA_SERVICIO`

El JSON completo de la cuenta de servicio en una sola línea.

- **Local:** en `supabase/.env` (ignorado por Git) como `FCM_CUENTA_SERVICIO='{"type":"service_account",…}'`. Para
  escribirlo sin mostrarlo en la terminal se usó un script de Node fuera del repo que hace `JSON.stringify` del archivo.
- **Producción:** `npx supabase secrets set --env-file <archivo>` con un archivo fuera del repo que tenga solo esa
  línea (ver «Despliegue»).

## Contrato de la función

`POST /functions/v1/enviar-push` con `Authorization: Bearer <clave secreta del proyecto>`. No la llaman ni la app ni
el portal: la usan otras funciones o pg_cron (T-051 y T-053).

```json
{
  "titulo": "Ya está la oración de hoy",
  "texto": "Entra a Santifica el día",
  "pantalla": "/oracion",
  "usuarios": ["uuid", "uuid"]
}
```

| Campo | Regla |
| --- | --- |
| `titulo` | Obligatorio, 1–80 caracteres. |
| `texto` | Obligatorio, 1–240 caracteres. |
| `pantalla` | Obligatorio, ruta de la app que empieza con `/` (letras, números y `/ _ - ? = &`, máx. 200). Viaja en `data.pantalla` para que la app la abra al tocar el aviso (T-050). |
| `usuarios` | Opcional, hasta 1000 UUID. Sin él se envía a todos. |

Respuesta `200`:

```json
{ "envio_id": 12, "destinatarios": 340, "enviados": 335, "invalidos": 4, "fallidos": 1 }
```

| Error | Cuándo |
| --- | --- |
| `405 metodo_no_permitido` | No es `POST`. |
| `401 no_autorizado` | Falta la clave secreta o no coincide. |
| `400 cuerpo_invalido` | El cuerpo no es JSON. |
| `400 datos_invalidos` | No cumple las reglas de los campos. |
| `500 error_tokens` | Falló la consulta de tokens. |
| `502 error_fcm` | No se pudo usar FCM (falta el secreto o Google no entregó el token de acceso). Queda registrado en `envios_push.error`. |

## Comportamiento

1. **Destinatarios:** los tokens de `tokens_dispositivo` cuyo perfil tiene `bloqueado = false` (y, si viene,
   `usuario_id` en `usuarios`).
2. **Envío:** un mensaje por token a `https://fcm.googleapis.com/v1/projects/<project_id>/messages:send`, 20 en
   paralelo, con `notification` (título y texto), `data.pantalla`, prioridad alta en Android y sonido en iOS.
3. **Autenticación con Google:** JWT RS256 firmado con la llave de la cuenta de servicio (Web Crypto, sin librerías) y
   cambiado por un token de acceso de 1 hora, que se reutiliza mientras la función siga activa.
4. **Clasificación de cada respuesta de FCM:**
   - *Inválido* → se borra el token: 404, `UNREGISTERED`, `SENDER_ID_MISMATCH` o un 400 que dice que el
     *registration token* no es válido.
   - *Reintentar* → 429, 5xx o sin respuesta de red: hasta 3 intentos, esperando lo que pida `Retry-After` (máx. 10 s)
     o 0,5 s y 1 s.
   - *Fallido* → cualquier otro error, o si se agotan los intentos. No se borra el token (un 400 por un mensaje mal
     armado sería error nuestro, no del token).
5. **Registro:** una fila en `envios_push` con los totales y `fallos` (`usuario_id`, `estado`, `codigo`, `mensaje`,
   `intentos`) de cada token inválido o fallido. **No se guarda el token.**

## Tabla `envios_push`

| Columna | Tipo | Nota |
| --- | --- | --- |
| `id` | `bigint` identity | |
| `titulo`, `texto`, `pantalla` | `text` | Lo que se envió. |
| `destinatarios`, `enviados`, `invalidos`, `fallidos` | `integer` | Totales del envío. |
| `fallos` | `jsonb` | Detalle de inválidos y fallidos. |
| `error` | `text` | Solo si falló todo el envío. |
| `creado_en` | `timestamptz` | Índice descendente para listar los últimos. |

RLS: el administrador la lee; nadie escribe desde la API (la función usa la clave secreta).

## Cómo probar en local

1. `npx supabase migration up` y `npx supabase test db` (9 archivos, 141 pruebas).
2. En Studio, dos usuarios de prueba (uno bloqueado) con tokens falsos:

   ```sql
   insert into auth.users (id, email, raw_user_meta_data) values
     ('ffffffff-0000-4000-8000-0000000000a1', 'push.activo@prueba.local', '{"nombre": "[PRUEBA T-049] Activo"}'),
     ('ffffffff-0000-4000-8000-0000000000a2', 'push.bloqueado@prueba.local', '{"nombre": "[PRUEBA T-049] Bloqueado"}');
   update public.perfiles set bloqueado = true where id = 'ffffffff-0000-4000-8000-0000000000a2';
   insert into public.tokens_dispositivo (usuario_id, token, plataforma) values
     ('ffffffff-0000-4000-8000-0000000000a1', 'prueba-t049-token-falso-activo', 'android'),
     ('ffffffff-0000-4000-8000-0000000000a2', 'prueba-t049-token-falso-bloqueado', 'android');
   ```

3. En una terminal aparte: `npx supabase functions serve enviar-push --env-file supabase/.env`.
4. En otra:

   ```bash
   CLAVE=$(npx supabase status -o env 2>/dev/null | sed -n 's/^SECRET_KEY="\(.*\)"$/\1/p')
   curl -s -X POST http://127.0.0.1:54321/functions/v1/enviar-push \
     -H "Authorization: Bearer $CLAVE" -H 'Content-Type: application/json' \
     -d '{"titulo":"[PRUEBA T-049] Aviso","texto":"Prueba","pantalla":"/oracion","usuarios":["ffffffff-0000-4000-8000-0000000000a1","ffffffff-0000-4000-8000-0000000000a2"]}'
   ```

   Resultado: `destinatarios 1` (el bloqueado no cuenta), `invalidos 1` (FCM responde `INVALID_ARGUMENT` al token
   falso), el token del activo desaparece de `tokens_dispositivo` y `envios_push.fallos` lo registra sin el token.
   Sin `Authorization` responde `401`; con título vacío, `400 datos_invalidos`.
5. Limpiar:

   ```sql
   delete from public.envios_push where titulo like '[PRUEBA T-049]%';
   delete from auth.users where email in ('push.activo@prueba.local', 'push.bloqueado@prueba.local');
   ```

La llegada de un aviso a un teléfono real se prueba en T-050, cuando la app registre su token.

## Despliegue a producción

Después de fusionar en `develop`:

1. Migración: `npx supabase db push --remote --dry-run`, revisar que el `Target:` sea el proyecto de producción y que
   solo aparezca `20261109023000_envios_push.sql`; luego `npx supabase db push --remote`.
2. Secreto, desde un archivo fuera del repo con solo la línea `FCM_CUENTA_SERVICIO='…'`:
   `npx supabase secrets set --env-file /c/dev/secretos/fcm.env`.
3. Función: `npx supabase functions deploy enviar-push`. En el panel (Edge Functions → enviar-push → Details) revisar
   que *Verify JWT* esté desactivado.
4. Comprobar con un `curl` sin `Authorization` que responde `401 no_autorizado`.
