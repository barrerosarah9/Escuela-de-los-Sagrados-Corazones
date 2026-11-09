# Recepción de push y registro del token · T-050

La app pide permiso de notificaciones, registra el token de FCM del teléfono y muestra los avisos que envía
`enviar-push` (T-049).
Historia: HU-18 · Caso de uso: CU-11 (A2) · Tarea de fase: F2-08 · Issue: #50.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `supabase/migrations/20261109040000_registrar_token_dispositivo.sql` | Función `registrar_token_dispositivo(token, plataforma)`. |
| `supabase/tests/database/tokens_dispositivo.test.sql` | 8 pruebas pgTAP de la función. |
| `esc-mobile-app/src/lib/notificaciones.ts` | Permiso, canal de Android, token, registro y borrado del token. |
| `esc-mobile-app/src/app/_layout.tsx` | Activa las notificaciones cuando hay sesión. |
| `esc-mobile-app/src/lib/cerrar-sesion.ts` | Borra el token del teléfono antes de cerrar sesión. |
| `esc-mobile-app/app.json` | `android.googleServicesFile` y plugin `expo-notifications` (ícono, color `#A11E21`, canal `general`). |
| `esc-mobile-app/.gitignore` | Ignora `google-services.json` y `GoogleService-Info.plist`. |
| `esc-mobile-app/package.json` | Agrega `expo-notifications` (`npx expo install`). |

## Comportamiento

- **Permiso:** se pide una sola vez, la primera vez que hay sesión. Si el usuario lo niega no se vuelve a pedir
  (queda marcado en `localStorage`); si después lo activa en los ajustes del teléfono, en la siguiente apertura se
  registra el token (CU-11 A2).
- **Token:** se pide el token nativo de FCM (`getDevicePushTokenAsync`, no el de Expo, porque T-049 envía directo a
  FCM) y se guarda con `registrar_token_dispositivo`. Se vuelve a guardar al iniciar sesión, al abrir la app con
  sesión guardada y si FCM lo cambia (`addPushTokenListener`).
- **Varias cuentas en un teléfono:** la función reasigna el token al usuario de la sesión (el token es único y RLS no
  deja tocar filas de otro usuario).
- **Cerrar sesión:** borra el token del teléfono mientras la sesión sigue activa; si falla (sin internet) la sesión se
  cierra igual y la próxima cuenta que entre se queda con el token.
- **Avisos:** con la app abierta se muestran como banner (`setNotificationHandler`); en segundo plano o cerrada los
  muestra Android. Canal `general` («Avisos de la Escuela», importancia alta), que también es el canal por defecto de
  FCM.
- **Expo Go y web:** no se hace nada. Expo Go no recibe push remoto en Android desde SDK 53 y en iOS su token no sirve
  para nuestro FCM.
- Abrir la pantalla al tocar el aviso (`data.pantalla`) es T-054 (HU-20).

## `google-services.json`

No está en el repo (el repo es público y GitHub marca su API key como filtrada). Cada desarrollador lo descarga de
Firebase → Configuración del proyecto → General → Tus apps → Escuela SSCC Android y lo pone en
`esc-mobile-app/google-services.json`. Para los builds de EAS (tiendas) habrá que subirlo como variable de entorno de
tipo archivo.

## Development build en Windows

Push no funciona en Expo Go, así que se prueba con `npx expo prebuild --platform android` y `npx expo run:android`.
En Windows hay que preparar el equipo una vez, porque el C++ de Reanimated/Worklets pasa el límite de 260 caracteres:

1. Rutas largas, en PowerShell como administrador y luego reiniciar:
   `New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force`
2. CMake 3.31.6 en Android Studio → SDK Manager → SDK Tools (trae Ninja 1.12, que soporta rutas largas).
3. `android.cmakeVersion=3.31.6` en `%USERPROFILE%\.gradle\gradle.properties` (solo en el equipo, no en el repo).

Si `android/` viene de un SDK anterior (por ejemplo, Gradle 9.3.1 cuando SDK 58 pide 9.4.1), regenerarla con
`npx expo prebuild --clean --platform android`. No usar `subst`: Node y Gradle ven rutas distintas y falla el codegen.

## Pruebas (emulador Pixel con Google Play, Supabase local)

1. `npx supabase test db`: 10 archivos, 149 pruebas.
2. Al iniciar sesión aparece el permiso; tras aceptarlo hay una fila en `tokens_dispositivo` con `plataforma = android`.
3. Con `npx supabase functions serve enviar-push --env-file supabase/.env` y un `curl` con la clave secreta local
   (ver T-049), el aviso llega con la app abierta, en segundo plano y cerrada (desde Recientes, no con «Forzar
   detención»).
4. Al cerrar sesión la fila desaparece; al volver a entrar se crea de nuevo sin pedir el permiso.
5. Limpiar: `delete from public.envios_push where titulo like '[PRUEBA T-050]%';`

**iOS:** pendiente. Sin cuenta de Apple Developer no hay APNs; en Expo Go la app sigue funcionando sin avisos.
