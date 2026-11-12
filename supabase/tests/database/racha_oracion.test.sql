begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

insert into auth.users (id, email, raw_user_meta_data) values
  ('f9800000-0000-4000-8000-000000000001', 'uno.t098@prueba.local', '{"nombre": "Uno"}'),
  ('f9800000-0000-4000-8000-000000000002', 'dos.t098@prueba.local', '{"nombre": "Dos"}'),
  ('f9800000-0000-4000-8000-000000000003', 'bloqueado.t098@prueba.local', '{"nombre": "Bloqueado"}');

update public.perfiles
set bloqueado = true
where id = 'f9800000-0000-4000-8000-000000000003';

create temporary table hoy_t098 on commit drop as
select (now() at time zone 'America/Bogota')::date as hoy;

grant select on hoy_t098 to authenticated;

insert into public.dias_oracion (usuario_id, fecha)
select 'f9800000-0000-4000-8000-000000000002', hoy - n
from hoy_t098, unnest(array[2, 3, 10, 11, 12, 13, 14]) as n;

set local role authenticated;
set local request.jwt.claims to '{"sub": "f9800000-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(
  (select array[actual, mejor] from public.racha_oracion()),
  array[0, 0],
  'Sin días de oración la racha es 0 y la mejor también'
);

select is(
  public.registrar_dia_oracion((select hoy from hoy_t098)),
  true,
  'Abrir la primera oración del día registra el día'
);

select is(
  (select array[actual, mejor] from public.racha_oracion()),
  array[1, 1],
  'El primer día de oración deja la racha en 1'
);

select is(
  public.registrar_dia_oracion((select hoy from hoy_t098)),
  false,
  'Abrir otra oración el mismo día no vuelve a sumar'
);

select is(
  (select count(*)::int from public.dias_oracion),
  1,
  'Solo queda un registro por día'
);

select is(
  public.registrar_dia_oracion((select hoy - 1 from hoy_t098)),
  true,
  'Sin conexión: el día de ayer se acepta al recuperarla'
);

select is(
  (select array[actual, mejor] from public.racha_oracion()),
  array[2, 2],
  'Si el día anterior también fue de oración, la racha suma un día'
);

select throws_ok(
  $$select public.registrar_dia_oracion((select hoy - 2 from hoy_t098))$$,
  '22023',
  null,
  'No se registran días de hace más de un día'
);

select throws_ok(
  $$select public.registrar_dia_oracion((select hoy + 1 from hoy_t098))$$,
  '22023',
  null,
  'No se registran días futuros'
);

set local request.jwt.claims to '{"sub": "f9800000-0000-4000-8000-000000000002", "role": "authenticated"}';

select is(
  (select array[actual, mejor] from public.racha_oracion()),
  array[0, 5],
  'Un día completo sin oración deja la racha actual en 0 y conserva la mejor'
);

select is(
  public.registrar_dia_oracion((select hoy from hoy_t098)),
  true,
  'Volver a orar después de un día sin oración registra el día'
);

select is(
  (select array[actual, mejor] from public.racha_oracion()),
  array[1, 5],
  'La racha empieza de nuevo en 1 y la mejor se conserva'
);

reset role;

delete from public.dias_oracion
where usuario_id = 'f9800000-0000-4000-8000-000000000002'
  and fecha = (select hoy from hoy_t098);

insert into public.dias_oracion (usuario_id, fecha)
select 'f9800000-0000-4000-8000-000000000002', hoy - 1
from hoy_t098;

set local role authenticated;
set local request.jwt.claims to '{"sub": "f9800000-0000-4000-8000-000000000002", "role": "authenticated"}';

select is(
  (select array[actual, mejor] from public.racha_oracion()),
  array[3, 5],
  'Antes de la medianoche la racha de ayer sigue viva aunque hoy no haya orado'
);

set local request.jwt.claims to '{"sub": "f9800000-0000-4000-8000-000000000003", "role": "authenticated"}';

select throws_ok(
  $$select public.registrar_dia_oracion()$$,
  '42501',
  null,
  'Un usuario bloqueado no registra días de oración'
);

reset role;
set local role anon;
set local request.jwt.claims to '{"role": "anon"}';

select throws_ok(
  $$select public.registrar_dia_oracion()$$,
  '42501',
  null,
  'Sin sesión no se puede registrar'
);

reset role;

select * from finish();

rollback;
