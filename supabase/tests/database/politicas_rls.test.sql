begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'usuario.a@prueba.local', '{"nombre": "Usuario A"}'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'usuario.b@prueba.local', '{"nombre": "Usuario B"}'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'admin@prueba.local', '{"nombre": "Administrador"}');

update public.perfiles
set rol = 'administrador'
where id = 'aaaaaaaa-0000-4000-8000-000000000003';

insert into public.publicaciones (autor_id, texto)
values ('aaaaaaaa-0000-4000-8000-000000000003', 'Publicación de prueba T-008');

insert into public.me_gusta (publicacion_id, usuario_id)
select id, 'aaaaaaaa-0000-4000-8000-000000000002'
from public.publicaciones
where texto = 'Publicación de prueba T-008';

insert into public.pedidos (
  usuario_id, contacto_nombre, contacto_correo, contacto_telefono,
  envio_direccion, envio_ciudad, envio_departamento,
  subtotal_centavos, costo_envio_centavos, total_centavos, estado
) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Usuario A', 'usuario.a@prueba.local', '3000000001',
   'Calle 1 # 2-3', 'Bogotá', 'Bogotá D.C.', 5000000, 1000000, 6000000, 'pagado'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'Usuario B', 'usuario.b@prueba.local', '3000000002',
   'Calle 4 # 5-6', 'Bogotá', 'Bogotá D.C.', 5000000, 1000000, 6000000, 'pagado');


set local role authenticated;
set local request.jwt.claims to '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(
  (select count(*)::int from public.perfiles where id::text like 'aaaaaaaa-0000-4000-8000-%'),
  1,
  'Usuario: solo ve su propio perfil'
);

select lives_ok(
  $$update public.perfiles set nombre = 'Usuario A editado' where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  'Usuario: edita su propio nombre'
);

select throws_ok(
  $$update public.perfiles set rol = 'administrador' where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  '42501', null,
  'Usuario: no puede volverse administrador'
);

with u as (
  update public.perfiles set nombre = 'Hackeado'
  where id = 'aaaaaaaa-0000-4000-8000-000000000002'
  returning 1
)
select is(count(*)::int, 0, 'Usuario: no modifica perfiles ajenos') from u;

