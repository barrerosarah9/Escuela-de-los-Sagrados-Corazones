# Listar comentarios (T-024)

HU-10 · CU-07 · F2-05 · Sprint 2

Al abrir una publicación se ven sus comentarios con el nombre y la foto de cada autor. Se actualiza
deslizando hacia abajo, y los comentarios que borró el administrador dejan de aparecer.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `src/lib/comentarios.ts` | `obtenerComentarios(publicacionId)` con el autor de cada comentario y `nombreVisible` |
| `src/lib/perfil.ts` | Caché en memoria de las URL firmadas de las fotos de perfil |
| `src/components/comentario-skeleton.tsx` | Tres filas de carga con la forma de un comentario |
| `src/app/publicacion/[id].tsx` | Carga en paralelo la publicación y sus comentarios; estados y deslizar para actualizar |

No hay migraciones: la lectura de `comentarios`, la vista `perfiles_publicos` y la lectura de fotos
del bucket `avatares` existen desde T-008 y T-018.

## Cómo se cargan

1. `comentarios` de la publicación, del más antiguo al más reciente, con `id` como desempate.
2. Los autores en una sola consulta a `perfiles_publicos` con `.in('id', …)`, sin repetir autores.
   No se lee `perfiles` porque RLS solo deja ver el propio.
3. Se pide un máximo de 500 comentarios por publicación (`MAXIMO_COMENTARIOS_CARGADOS`). Paginar los
   comentarios no está en el DoD; si una publicación se acerca a ese número, se hace en otra tarea.

## Autor del comentario

| Caso | Qué se ve |
| --- | --- |
| Perfil visible con foto | Nombre y foto |
| Perfil visible sin foto | Nombre y avatar con sus iniciales (una letra si el nombre es una palabra) |
| Perfil oculto (`perfil_visible = false`) | «Miembro de la comunidad» con «MD», sin foto |
| Comentario propio | Siempre el nombre y la foto del perfil propio, aunque esté oculto |

`perfiles_publicos` devuelve `nombre` y `foto_path` en `null` cuando el perfil está oculto, y la
política del bucket `avatares` tampoco deja leer su foto.

## Fotos

`obtenerUrlFoto` guarda cada URL firmada en memoria hasta 5 minutos antes de que venza (duran 1 h).
Si varios avatares piden la misma foto a la vez, comparten una sola petición. Solo se guardan las
firmas exitosas y como máximo 200. Una foto nueva siempre tiene ruta nueva
(`<usuario>/<timestamp>.jpg`, T-019), así que nunca se muestra una foto vieja de la caché.

## Estados del detalle

| Estado | Qué se ve |
| --- | --- |
| Cargando | Skeleton de la publicación y luego tres filas de comentarios |
| Falla la publicación | Error de pantalla completa con «Reintentar» |
| Fallan solo los comentarios | La publicación y, debajo, error con «Reintentar» |
| Sin comentarios | «Aún no hay comentarios. Sé el primero en comentar.» |
| Deslizar hacia abajo | Recarga publicación y comentarios; si falla, se conserva lo que había |

Los comentarios enviados en la visita (T-023) se juntan con los cargados y no se duplican al
actualizar.

## Comentarios borrados por el administrador

El administrador borra con `delete` (CU-19, política de T-008). El comentario deja de existir y no
llega en la siguiente carga, así que basta con actualizar el detalle. La pantalla para borrar
comentarios desde el portal es otra tarea; en las pruebas se borró desde el SQL Editor.

No hay actualización en tiempo real: los comentarios nuevos o borrados por otros se ven al abrir el
detalle o al deslizar hacia abajo.

## Pruebas (6 nov 2026)

iOS (iPhone, development build) y Android (emulador Pixel, development build) contra el Supabase
remoto:

- Publicación con cinco comentarios: propio con foto, dos autores sin foto (inicial), un perfil
  oculto («Miembro de la comunidad») y uno para borrar. Orden y horas correctos.
- Comentario borrado desde el SQL Editor: al deslizar hacia abajo desaparece y el contador baja.
- Comentario enviado y luego actualizar: aparece una sola vez.
- Modo avión al actualizar: se conserva la lista. Modo avión al abrir: error con «Reintentar».
- Publicación sin comentarios: estado vacío.

## Datos de prueba

Las publicaciones de prueba llevan `[PRUEBA T-024]` y se usó la cuenta
`escuelasagradoscorazones.app@gmail.com` con el perfil oculto. Para limpiar:

```sql
delete from public.publicaciones where texto like '[PRUEBA T-024]%';

update public.perfiles
set perfil_visible = true
where correo = 'escuelasagradoscorazones.app@gmail.com';
```
