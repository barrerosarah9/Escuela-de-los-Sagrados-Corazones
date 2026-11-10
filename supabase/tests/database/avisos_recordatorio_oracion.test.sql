begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

insert into auth.users (id, email, raw_user_meta_data) values
  ('ffffffff-0000-4000-8000-000000000001', 'admin.recordatorio@prueba.local', '{"nombre": "Administrador"}');

insert into public.oraciones_en_vivo (fecha, hora, titulo, enlace_meet, creado_por)
values (
  '2099-02-05',
  '19:00',
  'Hora Santa',
  'https://meet.google.com/abc-defg-hij',
  'ffffffff-0000-4000-8000-000000000001'
);

create temp table oracion_prueba as
select id from public.oraciones_en_vivo where fecha = '2099-02-05';

select throws_ok(
  $$insert into public.avisos_push (tipo) values ('recordatorio_oracion')$$,
  '23514', null,
  'Un recordatorio necesita la oración en vivo'
);

select lives_ok(
  format(
    'insert into public.avisos_push (tipo, oracion_en_vivo_id, enviar_desde) values (%L, %s, now())',
    'recordatorio_oracion',
    (select id from oracion_prueba)
  ),
  'Se encola un recordatorio de la oración en vivo'
);

select throws_ok(
  format(
    'insert into public.avisos_push (tipo, oracion_en_vivo_id) values (%L, %s)',
    'recordatorio_oracion',
    (select id from oracion_prueba)
  ),
  '23505', null,
  'No se puede encolar dos veces el recordatorio de la misma oración'
);

create temp table recordatorios_tomados as
select * from public.tomar_avisos_pendientes(10)
where tipo = 'recordatorio_oracion';

select is(
  (select count(*)::int from recordatorios_tomados),
  1,
  'El recordatorio listo se toma de la cola'
);

select is(
  (select oracion_titulo from recordatorios_tomados),
  'Hora Santa',
  'El recordatorio trae el título de la oración'
);

select is(
  (select oracion_hora from recordatorios_tomados),
  '19:00'::time,
  'El recordatorio trae la hora de la oración'
);

select is(
  (select oracion_fecha from recordatorios_tomados),
  '2099-02-05'::date,
  'El recordatorio trae la fecha de la oración'
);

delete from public.oraciones_en_vivo where id = (select id from oracion_prueba);

select is(
  (select count(*)::int from public.avisos_push
   where oracion_en_vivo_id = (select id from oracion_prueba)),
  0,
  'Borrar la oración en vivo borra su recordatorio'
);

select * from finish();

rollback;
