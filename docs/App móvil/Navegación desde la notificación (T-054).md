# Navegación desde la notificación · T-054

Al tocar un aviso push, la app abre la pantalla que indica `data.pantalla`.
Historia: HU-20 · Caso de uso: CU-11 · Tarea de fase: F2-08 · Issue: #54.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `supabase/functions/procesar-avisos/index.ts` | Los avisos `publicacion_nueva` mandan `/publicacion/<id>`. |
| `esc-mobile-app/src/lib/navegacion-avisos.ts` | Escucha el toque, valida la ruta, comprueba la publicación y navega. |
| `esc-mobile-app/src/lib/notificaciones.ts` | Exporta `cargarNotificaciones` para escuchar también sin sesión. |
| `esc-mobile-app/src/app/_layout.tsx` | Usa `useNavegacionDesdeAvisos(ready, Boolean(session))`. |

## Destinos

| Aviso | `pantalla` | Se abre |
| --- | --- | --- |
| `publicacion_nueva` | `/publicacion/<id>` | Detalle de la publicación con comentarios |
| `contenido_diario` | `/oracion` | Pestaña Oración (secciones) |
| `recordatorio_oracion` | `/` | Feed, con la tarjeta de la oración en vivo (T-025) |

## Comportamiento

- **App abierta o en segundo plano:** `addNotificationResponseReceivedListener`.
- **App cerrada:** `getLastNotificationResponse()` al arrancar; luego `clearLastNotificationResponse()` para no repetir.
- **Solo se aceptan** `/`, `/oracion` y `/publicacion/<número>`; cualquier otro valor abre el feed.
- **Publicación borrada:** se consulta `publicaciones_con_conteos` por `id`; si no existe, abre el feed. Si la consulta
  falla (sin red), abre el detalle, que tiene su propio estado de error.
- **Sin sesión:** lleva a Ingreso y guarda el destino; al iniciar sesión (o registrarse) abre la pantalla.
- La navegación espera a que la app esté lista (fuentes y sesión) y corre después del cambio de `Stack.Protected`.
- **Expo Go:** no hace nada (push remoto no disponible).

## Pruebas (development build, emulador Pixel 10 Pro XL API 37, Supabase local)

1. Publicación nueva, app en segundo plano → abre esa publicación.
2. Oraciones del día, app cerrada → abre la pestaña Oración.
3. Publicación borrada antes de tocar el aviso → abre el feed.
4. Aviso en la bandeja, sesión cerrada y app cerrada → Ingreso → al entrar abre la publicación.
5. Recordatorio de oración en vivo, app abierta en Perfil → abre el feed con la tarjeta.

iOS pendiente hasta tener APNs (cuenta de Apple Developer).

## Despliegue

`procesar-avisos` se despliega a producción con `npx supabase functions deploy procesar-avisos`.
