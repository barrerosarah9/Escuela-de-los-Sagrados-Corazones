# Calendario: oraciones variables de cada día · Portal (T-039)

Vista de día del calendario para asignar el contenido de las cinco oraciones variables de «Santifica el día» y, los
sábados, la Hora de María.
Historia: HU-42 · Caso de uso: CU-22 · Tarea de fase: F3-10 · Issue: #39.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `portal-admin/src/lib/calendario.ts` | Catálogo de las oraciones del calendario, opciones de la biblioteca, estado de cada día, bloqueo y guardado. |
| `portal-admin/src/App.tsx` (`Calendar`) | Semana navegable, vista de día con los selectores y Hora de María del sábado. |
| `portal-admin/src/App.tsx` (`FormularioContenido`) | Nueva prop opcional `fechaInicial` para abrir «Subir contenido» con la fecha del sábado puesta. |
| `portal-admin/src/index.css` | Fila de Hora de María, aviso de oraciones faltantes y «Cambios sin guardar». |

Se quitaron los datos de ejemplo del prototipo que solo usaba el calendario (`libraryGroups`, `fixedLimits`,
`widgetImages` y sus tipos).

No hay migraciones nuevas: `calendario_dias`, `calendario_contenidos` y `asignaciones_oficios`, el *trigger*
`validar_asignacion_calendario` y las llaves foráneas compuestas vienen de T-007, y las políticas «administrar» de T-008.

La imagen del widget de cada día se agregó en T-040: ver
[Imagen del widget en el calendario (T-040)](Imagen%20del%20widget%20en%20el%20calendario%20(T-040).md).

## Dónde se guarda cada cosa

| Qué | Tabla |
| --- | --- |
| El día (y si ya se publicó, `publicado_en`) | `calendario_dias` |
| Jaculatorias, Evangelio de Hoy, Santo Rosario de Hoy, Diario Espiritual, Hora de reparación e imagen del widget (T-040) | `calendario_contenidos` |
| Hora de María del sábado (es un oficio de la semana) | `asignaciones_oficios` |

Las oraciones se buscan por `clave` (`jaculatorias`, `evangelio-hoy`, `santo-rosario-hoy`, `diario-espiritual`,
`hora-reparacion`, `hora-maria` e `imagen-widget`), no por `id`, para que funcione igual en la base local y en
producción.

## Comportamiento

- Abre en la semana actual y en el día de hoy, calculados con la hora de Bogotá. Las flechas cambian de semana y
  «Volver a esta semana» regresa.
- Cada día tiene un punto y un *badge* con su estado:

  | Estado | Cuándo |
  | --- | --- |
  | Publicado (azul) | `calendario_dias.publicado_en` tiene valor |
  | Completo (verde) | Tiene las cinco oraciones, la imagen del widget y, si es sábado, la Hora de María |
  | Incompleto (amarillo) | Tiene algunas, pero no todas las requeridas |
  | Vacío (gris) | No tiene ninguna de las requeridas |

  El estado se calcula al leer, a partir de las asignaciones. Los oficios de la semana, del mes y del año (T-057)
  todavía no cuentan.
- **Selectores:** cada oración solo lista contenidos de la biblioteca de esa oración (una consulta a `contenidos`
  filtrada por `oracion_id`). La base también lo exige con la llave `(contenido_id, oracion_id)`.
- **Hora de María:** solo los sábados aparece la fila. Como la biblioteca identifica cada Hora de María por la fecha de
  su sábado (`contenidos_fecha_key`), el selector ofrece la de ese sábado. Si no existe, el botón **Subir** abre el panel
  de la Biblioteca (T-036) con el tipo y la fecha puestos; al guardarla queda elegida y falta «Guardar programación».
- **Antes de guardar** se avisa qué oraciones faltan. Al guardar:
  1. se vuelve a leer el día y, si ya está publicado o pasó, no se escribe nada;
  2. se crea la fila de `calendario_dias` solo si hay algo que asignar (sin pisar `creado_por` si ya existía);
  3. se asigna o reemplaza cada oración con `upsert` sobre `(fecha, oracion_id)` y se borran las que quedaron sin
     asignar;
  4. se relee el día para mostrar su estado real.
- **Días publicados o pasados:** solo de consulta. Se ven los contenidos asignados, pero los selectores están
  deshabilitados y no hay botón de guardar. Bloquear también los días pasados es una decisión de esta tarea, igual
  que en la Oración en vivo (T-031): cambiarlos no tendría efecto en la app.
- Las pestañas de la semana, el mes y el año, y copiar días, siguen con «Disponible pronto» (T-041 y T-057).

## Pendiente fuera de esta tarea

- **Bloqueo en la base de datos** de los días publicados: hoy lo garantiza el portal; T-057 lo agrega como regla de la
  base para que tampoco se pueda desde la API.
- El estado completo con los oficios (T-057) y la publicación diaria que llena `publicado_en` (T-043 y T-058).

## Cómo probar en local

1. `npx supabase start` y `portal-admin/.env.development.local` con la URL y la clave publicable locales.
2. Crear un administrador local (registro por `/auth/v1/signup` y `rol = 'administrador'` desde `psql`).
3. Cargar datos de prueba con `docker exec -i <contenedor supabase_db_…> psql -U postgres`:
   - 2 contenidos con enlace de YouTube para cada oración variable y 2 de Hora Santa, con nombre `[PRUEBA T-039] …`;
   - una Hora de María para un sábado futuro (columna `fecha`) y otro sábado sin ella;
   - un día futuro con `publicado_en = now()` y una asignación.
4. `cd portal-admin && npm run dev` y, en **Calendario**, revisar:
   - los selectores solo muestran su oración (no aparece Hora Santa);
   - guardar 3 de 5 → Incompleto; las 5 y la imagen del widget → Completo; quitar una → Incompleto;
   - el sábado con Hora de María: sin ella queda Incompleto y con ella Completo;
   - el sábado sin Hora de María: «Subir» abre el panel con la fecha puesta y la deja elegida;
   - el día publicado y un día pasado: solo consulta;
   - al recargar, los estados se mantienen.
5. Limpiar los datos de prueba:

   ```sql
   delete from public.calendario_dias
   where fecha in (date '2026-11-08', date '2026-11-10', date '2026-11-14', date '2026-11-21');
   delete from public.contenidos
   where nombre like '[PRUEBA T-039]%'
      or (oracion_id = (select id from public.oraciones where clave = 'hora-maria') and fecha = date '2026-11-21');
   ```

   Borrar los días también borra sus asignaciones (`on delete cascade`). Los contenidos de prueba usan YouTube, así
   que no dejan archivos en Storage.
