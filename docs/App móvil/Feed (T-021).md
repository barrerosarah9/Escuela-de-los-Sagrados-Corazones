# Feed de publicaciones · T-021

HU-08 · CU-07 · F2-04. Pestaña Inicio de la app: publicaciones de la administración con texto,
imágenes, contadores y paginación infinita.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `esc-mobile-app/src/lib/feed.ts` | Consulta paginada a `publicaciones_con_conteos` y URL pública de las imágenes |
| `esc-mobile-app/src/lib/use-feed.ts` | Estado del feed: primera carga, recarga, página siguiente y errores |
| `esc-mobile-app/src/lib/fecha-relativa.ts` | «ahora», «12 min», «2 h», «3 d» o fecha; versión completa para lectores de pantalla |
| `esc-mobile-app/src/components/publicacion-card.tsx` | Tarjeta según el prototipo: autor, hora, texto, imágenes y contadores |
| `esc-mobile-app/src/components/publicacion-imagenes.tsx` | Carrusel de imágenes con contador «1/3» |
| `esc-mobile-app/src/components/feed-encabezado.tsx` | Encabezado «Comunidad» y espacio para la oración en vivo |
| `esc-mobile-app/src/components/feed-pie.tsx` | Pie: cargando más, error con reintento o fin de la lista |
| `esc-mobile-app/src/app/(tabs)/index.tsx` | Pantalla Inicio con FlashList |

## Datos

- Se lee la vista `publicaciones_con_conteos` (T-007), que trae `total_comentarios` y
  `total_me_gusta` en la misma consulta. Tiene `security_invoker`, así que aplica RLS de T-008.
- Solo un administrador puede insertar en `publicaciones` (T-008), por eso la app no filtra por rol.
  La app no ofrece ninguna opción para crear publicaciones.
- Orden: `creado_en desc, id desc`.

## Paginación por cursor

Páginas de 10. Se piden 11 filas: si llega la número 11 hay más páginas. El cursor es
`(creado_en, id)` de la última publicación mostrada, y la página siguiente pide:

~~~
creado_en < cursor.creado_en
or (creado_en = cursor.creado_en and id < cursor.id)
~~~

No se usa `offset` porque una publicación nueva correría las posiciones y se repetirían elementos.
El `id` desempata publicaciones con la misma hora exacta.

`useFeed` evita pedir la misma página dos veces (`onEndReached` se dispara varias veces) y descarta
respuestas que llegan después de una recarga.

## Imágenes

- Bucket público `publicaciones` (T-028): la URL se arma con `getPublicUrl`, sin peticiones extra.
- `expo-image` reduce cada imagen al tamaño en que se muestra y la guarda con
  `cachePolicy="memory-disk"`. `cacheKey` es la ruta de Storage. El portal sube las imágenes con
  `cacheControl` de un año.
- `recyclingKey` evita que FlashList muestre por un instante la imagen de otra publicación.
- Espacio 4:3 reservado antes de cargar para que la lista no salte.
- El plan Free de Supabase no incluye transformaciones de imágenes en el servidor.

## Oración en vivo (T-025)

`FeedEncabezado` recibe `oracionEnVivo` y lo muestra arriba de «Comunidad». T-025 solo debe pasar
la tarjeta: `<FeedEncabezado oracionEnVivo={…} />`.

## Estados

| Estado | Qué se ve |
| --- | --- |
| Primera carga | Indicador centrado |
| Error en la primera carga | Mensaje (sin conexión u otro) y botón «Reintentar» |
| Sin publicaciones | «Aún no hay publicaciones» |
| Cargando la página siguiente | Indicador al final de la lista |
| Error en la página siguiente | «No pudimos cargar más publicaciones» con «Reintentar», sin perder lo cargado |
| Fin | «Ya viste todas las publicaciones» |
| Recarga deslizando hacia abajo | Si falla, se conserva lo que ya estaba |

Los estados vacío y de error son mínimos: los completa T-022 (F2-11).

## Pendiente en otras tareas

- Dar y quitar «Me gusta» (CU-07 A3) y abrir comentarios: T-023 y T-024. Hoy los contadores solo
  muestran el número.
- Componentes de carga, error y vacío con diseño: T-022.

## Pruebas (6 nov 2026)

iOS (iPad, development build) y Android (emulador Pixel, development build) contra el Supabase remoto:

- Publicaciones creadas desde el portal: una imagen, tres imágenes (carrusel) y solo imagen.
- 15 publicaciones de texto por SQL; la 7 y la 8 con la misma hora, y la 10 y la 11 con la misma
  hora justo en la frontera entre la página 1 y la 2: aparecen todas, una sola vez y en orden.
- Contadores con 3 comentarios y 2 «Me gusta».
- Sin conexión en la primera carga: error con «Reintentar»; al volver la red, carga.
- Fin de la lista y recarga deslizando hacia abajo.

## Datos de prueba

Las publicaciones de prueba llevan `[PRUEBA T-021]` en el texto. Para borrarlas (borra en cascada
sus comentarios, «Me gusta» y avisos push):

~~~sql
delete from public.publicaciones where texto like '[PRUEBA T-021]%';
~~~

Las imágenes del bucket `publicaciones` no se borran con SQL: se eliminan desde el panel
(Storage → publicaciones → `2026/11/`) o desde el portal cuando exista T-029.

## Notas de entorno

- Supabase CLI v3 apunta al Supabase local por defecto: para el proyecto remoto se usa `--remote`
  (`npx supabase migration list --remote`, `npx supabase db push --remote`).
- `npx expo run:android` necesita `ANDROID_HOME` (en Fedora, `$HOME/Android/Sdk`).
- Después de agregar módulos nativos (como en T-019) hay que volver a compilar el development build.
