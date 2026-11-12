begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

insert into auth.users (id, email, raw_user_meta_data) values
  ('f5700000-0000-4000-8000-000000000001', 'admin.t057@prueba.local', '{"nombre": "Administrador"}'),
  ('f5700000-0000-4000-8000-000000000002', 'usuario.t057@prueba.local', '{"nombre": "Usuario"}');

update public.perfiles
set rol = 'administrador'
where id = 'f5700000-0000-4000-8000-000000000001';

create temporary table fechas_t057 on commit drop as
select
  base + ((1 - extract(isodow from base)::int + 7) % 7) as lunes,
  base + ((1 - extract(isodow from base)::int + 7) % 7) + 7 as lunes_siguiente
from (
  select make_date(extract(year from current_date)::int + 2, 1, 1) as base
) as b;

grant select on fechas_t057 to authenticated;

insert into public.contenidos (oracion_id, seccion, nombre, numero, youtube_url)
select o.id, o.seccion, 'T-057 ' || o.clave, 9057, 'https://www.youtube.com/watch?v=jNQXAC9IVRw'
from public.oraciones o
where (o.seccion = 'dia' and not o.es_fija)
   or o.seccion = 'semana' and o.clave <> 'hora-maria'
   or o.seccion = 'mes';

insert into public.contenidos (oracion_id, seccion, nombre, numero, youtube_url)
select o.id, o.seccion, 'T-057 ' || o.clave, 12, 'https://www.youtube.com/watch?v=jNQXAC9IVRw'
from public.oraciones o
where o.seccion = 'anio';

insert into public.contenidos (oracion_id, seccion, nombre, imagen_path)
select id, seccion, 'T-057 widget', 'widget/t057.png'
from public.oraciones where clave = 'imagen-widget';

insert into public.contenidos (oracion_id, seccion, nombre, fecha, youtube_url)
select o.id, o.seccion, 'T-057 Hora de María ' || s.n, f.lunes + 5 + 7 * s.n,
  'https://www.youtube.com/watch?v=jNQXAC9IVRw'
from public.oraciones o, fechas_t057 f, generate_series(0, 1) as s(n)
where o.clave = 'hora-maria';

create function pg_temp.contenido(p_clave text) returns bigint language sql as $$
  select ct.id
  from public.contenidos ct
  join public.oraciones o on o.id = ct.oracion_id
  where o.clave = p_clave
    and ct.nombre like 'T-057%'
  order by ct.fecha nulls first
  limit 1
$$;

create function pg_temp.programar_diarias(p_fecha date) returns void language sql as $$
  insert into public.calendario_dias (fecha) values (p_fecha) on conflict do nothing;
  insert into public.calendario_contenidos (fecha, oracion_id, contenido_id)
  select p_fecha, o.id, pg_temp.contenido(o.clave)
  from public.oraciones o
  where (o.seccion = 'dia' and not o.es_fija) or o.seccion = 'widget';
$$;

select pg_temp.programar_diarias(lunes) from fechas_t057;

select is(
  (select estado from public.estados_calendario((select lunes from fechas_t057), (select lunes from fechas_t057))),
  'incompleto',
  'Estado: con las cinco oraciones y el widget, pero sin el oficio de la semana, el día está incompleto'
);

insert into public.asignaciones_oficios (fecha, oracion_id, contenido_id)
select f.lunes, o.id, pg_temp.contenido(o.clave)
from fechas_t057 f, public.oraciones o
where o.clave in ('almas-purgatorio', 'consagracion-san-jose');

select is(
  (select estado from public.estados_calendario((select lunes from fechas_t057), (select lunes from fechas_t057))),
  'completo',
  'Estado: con el oficio de la semana el día queda completo'
);

select is(
  (select estado from public.estados_calendario((select lunes + 1 from fechas_t057), (select lunes + 1 from fechas_t057))),
  'vacio',
  'Estado: un día sin nada asignado está vacío'
);

insert into public.calendario_dias (fecha) select lunes + 2 from fechas_t057;
insert into public.asignaciones_oficios (fecha, oracion_id, contenido_id)
select f.lunes + 2, o.id, pg_temp.contenido(o.clave)
from fechas_t057 f, public.oraciones o
where o.clave = 'lirios-san-jose';

select is(
  (select estado from public.estados_calendario((select lunes + 2 from fechas_t057), (select lunes + 2 from fechas_t057))),
  'incompleto',
  'Estado: solo con el oficio de la semana el día está incompleto'
);

select is(
  (select count(*)::int from public.estados_calendario((select lunes from fechas_t057), (select lunes + 6 from fechas_t057))),
  7,
  'Estado: devuelve un estado por cada día del rango'
);

select pg_temp.programar_diarias(lunes + 5) from fechas_t057;
insert into public.asignaciones_oficios (fecha, oracion_id, contenido_id)
select f.lunes + 5, ct.oracion_id, ct.id
from fechas_t057 f
join public.contenidos ct on ct.fecha = f.lunes + 5;

select is(
  (select estado from public.estados_calendario((select lunes + 5 from fechas_t057), (select lunes + 5 from fechas_t057))),
  'completo',
  'Estado: el sábado el oficio de la semana es la Hora de María'
);

set local role authenticated;
set local request.jwt.claims to '{"sub": "f5700000-0000-4000-8000-000000000002", "role": "authenticated"}';

select throws_ok(
  $$insert into public.asignaciones_oficios (fecha, oracion_id, contenido_id)
    select f.lunes + 1, o.id, pg_temp.contenido(o.clave)
    from fechas_t057 f, public.oraciones o where o.clave = 'santos-angeles'$$,
  '42501',
  null,
  'RLS: un usuario no asigna oficios'
);

