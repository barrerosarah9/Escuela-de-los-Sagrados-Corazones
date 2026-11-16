begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

insert into auth.users (id, email, raw_user_meta_data) values
  ('eeeeeeee-0000-4000-8000-000000000001', 'admin.publicar@prueba.local', '{"nombre": "Administrador"}'),
  ('eeeeeeee-0000-4000-8000-000000000002', 'usuario.publicar@prueba.local', '{"nombre": "Usuario"}');

update public.perfiles
set rol = 'administrador'
where id = 'eeeeeeee-0000-4000-8000-000000000001';

insert into public.contenidos (oracion_id, nombre, numero, youtube_url)
select id, 'Jaculatorias T-043', 9043, 'https://www.youtube.com/watch?v=jNQXAC9IVRw'
from public.oraciones where clave = 'jaculatorias';

insert into public.contenidos (oracion_id, nombre, imagen_path)
select id, 'Widget T-043', 'widget/t043.png'
from public.oraciones where clave = 'imagen-widget';

insert into public.calendario_dias (fecha) values (current_date + 600);

insert into public.calendario_contenidos (fecha, oracion_id, contenido_id)
select current_date + 600, c.oracion_id, c.id
from public.contenidos c
where c.nombre in ('Jaculatorias T-043', 'Widget T-043');

select is(
  (select count(*)::int from cron.job where jobname = 'publicar-contenido-diario' and schedule = '0 5 * * *'),
  1,
  'Cron: el job corre a las 5:00 UTC (12:00 a. m. en Bogotá)'
);

select is(
  public.publicar_dia(current_date + 600),
  5,
  'Publicar: faltan 4 de las 5 oraciones y el oficio de la semana; el widget está'
);

select ok(
  (select vigente and publicado_en is not null from public.calendario_dias where fecha = current_date + 600),
  'Publicar: el día queda publicado y vigente'
);

select is(
  (select count(*)::int from public.alertas_publicacion where fecha = current_date + 600),
  5,
  'Publicar: registra una alerta por cada oración faltante'
);

select is(
  public.publicar_dia(current_date + 601),
  7,
  'Publicar: un día sin programar registra las 7 alertas'
);

select is(
  (select array_agg(fecha order by fecha) from public.calendario_dias where vigente),
  array[current_date + 601],
  'Publicar: solo el día nuevo queda vigente'
);

select ok(
  (select publicado_en is not null from public.calendario_dias where fecha = current_date + 600),
  'Publicar: el día anterior conserva su publicación como historial'
);

select is(
  (select ct.nombre from public.calendario_contenidos cc
     join public.contenidos ct on ct.id = cc.contenido_id
   where cc.fecha = current_date + 601
     and cc.oracion_id = (select id from public.oraciones where clave = 'imagen-widget')),
  'Widget T-043',
  'Publicar: sin imagen del widget se conserva la del día anterior'
);

select ok(
  exists (select 1 from public.alertas_publicacion
          where fecha = current_date + 601
            and oracion_id = (select id from public.oraciones where clave = 'imagen-widget')),
  'Publicar: aunque se conserve, la falta del widget queda en las alertas'
);

select is(
  public.publicar_dia(current_date + 601),
  7,
  'Publicar: repetir el mismo día no duplica alertas'
);

select is(
  (select count(*)::int from public.calendario_contenidos where fecha = current_date + 601),
  1,
  'Publicar: repetir el mismo día no duplica contenidos'
);

set local role authenticated;
set local request.jwt.claims to '{"sub": "eeeeeeee-0000-4000-8000-000000000002", "role": "authenticated"}';

select is(
  (select array_agg(fecha order by fecha) from public.calendario_dias),
  array[current_date + 601],
  'Usuario: solo ve el día vigente'
);

select is(
  (select count(*)::int from public.calendario_contenidos where fecha = current_date + 600),
  0,
  'Usuario: ya no ve el contenido del día anterior'
);

select is(
  (select count(*)::int from public.calendario_contenidos where fecha = current_date + 601),
  1,
  'Usuario: ve el contenido del día vigente'
);

select is(
  (select count(*)::int from public.alertas_publicacion),
  0,
  'Usuario: no ve las alertas'
);

select throws_ok(
  $$select public.publicar_dia(current_date + 602)$$,
  '42501', null,
  'Usuario: no puede publicar un día'
);

set local request.jwt.claims to '{"sub": "eeeeeeee-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(
  (select count(*)::int from public.calendario_dias where fecha in (current_date + 600, current_date + 601)),
  2,
  'Administrador: ve todos los días'
);

select is(
  (select count(*)::int from public.alertas_publicacion where fecha in (current_date + 600, current_date + 601)),
  12,
  'Administrador: ve las alertas'
);

select throws_ok(
  $$select public.publicar_dia(current_date + 602)$$,
  '42501', null,
  'Administrador: tampoco publica a mano desde el portal'
);

select * from finish();

rollback;
