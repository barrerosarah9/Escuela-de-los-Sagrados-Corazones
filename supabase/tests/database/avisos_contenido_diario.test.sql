begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

insert into auth.users (id, email, raw_user_meta_data) values
  ('eeeeeeee-0000-4000-8000-000000000001', 'admin.diario@prueba.local', '{"nombre": "Administrador"}');

update public.perfiles
set rol = 'administrador'
where id = 'eeeeeeee-0000-4000-8000-000000000001';

select public.publicar_dia('2099-01-01');

select is(
  (select count(*)::int from public.avisos_push
   where tipo = 'contenido_diario' and fecha = '2099-01-01'),
  1,
  'Publicar el día encola un aviso de contenido diario'
);

select is(
  (select enviar_desde from public.avisos_push
   where tipo = 'contenido_diario' and fecha = '2099-01-01'),
  '2099-01-01 06:00:00-05'::timestamptz,
  'El aviso diario sale a las 6:00 a. m. de Bogotá'
);

select public.publicar_dia('2099-01-01');

select is(
  (select count(*)::int from public.avisos_push
   where tipo = 'contenido_diario' and fecha = '2099-01-01'),
  1,
  'Volver a publicar el mismo día no encola otro aviso'
);

select public.publicar_dia('2099-01-02');
select public.publicar_dia('2099-01-01');

select is(
  (select count(*)::int from public.avisos_push
   where tipo = 'contenido_diario' and fecha = '2099-01-01'),
  1,
  'Republicar un día que dejó de estar vigente no duplica su aviso'
);

select is(
  (select count(*)::int from public.avisos_push
   where tipo = 'contenido_diario' and fecha = '2099-01-02'),
  1,
  'Cada día publicado tiene su propio aviso'
);

select public.publicar_dia('2020-01-01');

select ok(
  (select enviar_desde <= now() from public.avisos_push
   where tipo = 'contenido_diario' and fecha = '2020-01-01'),
  'Un día publicado después de las 6:00 a. m. se avisa de inmediato'
);

select throws_ok(
  $$insert into public.avisos_push (tipo) values ('contenido_diario')$$,
  '23514', null,
  'Un aviso de contenido diario necesita la fecha'
);

select throws_ok(
  $$insert into public.avisos_push (tipo, fecha) values ('contenido_diario', '2099-01-01')$$,
  '23505', null,
  'No se puede encolar dos veces el aviso de un mismo día'
);

insert into public.publicaciones (autor_id, texto)
values ('eeeeeeee-0000-4000-8000-000000000001', 'Publicación de prueba T-051');

create temp table pub_diario as
select id from public.publicaciones where texto = 'Publicación de prueba T-051';

select throws_ok(
  format(
    'insert into public.avisos_push (tipo, publicacion_id) values (%L, %s)',
    'publicacion_nueva',
    (select id from pub_diario)
  ),
  '23505', null,
  'No se puede encolar dos veces la misma publicación'
);

set local role authenticated;
set local request.jwt.claims to '{"sub": "eeeeeeee-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$select * from public.tomar_avisos_pendientes()$$,
  '42501', null,
  'Un usuario de la app, aunque sea administrador, no puede tomar avisos'
);

reset role;
set local request.jwt.claims to '';

set local role service_role;

select lives_ok(
  $$select * from public.tomar_avisos_pendientes(0)$$,
  'La clave de servicio puede tomar avisos'
);

reset role;

create temp table avisos_tomados as
select * from public.tomar_avisos_pendientes(10);

select is(
  (select count(*)::int from avisos_tomados),
  2,
  'Solo se toman los avisos cuya hora de envío ya llegó'
);

select is(
  (select texto from avisos_tomados where tipo = 'publicacion_nueva'),
  'Publicación de prueba T-051',
  'El aviso de publicación trae el texto de la publicación'
);

select is(
  (select intentos::int from public.avisos_push
   where id = (select id from avisos_tomados where tipo = 'contenido_diario')),
  1,
  'Tomar un aviso suma un intento'
);

select is(
  (select count(*)::int from public.tomar_avisos_pendientes(10)),
  0,
  'Un aviso tomado no se vuelve a tomar enseguida'
);

update public.avisos_push
set tomado_en = now() - interval '11 minutes'
where id in (select id from avisos_tomados);

select is(
  (select count(*)::int from public.tomar_avisos_pendientes(10)),
  2,
  'Un aviso tomado hace más de 10 minutos sin enviarse se reintenta'
);

update public.avisos_push
set tomado_en = now() - interval '11 minutes',
    intentos = 3
where id in (select id from avisos_tomados);

select is(
  (select count(*)::int from public.tomar_avisos_pendientes(10)),
  0,
  'Después de 3 intentos el aviso no se vuelve a tomar'
);

update public.avisos_push
set enviado_en = now(),
    tomado_en = null,
    intentos = 0
where id in (select id from avisos_tomados);

select is(
  (select count(*)::int from public.tomar_avisos_pendientes(10)),
  0,
  'Un aviso enviado no se vuelve a tomar'
);

select is(
  (select count(*)::int from cron.job where jobname = 'procesar-avisos-push'),
  1,
  'El cron procesar-avisos-push está programado'
);

select * from finish();

rollback;
