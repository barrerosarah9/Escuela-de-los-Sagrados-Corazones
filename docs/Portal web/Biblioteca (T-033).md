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
  - si no, un recuadro con el ícono del formato.

  Al hacer clic se abre el archivo o el video en otra pestaña.
- Los PDF y las imágenes usan URL firmadas de 1 hora del bucket `contenidos`. Ese bucket se crea en T-035;
  mientras no exista, la vista previa muestra el recuadro de respaldo y Storage responde `400`, que la pantalla
  maneja. Si T-035 usa otro nombre, solo cambia `BUCKET_CONTENIDOS` en `biblioteca.ts`.

## Paginación

- 10 contenidos por oración en los acordeones y 12 imágenes en la cuadrícula del widget, con `.range()` y
  `count: 'exact'`.
- Orden: `fecha` descendente, luego `numero` y luego `creado_en`.
- Si se pide una página que ya no existe (`PGRST103`), se vuelve a la página 1.
- Cada acordeón carga sus contenidos al abrirse.

## Pendiente en otras tareas

- Búsqueda y filtros: T-034 (HU-39).
- Bucket de contenidos: T-035.
- Subir: T-036 (HU-40).
- Editar y eliminar: T-037 (HU-41).

Mientras tanto, esos botones muestran «… estará disponible pronto». El Calendario sigue usando los datos de
ejemplo del prototipo hasta T-042.

## Cómo probar en local

1. `npx supabase start` y, en `portal-admin/`, `npm run dev` con `.env.development.local` apuntando al local.
2. Cargar contenidos de prueba con `docker exec -i <contenedor supabase_db_…> psql -U postgres`. Usar los tres
   formatos, 12 contenidos en Jaculatorias, 4 sábados de Hora de María, las fijas en su límite y 14 imágenes del
   widget.
3. Revisar:
   - los totales de las tarjetas;
   - la paginación de Jaculatorias (1–10 y 11–12) y del widget (1–12 y 13–14);
   - las miniaturas de YouTube;
   - las fijas al final con su aviso de límite;
   - las oraciones sin contenido con su estado vacío.
4. Al terminar, borrar los contenidos de prueba (`delete from public.contenidos;` en la base local).
