# Oración en vivo · Portal (T-031)

Formulario del portal para publicar la oración en vivo del día con su enlace de Google Meet.
Historia: HU-36 · Caso de uso: CU-20 · Issue: #31.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `portal-admin/src/lib/oracion-en-vivo.ts` | Lee los oficios y las oraciones en vivo, valida el formulario y guarda (crea o edita). |
| `portal-admin/src/App.tsx` (`LivePrayer`) | Pantalla con la semana, el formulario y el aviso de día repetido. |

No hay migraciones nuevas: la tabla `oraciones_en_vivo` (fecha única, `check` del enlace de Meet) viene de
T-007 y la política «administrar» de T-008.

## Comportamiento

- La pantalla abre en la semana actual y en el día de hoy, calculados con la hora de Bogotá (UTC−5).
- **Título precargado:** se llena con el oficio del día de la semana desde `oraciones` (sección `semana`,
  columna `dia_semana`); por ejemplo, viernes → «Viacrucis». El administrador puede cambiarlo; si lo
  cambia, ya no se reemplaza al cambiar la fecha.
- **Una oración por día:** si el día elegido ya tiene oración, el formulario abre en modo edición. Si se
  cambia la fecha a un día que ya tiene otra, aparece un aviso con «Editar esa oración» y no se puede
  guardar. La restricción `unique` de la base es la última barrera (error `23505`).
- **Validaciones:**
  - Enlace: solo `meet.google.com` con un código `abc-defg-hij`. Acepta el enlace sin `https://`, con
    mayúsculas o con parámetros (`?authuser=0`) y lo guarda limpio: `https://meet.google.com/abc-defg-hij`.
  - Fecha: hoy o futura. El selector no deja elegir días pasados y la validación rechaza los escritos a mano.
  - Título obligatorio, máximo 120 caracteres. Hora obligatoria (19:45 por defecto).
- **Días pasados:** se muestran en solo lectura.
- La lista de asistentes muestra «Disponible pronto»; se conecta en HU-37.

## Cómo probar en local

1. `npx supabase start` y crear `portal-admin/.env.development.local` con la URL y la clave publicable
   locales (`npx supabase status -o env`). Vite lo carga por encima de `.env.local` solo en `npm run dev`.
2. Crear un administrador local (registro por `/auth/v1/signup` y `rol = 'administrador'` desde `psql`).
3. `cd portal-admin && npm run dev`, entrar a **Oración en vivo** y probar: crear, enlace inválido, día
   repetido, editar, día pasado y fecha pasada escrita a mano.
4. En la app (emulador Android con `EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:54321` y `npx expo start -c`),
   la oración de hoy aparece destacada en el feed (T-025).
