create extension if not exists pg_cron with schema pg_catalog;

alter table public.calendario_dias
  add column vigente boolean not null default false;

comment on column public.calendario_dias.vigente is
  'Día que la app muestra ahora; lo marca publicar_dia() y solo puede haber uno.';

create unique index calendario_dias_un_vigente_idx
  on public.calendario_dias (vigente)
  where vigente;

create table public.alertas_publicacion (
  id bigint generated always as identity primary key,
  fecha date not null references public.calendario_dias (fecha) on delete cascade,
  oracion_id smallint not null references public.oraciones (id) on delete cascade,
  creado_en timestamptz not null default now(),
  constraint alertas_publicacion_unica unique (fecha, oracion_id)
);

comment on table public.alertas_publicacion is
  'Secciones que no tenían contenido programado cuando se publicó el día (CU-28 E1 y E2).';

create index alertas_publicacion_oracion_idx on public.alertas_publicacion (oracion_id);

alter table public.alertas_publicacion enable row level security;

create policy "alertas_publicacion: leer si es administrador"
  on public.alertas_publicacion for select to authenticated
  using ((select public.es_admin()));

drop policy "calendario_dias: leer los publicados o todos si es administrador"
  on public.calendario_dias;

create policy "calendario_dias: leer el día vigente o si es administrador"
  on public.calendario_dias for select to authenticated
  using (vigente or (select public.es_admin()));

drop policy "calendario_contenidos: leer los de días publicados o todos si es administrador"
  on public.calendario_contenidos;

create policy "calendario_contenidos: leer del día vigente o administrador"
  on public.calendario_contenidos for select to authenticated
  using (
    (select public.es_admin())
    or exists (
      select 1
      from public.calendario_dias d
      where d.fecha = calendario_contenidos.fecha
        and d.vigente
    )
  );

drop policy "asignaciones_oficios: leer las de días publicados o todas si es administrador"
  on public.asignaciones_oficios;

create policy "asignaciones_oficios: leer del día vigente o administrador"
  on public.asignaciones_oficios for select to authenticated
  using (
    (select public.es_admin())
    or exists (
      select 1
      from public.calendario_dias d
      where d.fecha = asignaciones_oficios.fecha
        and d.vigente
    )
  );

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
  'Publica el día (por defecto hoy en Bogotá), retira el anterior, conserva su imagen del widget si falta y registra alertas. Devuelve cuántas secciones faltaron.';

revoke execute on function public.publicar_dia(date) from public, anon, authenticated;

select cron.schedule(
  'publicar-contenido-diario',
  '0 5 * * *',
  $$select public.publicar_dia()$$
);
