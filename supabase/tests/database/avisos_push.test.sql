begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

insert into auth.users (id, email, raw_user_meta_data) values
  ('dddddddd-0000-4000-8000-000000000001', 'admin.avisos@prueba.local', '{"nombre": "Administrador"}'),
  ('dddddddd-0000-4000-8000-000000000002', 'usuario.avisos@prueba.local', '{"nombre": "Usuario"}');

update public.perfiles
set rol = 'administrador'
where id = 'dddddddd-0000-4000-8000-000000000001';

set local role authenticated;
set local request.jwt.claims to '{"sub": "dddddddd-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$insert into public.publicaciones (autor_id, texto)
    values ('dddddddd-0000-4000-8000-000000000001', 'Publicación de prueba de avisos')$$,
  'Administrador: crea una publicación'
);

select is(
  (select count(*)::int from public.avisos_push),
  0,
  'Administrador: no lee la cola de avisos'
);

set local request.jwt.claims to '{"sub": "dddddddd-0000-4000-8000-000000000002", "role": "authenticated"}';

select is(
  (select count(*)::int from public.avisos_push),
  0,
  'Usuario: no lee la cola de avisos'
);

select throws_ok(
  $$insert into public.avisos_push (tipo, publicacion_id) values ('publicacion_nueva', 1)$$,
  '42501', null,
  'Usuario: no escribe en la cola de avisos'
);

reset role;
set local request.jwt.claims to '';

create temp table pub_prueba as
select id from public.publicaciones where texto = 'Publicación de prueba de avisos';

select is(
  (select count(*)::int from public.avisos_push a
   where a.publicacion_id = (select id from pub_prueba)
     and a.tipo = 'publicacion_nueva'
     and a.enviado_en is null),
  1,
  'Crear una publicación encola un aviso pendiente'
);

update public.publicaciones
set texto = 'Publicación editada'
where id = (select id from pub_prueba);

select is(
  (select count(*)::int from public.avisos_push
   where publicacion_id = (select id from pub_prueba)),
  1,
  'Editar una publicación no encola otro aviso'
);

select throws_ok(
  $$insert into public.avisos_push (tipo) values ('publicacion_nueva')$$,
  '23514', null,
  'Un aviso de publicación necesita la publicación'
);

delete from public.publicaciones where id = (select id from pub_prueba);

select is(
  (select count(*)::int from public.avisos_push
   where publicacion_id = (select id from pub_prueba)),
  0,
  'Borrar la publicación borra su aviso'
);

select * from finish();

rollback;