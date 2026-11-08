# Oraciones de cada sección · T-046

Listas de oraciones de **Santifica el día**, **Santifica tu [día]** y **Santifica tu mes**, con solo lo vigente
habilitado, y el detalle de cada oración.
Historia: HU-15 · Caso de uso: CU-10 (pasos 3–6, A1, A2, A3 y A5) · Tarea de fase: F2-07 · Issue: #46.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `esc-mobile-app/src/lib/oraciones-hoy.ts` | Consultas: catálogo, día vigente y sus asignaciones, contenidos; orden y formatos. |
| `esc-mobile-app/src/lib/oraciones-mes.ts` | Primer jueves, viernes y sábado del mes, disponibilidad y fecha siguiente. |
| `esc-mobile-app/src/lib/use-carga.ts` | Hook de carga con error, reintentar y refrescar. |
| `esc-mobile-app/src/components/opcion-oracion.tsx` | Fila de las listas: ícono o número, habilitada con etiqueta o bloqueada con candado. |
| `esc-mobile-app/src/components/lista-carga.tsx` | Esqueleto mientras carga. |
| `esc-mobile-app/src/components/lista-dia.tsx` | Las ocho oraciones de Santifica el día. |
| `esc-mobile-app/src/components/lista-semana.tsx` | Variantes del oficio de hoy. |
| `esc-mobile-app/src/components/lista-mes.tsx` | Primer jueves, viernes y sábado del mes. |
| `esc-mobile-app/src/app/seccion/[clave].tsx` | Muestra la lista de cada sección; el sábado redirige a la Hora de María. |
| `esc-mobile-app/src/app/mes/[dia].tsx` | Variantes de la oración del mes (dos listas el viernes). |
| `esc-mobile-app/src/app/detalle-oracion.tsx` | Detalle de una oración: título, contenido y formatos, o estado vacío. |

Sin migraciones ni dependencias nuevas.

## De dónde sale cada cosa

| Qué | Origen |
| --- | --- |
| Oraciones fijas (Iniciar el día, Divina Cita, Noche) | Sus contenidos en `contenidos` |
| Las cinco variables de hoy | `calendario_contenidos` del día vigente |
| Variante del oficio de la semana, Hora de María y oraciones del mes | `asignaciones_oficios` del día vigente |
| Variantes de cada oficio | `contenidos` de esa oración, ordenados por número |

El día vigente lo marca la publicación diaria (T-043). La app filtra `vigente = true` aunque RLS ya lo limita para los
usuarios, porque un administrador ve todos los días.

## Comportamiento

- **Santifica el día:** ocho filas, todas tocables. El subtítulo dice el formato («Video de oración», «Video y guía de
  oración»…) o «Aún sin contenido para hoy».
- **Santifica tu [día]:** variantes del oficio de hoy (día ISO en hora de Bogotá). La asignada va primero con
  **ESTA SEMANA**; las demás, en gris con candado y «Disponible en su semana correspondiente». Sin asignación: aviso
  «El oficio de hoy todavía no está disponible» y todas bloqueadas.
- **Sábado:** «Santifica tu sábado» abre directamente el detalle de la Hora de María asignada (CU-10 A2).
- **Santifica tu mes:** solo se abre la oración del día si hoy es el primer jueves, viernes o sábado del mes; las demás
  dicen «El siguiente será el jueves 3 de diciembre».
- **Variantes del mes:** la asignada va primero con **ESTE MES**. El primer viernes muestra dos listas: Primeros
  viernes diurnos y Vigilias de reparación.
- **Detalle:** título, nombre del contenido y sus formatos (video, PDF, imagen) con «Disponible pronto». Si no hay
  contenido: «Esta oración estará disponible próximamente» (CU-10 A5).
- Errores de conexión con «Reintentar», como en el feed.

## Pendiente fuera de esta tarea

- **T-047:** reproducir el video de YouTube.
- **T-048:** visor y descarga del PDF.
- **T-058:** activación de los oficios en la publicación diaria.
- Registrar el evento de oración consultada y el día de racha al abrir una oración (CU-33, CU-35).

## Cómo probar en local

1. Crear `esc-mobile-app/.env.development.local` (ignorado por Git) con la URL `http://<IP de tu compu>:54321` y la
   clave publicable local de `npx supabase status`. La IP es la de la línea `exp://…:8081` de Expo; con `10.0.2.2` la
   app no llegó a Supabase en el emulador.
2. `npx expo start --go --clear` → `a`, y entrar con una cuenta de la base local.
3. En Studio local, cargar contenidos y asignaciones `[PRUEBA T-046]` para hoy y para el jueves 3, viernes 4 y
   sábado 5 de diciembre de 2026, y `select public.publicar_dia();`.
4. Probar hoy; luego, para cada fecha de diciembre, `select public.publicar_dia(date '2026-12-0X');`, cambiar la fecha
   del emulador (Ajustes → Sistema → Fecha y hora) y recargar con `r`.
5. Volver a la fecha automática del emulador y limpiar:

   ```sql
   delete from public.calendario_dias
   where fecha in ((now() at time zone 'America/Bogota')::date,
                   date '2026-12-03', date '2026-12-04', date '2026-12-05');
   delete from public.contenidos where nombre like '[PRUEBA T-046]%';
   ```

   Borrar los días también borra sus asignaciones y alertas (`on delete cascade`).
