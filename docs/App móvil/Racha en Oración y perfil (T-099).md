# Racha en la pestaña Oración y en el perfil (T-099)

HU-65 · Sprint 3 · F2-16

## Qué se muestra

| Pantalla | Con racha | Sin días de oración |
| --- | --- | --- |
| Oración (línea con la llama) | «N días cerca de Él, ¡la constancia es una gran virtud!» | «0 días de oración. Abre una oración de Santifica el día para empezar tu racha.» |
| Perfil (tarjeta Racha de oración) | «N días seguidos» y debajo «Mejor racha: M días» | «0 días · Empieza hoy tu racha» y debajo «Abre una oración de Santifica el día para empezar.» |

- La mejor racha solo se muestra en el perfil.
- Si no hay conexión, el perfil muestra «No disponible por ahora».
- Las dos pantallas recargan la racha cada vez que se enfocan (`useFocusEffect`), y el perfil también al deslizar hacia abajo.

## De dónde salen los datos

- `obtenerResumenRacha(usuarioId)` en `src/lib/racha.ts` llama a la función `racha_oracion()` (T-098) y devuelve `{ actual, mejor }`.
- La pestaña Oración usa `obtenerRacha`, que devuelve solo `actual` desde la misma función.
- Los días se registran al abrir una oración de Santifica el día (T-098), con cola local si no hay conexión.

## Archivos

- `esc-mobile-app/src/app/(tabs)/perfil.tsx`
- `esc-mobile-app/src/components/racha-oracion.tsx`

## Cómo probar

1. En Studio, borrar los días del usuario de prueba en `public.dias_oracion` y entrar a Oración y Perfil sin abrir oraciones: se ve el estado en 0 con la invitación.
2. Insertar ayer y anteayer más 5 días seguidos de hace tres semanas: Oración muestra 2 días y Perfil «2 días seguidos» con «Mejor racha: 5 días».
