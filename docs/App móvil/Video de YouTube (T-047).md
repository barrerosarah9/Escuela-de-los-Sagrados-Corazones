# Video de YouTube · T-047

Abrir el video de YouTube de una oración desde su detalle.
Historia: HU-16 · Caso de uso: CU-10 (pasos 6–7 y E1) · Tarea de fase: F2-07 · Issue: #47.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `esc-mobile-app/src/lib/youtube.ts` | Saca el id del enlace, arma la miniatura, revisa si el video existe y lo abre. |
| `esc-mobile-app/src/components/video-oracion.tsx` | Tarjeta del video con miniatura, botón ▶ y mensaje de error. |
| `esc-mobile-app/src/app/detalle-oracion.tsx` | Usa la tarjeta del video en lugar de «Disponible pronto». |

Sin migraciones ni dependencias nuevas (usa `Linking` de React Native y `expo-image`, que ya estaba).

## Comportamiento

- El detalle muestra «Haz la oración con nuestro video de YouTube» y la miniatura del video con el botón ▶ y la
  etiqueta «Escuchar en YouTube», como en el prototipo.
- Al tocarla:
  1. se saca el id de 11 caracteres del enlace (`watch?v=`, `youtu.be`, `m.youtube.com`, `shorts`, `live`, `embed`);
  2. se consulta `https://www.youtube.com/oembed` (público, sin clave de API), con un máximo de 6 segundos;
  3. si responde 400 o 404 (el video no existe o fue eliminado) se muestra **«Este video no está disponible en este
     momento. Intenta más tarde.»**;
  4. si no, se abre `https://www.youtube.com/watch?v=<id>` con `Linking`: la app de YouTube si está instalada o el
     navegador si no.
- Si el enlace guardado no tiene un id válido, el botón aparece apagado y el mensaje se muestra desde el inicio.
- Si no se puede consultar oEmbed (sin red o tardó demasiado) se intenta abrir igual; si el teléfono no puede abrirlo,
  sale «No pudimos abrir YouTube. Revisa tu conexión e inténtalo de nuevo.».

## Decisiones

- Se abre en YouTube y no en un reproductor dentro de la app (HU-16 acepta las dos). Funciona igual en iOS y Android,
  no necesita WebView y evita los videos que YouTube no deja insertar.
- Los videos privados o que no dejan insertarse (oEmbed responde 401/403) se abren igual: la app de YouTube muestra su
  propio aviso.

## Cómo probar en local

1. App apuntando a Supabase local (ver T-046) y Expo con `npx expo start --go`.
2. En Studio local, crear contenidos `[PRUEBA T-047]` en oraciones fijas: uno con un video que existe, uno con un id
   inexistente (`watch?v=zzzzzzzzzz0`) y uno con `https://www.youtube.com/`.
3. Santifica el día: el primero abre YouTube, el segundo muestra el error al tocarlo y el tercero aparece apagado con
   el error.
4. Limpiar:

   ```sql
   delete from public.contenidos where nombre like '[PRUEBA T-047]%';
   ```
