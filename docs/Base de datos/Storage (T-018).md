# Storage · Escuela de los Sagrados Corazones

Buckets de Supabase Storage y sus políticas. Se crean con las migraciones de
[`supabase/migrations/`](../../supabase/migrations) y se prueban en `supabase/tests/database/storage_*.test.sql`.
Este documento se actualiza en el mismo PR que cambie un bucket o una política de Storage.

| Migración | Contenido |
| --- | --- |
| `20261028041203_storage_buckets.sql` | Buckets `avatares` y `marca` (T-018) |
| `20261028041844_politicas_storage_avatares.sql` | Función `foto_perfil_visible` y políticas de `avatares` (T-018) |
| `20261029020959_bucket_publicaciones.sql` | Bucket `publicaciones` y sus políticas (T-028) |
| `20261107175245_buckets_contenidos.sql` | Buckets `contenidos-imagenes` y `contenidos-pdf`, función `ruta_contenido_valida` y sus políticas (T-035) |

## Buckets

| Bucket | Público | Límite | Formatos | Uso |
| --- | --- | --- | --- | --- |
| `avatares` | No | 5 MB | `image/jpeg`, `image/png`, `image/webp` | Fotos de perfil (HU-06) |
| `marca` | Sí | 2 MB | `image/png`, `image/jpeg`, `image/webp` | Logo de los correos de Auth (T-009) |
| `publicaciones` | Sí | 5 MB | `image/jpeg`, `image/png` | Imágenes de las publicaciones del feed (HU-33) |
| `contenidos-imagenes` | No | 5 MB | `image/jpeg`, `image/png` | Imágenes de la biblioteca y del widget (HU-40) |
| `contenidos-pdf` | No | 10 MB | `application/pdf` | PDF de la biblioteca (HU-40) |

Las migraciones usan `on conflict (id) do update`: si un bucket ya existe (como `marca`, creado antes desde el
panel), toma la configuración del repositorio. No se cambian buckets desde el panel; los cambios van en una
migración nueva.

## Bucket `avatares`

### Rutas

Cada foto vive en la carpeta del usuario: `avatares/<id del usuario>/<archivo>`.
En `perfiles.foto_path` se guarda la ruta **sin** el nombre del bucket, por ejemplo
`4ff2e22e-3844-4c6d-824f-8e0d3cf6f5be/1730090000.jpg`.

### Escritura

Un usuario con sesión solo sube, reemplaza y borra archivos dentro de su propia carpeta, y solo si no está
bloqueado (`usuario_activo()`, igual que en T-008). Tampoco puede mover un archivo a la carpeta de otro.
El administrador no tiene excepción: no escribe en carpetas ajenas.

### Lectura

| Quién | Qué fotos ve |
| --- | --- |
| El dueño | La suya, siempre (aunque esté bloqueado) |
| Otro usuario con sesión | Solo las de perfiles con `perfil_visible = true` |
| Administrador | Todas |
| Sin sesión (`anon`) | Ninguna |

Así se cumple que la foto se vea en el perfil y en los comentarios (HU-06) sin romper la privacidad de
`perfil_visible` que define la vista `perfiles_publicos` (T-008).

La política consulta la visibilidad con `public.foto_perfil_visible(text)`, una función `security definer`
que solo responde verdadero o falso. Hace falta porque el RLS de `perfiles` no deja a un usuario leer filas
ajenas. Solo la puede ejecutar `authenticated`.

### Cómo muestra la app las fotos

El bucket es privado, así que no hay URL pública. La app pide una URL firmada con
`supabase.storage.from('avatares').createSignedUrl(foto_path, segundos)`, o varias a la vez con
`createSignedUrls`. Storage solo la firma si las políticas de lectura lo permiten.

### Errores al subir (para T-019)

Storage responde HTTP 400 en todos los rechazos; el motivo real viene en el cuerpo (`statusCode` y `code`).
La app debe decidir el mensaje por `code`, no por el código HTTP.

| `code` | `statusCode` | Causa | Mensaje sugerido para el usuario |
| --- | --- | --- | --- |
| `EntityTooLarge` | 413 | La imagen pesa más de 5 MB | «La foto pesa más de 5 MB. Elige otra o recórtala.» |
| `InvalidMimeType` | 415 | Formato distinto de JPEG, PNG o WebP | «Solo se permiten fotos JPEG, PNG o WebP.» |
| `AccessDenied` | 403 | Ruta fuera de la carpeta propia o usuario bloqueado | «No pudimos guardar la foto.» |

Verificado con `curl` contra Supabase local (CLI 2.122.0, storage-api v1.80.2).

### Pendientes para otras tareas

- **T-019 (pantalla):**
  - Convertir a JPEG y comprimir antes de subir. El iPhone suele entregar fotos HEIC, que el bucket rechaza.
  - Usar un nombre nuevo por cada subida (por ejemplo, la fecha en milisegundos) y borrar la foto anterior,
    para que ninguna caché muestre la foto vieja.
- **Eliminar cuenta (CU-06):** borrar la cuenta no borra los archivos de Storage en cascada. Esa tarea
  debe borrar `avatares/<id>/` con la API de Storage antes de eliminar el usuario.

## Bucket `marca`

Público porque los clientes de correo no pueden pedir URLs firmadas. No tiene políticas: el logo se lee por
su URL pública y solo se sube desde el panel o con la clave de servicio, nunca desde la app.
Archivo actual: `marca/logo-escuela.png`.

