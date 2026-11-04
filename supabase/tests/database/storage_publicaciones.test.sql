begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

set local storage.allow_delete_query to 'true';

select is(
  (select public from storage.buckets where id = 'publicaciones'),
  true,
  'Bucket publicaciones: es público'
);

select is(
  (select file_size_limit from storage.buckets where id = 'publicaciones'),
  5242880::bigint,
  'Bucket publicaciones: límite de 5 MB'
);

select is(
  (select allowed_mime_types from storage.buckets where id = 'publicaciones'),
  array['image/jpeg', 'image/png'],
  'Bucket publicaciones: solo JPEG y PNG'
);

insert into auth.users (id, email, raw_user_meta_data) values
  ('cccccccc-0000-4000-8000-000000000001', 'admin.feed@prueba.local', '{"nombre": "Administrador"}'),
  ('cccccccc-0000-4000-8000-000000000002', 'usuario.feed@prueba.local', '{"nombre": "Usuario"}'),
  ('cccccccc-0000-4000-8000-000000000003', 'admin.bloqueado@prueba.local', '{"nombre": "Admin bloqueado"}');

update public.perfiles
set rol = 'administrador'
where id in ('cccccccc-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000003');

update public.perfiles
set bloqueado = true
where id = 'cccccccc-0000-4000-8000-000000000003';

set local role authenticated;
set local request.jwt.claims to '{"sub": "cccccccc-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('publicaciones', 'prueba/uno.jpg')$$,
  'Administrador: sube una imagen'
);

with u as (
  update storage.objects set metadata = '{"version": 2}'
  where bucket_id = 'publicaciones' and name = 'prueba/uno.jpg'
  returning 1
)
select is(count(*)::int, 1, 'Administrador: reemplaza una imagen') from u;

set local request.jwt.claims to '{"sub": "cccccccc-0000-4000-8000-000000000002", "role": "authenticated"}';

select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'publicaciones' and name = 'prueba/uno.jpg'),
  0,
  'Usuario: no lista las imágenes de publicaciones'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('publicaciones', 'prueba/intrusa.jpg')$$,
  '42501', null,
  'Usuario: no sube imágenes'
);

with u as (
  update storage.objects set metadata = '{"intento": "usuario"}'
  where bucket_id = 'publicaciones' and name = 'prueba/uno.jpg'
  returning 1
)
select is(count(*)::int, 0, 'Usuario: no reemplaza imágenes') from u;

with u as (
  delete from storage.objects
  where bucket_id = 'publicaciones' and name = 'prueba/uno.jpg'
  returning 1
)
select is(count(*)::int, 0, 'Usuario: no borra imágenes') from u;

set local request.jwt.claims to '{"sub": "cccccccc-0000-4000-8000-000000000003", "role": "authenticated"}';

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('publicaciones', 'prueba/bloqueado.jpg')$$,
  '42501', null,
  'Administrador bloqueado: no sube imágenes'
);

set local role anon;
set local request.jwt.claims to '{"role": "anon"}';

select is(
  (select count(*)::int from storage.objects where bucket_id = 'publicaciones'),
  0,
  'Sin sesión: no lista imágenes por la API'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('publicaciones', 'prueba/anon.jpg')$$,
  '42501', null,
  'Sin sesión: no sube imágenes'
);

set local role authenticated;
set local request.jwt.claims to '{"sub": "cccccccc-0000-4000-8000-000000000001", "role": "authenticated"}';

with u as (
  delete from storage.objects
  where bucket_id = 'publicaciones' and name = 'prueba/uno.jpg'
  returning 1
)
select is(count(*)::int, 1, 'Administrador: borra una imagen') from u;

select * from finish();

rollback;