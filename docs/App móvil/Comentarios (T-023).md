# Crear comentario (T-023)

HU-09 · CU-08 · F2-05 · Sprint 2

El usuario abre una publicación del feed y deja un comentario. Se publica de inmediato, sin
moderación, y aparece en la lista con su nombre y foto.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `src/lib/comentarios.ts` | `crearComentario`, validación del texto y motivo de error |
| `src/components/comentario-composer.tsx` | Campo de varias líneas, botón «Enviar», aviso de error y «Reintentar» |
| `src/components/comentario-item.tsx` | Fila de comentario con avatar, nombre, hora relativa y texto (se reutiliza en T-024) |
| `src/app/publicacion/[id].tsx` | Detalle de la publicación con la lista y el campo de comentario |
| `src/lib/feed.ts` | `obtenerPublicacion(id)` desde `publicaciones_con_conteos` |
| `src/lib/eventos-feed.ts` | Aviso entre pantallas: el detalle avisa y el feed suma 1 al contador |
| `src/components/publicacion-card.tsx` | Prop opcional `onAbrir`: en el feed la tarjeta abre el detalle |

No hay migraciones: la tabla `comentarios` y sus políticas existen desde T-007 y T-008.

## Reglas

- El texto no puede estar vacío (solo espacios o saltos de línea cuentan como vacío) ni pasar de
  2000 caracteres, igual que el check de la tabla. Los caracteres se cuentan con `Array.from`
  para que un emoji cuente como 1, como en Postgres.
- «Enviar» está inactivo con el campo vacío, mientras se envía y si se pasa del límite. Desde 1800
  caracteres se muestra el contador.
- Se guarda el texto sin espacios al inicio ni al final.
- RLS solo permite insertar con `usuario_id = auth.uid()` y si la cuenta no está bloqueada.

## Errores

| Motivo | Cuándo | Qué ve el usuario |
| --- | --- | --- |
| `sin_conexion` | Falla de red | Aviso, texto conservado y «Reintentar» |
| `desconocido` | Cualquier otro error | Aviso, texto conservado y «Reintentar» |
| `cuenta_bloqueada` | RLS rechaza la inserción (42501) | Aviso sin reintentar |
| `publicacion_eliminada` | La publicación se borró mientras escribía (23503) | Aviso sin reintentar |
| `texto_invalido` | Check de la tabla (23514) | Aviso; no debería pasar por la validación de la app |

Limitación conocida: si la red se cae justo después de que el servidor guardó el comentario, el
reintento lo guarda otra vez. Evitarlo requiere un identificador generado en el cliente y una
migración; queda fuera de esta tarea.

## Detalle de la publicación

- La ruta solo recibe el `id` y vuelve a pedir la publicación, para que funcione al abrirla desde
  otro lado (por ejemplo, una notificación push en T-051).
- Estados: skeleton mientras carga, error con «Reintentar», «ya no está disponible» si se borró o
  el id no es válido, y la publicación con el campo de comentario.
- El comentario enviado se agrega a la lista con el nombre y la foto del perfil propio, sube el
  contador del detalle y el del feed, y la lista baja hasta él.

## Lista de comentarios

Cargar los comentarios que ya existen, con el nombre y la foto de cada autor, se hizo en T-024; ver
[Comentarios (T-024).md](Comentarios%20%28T-024%29.md).

## Pruebas (6 nov 2026)

iOS (iPhone, development build) y Android (emulador Pixel, development build) contra el Supabase
remoto:

- Campo vacío y solo espacios: «Enviar» inactivo.
- Comentario enviado: aparece de inmediato con nombre y foto, el campo se vacía y el contador sube.
- Sin conexión (modo avión): aviso, texto conservado y «Reintentar»; al volver la red se envía.
- Abrir el detalle sin conexión: error con «Reintentar»; al volver la red carga.
- Los comentarios quedan guardados en la base (verificado en el SQL Editor).

## Datos de prueba

Las publicaciones y comentarios de prueba llevan `[PRUEBA T-023]`. Para borrarlos (borra en cascada
todos sus comentarios y avisos push):

```sql
delete from public.publicaciones where texto like '[PRUEBA T-023]%';
```
