# Políticas de acceso · Escuela de los Sagrados Corazones

Políticas RLS de la base de datos (T-008). Se crean en la migración `supabase/migrations/<fecha>_politicas_rls.sql`
y se prueban en `supabase/tests/database/politicas_rls.test.sql`. Este documento se actualiza en el mismo PR
que cambie una política.

## Roles

| Rol | Cómo se identifica |
| --- | --- |
| Sin sesión (`anon`) | No lee ni escribe nada. |
| Usuario | Sesión iniciada (`authenticated`) y `perfiles.rol = 'usuario'`. |
| Administrador | Sesión iniciada y `perfiles.rol = 'administrador'`, sin bloqueo. |
| Clave de servicio | Edge Functions y webhook de Wompi. Ignora RLS. Nunca se usa en la app ni en el portal. |

Funciones auxiliares: `es_admin()` y `usuario_activo()` (no bloqueado).

El rol administrador **no** se asigna desde la app ni desde una migración. Se asigna a mano en el SQL Editor
de Supabase:

```sql
update public.perfiles set rol = 'administrador' where correo = '<correo>';
```

## Permisos por tabla

| Tabla | Usuario | Administrador |
| --- | --- | --- |
| `perfiles` | Lee y edita solo el suyo (no `rol`, `bloqueado`, `correo`) | Lee y edita todos; cambia `rol` y `bloqueado` de otros, no los suyos |
| `perfiles_publicos` (vista) | Lee `id`, `nombre` y `foto_path` de todos; nombre y foto en `null` si `perfil_visible = false` | Igual |
| `publicaciones` | Lee | Lee y escribe |
| `comentarios` | Lee; crea los suyos; borra los suyos | Lee; borra cualquiera |
| `me_gusta` | Lee (para conteos); crea y borra solo los suyos | Lee |
| `oraciones_en_vivo` | Lee | Lee y escribe |
| `asistencias` | Ve, confirma y cancela solo las suyas | Ve todas |
| `oraciones` (catálogo) | Lee | Lee (el catálogo solo cambia con migraciones) |
| `contenidos` | Lee | Lee y escribe |
| `calendario_dias`, `calendario_contenidos`, `asignaciones_oficios` | Lee solo días publicados (`publicado_en` no nulo) | Lee y escribe todo |
| `dias_oracion` | Ve los suyos; registra solo el día de hoy (hora de Bogotá) | Ve todos |
| `eventos` | Registra los suyos solo si `analitica_uso = true`; no lee | Lee |
| `tokens_dispositivo` | Lee y escribe solo los suyos | — |
| `donaciones_mensuales` | Ve las suyas | Ve todas |
| `tipos_articulo` | Lee | Lee y escribe |
| `articulos` | Lee los visibles | Lee y escribe todos |
| `pedidos` | Ve los suyos | Ve todos; solo cambia `estado` a `enviado` o `entregado` |
| `pedido_items` | Ve los de sus pedidos | Ve todos |
| `transacciones` | Ve las suyas | Ve todas |

Un usuario bloqueado sigue leyendo, pero no comenta, no da «Me gusta», no confirma asistencia ni suma días
a su racha.

## Lo que se escribe solo con la clave de servicio

Donaciones mensuales, pedidos, ítems de pedido y transacciones se crean y actualizan desde Edge Functions
(cálculo de precios, cobros y webhook de Wompi). Así el usuario no puede alterar montos ni estados de pago.
El borrado de cuenta (CU-06) también va por Edge Function.

## Vistas

- `publicaciones_con_conteos` usa `security_invoker = true`: respeta las políticas de quien consulta.
- `perfiles_publicos` se ejecuta con los permisos de su dueño para mostrar nombre y foto de otros usuarios
  sin exponer correo ni teléfono. Solo admite `select`. El asesor de seguridad de Supabase la marca como
  *Security Definer View*; es intencional.

## Cómo probar

```bash
# Base local (requiere Docker)
npx supabase db reset
npx supabase test db

# Proyecto remoto (la prueba hace rollback, no deja datos)
npx supabase test db --linked
```

Las pruebas crean tres cuentas de prueba (usuario A, usuario B y administrador) dentro de una transacción
que se revierte al final.
