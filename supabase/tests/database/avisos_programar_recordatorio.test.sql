begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

insert into public.oraciones_en_vivo (fecha, hora, titulo, enlace_meet)
values ('2099-03-05', '19:00', 'Hora Santa', 'https://meet.google.com/abc-defg-hij');

create temp table oracion_futura as
select id from public.oraciones_en_vivo where fecha = '2099-03-05';

select is(
  (select count(*)::int from public.avisos_push
   where tipo = 'recordatorio_oracion'
     and oracion_en_vivo_id = (select id from oracion_futura)),
  1,
  'Publicar la oración programa su recordatorio'
);

select is(
  (select enviar_desde from public.avisos_push
   where oracion_en_vivo_id = (select id from oracion_futura)),
  '2099-03-05 18:45:00-05'::timestamptz,
  'El recordatorio sale 15 minutos antes de la hora de Bogotá'
);

update public.oraciones_en_vivo
set hora = '20:00'
where id = (select id from oracion_futura);

select is(
  (select enviar_desde from public.avisos_push
   where oracion_en_vivo_id = (select id from oracion_futura)),
  '2099-03-05 19:45:00-05'::timestamptz,
  'Cambiar la hora reprograma el recordatorio'
);

select is(
  (select count(*)::int from public.avisos_push
   where oracion_en_vivo_id = (select id from oracion_futura)),
  1,
  'Reprogramar no duplica el recordatorio'
);

update public.avisos_push
set enviado_en = now(), tomado_en = now(), intentos = 1
where oracion_en_vivo_id = (select id from oracion_futura);

update public.oraciones_en_vivo
set titulo = 'Hora Santa de jueves'
where id = (select id from oracion_futura);

select isnt(
  (select enviado_en from public.avisos_push
   where oracion_en_vivo_id = (select id from oracion_futura)),
  null,
  'Cambiar solo el título no reprograma el recordatorio'
);

update public.oraciones_en_vivo
set fecha = '2099-03-06', hora = '07:30'
where id = (select id from oracion_futura);

select ok(
  (select enviado_en is null and tomado_en is null and intentos = 0
          and enviar_desde = '2099-03-06 07:15:00-05'::timestamptz
   from public.avisos_push
   where oracion_en_vivo_id = (select id from oracion_futura)),
  'Si ya se había enviado y cambia la fecha u hora, se reactiva con la nueva hora'
);

delete from public.oraciones_en_vivo where id = (select id from oracion_futura);

select is(
  (select count(*)::int from public.avisos_push
   where oracion_en_vivo_id = (select id from oracion_futura)),
  0,
  'Eliminar la oración anula su recordatorio'
);

insert into public.oraciones_en_vivo (fecha, hora, titulo, enlace_meet)
values ('2020-01-01', '10:00', 'Oración pasada', 'https://meet.google.com/abc-defg-hij');

select is(
  (select count(*)::int from public.avisos_push a
   join public.oraciones_en_vivo ov on ov.id = a.oracion_en_vivo_id
   where ov.fecha = '2020-01-01'),
  0,
  'Una oración cuya hora ya pasó no programa recordatorio'
);

delete from public.oraciones_en_vivo
where fecha = ((now() at time zone 'America/Bogota') + interval '5 minutes')::date;

insert into public.oraciones_en_vivo (fecha, hora, titulo, enlace_meet)
values (
  ((now() at time zone 'America/Bogota') + interval '5 minutes')::date,
  ((now() at time zone 'America/Bogota') + interval '5 minutes')::time,
  'Oración cercana',
  'https://meet.google.com/abc-defg-hij'
);

select ok(
  (select a.enviar_desde <= now()
   from public.avisos_push a
   join public.oraciones_en_vivo ov on ov.id = a.oracion_en_vivo_id
   where ov.titulo = 'Oración cercana'),
  'Si faltan menos de 15 minutos, el recordatorio sale de inmediato'
);

select * from finish();

rollback;
