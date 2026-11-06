# Estados de carga, error y vacío · T-022

HU-08 · F2-11. Componentes reutilizables para lo que se ve mientras una pantalla carga, cuando falla
o cuando no tiene contenido. Hoy se usan en el feed (Inicio) y en Perfil; la lista de comentarios
(T-024) y las demás listas deben usar los mismos.

## Componentes

| Archivo | Qué hace |
| --- | --- |
| `esc-mobile-app/src/components/skeleton.tsx` | Bloque gris (`colors.surface`) que pulsa; base de todos los skeletons |
| `esc-mobile-app/src/components/publicacion-skeleton.tsx` | `PublicacionSkeleton` con las medidas de `PublicacionCard` y `ListaPublicacionesSkeleton` con varias |
| `esc-mobile-app/src/components/perfil-skeleton.tsx` | Avatar, nombre, racha y tarjeta de datos básicos de Perfil |
| `esc-mobile-app/src/components/estado-mensaje.tsx` | Base común: ícono en círculo, título, mensaje y acción opcional, con tono `error` o `informativo` |
| `esc-mobile-app/src/components/estado-error.tsx` | Error con botón «Reintentar»; ícono y mensaje según el motivo |
| `esc-mobile-app/src/components/estado-vacio.tsx` | Estado vacío con ícono y acción opcionales |

## Cómo usarlos

~~~tsx
<ListaPublicacionesSkeleton etiqueta="Cargando publicaciones" />

<EstadoError
  motivo={motivoError}
  titulo="No se pudo cargar el feed"
  onReintentar={reintentar}
  reintentando={reintentando}
/>

<EstadoVacio
  icono="newspaper-outline"
  titulo="Aún no hay publicaciones"
  mensaje="Cuando la comunidad comparta novedades, aparecerán aquí."
/>
~~~

- `Skeleton` acepta `width`, `height` y `radius`; para imágenes se omite `height` y se pasa
  `aspectRatio` en `style`.
- `EstadoError.motivo` es `'sin_conexion'` (nube tachada) o `'desconocido'` (alerta). Si no se pasa
  `mensaje`, usa el texto por defecto de ese motivo. `reintentando` muestra la carga en el botón.
- `EstadoVacio.accion` es para listas donde el usuario puede hacer algo («Escribe el primer
  comentario»). El feed no la usa porque el usuario no publica (HU-08).
- Dentro de una pantalla que ya tiene margen, se quita el padding propio con `style`
  (`paddingHorizontal: 0, paddingVertical: 0`), como en Perfil.

## Diseño

El prototipo de Figma Make no dibuja estos estados. Se arman con el tema de T-006:

- Skeleton en `colors.surface` (`#F2F3F4`), con la forma y las medidas del contenido real, para que
  la pantalla no salte al llegar los datos.
- Títulos en Newsreader (`subtitle`). Error: círculo `primarySoft`, ícono y título rojo cereza.
  Vacío: círculo `skyLight`, ícono azul de enlaces (`link`) y título carbón, porque no es un error.
- Botón «Reintentar» primario, de ancho completo.

## Accesibilidad

- Cada skeleton completo es un solo elemento `progressbar` con `busy: true` y una etiqueta
  («Cargando publicaciones», «Cargando tu perfil»); el lector de pantalla no lee los bloques.
- La animación corre en el hilo de UI (Reanimated) y se detiene si el teléfono tiene activado
  «Reducir movimiento» (`useReducedMotion`).
- El título de error y de vacío es `header`.

## Comportamiento

| Pantalla | Situación | Qué se ve |
| --- | --- | --- |
| Feed | Primera carga | Encabezado «Comunidad» y tres publicaciones skeleton |
| Feed | Falla la primera carga | `EstadoError` con el motivo; «Reintentar» con el botón o deslizando hacia abajo |
| Feed | Falla una recarga sin publicaciones | `EstadoError` (antes quedaba «Aún no hay publicaciones») |
| Feed | Falla una recarga con publicaciones | Se conservan las publicaciones |
| Feed | Sin publicaciones | `EstadoVacio`, sin acción |
| Feed | Falla la página siguiente | Línea pequeña al final con «Reintentar» (`FeedPie`, de T-021) |
| Perfil | Primera carga | `PerfilSkeleton` |
| Perfil | Falla la carga sin perfil | `EstadoError` entre el avatar y los menús; «Cerrar sesión» y Configuración siguen disponibles |
| Perfil | Falla una recarga con perfil | Se conserva el perfil; la racha dice «No disponible por ahora» |

## Pruebas (6 nov 2026)

iOS (iPhone, development build) y Android (emulador Pixel, development build) contra el Supabase
remoto:

- Skeleton del feed y de Perfil al recargar la app.
- Feed vacío (sin publicaciones en el remoto): estado vacío.
- Modo avión con la app abierta, deslizando en el feed vacío: error sin conexión; «Reintentar» vuelve
  al skeleton y, con red, al feed.
- Perfil abierto por primera vez en modo avión: error con «Reintentar» y menús visibles.

En desarrollo no se puede abrir la app en modo avión, porque el código viene de Metro. Para probar
el error de la primera carga hay que dejar la app abierta en otra pestaña, recargar con `r` y quitar
la red antes de entrar a la pantalla. La pestaña que estaba abierta al pulsar `r` se vuelve a abrir
y carga con red.
