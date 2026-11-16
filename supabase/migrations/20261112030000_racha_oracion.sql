create or replace function public.registrar_dia_oracion(
  p_fecha date default (now() at time zone 'America/Bogota')::date
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_hoy date := (now() at time zone 'America/Bogota')::date;
begin
  if v_usuario is null or not (select public.usuario_activo()) then
    raise exception 'La cuenta no puede registrar días de oración' using errcode = '42501';
  end if;

  if p_fecha is null or p_fecha > v_hoy or p_fecha < v_hoy - 1 then
    raise exception 'Solo se registra el día de hoy o el de ayer (hora de Colombia)'
      using errcode = '22023';
  end if;

  insert into public.dias_oracion (usuario_id, fecha)
  values (v_usuario, p_fecha)
  on conflict (usuario_id, fecha) do nothing;

  return found;
end;
$$;

comment on function public.registrar_dia_oracion(date) is
  'Marca un día de oración del usuario actual. Acepta hoy o ayer (hora de Colombia) para los registros que se enviaron sin conexión; no duplica (T-098).';

revoke execute on function public.registrar_dia_oracion(date) from public, anon;
grant execute on function public.registrar_dia_oracion(date) to authenticated;

create or replace function public.racha_oracion()
returns table (actual integer, mejor integer)
language sql
stable
set search_path = ''
as $$
  with dias as (
    select d.fecha
    from public.dias_oracion d
    where d.usuario_id = (select auth.uid())
  ),
  islas as (
    select fecha, fecha - (row_number() over (order by fecha))::integer as grupo
    from dias
  ),
  rachas as (
    select max(fecha) as fin, count(*)::integer as largo
    from islas
    group by grupo
  )
  select
    coalesce(
      (
        select r.largo
        from rachas r
        where r.fin >= (now() at time zone 'America/Bogota')::date - 1
        order by r.fin desc
        limit 1
      ),
      0
    ),
    coalesce((select max(r.largo) from rachas r), 0);
$$;

comment on function public.racha_oracion() is
  'Racha actual y mejor racha del usuario actual. La actual sigue viva si hubo oración hoy o ayer (corte a medianoche de Colombia) y vuelve a 0 tras un día completo sin oración (T-098).';

revoke execute on function public.racha_oracion() from public, anon;
grant execute on function public.racha_oracion() to authenticated;
