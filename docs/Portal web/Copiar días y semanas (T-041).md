# Copiar días y semanas · Portal (T-041)

Vista semanal con el estado de cada día y copia de la programación de un día o una semana a otra fecha.
Historia: HU-44 · Caso de uso: CU-22 (A2) · Tarea de fase: F3-10 · Issue: #41.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `portal-admin/src/lib/calendario.ts` | `copiarProgramacion`: revisa origen y destino, pide confirmación y copia. |
| `portal-admin/src/App.tsx` (`CopiarProgramacion`, `Calendar`) | Botón «Copiar día o semana», ventana de copia y recarga del calendario al terminar. |
| `portal-admin/src/index.css` | Texto del origen y notas de la ventana (`.copia-origen`, `.copia-nota`). |

No hay migraciones nuevas: usa `calendario_dias` y `calendario_contenidos` (T-007) con las políticas de T-008.

## Vista semanal

La semana, sus flechas y el estado de cada día (publicado, completo, incompleto o vacío) se construyeron en
[Calendario (T-039)](Calendario%20(T-039).md) y la imagen del widget se sumó al estado en
[Imagen del widget en el calendario (T-040)](Imagen%20del%20widget%20en%20el%20calendario%20(T-040).md). Esta tarea
solo agrega la copia.

## Qué se copia

- Las cinco oraciones variables y la imagen del widget (`calendario_contenidos`).
- **No se copia la Hora de María:** cada una pertenece a la fecha de su sábado en la biblioteca, así que copiarla a otro
  sábado pondría la de una fecha equivocada.
- Los oficios de la semana, del mes y del año los suma T-057 a la copia, como dice su DoD.

## Comportamiento

- **Este día:** copia el día seleccionado a otra fecha. **Semana completa:** copia de lunes a domingo a la semana de la
  fecha elegida (lunes a lunes, martes a martes…); basta con elegir cualquier día de la semana de destino.
- **El destino queda igual al origen:** se asignan las oraciones del origen y se quitan del destino las que el origen no
  tiene. En una semana, los días vacíos del origen no cambian su día de destino.
- **Aviso antes de reemplazar:** si algún día de destino ya tiene programación, la ventana lo lista y pide «Reemplazar y
  copiar». Si se cambia el modo o la fecha, hay que volver a revisar.
- **Días publicados o pasados:** nunca se tocan. En una semana se omiten y se avisa cuáles; si no queda ninguno
  disponible, no se copia nada.
- **Errores en la ventana:** misma fecha o misma semana que el origen, origen sin nada que copiar, destino sin días
  disponibles y errores de Supabase. La ventana no se cierra con un error.
- Antes de escribir se vuelve a leer el destino, así que un día que se publicó mientras tanto no se modifica.
- Al terminar, el calendario salta al primer día copiado y avisa cuántos días se copiaron y cuántos se omitieron.

La copia hace varias llamadas a Supabase (días, asignaciones y borrados) y no es una transacción. Si una falla a mitad,
se muestra el error y lo ya copiado queda; se puede repetir la copia, que deja el destino igual al origen.

## Cómo probar en local

1. Supabase local, `portal-admin/.env.development.local` y un administrador local, como en T-039.
2. Subir una imagen del widget llamada `[PRUEBA T-041] Widget` desde **Biblioteca → Imágenes del widget**.
3. Con `psql`, crear contenidos `[PRUEBA T-041] …` (2 por oración variable y una Hora de María para un sábado) y
   programar dos semanas: en la de origen, un lunes completo, un miércoles con 2 oraciones y un sábado completo con
   Hora de María; en la de destino, un lunes y un jueves con algo, y un sábado publicado (`publicado_en = now()`).
4. En **Calendario**, revisar:
   - copiar el lunes a un día vacío: queda igual y el calendario salta a ese día;
   - copiar el lunes a un día con programación: aparece el aviso y «Reemplazar y copiar»;
   - copiar la semana: avisa los días con programación y el sábado publicado que se omite; el jueves de destino no
     cambia y la Hora de María no se copia;
   - errores: origen vacío, misma fecha, fecha pasada y misma semana.
5. Limpiar:
   - eliminar `[PRUEBA T-041] Widget` desde **Biblioteca → Imágenes del widget** (borra también el archivo de Storage);
   - borrar los días y contenidos de prueba:

     ```sql
     delete from public.calendario_dias where fecha between date '2026-11-09' and date '2026-11-22';
     delete from public.contenidos where nombre like '[PRUEBA T-041]%';
     ```
