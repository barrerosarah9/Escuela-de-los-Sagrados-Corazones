# Cálculo de la racha de oración · T-098

Registro de los días de oración y cálculo de la racha actual y la mejor racha de cada usuario.
Historia: HU-65 · Caso de uso: CU-35 · Tarea de fase: F4-16 · Issue: #98.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `supabase/migrations/20261112030000_racha_oracion.sql` | `registrar_dia_oracion(fecha)` y `racha_oracion()`. |
| `supabase/tests/database/racha_oracion.test.sql` | 15 pruebas pgTAP. |
| `esc-mobile-app/src/lib/racha.ts` | Cola de días pendientes, envío, reintentos y lectura de la racha. |
| `esc-mobile-app/src/lib/perfil.ts` | `obtenerRacha` usa la base. |
| `esc-mobile-app/src/app/detalle-oracion.tsx` | Abrir una oración de Santifica el día registra el día. |

## Base de datos

- Tabla `dias_oracion` (T-007): un registro por usuario y fecha (llave primaria).
- `registrar_dia_oracion(fecha)` (`security definer`): usa siempre `auth.uid()`; rechaza usuarios bloqueados o sin
  sesión (`42501`); acepta solo hoy o ayer en hora de Colombia (`22023` si no); no duplica (devuelve `false`).
- `racha_oracion()`: devuelve `actual` y `mejor`.
  - Agrupa los días seguidos («islas»: fecha menos su número de fila).
  - **Actual:** la racha cuyo último día es hoy o ayer; tras un día completo sin oración (corte a medianoche de
    Colombia) es 0.
  - **Mejor:** la racha más larga de la historia; se conserva cuando la actual vuelve a 0.

## App

- Abrir cualquiera de las 8 oraciones de Santifica el día (por su clave, aunque no cargue por falta de red) agrega el
  día de hoy a una cola guardada en el teléfono (`localStorage`).
- La cola se envía al momento; si no hay red, cada 30 s mientras la app está abierta y cada vez que vuelve a primer
  plano. Los días de hace más de un día se descartan.
- Una marca por usuario evita volver a llamar a la base el mismo día.
- La pestaña Oración y el Perfil leen la racha actual de la base; `obtenerResumenRacha` también trae la mejor racha
  (se mostrará en T-099).
- Los oficios de la semana, del mes y la Hora de María no cuentan para la racha.

## Pruebas

- `npx supabase test db`: 17 archivos, 250 pruebas.
- Android (development build, Supabase local): primera oración del día → 1; otras oraciones no suman; con ayer → 2
  (Oración y Perfil); sin conexión el día queda pendiente y se registra al recuperar la red.
