# Confirmar y cancelar asistencia (T-026)

HU-12 · CU-09 · F2-06 · Sprint 2

En la tarjeta de la oración en vivo (T-025) el usuario confirma su asistencia y puede cancelarla. La
confirmación se guarda en la base, así que se mantiene al reabrir la app o al entrar desde otro
dispositivo, y el administrador la ve en la lista de asistentes.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `src/lib/asistencia.ts` | Consultar, confirmar y cancelar la asistencia del usuario a una oración |
| `src/lib/use-oracion-en-vivo.ts` | Carga la asistencia junto con la oración; cambio inmediato, reversión si falla y aviso antes de cancelar |
| `src/components/oracion-en-vivo-card.tsx` | Botón de asistencia y botón «Unirse», con protagonismo según el estado |
| `src/app/(tabs)/index.tsx` | Pasa a la tarjeta el estado de la asistencia y la acción para cambiarlo |

No hay migraciones: la tabla `asistencias` es de T-007 y sus políticas de T-008 (cada usuario
confirma y cancela solo la suya; el administrador lee todas; una cuenta bloqueada no puede
confirmar, pero sí cancelar).

## Datos

- Confirmar inserta `(oracion_en_vivo_id, usuario_id)`. La llave primaria es esa pareja; si ya
  existía (`23505`, por un doble toque u otro dispositivo) se toma como éxito.
- Cancelar borra esa fila. Si no existía, también es éxito.
- La consulta del estado filtra siempre por el `usuario_id` de la sesión: un administrador puede
  leer las asistencias de todos y, sin ese filtro, aparecería confirmado por la confirmación de otra
  persona.
- El estado se pide cada vez que se carga la oración (al abrir, deslizar hacia abajo, volver a la
  app o cambiar el día). Si solo esa consulta falla, se conserva lo que se mostraba.

## Comportamiento

| Acción | Qué pasa |
| --- | --- |
| Tocar «Confirmar asistencia» | Cambia al instante a «✓ Confirmado» y se guarda |
| Tocar «Confirmado» | Aviso «¿Cancelar tu asistencia?» con «Volver» y «Cancelar asistencia» |
| Falla al guardar | Vuelve al estado anterior y muestra un aviso: sin conexión, cuenta bloqueada, oración borrada (recarga y la tarjeta desaparece) u otro error |
| Doble toque | El botón queda bloqueado mientras guarda |

## Diseño por estado

| Estado de la oración | Arriba | Abajo |
| --- | --- | --- |
| Próxima | Píldora blanca «Confirmar asistencia» / «✓ Confirmado» | «Unirse a la oración» gris (deshabilitado) y aviso de la hora |
| En curso | «EN CURSO» y píldora roja «Unirse a la oración» | «⊕ Confirmar asistencia» / «✓ Confirmado» como texto |
| Terminada | — | «Unirse a la oración» gris; la asistencia no se muestra |

En curso se invierte el protagonismo para que lo más visible sea entrar a la reunión. Confirmar
funciona en próxima y en curso, como dice CU-09 («funciona a cualquier hora»); se oculta cuando la
oración ya terminó. Se cambió el lugar del botón frente al prototipo (estaba a la derecha de
«Unirse»).

## Lista del administrador

La pantalla con la lista de asistentes en el portal es T-032 (HU-37). Mientras tanto se consulta así:

```sql
select p.nombre, p.correo, a.creado_en
from public.asistencias a
join public.perfiles p on p.id = a.usuario_id
where a.oracion_en_vivo_id = <id de la oración>
order by a.creado_en;
```

## Pruebas (6 nov 2026)

iOS (iPhone, development build) y Android (emulador Pixel, development build) contra el Supabase
remoto, con la oración de prueba en estado próxima y en curso:

- Confirmar, cancelar con el aviso y «Volver» sin cambios.
- Cerrar la app del todo y abrirla: el estado se mantiene.
- Confirmar en el iPhone y recargar en el emulador con la misma cuenta: se ve confirmado; cancelar en
  el emulador y recargar en el iPhone: se ve sin confirmar.
- Modo avión al confirmar: vuelve a «Confirmar asistencia» con el aviso de conexión.
- Dos cuentas (administradora y `pruebaportal.esc@gmail.com`): cada una ve solo su estado y la
  consulta del administrador devuelve las dos.

## Datos de prueba

Las asistencias de prueba son de la oración con el enlace falso de T-025 y se borran en cascada con
ella:

```sql
delete from public.oraciones_en_vivo
where enlace_meet = 'https://meet.google.com/abc-defg-hij';
```
