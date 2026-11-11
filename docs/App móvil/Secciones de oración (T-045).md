# Secciones de oración · T-045

Pestaña **Oración** con la racha y las tres secciones, y tarjetas destacadas del **Inicio** que abren directamente su
sección.
Historia: HU-14 · Caso de uso: CU-10 (flujo principal pasos 1–3 y A4) · Tarea de fase: F2-07 · Issue: #45.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `esc-mobile-app/src/app/(tabs)/oracion.tsx` | Pestaña Oración: racha, saludo y tarjetas de las tres secciones. |
| `esc-mobile-app/src/app/seccion/[clave].tsx` | Pantalla de cada sección (`dia`, `semana`, `mes`). |
| `esc-mobile-app/src/app/_layout.tsx` | Registra `seccion/[clave]` entre las rutas con sesión. |
| `esc-mobile-app/src/lib/secciones-oracion.ts` | Día de hoy en Bogotá, oficio del día, títulos, descripciones y navegación. |
| `esc-mobile-app/src/components/racha-oracion.tsx` | Línea de la racha con la llama. |
| `esc-mobile-app/src/components/seccion-oracion-card.tsx` | Tarjeta de sección (amarilla, roja o azul). |
| `esc-mobile-app/src/components/destacados-inicio.tsx` | Carrusel «Oficios de hoy» del Inicio. |
| `esc-mobile-app/src/components/feed-encabezado.tsx` | Muestra el carrusel arriba de la oración en vivo y del feed. |

No hay migraciones ni dependencias nuevas.

## Comportamiento

- **Racha:** usa `obtenerRacha` del perfil (T-017), que lee `dias_oracion`. Con días: «**N días** cerca de Él, ¡la
  constancia es una gran virtud!». Con 0: «Aún no tienes días de oración…». Si falla la consulta no se muestra la línea
  y la tarjeta de Santifica el día muestra un texto general. Se recarga al entrar a la pestaña y al deslizar hacia
  abajo.
- **Secciones:**

  | Sección | Color e ícono | Título | Descripción |
  | --- | --- | --- | --- |
  | `dia` | Amarilla, sol | Santifica el día | Estado de la racha |
  | `semana` | Roja, corazón | Santifica tu [día] | Oficio del día |
  | `mes` | Azul, luna | Santifica tu mes | Primer jueves, viernes y sábado |

- **Día de hoy:** se calcula en hora de Bogotá (`fechaHoyBogota`), no con la zona del teléfono. Los oficios por día
  son los del catálogo `oraciones` (lunes Almas del purgatorio … domingo 7 Dolores y Gozos de San José).
- **Navegación:** cada tarjeta abre `/seccion/dia|semana|mes`. Una clave desconocida muestra «No encontramos esta
  sección».
- **Inicio (CU-10 A4):** carrusel con «Santifica tu día» y «Santifica tu [día]»; se desliza por páginas, los puntos
  cambian de tarjeta y cada tarjeta abre su sección.

## Decisiones

- Saludo neutro: «¡Hola, [primer nombre]!» y «¿Quieres acercarte más a Dios?», en lugar de «¡Bienvenida María!» y
  «¿Lista…?» del prototipo, porque no se conoce el género del usuario.
- El carrusel del Inicio no usa las fotos de ejemplo del prototipo: fondos de la paleta (carbón y azul `#315F7E`).
- No se incluye la tarjeta «Apoya a la Comunidad» porque la tienda aún no existe.

## Pendiente fuera de esta tarea

- **T-046:** la lista de oraciones de cada sección (hoy muestra «Pronto verás aquí las oraciones»).
- **T-098 / T-099:** cálculo de la racha en la base y mejor racha.
- Tarjeta «Apoya a la Comunidad» del Inicio cuando exista la tienda.

## Cómo probar

1. En `esc-mobile-app`: `npm ci` si cambiaron dependencias, y `npx expo start --go` → `a` (emulador Android con Expo
   Go). El *development build* anterior al SDK 58 ya no sirve.
2. Pestaña **Oración:** racha, saludo, «Santifica tu [día de hoy]» con su oficio, y cada tarjeta abre su sección.
3. **Inicio:** el carrusel desliza, los puntos cambian de tarjeta y cada tarjeta abre su sección.
4. `npx tsc --noEmit` (después de arrancar Expo, que genera los tipos de las rutas) y `npm run lint`.
5. iOS: igual con Expo Go en un iPhone.
