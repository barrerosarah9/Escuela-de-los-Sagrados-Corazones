# Eliminación de cuenta · T-020

HU-07 · CU-06 · F2-03. Requisito de App Store: el usuario puede eliminar su cuenta desde la app.

## Flujo

1. Perfil → Configuración de la cuenta → **Eliminar cuenta**.
2. Alerta que explica qué se elimina y que no se puede deshacer. «Cancelar» la cierra (CU-06 A1).
3. La app llama a la Edge Function `eliminar-cuenta` con el token de la sesión.
4. Si responde bien, se cierra la sesión (Google y Supabase), la app vuelve a Ingreso y muestra
   «Cuenta eliminada». Si falla, se muestra el error y la cuenta sigue activa (CU-06 E1).

Código de la app: `esc-mobile-app/src/lib/eliminar-cuenta.ts` y `esc-mobile-app/src/app/configuracion.tsx`.

## Edge Function `eliminar-cuenta`

Ubicación: `supabase/functions/eliminar-cuenta/index.ts`. Configurada con `verify_jwt = false`
en `supabase/config.toml`: con las llaves nuevas (`sb_publishable_…` / `sb_secret_…`) el usuario
se valida dentro de la función con `auth.getUser(token)`.

Orden de las operaciones:

| # | Operación | Si falla |
| --- | --- | --- |
| 1 | Validar el token del usuario | 401, no se toca nada |
| 2 | Rechazar cuentas con rol `administrador` | 403, no se toca nada |
| 3 | `cancelarDonacionesMensuales` (gancho) | 500, no se toca nada |
| 4 | Borrar `foto_path` y la carpeta `avatares/<id>/` | 500, no se toca nada |
| 5 | `auth.admin.deleteUser` | 500, la cuenta sigue activa sin foto (`foto_path = null`) |

La foto se borra antes que el usuario porque Supabase no permite borrar un usuario que es dueño de
archivos en Storage. El paso 5 borra en cascada (T-007) perfil, comentarios, «Me gusta»,
asistencias, racha, eventos, tokens, donaciones mensuales, pedidos y transacciones. El borrado es
definitivo: con esa cuenta ya no se puede iniciar sesión.

Las cuentas de administrador no se eliminan desde la app porque `publicaciones.autor_id` borra en
cascada todo lo que publicaron. Primero otro administrador debe quitarles el rol.

Respuestas de error (`{"error": "<código>"}`): `metodo_no_permitido`, `sin_sesion`,
`sesion_invalida`, `cuenta_administrador`, `error_donaciones`, `error_eliminacion`.

## Gancho para T-069

`supabase/functions/_shared/donaciones.ts` exporta `cancelarDonacionesMensuales(admin, usuarioId)`.
Hoy no hace nada (las filas se borran por la cascada). En T-069 debe cancelar en Wompi cada
donación mensual activa del usuario. Si lanza un error, la eliminación se detiene antes de borrar
nada.

## Desplegar y probar

```bash
# Supabase local (requiere Docker)
npx supabase functions serve

# Proyecto remoto
npx supabase functions deploy eliminar-cuenta
npx supabase functions list
```

En remoto, revisar en el panel que **Verify JWT** de la función esté apagado.

## Pendiente

- Cuando se active Sign in with Apple, App Store exige revocar los tokens de Apple al eliminar la
  cuenta. Hay que agregarlo a esta función en la issue de Apple.
