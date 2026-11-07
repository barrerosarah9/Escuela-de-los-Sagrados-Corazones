begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

set local storage.allow_delete_query to 'true';

select is(
  (select public from storage.buckets where id = 'contenidos-imagenes'),
  false,
  'Bucket contenidos-imagenes: es privado'
);

select is(
  (select file_size_limit from storage.buckets where id = 'contenidos-imagenes'),
  5242880::bigint,
  'Bucket contenidos-imagenes: límite de 5 MB'
);

select is(
  (select allowed_mime_types from storage.buckets where id = 'contenidos-imagenes'),
  array['image/jpeg', 'image/png'],
  'Bucket contenidos-imagenes: solo JPEG y PNG'
);

select is(
  (select public from storage.buckets where id = 'contenidos-pdf'),
  false,
  'Bucket contenidos-pdf: es privado'
);

select is(
  (select file_size_limit from storage.buckets where id = 'contenidos-pdf'),
  10485760::bigint,
  'Bucket contenidos-pdf: límite de 10 MB'
);

select is(
  (select allowed_mime_types from storage.buckets where id = 'contenidos-pdf'),
  array['application/pdf'],
  'Bucket contenidos-pdf: solo PDF'
);

insert into auth.users (id, email, raw_user_meta_data) values
  ('dddddddd-0000-4000-8000-000000000001', 'admin.biblioteca@prueba.local', '{"nombre": "Administrador"}'),
  ('dddddddd-0000-4000-8000-000000000002', 'usuario.biblioteca@prueba.local', '{"nombre": "Usuario"}'),
  ('dddddddd-0000-4000-8000-000000000003', 'admin.bloqueado.biblioteca@prueba.local', '{"nombre": "Admin bloqueado"}');

update public.perfiles
set rol = 'administrador'
where id in ('dddddddd-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000003');

update public.perfiles
set bloqueado = true
where id = 'dddddddd-0000-4000-8000-000000000003';

set local role authenticated;
set local request.jwt.claims to '{"sub": "dddddddd-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('contenidos-pdf', 'semana/hora-maria/prueba-pgtap.pdf')$$,
  'Administrador: sube un PDF en <seccion>/<clave>/'
);

select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('contenidos-imagenes', 'widget/imagen-widget/prueba-pgtap.PNG')$$,
  'Administrador: sube una imagen del widget (extensión en mayúsculas)'
);

select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('contenidos-imagenes', 'dia/jaculatorias/prueba-pgtap.jpeg')$$,
  'Administrador: sube una imagen de una oración del día'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('contenidos-pdf', 'widget/imagen-widget/prueba-pgtap.pdf')$$,
  '42501', null,
  'Administrador: no sube PDF del widget'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('contenidos-pdf', 'semana/hora-maria/prueba-pgtap.jpg')$$,
  '42501', null,
  'Administrador: no sube una extensión distinta a la del bucket'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('contenidos-pdf', 'mes/hora-maria/prueba-pgtap.pdf')$$,
  '42501', null,
  'Administrador: no sube si la sección no es la de la oración'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('contenidos-pdf', 'semana/no-existe/prueba-pgtap.pdf')$$,
  '42501', null,
  'Administrador: no sube en una oración que no existe'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('contenidos-pdf', 'semana/prueba-pgtap.pdf')$$,
  '42501', null,
  'Administrador: no sube sin la carpeta de la oración'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('contenidos-pdf', 'semana/hora-maria/extra/prueba-pgtap.pdf')$$,
  '42501', null,
  'Administrador: no sube con carpetas de más'
);

with u as (
  update storage.objects set metadata = '{"version": 2}'
  where bucket_id = 'contenidos-pdf' and name = 'semana/hora-maria/prueba-pgtap.pdf'
  returning 1
)
select is(count(*)::int, 1, 'Administrador: reemplaza un PDF') from u;

select throws_ok(
  $$update storage.objects set name = 'otra/ruta/prueba-pgtap.pdf'
    where bucket_id = 'contenidos-pdf' and name = 'semana/hora-maria/prueba-pgtap.pdf'$$,
  '42501', null,
  'Administrador: no mueve un archivo a una ruta inválida'
);

set local request.jwt.claims to '{"sub": "dddddddd-0000-4000-8000-000000000002", "role": "authenticated"}';

select is(
  (select count(*)::int from storage.objects
   where bucket_id in ('contenidos-imagenes', 'contenidos-pdf') and name like '%prueba-pgtap%'),
  3,
  'Usuario: lee los archivos de la biblioteca'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('contenidos-pdf', 'semana/hora-maria/intruso.pdf')$$,
  '42501', null,
  'Usuario: no sube archivos'
);

with u as (
  update storage.objects set metadata = '{"intento": "usuario"}'
  where bucket_id in ('contenidos-imagenes', 'contenidos-pdf') and name like '%prueba-pgtap%'
  returning 1
)
select is(count(*)::int, 0, 'Usuario: no reemplaza archivos') from u;

with u as (
  delete from storage.objects
  where bucket_id in ('contenidos-imagenes', 'contenidos-pdf') and name like '%prueba-pgtap%'
  returning 1
)
select is(count(*)::int, 0, 'Usuario: no borra archivos') from u;

set local request.jwt.claims to '{"sub": "dddddddd-0000-4000-8000-000000000003", "role": "authenticated"}';

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('contenidos-pdf', 'semana/hora-maria/bloqueado.pdf')$$,
  '42501', null,
  'Administrador bloqueado: no sube archivos'
);

set local role anon;
set local request.jwt.claims to '{"role": "anon"}';

select is(
  (select count(*)::int from storage.objects
   where bucket_id in ('contenidos-imagenes', 'contenidos-pdf')),
  0,
  'Sin sesión: no lee archivos de la biblioteca'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('contenidos-pdf', 'semana/hora-maria/anon.pdf')$$,
  '42501', null,
  'Sin sesión: no sube archivos'
);

set local role authenticated;
set local request.jwt.claims to '{"sub": "dddddddd-0000-4000-8000-000000000001", "role": "authenticated"}';

with u as (
  delete from storage.objects
  where bucket_id in ('contenidos-imagenes', 'contenidos-pdf') and name like '%prueba-pgtap%'
  returning 1
)
select is(count(*)::int, 3, 'Administrador: borra los archivos') from u;

select * from finish();

rollback;