select throws_ok(
  $$select * from public.copiar_programacion((select lunes from fechas_t057), (select lunes_siguiente from fechas_t057), 1)$$,
  '42501',
  null,
  'Copiar: un usuario no puede copiar la programación'
);

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "f5700000-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$insert into public.calendario_dias (fecha) select lunes + 1 from fechas_t057;
    insert into public.asignaciones_oficios (fecha, oracion_id, contenido_id)
    select f.lunes + 1, o.id, pg_temp.contenido(o.clave)
    from fechas_t057 f, public.oraciones o where o.clave = 'santos-angeles'$$,
  'RLS: el administrador asigna oficios'
);

select is(
  (select array_agg(d order by d) from public.copiar_programacion(
    (select lunes from fechas_t057), (select lunes_siguiente from fechas_t057), 1) as d),
  array[(select lunes_siguiente from fechas_t057)],
  'Copiar día: devuelve el día copiado'
);

select is(
  (select count(*)::int from public.calendario_contenidos where fecha = (select lunes_siguiente from fechas_t057)),
  6,
  'Copiar día: copia las cinco oraciones y el widget'
);

select is(
  (select array_agg(o.clave order by o.clave)
   from public.asignaciones_oficios a join public.oraciones o on o.id = a.oracion_id
   where a.fecha = (select lunes_siguiente from fechas_t057)),
  array['almas-purgatorio', 'consagracion-san-jose'],
  'Copiar día: copia el oficio de la semana y la consagración con su día'
);

select is(
  (select estado from public.estados_calendario((select lunes_siguiente from fechas_t057), (select lunes_siguiente from fechas_t057))),
  'completo',
  'Copiar día: el día copiado queda completo'
);

select is(
  (select array_agg(d order by d) from public.copiar_programacion(
    (select lunes from fechas_t057), (select lunes + 1 from fechas_t057), 1) as d),
  array[(select lunes + 1 from fechas_t057)],
  'Copiar día: copia de lunes a martes'
);

select is(
  (select array_agg(o.clave order by o.clave)
   from public.asignaciones_oficios a join public.oraciones o on o.id = a.oracion_id
   where a.fecha = (select lunes + 1 from fechas_t057)),
  array['consagracion-san-jose', 'santos-angeles'],
  'Copiar día: a otro día de la semana no pega el oficio del lunes y conserva el propio'
);

select is(
  (select array_agg(d order by d) from public.copiar_programacion(
    (select lunes from fechas_t057), (select lunes_siguiente from fechas_t057), 7) as d),
  array[
    (select lunes_siguiente from fechas_t057),
    (select lunes_siguiente + 1 from fechas_t057),
    (select lunes_siguiente + 2 from fechas_t057),
    (select lunes_siguiente + 5 from fechas_t057)
  ],
  'Copiar semana: copia solo los días con programación'
);

select is(
  (select ct.fecha
   from public.asignaciones_oficios a
   join public.contenidos ct on ct.id = a.contenido_id
   join public.oraciones o on o.id = a.oracion_id
   where a.fecha = (select lunes_siguiente + 5 from fechas_t057) and o.clave = 'hora-maria'),
  (select lunes_siguiente + 5 from fechas_t057),
  'Copiar semana: el sábado toma la Hora de María de su propia fecha'
);

select is(
  (select array_agg(o.clave order by o.clave)
   from public.asignaciones_oficios a join public.oraciones o on o.id = a.oracion_id
   where a.fecha = (select lunes_siguiente + 2 from fechas_t057)),
  array['lirios-san-jose'],
  'Copiar semana: copia el oficio de cada día'
);

reset role;

update public.calendario_dias
set publicado_en = now()
where fecha = (select lunes from fechas_t057);

set local role authenticated;
set local request.jwt.claims to '{"sub": "f5700000-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$delete from public.asignaciones_oficios where fecha = (select lunes from fechas_t057)$$,
  'P0001',
  null,
  'Publicado: no se pueden quitar oficios de un día publicado'
);

select throws_ok(
  $$update public.calendario_contenidos
    set contenido_id = contenido_id
    where fecha = (select lunes from fechas_t057)$$,
  'P0001',
  null,
  'Publicado: no se pueden cambiar las oraciones de un día publicado'
);

select throws_ok(
  $$delete from public.calendario_dias where fecha = (select lunes from fechas_t057)$$,
  'P0001',
  null,
  'Publicado: no se puede borrar un día publicado'
);

select throws_ok(
  $$update public.calendario_dias set publicado_en = now() where fecha = (select lunes + 1 from fechas_t057)$$,
  'P0001',
  null,
  'Publicado: desde la API no se puede marcar un día como publicado'
);

select is(
  (select array_agg(d order by d) from public.copiar_programacion(
    (select lunes_siguiente from fechas_t057), (select lunes from fechas_t057), 1) as d),
  null::date[],
  'Copiar: omite el día de destino que ya se publicó'
);

select is(
  (select estado from public.estados_calendario((select lunes from fechas_t057), (select lunes from fechas_t057))),
  'publicado',
  'Estado: el día publicado aparece como publicado'
);

reset role;

select lives_ok(
  $$delete from public.calendario_dias where fecha = (select lunes from fechas_t057)$$,
  'Publicado: el servidor (publicación diaria y mantenimiento) sí puede cambiarlo'
);

select * from finish();

rollback;
