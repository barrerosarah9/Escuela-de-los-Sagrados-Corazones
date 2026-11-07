# Biblioteca de contenidos · Portal (T-033)

Vista de la biblioteca del portal agrupada por tipo de oración e imágenes del widget.
Historia: HU-38 · Caso de uso: CU-21 · Tarea de fase: F3-08 · Issue: #33.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `portal-admin/src/lib/biblioteca.ts` | Lee el catálogo de oraciones con el total de contenidos y los contenidos paginados de cada oración, con sus formatos y datos de vista previa. |
| `portal-admin/src/App.tsx` (`Library`, `ContenidosOracion`, `ImagenesWidget`, `VistaPrevia`, `Paginacion`) | Tarjetas por tipo, acordeones por oración y cuadrícula del widget. |
| `portal-admin/src/index.css` | Estilos de la vista previa, la paginación y las oraciones fijas. |

No hay migraciones nuevas: las tablas `oraciones` y `contenidos` y sus reglas son de T-007, y la política de
lectura de T-008.

## Agrupación

| Tarjeta | `seccion` | Qué muestra |
| --- | --- | --- |
| Santifica el día | `dia` | Las cinco oraciones que cambian a diario y, al final, las tres fijas con punto amarillo y su límite («Fija · 2 de 2»). |
| Santifica la semana | `semana` | Oficios de lunes a viernes y domingo con su día, y la Hora de María con una variante por sábado (`fecha`), del más reciente al más antiguo. |
| Santifica el mes | `mes` | Primer jueves, primeros viernes diurnos, vigilias de reparación y primer sábado. |
| Santifica el año | `anio` | Las tres consagraciones con sus días 1 a 30 (`numero`). |
| Imágenes del widget | `widget` | Cuadrícula de imágenes. |

Cada tarjeta muestra el total de contenidos de su tipo. Ese total sale de una sola consulta con
`contenidos(count)`.

## Cada contenido

- **Nombre** y un detalle: «Sábado 14 de noviembre de 2026» en la Hora de María, «Día 3 de 30» en las
  consagraciones.
- **Formato:** una insignia por cada archivo que tenga (PDF, YouTube, Imagen). Un contenido puede tener varios.
- **Vista previa:**
  - si tiene imagen, la imagen;
  - si tiene video, la miniatura del video (`i.ytimg.com/vi/<id>/hqdefault.jpg`) con el ícono de reproducir;
  - si no, o si el archivo no se puede cargar, un recuadro con el ícono del formato.

  Al hacer clic se abre el archivo o el video en otra pestaña.
- Los PDF se firman en el bucket `contenidos-pdf` y las imágenes en `contenidos-imagenes` (T-035), con URL de
  1 hora. Ver [Storage](../Base%20de%20datos/Storage%20(T-018).md).

## Paginación

- 10 contenidos por oración en los acordeones y 12 imágenes en la cuadrícula del widget, con `.range()` y
  `count: 'exact'`.
- Orden: `fecha` descendente, luego `numero`, luego `creado_en` y por último `id`. El `id` hace que el orden
  sea único: sin él, los contenidos creados en el mismo instante (por ejemplo, en una carga en bloque) podían
  cambiar de lugar entre consultas y repetirse o saltarse entre páginas.
- Si se pide una página que ya no existe (`PGRST103`), se vuelve a la página 1.
- Cada acordeón carga sus contenidos al abrirse.

## Relación con otras tareas

- Búsqueda y filtros: hechos en T-034 (HU-39). Ver [Búsqueda de la biblioteca (T-034)](B%C3%BAsqueda%20de%20la%20biblioteca%20(T-034).md).
- Buckets de contenidos: hechos en T-035.
- Subir: T-036 (HU-40).
- Editar y eliminar: T-037 (HU-41).

Mientras tanto, los botones de subir, editar y eliminar muestran «… estará disponible pronto». El Calendario sigue
usando los datos de ejemplo del prototipo hasta T-042.

## Cómo probar en local

1. `npx supabase start` y, en `portal-admin/`, `npm run dev` con `.env.development.local` apuntando al local.
2. Cargar contenidos de prueba con `docker exec -i <contenedor supabase_db_…> psql -U postgres`. Usar los tres
   formatos, 12 contenidos en Jaculatorias, 4 sábados de Hora de María, las fijas en su límite y 14 imágenes del
   widget.
3. Para ver vistas previas reales, subir un PDF y una imagen como administrador a la ruta
   `<seccion>/<clave>/<archivo>` de su bucket y poner esas rutas en `pdf_path` e `imagen_path`.
4. Revisar:
   - los totales de las tarjetas;
   - la paginación de Jaculatorias (1–10 y 11–12) y del widget (1–12 y 13–14);
   - las miniaturas de YouTube y las vistas previas de imagen;
   - las fijas al final con su aviso de límite;
   - las oraciones sin contenido con su estado vacío.
5. Al terminar, borrar los archivos de prueba con la API de Storage y los contenidos de prueba
   (`delete from public.contenidos;` en la base local).
