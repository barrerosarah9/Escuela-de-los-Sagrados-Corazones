create or replace function public.publicar_dia(
  p_fecha date default (now() at time zone 'America/Bogota')::date
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_anterior date;
  v_widget smallint;
  v_faltantes integer;
begin
  select fecha into v_anterior
  from public.calendario_dias
  where vigente and fecha <> p_fecha;

  insert into public.calendario_dias (fecha)
  values (p_fecha)
  on conflict (fecha) do nothing;

  insert into public.alertas_publicacion (fecha, oracion_id)
  select p_fecha, o.id
  from public.oraciones o
  where o.seccion in ('dia', 'widget')
    and not o.es_fija
    and not exists (
      select 1
      from public.calendario_contenidos c
      where c.fecha = p_fecha
        and c.oracion_id = o.id
    )
  on conflict (fecha, oracion_id) do nothing;

  insert into public.alertas_publicacion (fecha, oracion_id)
  select p_fecha, o.id
  from public.oraciones o
  where o.seccion = 'semana'
    and o.dia_semana = extract(isodow from p_fecha)
    and not exists (
      select 1
      from public.asignaciones_oficios a
      join public.contenidos ct on ct.id = a.contenido_id
      where a.fecha = p_fecha
        and a.oracion_id = o.id
        and (ct.fecha is null or ct.fecha = p_fecha)
    )
  on conflict (fecha, oracion_id) do nothing;

  select count(*) into v_faltantes
  from public.alertas_publicacion
  where fecha = p_fecha;

  select id into v_widget
  from public.oraciones
  where seccion = 'widget';

  if v_anterior is not null then
    insert into public.calendario_contenidos (fecha, oracion_id, contenido_id)
    select p_fecha, c.oracion_id, c.contenido_id
    from public.calendario_contenidos c
    where c.fecha = v_anterior
      and c.oracion_id = v_widget
    on conflict (fecha, oracion_id) do nothing;

    update public.calendario_dias
    set vigente = false
    where fecha = v_anterior;
  end if;

  update public.calendario_dias
  set publicado_en = coalesce(publicado_en, now()),
      vigente = true
  where fecha = p_fecha;

  return v_faltantes;
end;
$$;

comment on function public.publicar_dia(date) is
  'Publica el día (por defecto hoy en Bogotá): activa sus oraciones, imagen del widget y oficios asignados (semana, mes y consagraciones), retira el anterior, conserva su imagen del widget si falta y registra alertas, incluida la del oficio de la semana sin asignar (T-058). Devuelve cuántas secciones faltaron.';

revoke execute on function public.publicar_dia(date) from public, anon, authenticated;
