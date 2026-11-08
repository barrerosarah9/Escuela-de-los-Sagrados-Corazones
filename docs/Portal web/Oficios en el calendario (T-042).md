# Oficios en el calendario · Portal (T-042)

Pestañas «Santificar cada día de la semana», «Santificar cada mes» y «Santificar cada año» del panel del día en el
calendario.
Historia: HU-45 · Caso de uso: CU-23 · Tarea de fase: F3-10 · Issue: #42.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `portal-admin/src/lib/calendario.ts` | Catálogo de oficios, `oficioDeLaSemana`, `oracionesDelMes`, `oficiosDelDia`, `listarOpcionesOficios` y guardado en `asignaciones_oficios`. |
| `portal-admin/src/App.tsx` (`Calendar`) | Las tres pestañas, las casillas de consagraciones y el guardado desde cualquier pestaña. |
| `portal-admin/src/index.css` | Pestañas en una sola fila (`.calendar-tabs`). |

No hay migraciones nuevas. Los oficios se guardan en `asignaciones_oficios` (T-007), cuyo *trigger*
`validar_asignacion_calendario` exige que el oficio de la semana sea de su día, que la oración del mes sea de su día y
de los primeros 7 días del mes, y que el contenido pertenezca a la oración. Las políticas son de T-008.

## Pestañas

| Pestaña | Cuándo aparece | Qué tiene |
| --- | --- | --- |
| Santificar cada hora del día | Siempre | Las cinco oraciones variables, la imagen del widget y las fijas (T-039 y T-040). |
| Santificar cada día de la semana | Siempre | El oficio del día (por `oraciones.dia_semana`) con sus variantes de la biblioteca. El sábado, la Hora de María. |
| Santificar cada mes | Jueves, viernes y sábado | Primer jueves; el viernes, Primeros viernes diurnos y Vigilias de reparación; Primer sábado. Empiezan en «Sin asignar». |
| Santificar cada año | Siempre | Las tres consagraciones como casillas; cada una marcada tiene su desplegable de días (Día 1 a 30) de la biblioteca. |

## Comportamiento

- **Hora de María:** desde esta tarea está en la pestaña de la semana, porque el sábado es su oficio
  (`dia_semana = 6`). Se elige la de ese sábado o se sube con el panel de la Biblioteca, como en T-039.
- **Desplegables vacíos:** si un oficio no tiene variantes, o una consagración no tiene días, el desplegable lo dice
  («Sin variantes en la biblioteca», «Sin días en la biblioteca»).
- **Mes fuera de la primera semana:** la pestaña se ve el jueves, viernes o sábado, pero si el día es posterior al 7
  los desplegables quedan deshabilitados con una nota, porque la base no acepta ese oficio ese día.
- **Año:** marcar una consagración sin elegir su día muestra un aviso y deshabilita «Guardar programación». Al
  desmarcarla se quita su asignación.
- **Guardar:** un solo «Guardar programación», debajo de las cuatro pestañas, guarda todo el día. Los oficios se
  asignan con `upsert` sobre `(fecha, oracion_id)` y se borran los que quedaron vacíos; fuera de la primera semana no
  se tocan los del mes. Sigue sin escribir si el día está publicado o ya pasó.
- **Cambios sin guardar** detecta cambios en cualquiera de las cuatro pestañas.
- **Una sola fila:** los botones de las pestañas se reparten el ancho y, si un texto no cabe, pasa a dos líneas dentro
  de su botón. Probado a 1280, 1440 y 1920 px sin *scroll* horizontal
  (`document.documentElement.scrollWidth <= window.innerWidth`).

## Pendiente fuera de esta tarea (T-057)

- Que el estado del día cuente el oficio de la semana de lunes a viernes y el domingo. Hoy cuenta las cinco
  oraciones, el widget y, el sábado, la Hora de María; un día con solo oficios puede verse «Vacío».
- Que copiar un día o una semana (T-041) copie también los oficios.
- El bloqueo en la base de los días publicados.

## Cómo probar en local

1. Supabase local, `portal-admin/.env.development.local` y un administrador local, como en T-039.
2. Con `psql`, crear contenidos `[PRUEBA T-042] …`: 2 variantes de los oficios de lunes a viernes y de las 4 oraciones
   del mes, los días 1 a 3 de las consagraciones a San José y a la Virgen María, y una Hora de María para el primer
   sábado de un mes. Dejar sin contenido el oficio del domingo y la Consagración al Sagrado Corazón.
3. En **Calendario**, revisar:
   - las pestañas en una fila a 1280, 1440 y 1920 px;
   - semana: el oficio de cada día con sus variantes; el domingo, «Sin variantes»; el sábado, la Hora de María;
   - mes: no aparece el lunes; un jueves después del 7, deshabilitado; el primer jueves, habilitado; el primer
     viernes, dos desplegables;
   - año: marcar sin día muestra el aviso; Sagrado Corazón dice «Sin días»; marcar, guardar, recargar y desmarcar.
4. Revisar `asignaciones_oficios` con `psql`.
5. Limpiar:

   ```sql
   delete from public.calendario_dias where fecha between date '2026-11-09' and date '2026-12-06';
   delete from public.contenidos where nombre like '[PRUEBA T-042]%';
   ```
