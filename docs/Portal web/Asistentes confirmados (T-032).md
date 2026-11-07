# Asistentes confirmados · Portal (T-032)

Lista de las personas que confirmaron asistencia a una oración en vivo, en la pantalla **Oración en vivo**
del portal.
Historia: HU-37 · Caso de uso: CU-20 (paso 6) · Issue: #32.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `portal-admin/src/lib/asistencias.ts` | Lee las asistencias de una oración con el perfil de cada usuario y el total exacto. |
| `portal-admin/src/App.tsx` (`AsistentesOracion`, `FilaAsistente`) | Tarjeta «Asistentes confirmados» junto al formulario de T-031. |

No hay migraciones nuevas: la tabla `asistencias` viene de T-007, y la política de T-008 deja que el
administrador lea todas las asistencias y todos los perfiles.

## Comportamiento

- **Total y nombres:** el número grande es el total exacto (`count: 'exact'`). La lista está ordenada por
  nombre (alfabético en español) y muestra iniciales o foto, nombre, correo y fecha y hora de confirmación.
  Si un perfil no tiene nombre, aparece como «Usuario sin nombre».
- El administrador ve el nombre real aunque el usuario tenga `perfil_visible = false`: la lista es para
  preparar la reunión y no se muestra a otros usuarios.
- **Cancelaciones:** en la app, cancelar borra la fila de `asistencias` (T-026). La tarjeta vuelve a
  consultar al pulsar **Actualizar** y, sola, cada vez que el administrador vuelve a la pestaña del portal.
  El subtítulo indica la hora de la última actualización.
- **Estados:** cargando, error con «Reintentar», día sin oración («Sin oración programada») y nadie
  confirmado («Nadie ha confirmado todavía»).
- Las fotos usan URLs firmadas del bucket privado `avatares` (1 hora). Si fallan, se muestran las iniciales.

## Cómo probar en local

1. Supabase local y portal como en T-031 (`npx supabase start`, `cd portal-admin && npm run dev`).
2. Crear usuarios de prueba, una oración para mañana con 3 asistencias y otra para pasado mañana sin
   asistencias. Se corre un SQL con `docker exec -i <contenedor supabase_db_…> psql -U postgres`; los
   usuarios se insertan en `auth.users` con `raw_user_meta_data.nombre` y el trigger crea su perfil.
3. En **Oración en vivo**: mañana muestra 3 personas ordenadas por nombre, pasado mañana muestra el estado
   vacío y un día sin oración muestra «Sin oración programada».
4. Borrar una asistencia desde `psql` (igual que cancelar en la app) y pulsar **Actualizar**: la persona
   desaparece y el total baja. Borrar otra con el portal en otra pestaña y volver: se actualiza sola.
5. Al terminar, borrar los usuarios de prueba de `auth.users` (sus perfiles y asistencias se borran en
   cascada) y la oración de prueba.
