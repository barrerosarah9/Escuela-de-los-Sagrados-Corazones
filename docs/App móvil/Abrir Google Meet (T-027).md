# Abrir Google Meet desde la app (T-027)

HU-13 · CU-09 · F2-06 · Sprint 2

«Unirse a la oración» abre la reunión en la app de Google Meet si está instalada y, si no, en el
navegador. Funciona aunque el usuario no haya confirmado asistencia.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `src/lib/abrir-meet.ts` | Extrae el código del enlace y abre Meet según la plataforma |
| `src/lib/use-oracion-en-vivo.ts` | `unirse` revisa el horario al tocar y llama a `abrirMeet` |
| `src/components/oracion-en-vivo-card.tsx` | Aviso «El enlace estará disponible próximamente, a partir de las…» |

No hay migraciones, dependencias nuevas ni cambios nativos: no requiere `db push` ni compilar otra vez
el development build.

## Cómo se abre la reunión

| Plataforma | Con la app de Meet | Sin la app de Meet |
| --- | --- | --- |
| iOS | `gmeet://<código>` abre la app en la sala | `openURL` falla y se abre el enlace `https://` en Safari |
| Android | El enlace `https://meet.google.com/…` lo recibe la app de Meet (enlaces verificados) | Se abre en el navegador; la página de Meet redirige a Play Store para instalar la app |

- El código se toma del enlace guardado (`https://meet.google.com/<código>`, mismo formato que el
  `check` de `oraciones_en_vivo.enlace_meet`). Si el enlace no coincide, se abre el `https://`.
- En iOS no se usa `canOpenURL`: exigiría declarar `gmeet` en `LSApplicationQueriesSchemes` y
  compilar otra vez. `openURL` sin esa declaración funciona y su error indica que no hay app.
- Si no se puede abrir nada, aparece «No se pudo abrir la reunión».
- `unirse` no revisa la asistencia confirmada.

**Limitación de Android:** Google Meet no permite unirse desde el navegador del celular en Android y
pide instalar la app. Desde la app no se puede cambiar. En iOS sí se puede entrar desde Safari.
Pendiente comentarlo con el cliente para ajustar el criterio de HU-13.

## Horario del enlace

El enlace se habilita desde la hora publicada y durante 1 h 45 min (7:45 a 9:30 p. m. con la hora
habitual), calculado con la hora de Bogotá (T-025).

| Estado | «Unirse a la oración» | Aviso | «Confirmar asistencia» |
| --- | --- | --- | --- |
| Próxima | Deshabilitado | «El enlace estará disponible próximamente, a partir de las 7:45 p. m.» | Disponible |
| En curso | Habilitado, con punto rojo titilante y «EN CURSO» encima | — | Disponible |
| Terminada | Deshabilitado | — (mensaje de cierre de T-025) | No aparece |

El reloj de la tarjeta se actualiza cada 30 s. Al tocar «Unirse», el estado se vuelve a calcular con la
hora exacta: si la reunión ya terminó, no se abre y la tarjeta pasa a «Terminada».

## Pruebas (6 nov 2026)

iPhone (Expo Go) y emulador Pixel contra el Supabase remoto, con una reunión real de Meet y la fila de
prueba movida desde el SQL Editor, sin confirmar asistencia:

- iOS con Meet: se abre la app en la sala. iOS sin Meet: se abre Safari en la reunión.
- Android con Meet: se abre la app en la sala. Android sin Meet: navegador y redirección a Play Store.
- Próxima: botón deshabilitado, aviso nuevo y «Confirmar asistencia» confirma y cancela.
- Terminada: botón deshabilitado, sin aviso y mensaje de cierre.

## Datos de prueba

```sql
delete from public.oraciones_en_vivo
where titulo = 'Prueba T-027';
```
