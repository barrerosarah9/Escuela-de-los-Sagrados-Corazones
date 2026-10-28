# Storage · Escuela de los Sagrados Corazones

Buckets de Supabase Storage y sus políticas. Se crean con las migraciones de
[`supabase/migrations/`](../../supabase/migrations) y se prueban en
[`supabase/tests/database/storage_avatares.test.sql`](../../supabase/tests/database/storage_avatares.test.sql).
Este documento se actualiza en el mismo PR que cambie un bucket o una política de Storage.

| Migración | Contenido |
| --- | --- |
| `20261028041203_storage_buckets.sql` | Buckets `avatares` y `marca` |
| `20261028041844_politicas_storage_avatares.sql` | Función `foto_perfil_visible` y políticas de `avatares` |

## Buckets

| Bucket | Público | Límite | Formatos | Uso |
| --- | --- | --- | --- | --- |
| `avatares` | No | 5 MB | `image/jpeg`, `image/png`, `image/webp` | Fotos de perfil (HU-06) |
| `marca` | Sí | 2 MB | `image/png`, `image/jpeg`, `image/webp` | Logo de los correos de Auth (T-009) |

La migración usa `on conflict (id) do update`: si un bucket ya existe (como `marca`, creado antes desde el
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

## Pruebas

```bash
npx supabase test db
```

`storage_avatares.test.sql` comprueba la configuración de los buckets, que cada usuario escribe solo en
su carpeta, la lectura según `perfil_visible`, el acceso del administrador, el usuario bloqueado y el
acceso sin sesión. El tamaño y los formatos los aplica el servicio de Storage, no Postgres; por eso se
verificaron aparte con `curl`.
