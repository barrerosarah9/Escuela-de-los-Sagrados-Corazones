alter table public.avisos_push
  add column oracion_en_vivo_id bigint references public.oraciones_en_vivo (id) on delete cascade,
  add constraint avisos_push_oracion_requerida
    check (tipo <> 'recordatorio_oracion' or oracion_en_vivo_id is not null);

comment on column public.avisos_push.oracion_en_vivo_id is
  'Oración en vivo del recordatorio; solo en avisos recordatorio_oracion (T-052).';

create unique index avisos_push_recordatorio_unico_idx
  on public.avisos_push (oracion_en_vivo_id)
  where tipo = 'recordatorio_oracion';

drop function public.tomar_avisos_pendientes(integer);

create function public.tomar_avisos_pendientes(p_limite integer default 10)
returns table (
  id bigint,
  tipo public.tipo_aviso,
  publicacion_id bigint,
  fecha date,
  texto text,
  oracion_en_vivo_id bigint,
  oracion_titulo text,
  oracion_fecha date,
  oracion_hora time
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
    returning a.id, a.tipo, a.publicacion_id, a.fecha, a.oracion_en_vivo_id
  )
  select
    t.id,
    t.tipo,
    t.publicacion_id,
    t.fecha,
    pub.texto,
    t.oracion_en_vivo_id,
    ov.titulo,
    ov.fecha,
    ov.hora
  from tomados t
  left join public.publicaciones pub on pub.id = t.publicacion_id
  left join public.oraciones_en_vivo ov on ov.id = t.oracion_en_vivo_id;
$$;

comment on function public.tomar_avisos_pendientes(integer) is
  'Toma hasta p_limite avisos listos para enviar sin que dos ejecuciones tomen el mismo; incluye los datos de la publicación o de la oración en vivo (T-051, T-052).';

revoke execute on function public.tomar_avisos_pendientes(integer) from public, anon, authenticated;
grant execute on function public.tomar_avisos_pendientes(integer) to service_role;
