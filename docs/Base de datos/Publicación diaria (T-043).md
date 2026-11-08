# Publicación diaria del contenido programado · T-043

Todos los días a las **12:00 a. m. de Bogotá**, pg_cron publica el día que se programó en el calendario del portal y
retira el del día anterior.
Historia: HU-56 · Caso de uso: CU-28 · Tarea de fase: F4-06 · Issue: #43.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `supabase/migrations/20261108083000_publicacion_diaria.sql` | Activa pg_cron, agrega `calendario_dias.vigente`, la tabla `alertas_publicacion`, la función `publicar_dia` y el job; cambia las políticas de lectura del calendario. |
| `supabase/tests/database/publicacion_diaria.test.sql` | 19 pruebas pgTAP de la publicación, las alertas y lo que ve cada rol. |

No tiene secretos ni variables de entorno: todo corre dentro de la base.

## El job

| Nombre | Horario (UTC) | Hora en Bogotá | Comando |
| --- | --- | --- | --- |
| `publicar-contenido-diario` | `0 5 * * *` | 12:00 a. m. | `select public.publicar_dia()` |

pg_cron programa en UTC. Colombia está en UTC−5 todo el año (no tiene horario de verano), así que la hora no se
corre. La fecha de «hoy» la calcula la función con `America/Bogota`, no el servidor.

**Cambiar la hora:** volver a programar el job con el mismo nombre; reemplaza el horario, no crea otro job. Por
ejemplo, para las 4:00 a. m. de Bogotá (9:00 UTC):

```sql
select cron.schedule('publicar-contenido-diario', '0 9 * * *', $$select public.publicar_dia()$$);
```

Si el cambio es definitivo, va en una migración nueva para que quede versionado.

## `publicar_dia(fecha)`

Por defecto publica **hoy en Bogotá**. Pasos:

1. Recuerda cuál era el día vigente.
2. Crea el día en `calendario_dias` si no estaba programado.
3. Registra en `alertas_publicacion` una fila por cada sección sin contenido: las cinco oraciones variables
   (Jaculatorias, Evangelio de Hoy, Santo Rosario de Hoy, Diario Espiritual, Hora de reparación) y la imagen del
   widget (CU-28 E1). La sección queda vacía en la app.
4. Si falta la imagen del widget, copia la del día anterior: el widget conserva la imagen anterior (CU-28 E2). La
   alerta queda registrada igual.
5. Retira el día anterior (`vigente = false`) y deja vigente el nuevo. El anterior conserva `publicado_en` como
   historial y en el portal sigue «Publicado» y bloqueado.
6. Llena `publicado_en` (solo la primera vez) y devuelve cuántas secciones faltaron.

Correrla varias veces el mismo día no duplica alertas ni contenidos ni cambia la hora de publicación. Es
`security definer` y no la pueden ejecutar `anon` ni `authenticated`: solo pg_cron (o el SQL Editor, que entra
como `postgres`).

## Qué ve cada rol

| Tabla | Usuario | Administrador |
| --- | --- | --- |
| `calendario_dias`, `calendario_contenidos`, `asignaciones_oficios` | Solo el día vigente | Todo |
| `alertas_publicacion` | Nada | Lee |

Antes (T-008) el usuario leía cualquier día con `publicado_en`; ahora solo el vigente, así «el día anterior deja de
mostrarse» lo garantiza la base y no depende de la app. Un índice único parcial impide tener dos días vigentes.

## Decisiones

- Hora de publicación: 12:00 a. m. de Bogotá, para que el contenido esté desde que empieza el día. El documento de
  casos de uso solo dice «una hora fija configurada en pg_cron».
- Un día sin programar se publica igual (vacío) y registra las seis alertas.
- La imagen del widget se copia en la base y no en la app, porque la app ya no puede leer días anteriores.

## Pendiente fuera de esta tarea

- **T-058:** activar los oficios de la semana, del mes y del año al publicar, y sus alertas.
- **T-051 / T-049:** encolar el aviso push del contenido nuevo (CU-28 paso 5, CU-29).
- **App (T-046):** leer el día vigente.
- Mostrar las alertas en el portal (por ejemplo en el Resumen). Hoy se consultan en el SQL Editor:

  ```sql
  select a.fecha, o.nombre, a.creado_en
  from public.alertas_publicacion a
  join public.oraciones o on o.id = a.oracion_id
  order by a.fecha desc, o.orden;
  ```

## Aplicar en producción

Después de fusionar el PR, desde la raíz del repo:

```bash
npx supabase db push --remote
```

Revisar que la línea `Target:` sea el proyecto `mwmrcunefvapawpocvof` antes de confirmar. Luego, en el SQL Editor
del dashboard:

```sql
select jobid, jobname, schedule, active from cron.job;
```

Debe aparecer `publicar-contenido-diario` con `0 5 * * *` y `active = true`. Al día siguiente, revisar la primera
ejecución:

```sql
select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
```

## Cómo probar en local

1. `npx supabase migration up` y `npx supabase test db` (8 archivos, 136 pruebas).
2. En el SQL Editor de Studio (`http://127.0.0.1:54323`), «adelantar la hora» llamando la función con ayer:
   - crear un contenido `[PRUEBA T-043] Jaculatorias` y otro `[PRUEBA T-043] Widget` y asignarlos a ayer;
   - `select public.publicar_dia(ayer)` → devuelve 4; ayer queda vigente con 4 alertas.
3. Probar el job real: `cron.schedule` con `* * * * *`, esperar uno o dos minutos y revisar
   `cron.job_run_details` (`succeeded`). Hoy queda vigente con 6 alertas y el widget copiado de ayer; ayer queda
   con `vigente = false` y conserva `publicado_en`.
4. Devolver el job a `0 5 * * *` y comprobar que en `cron.job` hay una sola fila.
5. Limpiar los datos de prueba:

   ```sql
   delete from public.calendario_dias
   where fecha in ((now() at time zone 'America/Bogota')::date - 1,
                   (now() at time zone 'America/Bogota')::date);
   delete from public.contenidos where nombre like '[PRUEBA T-043]%';
   delete from cron.job_run_details;
   ```

   Borrar los días también borra sus contenidos asignados y sus alertas (`on delete cascade`).