select is(
  (select count(*)::int from public.perfiles_publicos where id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  1,
  'Usuario: ve los datos públicos de otros perfiles'
);

select is(
  (select count(*)::int from public.publicaciones where texto = 'Publicación de prueba T-008'),
  1,
  'Usuario: lee las publicaciones'
);

select throws_ok(
  $$insert into public.publicaciones (autor_id, texto) values ('aaaaaaaa-0000-4000-8000-000000000001', 'No debería')$$,
  '42501', null,
  'Usuario: no puede publicar'
);

select lives_ok(
  $$insert into public.me_gusta (publicacion_id, usuario_id)
    select id, 'aaaaaaaa-0000-4000-8000-000000000001' from public.publicaciones
    where texto = 'Publicación de prueba T-008'$$,
  'Usuario: da su propio Me gusta'
);

select throws_ok(
  $$insert into public.me_gusta (publicacion_id, usuario_id)
    select id, 'aaaaaaaa-0000-4000-8000-000000000003' from public.publicaciones
    where texto = 'Publicación de prueba T-008'$$,
  '42501', null,
  'Usuario: no crea Me gusta a nombre de otro'
);

select is(
  (select count(*)::int from public.me_gusta m
   join public.publicaciones p on p.id = m.publicacion_id
   where p.texto = 'Publicación de prueba T-008'),
  2,
  'Usuario: ve todos los Me gusta para el conteo'
);

with d as (
  delete from public.me_gusta
  where usuario_id = 'aaaaaaaa-0000-4000-8000-000000000002'
  returning 1
)
select is(count(*)::int, 0, 'Usuario: no borra Me gusta ajenos') from d;

with d as (
  delete from public.me_gusta
  where usuario_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  returning 1
)
select is(count(*)::int, 1, 'Usuario: borra su propio Me gusta') from d;

select lives_ok(
  $$insert into public.comentarios (publicacion_id, usuario_id, texto)
    select id, 'aaaaaaaa-0000-4000-8000-000000000001', 'Amén' from public.publicaciones
    where texto = 'Publicación de prueba T-008'$$,
  'Usuario: comenta'
);

select is(
  (select count(*)::int from public.pedidos where usuario_id::text like 'aaaaaaaa-0000-4000-8000-%'),
  1,
  'Usuario: solo ve sus propios pedidos'
);

with u as (
  update public.pedidos set estado = 'enviado'
  where usuario_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  returning 1
)
select is(count(*)::int, 0, 'Usuario: no cambia el estado de envío') from u;

select throws_ok(
  $$insert into public.calendario_dias (fecha, creado_por) values (current_date + 400, 'aaaaaaaa-0000-4000-8000-000000000001')$$,
  '42501', null,
  'Usuario: no escribe en el calendario'
);

select throws_ok(
  $$insert into public.articulos (tipo, nombre, precio_centavos, unidades_disponibles) values ('rosario', 'Rosario de prueba', 2000000, 5)$$,
  '42501', null,
  'Usuario: no crea artículos de la tienda'
);

select lives_ok(
  $$insert into public.dias_oracion (usuario_id, fecha) values ('aaaaaaaa-0000-4000-8000-000000000001', (now() at time zone 'America/Bogota')::date)$$,
  'Usuario: registra el día de hoy en su racha'
);

select throws_ok(
  $$insert into public.dias_oracion (usuario_id, fecha) values ('aaaaaaaa-0000-4000-8000-000000000001', (now() at time zone 'America/Bogota')::date - 1)$$,
  '42501', null,
  'Usuario: no registra días pasados en su racha'
);


reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';

select is(
  (select count(*)::int from public.perfiles where id::text like 'aaaaaaaa-0000-4000-8000-%'),
  3,
  'Administrador: ve todos los perfiles'
);

select throws_ok(
  $$update public.perfiles set rol = 'usuario' where id = 'aaaaaaaa-0000-4000-8000-000000000003'$$,
  '42501', null,
  'Administrador: no cambia su propio rol'
);

select lives_ok(
  $$update public.perfiles set bloqueado = true where id = 'aaaaaaaa-0000-4000-8000-000000000002'$$,
  'Administrador: bloquea a un usuario'
);

select lives_ok(
  $$insert into public.publicaciones (autor_id, texto) values ('aaaaaaaa-0000-4000-8000-000000000003', 'Otra publicación de prueba')$$,
  'Administrador: publica'
);

select lives_ok(
  $$insert into public.calendario_dias (fecha, creado_por) values (current_date + 400, 'aaaaaaaa-0000-4000-8000-000000000003')$$,
  'Administrador: escribe en el calendario'
);

select lives_ok(
  $$insert into public.articulos (tipo, nombre, precio_centavos, unidades_disponibles) values ('rosario', 'Rosario de prueba', 2000000, 5)$$,
  'Administrador: crea artículos de la tienda'
);

with u as (
  update public.pedidos set estado = 'enviado'
  where usuario_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  returning 1
)
select is(count(*)::int, 1, 'Administrador: cambia el estado de envío') from u;

select throws_ok(
  $$update public.pedidos set total_centavos = 1 where usuario_id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  '42501', null,
  'Administrador: no cambia el total de un pedido'
);


reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';

select is(
  (select count(*)::int from public.comentarios c
   join public.publicaciones p on p.id = c.publicacion_id
   where p.texto = 'Publicación de prueba T-008'),
  1,
  'Usuario bloqueado: sigue leyendo los comentarios'
);

select throws_ok(
  $$insert into public.comentarios (publicacion_id, usuario_id, texto)
    select id, 'aaaaaaaa-0000-4000-8000-000000000002', 'No debería' from public.publicaciones
    where texto = 'Publicación de prueba T-008'$$,
  '42501', null,
  'Usuario bloqueado: no puede comentar'
);


reset role;
set local role anon;
set local request.jwt.claims to '{"role": "anon"}';

select is(
  (select count(*)::int from public.publicaciones),
  0,
  'Sin sesión: no lee nada'
);


reset role;

select * from finish();

rollback;
