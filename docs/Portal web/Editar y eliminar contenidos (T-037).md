# Editar y eliminar contenidos · Portal (T-037)

Edición del nombre y el tipo de un contenido de la biblioteca, y eliminación con aviso de los días asignados.
Historia: HU-41 · Caso de uso: CU-21 · Tarea de fase: F3-08 · Issue: #37.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `supabase/migrations/*_limite_fijas_al_editar.sql` | `validar_contenido` también revisa el límite de las oraciones fijas cuando un contenido cambia de oración. |
| `supabase/tests/database/contenidos_editar.test.sql` | 5 pruebas pgTAP del límite al editar. |
| `portal-admin/src/lib/contenidos.ts` | `validarEdicion`, `actualizarContenido`, `diasAsignados` y `eliminarContenido`. |
| `portal-admin/src/lib/biblioteca.ts` | Cada contenido trae también sus rutas de Storage (`pdfPath`, `imagenPath`). |
| `portal-admin/src/App.tsx` (`EditarContenido`, `Library`) | Panel de edición y modal de eliminación. |
| `portal-admin/src/index.css` | Nota del tipo, vista previa de los archivos y aviso de días asignados. |

También se cambió `storage_contenidos.test.sql` (T-035) para que use el nombre `prueba-pgtap` y no choque con archivos
subidos a mano en la base local.

## Editar

- Se abre con «Editar» en cualquier fila, tarjeta del widget o resultado de búsqueda.
- Se puede cambiar el **tipo de oración**, el **número de variante**, el **día de la consagración** o la **fecha del
  sábado** (según el tipo) y el **nombre**. Si el nombre era el sugerido, se actualiza solo al cambiar el tipo o el número.
- Los archivos no se cambian: para reemplazarlos, se elimina el contenido y se sube de nuevo (T-036).
- Restricciones:
  - no se puede mover a una oración fija llena («(completa)»);
  - no se puede mover al widget un contenido con PDF o YouTube («(solo imagen)»);
  - si el contenido está asignado en el calendario, la base no deja cambiar su tipo (llaves de `calendario_contenidos`
    y `asignaciones_oficios`) y se muestra «Este contenido está asignado en el calendario…».
- Al cambiar de tipo, el PDF y la imagen se **mueven** en Storage a `<nueva sección>/<nueva clave>/<mismo archivo>`,
  para respetar la convención de T-035. Si la fila no se puede guardar, los archivos vuelven a su ruta original.

## Eliminar

1. Al pulsar «Eliminar» se consulta `calendario_contenidos` y `asignaciones_oficios` desde **hoy** (fecha de Bogotá).
2. Si hay días asignados, el modal muestra cuántos y cuáles (hasta 5 y «y N más») y advierte que quedarán
   incompletos.
3. Al confirmar se borra la fila (sus asignaciones se borran en cascada) y después su PDF y su imagen de Storage.
   Si un archivo no se pudo borrar, el mensaje lo dice.

Se borra primero la fila para que nunca quede un contenido visible con su archivo roto; en el peor caso queda un
archivo suelto en Storage.

## Cómo probar en local

1. Crear asignaciones de prueba con `psql`: un contenido de Lunes en un lunes pasado y en uno futuro, y una imagen del
   widget en dos días futuros (`calendario_dias`, `asignaciones_oficios`, `calendario_contenidos`).
2. Editar solo el nombre de un contenido.
3. Cambiar de tipo un contenido con PDF e imagen: aparece en la nueva oración y sus archivos cambian de carpeta.
4. Cambiar de tipo un contenido asignado: error en el tipo y archivos sin mover.
5. Revisar «(completa)» y «(solo imagen)» en el selector.
6. Eliminar el contenido asignado: el aviso muestra solo los días desde hoy.
7. Eliminar uno sin asignaciones: sin aviso.
8. En la base: los archivos eliminados ya no están en `storage.objects` y las asignaciones se borraron en cascada.
