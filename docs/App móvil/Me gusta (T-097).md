# «Me gusta» en las publicaciones · T-097

Dar y quitar «Me gusta» a las publicaciones desde el feed y el detalle.
Historia: HU-64 · Caso de uso: CU-07 · Tarea de fase: F2-15 · Issue: #97.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `supabase/migrations/20261112021500_me_gusta_propio.sql` | `total_me_gusta()`, columna `me_gusta_propio` en la vista y lectura solo de los propios. |
| `supabase/tests/database/me_gusta.test.sql` | 12 pruebas pgTAP. |
| `supabase/tests/database/politicas_rls.test.sql` | Ajustada a la nueva política de lectura. |
| `esc-mobile-app/src/lib/me-gusta.ts` | Estado compartido, dar y quitar, reversión y aviso. |
| `esc-mobile-app/src/lib/feed.ts` | Lee `me_gusta_propio` y registra el estado que trae la base. |
| `esc-mobile-app/src/components/publicacion-card.tsx` | El corazón es un botón (feed y detalle). |

## Base de datos

- `me_gusta` (T-007): llave primaria `(publicacion_id, usuario_id)` → un «Me gusta» por usuario y publicación.
- RLS: crear y borrar solo los propios; un usuario bloqueado no puede crear. **Nuevo:** cada usuario solo lee sus
  propias filas, así nadie ve quién dio «Me gusta» (HU-64).
- `publicaciones_con_conteos`: `total_me_gusta` se cuenta con `total_me_gusta()` (`security definer`, solo devuelve el
  número) y la columna nueva `me_gusta_propio` indica si el usuario actual ya dio «Me gusta». El portal sigue viendo
  solo el número.

## App

- Tocar el corazón cambia la marca y el contador al instante (optimista) y luego registra en la base: `upsert` con
  `ignoreDuplicates` para dar, `delete` de la fila propia para quitar.
- Si falla, vuelve al estado anterior y muestra un aviso: sin conexión, cuenta sin permiso (bloqueada), sin sesión u
  otro error.
- Mientras una operación está en curso, los toques repetidos sobre esa publicación se ignoran.
- El estado se comparte entre el feed y el detalle (`useSyncExternalStore`) y se actualiza con lo que trae la base al
  cargar o refrescar.
- Tocar el corazón no abre la publicación. Los comentarios no tienen «Me gusta».

## Pruebas

- `npx supabase test db`: 16 archivos, 235 pruebas.
- Android (development build, Supabase local): dar y quitar en el feed; sincronización feed ↔ detalle; refrescar
  conserva la marca; modo avión revierte y muestra el aviso; sin corazón en comentarios; una fila por usuario.
- iOS: pendiente (no requiere nada nativo; se puede probar con Expo Go).
