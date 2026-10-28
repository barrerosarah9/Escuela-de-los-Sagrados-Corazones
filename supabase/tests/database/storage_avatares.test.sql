begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

set local storage.allow_delete_query to 'true';

select is(
  (select public from storage.buckets where id = 'avatares'),
  false,
  'Bucket avatares: es privado'
);

select is(
  (select file_size_limit from storage.buckets where id = 'avatares'),
  5242880::bigint,
  'Bucket avatares: límite de 5 MB'
);

select is(
  (select allowed_mime_types from storage.buckets where id = 'avatares'),
  array['image/jpeg', 'image/png', 'image/webp'],
  'Bucket avatares: solo JPEG, PNG y WebP'
);

select is(
  (select public from storage.buckets where id = 'marca'),
  true,
  'Bucket marca: es público'
);

insert into auth.users (id, email, raw_user_meta_data) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'ana@prueba.local', '{"nombre": "Ana"}'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'beto@prueba.local', '{"nombre": "Beto"}'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'admin.storage@prueba.local', '{"nombre": "Administrador"}'),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'carla@prueba.local', '{"nombre": "Carla"}');

update public.perfiles
set perfil_visible = true
where id in ('bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000004');

update public.perfiles
set perfil_visible = false
where id = 'bbbbbbbb-0000-4000-8000-000000000002';

update public.perfiles
set rol = 'administrador'
where id = 'bbbbbbbb-0000-4000-8000-000000000003';

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('avatares', 'bbbbbbbb-0000-4000-8000-000000000001/foto.jpg')$$,
  'Usuario: sube su foto en su carpeta'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('avatares', 'bbbbbbbb-0000-4000-8000-000000000002/intrusa.jpg')$$,
  '42501', null,
  'Usuario: no sube en la carpeta de otro'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('avatares', 'sin-carpeta.jpg')$$,
  '42501', null,
  'Usuario: no sube fuera de una carpeta'
);

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';

select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('avatares', 'bbbbbbbb-0000-4000-8000-000000000002/foto.jpg')$$,
  'Usuario con perfil oculto: sube su foto'
);

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000004", "role": "authenticated"}';

select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('avatares', 'bbbbbbbb-0000-4000-8000-000000000004/foto.jpg')$$,
  'Usuario que luego se bloquea: sube su foto'
);

reset role;
set local request.jwt.claims to '';

update public.perfiles
set bloqueado = true
where id = 'bbbbbbbb-0000-4000-8000-000000000004';

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'avatares' and name = 'bbbbbbbb-0000-4000-8000-000000000001/foto.jpg'),
  1,
  'Usuario: ve su propia foto'
);

select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'avatares' and name like 'bbbbbbbb-0000-4000-8000-000000000002/%'),
  0,
  'Usuario: no ve la foto de un perfil oculto'
);

select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'avatares' and name like 'bbbbbbbb-0000-4000-8000-000000000004/%'),
  1,
  'Usuario: ve la foto de un perfil visible'
);

with u as (
  update storage.objects set metadata = '{"intento": "ajeno"}'
  where bucket_id = 'avatares' and name = 'bbbbbbbb-0000-4000-8000-000000000004/foto.jpg'
  returning 1
)
select is(count(*)::int, 0, 'Usuario: no reemplaza la foto visible de otro') from u;

with u as (
  delete from storage.objects
  where bucket_id = 'avatares' and name = 'bbbbbbbb-0000-4000-8000-000000000004/foto.jpg'
  returning 1
)
select is(count(*)::int, 0, 'Usuario: no borra la foto de otro') from u;

select throws_ok(
  $$update storage.objects set name = 'bbbbbbbb-0000-4000-8000-000000000002/robada.jpg'
    where bucket_id = 'avatares' and name = 'bbbbbbbb-0000-4000-8000-000000000001/foto.jpg'$$,
  '42501', null,
  'Usuario: no mueve su foto a la carpeta de otro'
);

with u as (
  update storage.objects set metadata = '{"version": 2}'
  where bucket_id = 'avatares' and name = 'bbbbbbbb-0000-4000-8000-000000000001/foto.jpg'
  returning 1
)
select is(count(*)::int, 1, 'Usuario: reemplaza su propia foto') from u;

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';

select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'avatares' and name like 'bbbbbbbb-0000-4000-8000-000000000001/%'),
  1,
  'Usuario con perfil oculto: ve fotos de perfiles visibles'
);

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000003", "role": "authenticated"}';

select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'avatares' and name like 'bbbbbbbb-%'),
  3,
  'Administrador: ve todas las fotos, incluso de perfiles ocultos'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('avatares', 'bbbbbbbb-0000-4000-8000-000000000001/del-admin.jpg')$$,
  '42501', null,
  'Administrador: no sube en la carpeta de otro usuario'
);

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000004", "role": "authenticated"}';

select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'avatares' and name = 'bbbbbbbb-0000-4000-8000-000000000004/foto.jpg'),
  1,
  'Usuario bloqueado: sigue viendo su foto'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('avatares', 'bbbbbbbb-0000-4000-8000-000000000004/nueva.jpg')$$,
  '42501', null,
  'Usuario bloqueado: no sube fotos'
);

select throws_ok(
  $$update storage.objects set metadata = '{"version": 2}'
    where bucket_id = 'avatares' and name = 'bbbbbbbb-0000-4000-8000-000000000004/foto.jpg'$$,
  '42501', null,
  'Usuario bloqueado: no reemplaza su foto'
);

with u as (
  delete from storage.objects
  where bucket_id = 'avatares' and name = 'bbbbbbbb-0000-4000-8000-000000000004/foto.jpg'
  returning 1
)
select is(count(*)::int, 0, 'Usuario bloqueado: no borra su foto') from u;

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

with u as (
  delete from storage.objects
  where bucket_id = 'avatares' and name = 'bbbbbbbb-0000-4000-8000-000000000001/foto.jpg'
  returning 1
)
select is(count(*)::int, 1, 'Usuario: borra su propia foto') from u;

set local role anon;
set local request.jwt.claims to '{"role": "anon"}';

select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'avatares' and name like 'bbbbbbbb-%'),
  0,
  'Sin sesión: no ve ninguna foto'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('avatares', 'bbbbbbbb-0000-4000-8000-000000000001/anon.jpg')$$,
  '42501', null,
  'Sin sesión: no sube fotos'
);

select throws_ok(
  $$select public.foto_perfil_visible('bbbbbbbb-0000-4000-8000-000000000001')$$,
  '42501', null,
  'Sin sesión: no puede ejecutar foto_perfil_visible'
);

select * from finish();

rollback;
