# Imagen del widget en el calendario · Portal (T-040)

Selector de la imagen del widget de cada día en el calendario, con vista previa.
Historia: HU-43 · Caso de uso: CU-22 · Tarea de fase: F3-10 · Issue: #40.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `portal-admin/src/lib/calendario.ts` | Oración `imagen-widget` en el catálogo, `listarImagenesWidget`, `urlVistaPrevia` y el widget en el estado y el guardado del día. |
| `portal-admin/src/App.tsx` (`Calendar`) | Fila «Imagen del widget» con selector y vista previa. |
| `portal-admin/src/index.css` | Estilos de la vista previa (`.calendario-widget-vista`). |

No hay migraciones nuevas. La imagen del widget es una oración más del catálogo de T-007 (sección `widget`) y se
guarda en `calendario_contenidos`, igual que las cinco oraciones variables. La base ya exige que el contenido sea del
widget (llave `(contenido_id, oracion_id)`) y que el widget solo tenga imagen (T-007). Las imágenes están en el bucket
privado `contenidos-imagenes` (T-035).

## Comportamiento

- **Selector:** solo lista contenidos de la oración `imagen-widget` que tienen imagen, del más reciente al más antiguo
  (`creado_en`), porque se suben casi a diario.
- **Vista previa:** al elegir una imagen se pide una URL firmada de 1 hora (`createSignedUrl`) y se muestra debajo
  del selector, antes y después de guardar. Se firma solo la imagen elegida, no todas las del selector. Si la URL no
  se puede firmar, aparece «No pudimos cargar la vista previa de la imagen.».
- **Estado del día:** el widget es obligatorio (CU-22 E2). Un día sin imagen queda incompleto y el aviso de faltantes
  lo nombra. Las requeridas quedan: las cinco oraciones, la imagen del widget y, los sábados, la Hora de María.
- **Días publicados o pasados:** el selector queda deshabilitado, pero la vista previa se sigue viendo.
- Las imágenes se suben desde **Biblioteca → Imágenes del widget** (T-036); el calendario solo las elige.

El resto del calendario está en [Calendario (T-039)](Calendario%20(T-039).md).

## Cómo probar en local

1. Supabase local, `portal-admin/.env.development.local` y un administrador local, como en T-039.
2. Un contenido con YouTube para cada oración variable (`[PRUEBA T-040] …`) con `psql`.
3. En **Biblioteca → Imágenes del widget**, subir 2 imágenes JPG o PNG llamadas `[PRUEBA T-040] Widget 1` y `Widget 2`.
4. En **Calendario**, revisar:
   - el selector del widget solo muestra esas 2 imágenes, y el de las oraciones no las muestra;
   - al elegir una imagen aparece su vista previa y cambia al elegir otra;
   - las 5 oraciones sin widget → Incompleto («Falta: Imagen del widget»); con widget → Completo;
   - al recargar, la imagen guardada y su vista previa se mantienen;
   - un sábado necesita también la Hora de María; el widget es la fila 7;
   - un día con `publicado_en` muestra la vista previa con el selector deshabilitado.
5. Limpiar:
   - eliminar las 2 imágenes desde **Biblioteca → Imágenes del widget** (T-037 borra también el archivo de Storage
     y sus asignaciones del calendario);
   - borrar los días y los contenidos de prueba:

     ```sql
     delete from public.calendario_dias where fecha in (date '2026-11-08', date '2026-11-09', date '2026-11-14');
     delete from public.contenidos where nombre like '[PRUEBA T-040]%';
     ```
