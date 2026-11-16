# Publicación diaria de los oficios asignados · T-058

Al publicar el día, se activan los oficios asignados en el calendario (no hay rotación automática) y, si falta el
oficio de la semana, se registra una alerta.
Historia: HU-56 · Tarea de fase: F4-14 · Issue: #58.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `supabase/migrations/20261112015000_publicar_oficios.sql` | `publicar_dia()` con la alerta del oficio de la semana. |
| `supabase/tests/database/publicacion_oficios.test.sql` | 12 pruebas pgTAP. |
| `supabase/tests/database/publicacion_diaria.test.sql` | Conteos de alertas ajustados (7 posibles por día). |

## Cómo se activan los oficios

- Los oficios se guardan por fecha en `asignaciones_oficios` (T-057).
- `publicar_dia()` (pg_cron, 12:00 a. m. de Bogotá, T-043) marca el día como `vigente`.
- La política RLS solo deja a los usuarios leer las asignaciones del día vigente, y la app las lee con
  `obtenerAsignacionesDeHoy()` (T-046). Así quedan activos:
  - la variante del oficio de la semana asignada (el sábado, la Hora de María elegida);
  - la del mes, solo si se asignó;
  - las consagraciones marcadas, con su Día 1–30.
- El día anterior deja de verse al dejar de ser vigente.

## Alertas (`alertas_publicacion`)

- Cinco oraciones variables e imagen del widget (T-043).
- **Nuevo:** el oficio de la semana del día si no está asignado. Una Hora de María cuya fecha no es ese sábado cuenta
  como faltante.
- El mes y las consagraciones no generan alerta (se pueden dejar «Sin asignar»).
- `publicar_dia()` devuelve cuántas secciones faltaron (hasta 7). Publicar dos veces no duplica alertas.
- Sin oficio, la app muestra «El oficio de hoy todavía no está disponible» (sección vacía).

## Pruebas

`npx supabase test db`: 15 archivos, 222 pruebas.
