alter table public.avisos_push
  add column fecha date references public.calendario_dias (fecha) on delete cascade,
  add column enviar_desde timestamptz not null default now(),
  add column tomado_en timestamptz,
  add column intentos smallint not null default 0,
  add column envio_id bigint references public.envios_push (id) on delete set null,
  add constraint avisos_push_fecha_requerida
    check (tipo <> 'contenido_diario' or fecha is not null);

comment on column public.avisos_push.fecha is
  'Día publicado, para los avisos de contenido diario.';
comment on column public.avisos_push.enviar_desde is
  'Momento desde el que el aviso puede enviarse (contenido diario: 6:00 a. m. de Bogotá).';
comment on column public.avisos_push.tomado_en is
  'Cuándo lo tomó procesar-avisos; si no se marcó enviado en 10 minutos, se vuelve a intentar.';
comment on column public.avisos_push.intentos is
  'Veces que procesar-avisos lo ha tomado; se deja de intentar al tercero.';
comment on column public.avisos_push.envio_id is
  'Registro del envío en envios_push.';

update public.avisos_push
set enviado_en = now()
where enviado_en is null;

create unique index avisos_push_publicacion_unica_idx
  on public.avisos_push (publicacion_id)
  where tipo = 'publicacion_nueva';

create unique index avisos_push_contenido_diario_unico_idx
  on public.avisos_push (fecha)
  where tipo = 'contenido_diario';

create index avisos_push_fecha_idx on public.avisos_push (fecha);
create index avisos_push_envio_idx on public.avisos_push (envio_id);

drop index public.avisos_push_pendientes_idx;

create index avisos_push_pendientes_idx
  on public.avisos_push (enviar_desde)
  where enviado_en is null;

create or replace function public.encolar_aviso_publicacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.avisos_push (tipo, publicacion_id)
  values ('publicacion_nueva', new.id)
  on conflict (publicacion_id) where tipo = 'publicacion_nueva' do nothing;
  return new;
end;
$$;

revoke execute on function public.encolar_aviso_publicacion() from public, anon, authenticated;

create or replace function public.encolar_aviso_contenido_diario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.avisos_push (tipo, fecha, enviar_desde)
  values (
    'contenido_diario',
    new.fecha,
    greatest(now(), (new.fecha + time '06:00') at time zone 'America/Bogota')
  )
  on conflict (fecha) where tipo = 'contenido_diario' do nothing;
  return new;
end;
$$;

revoke execute on function public.encolar_aviso_contenido_diario() from public, anon, authenticated;

create trigger calendario_dias_aviso_push
  after update of vigente on public.calendario_dias
  for each row
  when (new.vigente and not old.vigente)
  execute function public.encolar_aviso_contenido_diario();

create or replace function public.tomar_avisos_pendientes(p_limite integer default 10)
returns table (
  id bigint,
  tipo public.tipo_aviso,
  publicacion_id bigint,
  fecha date,
  texto text
)
language sql
security definer
set search_path = ''
as $$
  with tomados as (
    update public.avisos_push a
    set tomado_en = now(),
        intentos = a.intentos + 1
    where a.id in (
      select p.id
      from public.avisos_push p
      where p.enviado_en is null
        and p.enviar_desde <= now()
        and p.intentos < 3
        and (p.tomado_en is null or p.tomado_en < now() - interval '10 minutes')
      order by p.enviar_desde
      limit p_limite
      for update skip locked
    )
    returning a.id, a.tipo, a.publicacion_id, a.fecha
  )
  select t.id, t.tipo, t.publicacion_id, t.fecha, pub.texto
  from tomados t
  left join public.publicaciones pub on pub.id = t.publicacion_id;
$$;

comment on function public.tomar_avisos_pendientes(integer) is
  'Toma hasta p_limite avisos listos para enviar sin que dos ejecuciones tomen el mismo (T-051).';

revoke execute on function public.tomar_avisos_pendientes(integer) from public, anon, authenticated;
grant execute on function public.tomar_avisos_pendientes(integer) to service_role;

create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'procesar-avisos-push',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'avisos_push_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'avisos_push_clave')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  )
  where exists (
    select 1
    from public.avisos_push
    where enviado_en is null
      and enviar_desde <= now()
      and intentos < 3
  )
  $$
);
