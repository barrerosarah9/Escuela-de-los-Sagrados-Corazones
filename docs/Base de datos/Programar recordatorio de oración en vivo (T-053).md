# Programar recordatorio de oración en vivo · T-053

Historia: HU-19 · Recibir el recordatorio de la oración en vivo. Rama `feature/push-notifications`.

Al publicar una oración en vivo desde el portal (T-031) se programa su recordatorio push 15 minutos antes
de la hora. Si cambian la fecha o la hora se reprograma, y si se elimina la oración se anula. El envío lo
hace la cola de T-051 con el mensaje de T-052.

## Criterios de HU-19

- Dado que hay una oración en vivo publicada hoy, cuando se acerca su hora, entonces recibo el recordatorio.
- Dado que no hay oración en vivo hoy, cuando pasa el día, entonces no recibo ningún recordatorio.

La historia no fija cuánto antes: se eligieron 15 minutos. El recordatorio va a **todos** los usuarios,
no solo a quienes confirmaron asistencia (corrección sobre T-052).

## Reglas

| Caso | Resultado |
| --- | --- |
| Se crea la oración | Se encola `recordatorio_oracion` con `enviar_desde` = inicio − 15 min (hora de Bogotá). |
| Faltan menos de 15 minutos | `enviar_desde` = ahora: sale en el siguiente minuto. |
| La hora ya pasó | No se programa nada. |
| Cambia la fecha o la hora | Se mueve `enviar_desde`; si ya se había enviado, se reactiva (`enviado_en`, `tomado_en`, `intentos` y `envio_id` a cero) y llega otro con la hora nueva. |
| Cambia solo el título o el enlace | No se toca el recordatorio (el título se calcula al enviar). |
| Se elimina la oración | El recordatorio se borra en cascada (llave foránea de T-052). |
| No hay oración en vivo | No existe recordatorio. |

## Base de datos

Migración `20261110052500_programar_recordatorio_oracion.sql`:

- Función `programar_recordatorio_oracion()` (security definer) con `insert … on conflict do update`
  sobre el índice único de T-052.
- Triggers `oraciones_en_vivo_programar_recordatorio` (`after insert`) y
  `oraciones_en_vivo_reprogramar_recordatorio` (`after update of fecha, hora`, solo si alguna cambió).
- Al aplicarse, crea el recordatorio de las oraciones en vivo futuras ya publicadas.

Para cambiar los 15 minutos se crea una migración nueva que reemplace la función y ajuste los
recordatorios pendientes.

## Edge Function

`procesar-avisos` envía el recordatorio a todos los tokens de usuarios no bloqueados (antes filtraba por
`asistencias`).

## Pruebas

- pgTAP: `supabase/tests/database/avisos_programar_recordatorio.test.sql` (9 pruebas; 185 en total). La
  prueba de T-052 se ajustó porque el recordatorio ahora lo crea el trigger.
- Prueba en local (10 nov 2026, emulador Pixel 10 Pro XL API 37, cuenta sin asistencia confirmada):
  1. Oración creada 16 minutos adelante → el recordatorio se programó solo y llegó «Oración a los Santos
     Ángeles · La oración en vivo es hoy a las 12:54 a. m.».
  2. Hora cambiada a 17 minutos adelante → llegó otro con «12:57 a. m.».
  3. Oración eliminada → 0 recordatorios en la cola.

## Producción

1. `npx supabase functions deploy procesar-avisos`.
2. `npx supabase db push --remote --dry-run` y luego `npx supabase db push --remote`.
3. Sin secretos nuevos.
