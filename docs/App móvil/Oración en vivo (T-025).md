# Oración en vivo destacada (T-025)

HU-11 · CU-09 · F2-06 · Sprint 2

Arriba del feed aparece la oración en vivo del día con el nombre del oficio, la hora y el botón
«Unirse a la oración». Si no hay oración publicada hoy, no aparece nada.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `src/lib/oracion-en-vivo.ts` | Consulta de la oración de hoy, oficio de hoy y de mañana, fecha de Bogotá, formato de hora y estado |
| `src/lib/use-oracion-en-vivo.ts` | Carga, recarga, reloj de 30 s y «Unirse» con `Linking` |
| `src/components/oracion-en-vivo-card.tsx` | Tarjeta según el prototipo «Mobile App - ESC» (`.meeting-card`) |
| `src/components/punto-en-vivo.tsx` | Punto rojo titilante; quieto con «Reducir movimiento» |
| `src/app/(tabs)/index.tsx` | Pasa la tarjeta a `FeedEncabezado` en los estados de carga, error y lista |

No hay migraciones: `oraciones_en_vivo` y su lectura para usuarios con sesión existen desde T-007 y
T-008.

## Cómo se carga

1. «Hoy» es la fecha de Bogotá (UTC−5, sin horario de verano), no la del teléfono, para que coincida
   con la fecha que publica el administrador.
2. En paralelo: la fila de `oraciones_en_vivo` de hoy (`maybeSingle`, `null` si no hay) y los oficios
   de la semana (`oraciones`, sección `semana`) de hoy y de mañana en una sola consulta.
3. El título es el nombre del oficio del día (`dia_semana` ISO: jueves → Hora Santa). Si no se
   encuentra, se usa el `titulo` guardado.
4. Si la consulta falla, la tarjeta no aparece (o se conserva la que había). El feed no se afecta.

Se vuelve a consultar al deslizar hacia abajo en Inicio, al reintentar el feed, al volver a la app
desde segundo plano y al cambiar el día con la app abierta.

## Estados

La reunión dura 1 h 45 min desde la hora publicada (7:45 a 9:30 p. m., como en CU-09). Un reloj
interno recalcula el estado cada 30 s.

| Estado | Píldora | Texto principal | Botón «Unirse a la oración» |
| --- | --- | --- | --- |
| Próxima | Reloj y hora | «Te esperamos para unirnos a orar…» | Deshabilitado, con «El enlace estará disponible a partir de las 7:45 p. m.» |
| En curso | Punto rojo titilante y hora | «Te esperamos para unirnos a orar…» | Habilitado, con «EN CURSO» encima |
| Terminada | Reloj y hora | «La oración de hoy ya terminó. ¡Gracias por acompañarnos! Te esperamos mañana para orar la Hora de María.» | Deshabilitado, sin aviso |
| Sin oración hoy | — | — | La tarjeta no aparece |

El estado «Terminada» no está en el prototipo; se agregó para no mostrar «El enlace estará
disponible…» después de la reunión. El artículo del oficio de mañana sale de
`ARTICULO_POR_OFICIO` según la `clave` del catálogo (el Viacrucis, la Hora Santa, los Lirios de San
José…); un oficio nuevo sin artículo en esa lista se muestra solo con su nombre.

## Fuera de esta tarea

| Tema | Tarea |
| --- | --- |
| Confirmar y cancelar asistencia | T-026 (HU-12) |
| Abrir Meet en la app o el navegador y manejo de errores | T-027 (HU-13); hoy se usa `Linking.openURL` con un aviso si falla |
| Crear la oración en vivo desde el portal | CU-20 |

## Pruebas (6 nov 2026)

iOS (iPhone, development build) y Android (emulador Pixel, development build) contra el Supabase
remoto, moviendo la fila de prueba desde el SQL Editor:

- Próxima (7:45 p. m.): reloj, botón deshabilitado y aviso.
- En curso (hora actual menos 5 min): punto rojo, «EN CURSO», «Unirse» abre
  `meet.google.com/abc-defg-hij`.
- Terminada (hora actual menos 110 min): mensaje de cierre con «la Hora de María» (viernes → sábado).
- Sin oración hoy (fila movida a mañana): la tarjeta no aparece.
- Título «Viacrucis» un viernes, sacado del catálogo.

## Datos de prueba

La fila de prueba usa el enlace falso `https://meet.google.com/abc-defg-hij`. Para borrarla:

```sql
delete from public.oraciones_en_vivo
where enlace_meet = 'https://meet.google.com/abc-defg-hij';
```