## Bucket `publicaciones`

Público, para que el feed muestre las imágenes por su URL sin firmar. Solo el administrador no bloqueado
(`es_admin()`) lista, sube, reemplaza y borra archivos por la API.

## Buckets de la biblioteca: `contenidos-imagenes` y `contenidos-pdf`

Archivos de los contenidos de la biblioteca (tabla `contenidos`, T-007). Son dos buckets porque el límite de
tamaño y los formatos se configuran por bucket: imágenes de hasta 5 MB y PDF de hasta 10 MB, igual que el
formulario del portal.

### Rutas por tipo

Cada archivo vive en la carpeta de su sección y de su oración:

```
<seccion>/<clave de la oración>/<archivo>
```

| Ejemplo | Bucket |
| --- | --- |
| `semana/hora-maria/2b1f6c0e-….pdf` | `contenidos-pdf` |
| `dia/jaculatorias/9c3e41aa-….jpg` | `contenidos-imagenes` |
| `widget/imagen-widget/5d7a0b12-….png` | `contenidos-imagenes` |

- `seccion` es el valor de `oraciones.seccion` (`dia`, `semana`, `mes`, `anio`, `widget`) y `clave` es
  `oraciones.clave` (por ejemplo `hora-maria`, `primeros-viernes-diurnos`, `consagracion-san-jose`).
- El nombre del archivo debe ser único y sin espacios ni tildes; se recomienda un UUID con la extensión
  (`crypto.randomUUID()`). Así, reemplazar un archivo nunca choca con la caché de una URL anterior.
- En `contenidos.pdf_path` y `contenidos.imagen_path` se guarda la ruta **sin** el nombre del bucket.
- Los PDF del widget no existen: el widget solo lleva imagen (regla `contenidos_widget_solo_imagen`).

La convención no es solo una recomendación: la función `public.ruta_contenido_valida(bucket, ruta)` la exige
al subir y al reemplazar. Rechaza:

- carpetas de más o de menos;
- una sección o una oración que no existan, o que no coincidan entre sí (por ejemplo `mes/hora-maria/…`);
- una extensión distinta a la del bucket (`jpg`, `jpeg` o `png` en imágenes; `pdf` en PDF; sin distinguir
  mayúsculas);
- un PDF en la carpeta del widget.

La función no es `security definer`: solo lee `oraciones`, que cualquier usuario con sesión puede leer (T-008).

### Permisos

| Quién | Leer | Subir, reemplazar, borrar |
| --- | --- | --- |
| Administrador (no bloqueado) | Sí | Sí (subir y reemplazar solo con ruta válida) |
| Usuario con sesión, aunque esté bloqueado | Sí | No |
| Administrador bloqueado | Sí | No |
| Sin sesión (`anon`) | No | No |

La lectura es igual que la de la tabla `contenidos` (T-008). Los buckets son privados: el portal y la app
muestran los archivos con URL firmadas (`createSignedUrls`). El portal las pide en paralelo por bucket en
`portal-admin/src/lib/biblioteca.ts` (`BUCKET_PDF` y `BUCKET_IMAGENES`).

### Errores al subir (para T-036)

Verificado con `curl` contra Supabase local, subiendo como administrador:

| Caso | `statusCode` | `code` | Mensaje sugerido para el administrador |
| --- | --- | --- | --- |
| Archivo que no es imagen o PDF | 415 | `InvalidMimeType` | «Solo se permiten imágenes JPG o PNG y archivos PDF.» |
| Imagen de más de 5 MB o PDF de más de 10 MB | 413 | `EntityTooLarge` | «El archivo pesa más de lo permitido (5 MB imágenes, 10 MB PDF).» |
| Ruta que no sigue la convención o cuenta sin permiso | 403 | `AccessDenied` | «No pudimos guardar el archivo.» |

Igual que en `avatares`, Storage responde HTTP 400 en los tres casos; el motivo real viene en el cuerpo.

### Pendientes para otras tareas

- **T-036 (subir):** armar la ruta con `<seccion>/<clave>/<uuid>.<ext>` desde la oración elegida y validar
  formato y tamaño antes de subir, para mostrar el mensaje sin esperar a Storage.
- **T-037 (editar y eliminar):** hecho. Al eliminar un contenido se borran su PDF y su imagen, y al cambiarlo de
  tipo sus archivos se mueven a la carpeta del nuevo tipo. Ver `docs/Portal web/Editar y eliminar contenidos (T-037).md`.
- **Widget (sprint 5):** el widget no puede pedir URL firmadas por su cuenta; la app debe descargarle la imagen
  del día o pasarle una URL firmada vigente.

## Pruebas

```bash
npx supabase test db
```

- `storage_avatares.test.sql`: configuración de los buckets, escritura solo en la carpeta propia, lectura según
  `perfil_visible`, acceso del administrador, usuario bloqueado y acceso sin sesión.
- `storage_publicaciones.test.sql`: configuración del bucket y escritura solo del administrador.
- `storage_contenidos.test.sql`: configuración de los dos buckets, escritura solo del administrador no
  bloqueado, rechazo de rutas que no siguen la convención, lectura con sesión y sin acceso para `anon`.

El tamaño y los formatos los aplica el servicio de Storage, no Postgres; por eso se verifican aparte con `curl`.
