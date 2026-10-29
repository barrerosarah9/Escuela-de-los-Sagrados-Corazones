create type public.tipo_aviso as enum ('publicacion_nueva');

create table public.avisos_push (
  id bigint generated always as identity primary key,
  tipo public.tipo_aviso not null,
  publicacion_id bigint references public.publicaciones (id) on delete cascade,
  creado_en timestamptz not null default now(),
  enviado_en timestamptz,
  constraint avisos_push_publicacion_requerida
    check (tipo <> 'publicacion_nueva' or publicacion_id is not null)
);

comment on table public.avisos_push is
  'Cola de avisos push pendientes; la procesa una Edge Function con la clave de servicio (T-051).';

create index avisos_push_pendientes_idx
  on public.avisos_push (creado_en)
  where enviado_en is null;

alter table public.avisos_push enable row level security;

create or replace function public.encolar_aviso_publicacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.avisos_push (tipo, publicacion_id)
  values ('publicacion_nueva', new.id);
  return new;
end;
$$;

revoke execute on function public.encolar_aviso_publicacion() from public, anon, authenticated;

create trigger publicaciones_aviso_push
  after insert on public.publicaciones
  for each row execute function public.encolar_aviso_publicacion();