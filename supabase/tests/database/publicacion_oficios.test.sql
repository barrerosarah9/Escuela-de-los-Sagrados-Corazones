begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

insert into auth.users (id, email, raw_user_meta_data) values
  ('f5800000-0000-4000-8000-000000000001', 'usuario.t058@prueba.local', '{"nombre": "Usuario"}');

create temporary table fechas_t058 on commit drop as
select
  base + ((4 - extract(isodow from base)::int + 7) % 7) as jueves
from (
  select make_date(extract(year from current_date)::int + 3, 1, 1) as base
) as b;

grant select on fechas_t058 to authenticated;

insert into public.contenidos (oracion_id, seccion, nombre, numero, youtube_url)
select o.id, o.seccion, 'T-058 ' || o.clave, 9058, 'https://www.youtube.com/watch?v=jNQXAC9IVRw'
from public.oraciones o
where (o.seccion = 'semana' and o.clave <> 'hora-maria')
   or o.seccion = 'mes';

insert into public.contenidos (oracion_id, seccion, nombre, numero, youtube_url)
select o.id, o.seccion, 'T-058 ' || o.clave, 12, 'https://www.youtube.com/watch?v=jNQXAC9IVRw'
from public.oraciones o
where o.clave = 'consagracion-san-jose';

insert into public.contenidos (oracion_id, seccion, nombre, fecha, youtube_url)
select o.id, o.seccion, 'T-058 Hora de María', f.jueves + 2, 'https://www.youtube.com/watch?v=jNQXAC9IVRw'
from public.oraciones o, fechas_t058 f
where o.clave = 'hora-maria';

insert into public.calendario_dias (fecha)
select jueves + n from fechas_t058, generate_series(0, 9) as n;

insert into public.asignaciones_oficios (fecha, oracion_id, contenido_id)
select f.jueves, ct.oracion_id, ct.id
from fechas_t058 f
join public.oraciones o on (o.seccion in ('semana', 'mes') and o.dia_semana = 4)
  or o.clave = 'consagracion-san-jose'
join public.contenidos ct on ct.oracion_id = o.id and ct.nombre like 'T-058%';

insert into public.asignaciones_oficios (fecha, oracion_id, contenido_id)
select f.jueves + 2, ct.oracion_id, ct.id
from fechas_t058 f
join public.contenidos ct on ct.nombre = 'T-058 Hora de María';

insert into public.asignaciones_oficios (fecha, oracion_id, contenido_id)
select f.jueves + 9, ct.oracion_id, ct.id
from fechas_t058 f
join public.contenidos ct on ct.nombre = 'T-058 Hora de María';

create function pg_temp.alerta_del_oficio(p_fecha date) returns boolean language sql as $$
  select exists (
    select 1
    from public.alertas_publicacion al
    join public.oraciones o on o.id = al.oracion_id
    where al.fecha = p_fecha
      and o.seccion = 'semana'
  )
$$;

select is(
  public.publicar_dia((select jueves from fechas_t058)),
  6,
  'Jueves: con el oficio asignado solo faltan las cinco oraciones y el widget'
);

select ok(
  not pg_temp.alerta_del_oficio((select jueves from fechas_t058)),
  'Jueves: el oficio de la semana asignado no genera alerta'
);

set local role authenticated;
set local request.jwt.claims to '{"sub": "f5800000-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(
  (select array_agg(o.seccion::text order by o.seccion::text)
   from public.asignaciones_oficios a
   join public.oraciones o on o.id = a.oracion_id
   where a.fecha = (select jueves from fechas_t058)),
  array['anio', 'mes', 'semana'],
  'Jueves: el usuario ve activos el oficio de la semana, el del mes y la consagración'
);

select is(
  (select ct.numero
   from public.asignaciones_oficios a
   join public.contenidos ct on ct.id = a.contenido_id
   join public.oraciones o on o.id = a.oracion_id
   where a.fecha = (select jueves from fechas_t058) and o.clave = 'consagracion-san-jose'),
  12::smallint,
  'Jueves: la consagración se activa con su día'
);

reset role;

select is(
  public.publicar_dia((select jueves + 1 from fechas_t058)),
  7,
  'Viernes: sin oficio de la semana falta una sección más'
);

select ok(
  pg_temp.alerta_del_oficio((select jueves + 1 from fechas_t058)),
  'Viernes: falta el oficio de la semana y se registra una alerta'
);

select is(
  (select count(*)::int
   from public.alertas_publicacion al
   join public.oraciones o on o.id = al.oracion_id
   where o.seccion in ('mes', 'anio')),
  0,
  'Mes y año: si no se asignan no generan alertas'
);

set local role authenticated;
set local request.jwt.claims to '{"sub": "f5800000-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(
  (select count(*)::int from public.asignaciones_oficios),
  0,
  'Viernes: la sección del oficio queda vacía y el jueves ya no se ve'
);

reset role;

select public.publicar_dia((select jueves + 2 from fechas_t058));

select ok(
  not pg_temp.alerta_del_oficio((select jueves + 2 from fechas_t058)),
  'Sábado: la Hora de María elegida activa el oficio sin alerta'
);

set local role authenticated;
set local request.jwt.claims to '{"sub": "f5800000-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(
  (select ct.fecha
   from public.asignaciones_oficios a
   join public.contenidos ct on ct.id = a.contenido_id),
  (select jueves + 2 from fechas_t058),
  'Sábado: el usuario ve la Hora de María de ese sábado'
);

reset role;

select public.publicar_dia((select jueves + 9 from fechas_t058));

select ok(
  pg_temp.alerta_del_oficio((select jueves + 9 from fechas_t058)),
  'Sábado: una Hora de María de otro sábado cuenta como faltante y genera alerta'
);

select is(
  public.publicar_dia((select jueves + 9 from fechas_t058)),
  7,
  'Publicar otra vez no duplica la alerta del oficio'
);

select * from finish();

rollback;
