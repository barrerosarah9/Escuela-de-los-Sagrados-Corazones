# Asignación de oficios por día · T-057

Cada día del calendario guarda la variante del oficio de la semana, la del mes y las consagraciones del año con su
día, y la base de datos calcula el estado del día, bloquea los días publicados y copia la programación.
Historia: HU-45 · Tarea de fase: F4-13 · Issue: #57.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `supabase/migrations/20261111225000_asignacion_oficios.sql` | Bloqueo de días publicados, `estados_calendario` y `copiar_programacion`. |
| `supabase/tests/database/asignacion_oficios.test.sql` | 25 pruebas pgTAP. |
| `portal-admin/src/lib/calendario.ts` | Usa el estado y la copia de la base; mensaje de día publicado. |
| `portal-admin/src/App.tsx` | Texto del modal de copia. |

## Tablas (desde T-007 y T-008)

- `calendario_contenidos`: las cinco oraciones variables y la imagen del widget de cada día.
- `asignaciones_oficios`: oficio de la semana, oraciones del mes y consagraciones (contenido con su Día 1–30).
  Validaciones existentes: el oficio de la semana solo en su día, el del mes solo en la primera semana.
- RLS: solo el administrador escribe; la app lee solo el día vigente.

## Estado del día (`estados_calendario(desde, hasta)`)

- **Publicado:** `calendario_dias.publicado_en` tiene valor.
- **Completo:** están las cinco oraciones variables, la imagen del widget y el oficio de la semana (el sábado, la
  Hora de María).
- **Incompleto:** falta alguna de las anteriores. **Vacío:** no hay ninguna.
- Las oraciones del mes y las consagraciones no cuentan (HU-45 permite «Sin asignar»).

## Días publicados

Trigger `bloquear_dia_publicado` en `calendario_dias`, `calendario_contenidos` y `asignaciones_oficios`:

- Desde la API (`authenticated`/`anon`) no se puede insertar, cambiar ni borrar nada de un día publicado, ni marcar un
  día como publicado o vigente. Error `P0001` con `hint = 'dia_publicado'`.
- `publicar_dia()` (pg_cron, como `postgres`), el SQL Editor y las cascadas (borrar un contenido de la biblioteca)
  no se bloquean.

## Copiar (`copiar_programacion(origen, destino, dias)`)

- `dias` = 1 (día) o 7 (semana); solo administradores; una sola transacción; devuelve las fechas copiadas.
- Omite destinos pasados o publicados y orígenes sin programación.
- Reemplaza las oraciones y el widget del destino.
- Oficios: las consagraciones siempre; el oficio de la semana y los del mes solo si el destino es el mismo día de la
  semana (los del mes, además, en la primera semana). Si no aplican, el destino conserva los suyos.
- Hora de María: no se copia la del sábado de origen; se asigna la del sábado de destino si existe.

## Pruebas

- `npx supabase test db`: 14 archivos, 210 pruebas.
- Portal contra Supabase local: estado incompleto sin oficio y completo con él; copia miércoles → miércoles (copia
  oficio y consagración) y miércoles → jueves (copia la consagración, el jueves queda sin su oficio); día publicado
  bloqueado en el portal, en la copia y en la base (`delete` como administrador rechazado).
