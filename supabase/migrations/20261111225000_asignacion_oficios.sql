create or replace function public.dia_publicado(p_fecha date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.calendario_dias d
    where d.fecha = p_fecha
      and d.publicado_en is not null
  );
$$;

comment on function public.dia_publicado(date) is
  'Indica si el día ya fue publicado por publicar_dia() (T-057).';

revoke execute on function public.dia_publicado(date) from public, anon;
grant execute on function public.dia_publicado(date) to authenticated;

create or replace function public.bloquear_dia_publicado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return coalesce(new, old);
  end if;

  if tg_table_name = 'calendario_dias' then
    if tg_op in ('UPDATE', 'DELETE') and old.publicado_en is not null then
      raise exception 'El día % ya se publicó y no se puede modificar', old.fecha
        using errcode = 'P0001', hint = 'dia_publicado';
    end if;
    if tg_op in ('INSERT', 'UPDATE') and (new.publicado_en is not null or new.vigente) then
      raise exception 'Solo la publicación diaria puede publicar el día %', new.fecha
        using errcode = 'P0001', hint = 'dia_publicado';
    end if;
    return coalesce(new, old);
  end if;

  if tg_op in ('UPDATE', 'DELETE') and public.dia_publicado(old.fecha) then
    raise exception 'El día % ya se publicó y no se puede modificar', old.fecha
      using errcode = 'P0001', hint = 'dia_publicado';
  end if;
  if tg_op in ('INSERT', 'UPDATE') and public.dia_publicado(new.fecha) then
    raise exception 'El día % ya se publicó y no se puede modificar', new.fecha
      using errcode = 'P0001', hint = 'dia_publicado';
  end if;
  return coalesce(new, old);
end;
$$;

comment on function public.bloquear_dia_publicado() is
  'Impide que la API cambie un día ya publicado o lo marque como publicado; publicar_dia() y las cascadas no se bloquean (T-057).';

create trigger calendario_dias_bloquear_publicado
  before insert or update or delete on public.calendario_dias
  for each row execute function public.bloquear_dia_publicado();

create trigger calendario_contenidos_bloquear_publicado
  before insert or update or delete on public.calendario_contenidos
  for each row execute function public.bloquear_dia_publicado();

create trigger asignaciones_oficios_bloquear_publicado
  before insert or update or delete on public.asignaciones_oficios
  for each row execute function public.bloquear_dia_publicado();

create or replace function public.estados_calendario(p_desde date, p_hasta date)
returns table (fecha date, estado text)
language sql
stable
set search_path = ''
as $$
  with dias as (
    select dia::date as fecha
    from generate_series(p_desde, p_hasta, interval '1 day') as dia
  ),
  requeridas as (
    select dias.fecha, o.id as oracion_id, o.seccion
    from dias
    join public.oraciones o
      on (o.seccion in ('dia', 'widget') and not o.es_fija)
      or (o.seccion = 'semana' and o.dia_semana = extract(isodow from dias.fecha))
  ),
  conteo as (
    select
      r.fecha,
      count(*) as total,
      count(*) filter (
        where exists (
          select 1
          from public.calendario_contenidos c
          where c.fecha = r.fecha
            and c.oracion_id = r.oracion_id
        )
        or exists (
          select 1
          from public.asignaciones_oficios a
          where a.fecha = r.fecha
            and a.oracion_id = r.oracion_id
        )
      ) as asignadas
    from requeridas r
    group by r.fecha
  )
  select
    dias.fecha,
    case
      when d.publicado_en is not null then 'publicado'
      when coalesce(conteo.asignadas, 0) = 0 then 'vacio'
      when conteo.asignadas = conteo.total then 'completo'
      else 'incompleto'
    end
  from dias
  left join conteo on conteo.fecha = dias.fecha
  left join public.calendario_dias d on d.fecha = dias.fecha
  order by dias.fecha;
$$;

comment on function public.estados_calendario(date, date) is
  'Estado de cada día del rango: publicado, completo, incompleto o vacío. Requiere las cinco oraciones variables, la imagen del widget y el oficio de la semana (T-057).';

revoke execute on function public.estados_calendario(date, date) from public, anon;
grant execute on function public.estados_calendario(date, date) to authenticated;

create or replace function public.copiar_programacion(
  p_origen date,
  p_destino date,
  p_dias integer default 1
)
returns setof date
language plpgsql
set search_path = ''
as $$
declare
  v_hoy date := (now() at time zone 'America/Bogota')::date;
  v_origen date;
  v_destino date;
  v_copiables smallint[];
begin
  if not (select public.es_admin()) then
    raise exception 'Solo un administrador puede copiar la programación' using errcode = '42501';
  end if;

  if p_dias not in (1, 7) then
    raise exception 'Solo se copia un día o una semana' using errcode = '22023';
  end if;

  if p_origen = p_destino then
    raise exception 'El origen y el destino deben ser distintos' using errcode = '22023';
  end if;

  for i in 0 .. p_dias - 1 loop
    v_origen := p_origen + i;
    v_destino := p_destino + i;

    continue when v_destino < v_hoy;
    continue when exists (
      select 1
      from public.calendario_dias d
      where d.fecha = v_destino
        and d.publicado_en is not null
    );
    continue when not exists (
      select 1 from public.calendario_contenidos c where c.fecha = v_origen
      union all
      select 1 from public.asignaciones_oficios a where a.fecha = v_origen
    );

    insert into public.calendario_dias (fecha, creado_por)
    values (v_destino, (select auth.uid()))
    on conflict (fecha) do nothing;

    delete from public.calendario_contenidos c
    where c.fecha = v_destino;

    insert into public.calendario_contenidos (fecha, oracion_id, contenido_id)
    select v_destino, c.oracion_id, c.contenido_id
    from public.calendario_contenidos c
    where c.fecha = v_origen;

    select coalesce(array_agg(o.id), '{}')
    into v_copiables
    from public.oraciones o
    where o.seccion = 'anio'
       or (
         o.seccion = 'semana'
         and o.dia_semana = extract(isodow from v_destino)
         and extract(isodow from v_origen) = extract(isodow from v_destino)
       )
       or (
         o.seccion = 'mes'
         and o.dia_semana = extract(isodow from v_destino)
         and extract(isodow from v_origen) = extract(isodow from v_destino)
         and extract(day from v_destino) <= 7
       );

    delete from public.asignaciones_oficios a
    where a.fecha = v_destino
      and a.oracion_id = any (v_copiables);

    insert into public.asignaciones_oficios (fecha, oracion_id, contenido_id)
    select v_destino, a.oracion_id, a.contenido_id
    from public.asignaciones_oficios a
    join public.contenidos ct on ct.id = a.contenido_id
    where a.fecha = v_origen
      and a.oracion_id = any (v_copiables)
      and (ct.fecha is null or ct.fecha = v_destino);

    insert into public.asignaciones_oficios (fecha, oracion_id, contenido_id)
    select v_destino, ct.oracion_id, ct.id
    from public.contenidos ct
    where ct.fecha = v_destino
      and ct.oracion_id = any (v_copiables)
    on conflict (fecha, oracion_id) do nothing;

    return next v_destino;
  end loop;
end;
$$;

comment on function public.copiar_programacion(date, date, integer) is
  'Copia un día o una semana (oraciones, imagen del widget y oficios válidos en el destino); omite días publicados o pasados y devuelve los días copiados (T-057).';

revoke execute on function public.copiar_programacion(date, date, integer) from public, anon;
grant execute on function public.copiar_programacion(date, date, integer) to authenticated;
