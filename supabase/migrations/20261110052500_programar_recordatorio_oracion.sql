create or replace function public.programar_recordatorio_oracion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inicio timestamptz := (new.fecha + new.hora) at time zone 'America/Bogota';
begin
  if v_inicio <= now() then
    return new;
  end if;

  insert into public.avisos_push (tipo, oracion_en_vivo_id, enviar_desde)
  values (
    'recordatorio_oracion',
    new.id,
    greatest(now(), v_inicio - interval '15 minutes')
  )
  on conflict (oracion_en_vivo_id) where tipo = 'recordatorio_oracion'
  do update set
    enviar_desde = excluded.enviar_desde,
    enviado_en = null,
    tomado_en = null,
    intentos = 0,
    envio_id = null;

  return new;
end;
$$;

comment on function public.programar_recordatorio_oracion() is
  'Programa el recordatorio push 15 minutos antes de la oración en vivo (hora de Bogotá) y lo reprograma si cambian la fecha o la hora (T-053).';

revoke execute on function public.programar_recordatorio_oracion() from public, anon, authenticated;

create trigger oraciones_en_vivo_programar_recordatorio
  after insert on public.oraciones_en_vivo
  for each row
  execute function public.programar_recordatorio_oracion();

create trigger oraciones_en_vivo_reprogramar_recordatorio
  after update of fecha, hora on public.oraciones_en_vivo
  for each row
  when (old.fecha is distinct from new.fecha or old.hora is distinct from new.hora)
  execute function public.programar_recordatorio_oracion();

insert into public.avisos_push (tipo, oracion_en_vivo_id, enviar_desde)
select
  'recordatorio_oracion',
  ov.id,
  greatest(now(), ((ov.fecha + ov.hora) at time zone 'America/Bogota') - interval '15 minutes')
from public.oraciones_en_vivo ov
where ((ov.fecha + ov.hora) at time zone 'America/Bogota') > now()
on conflict (oracion_en_vivo_id) where tipo = 'recordatorio_oracion' do nothing;
