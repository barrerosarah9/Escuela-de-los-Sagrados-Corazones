-- T-007 · Perfiles de usuario (CU-01, CU-05, CU-25, CU-43, CU-44)

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 120),
  correo text,
  telefono text check (telefono ~ '^\+?[0-9 ]{7,20}$'),
  foto_path text,
  rol public.rol_usuario not null default 'usuario',
  bloqueado boolean not null default false,
  perfil_visible boolean not null default true,
  analitica_uso boolean not null default true,
  recibe_reflexion_semanal boolean not null default true,
  recibe_novedades boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table public.perfiles is
  'Un perfil por cuenta de Supabase Auth; se crea solo al registrarse.';
comment on column public.perfiles.correo is
  'Copia del correo de auth.users para listar y buscar usuarios en el portal.';
comment on column public.perfiles.foto_path is
  'Ruta del archivo en el bucket de avatares de Storage.';
comment on column public.perfiles.bloqueado is
  'Reflejo del bloqueo en Auth para el listado del portal (CU-25).';
comment on column public.perfiles.perfil_visible is
  'Privacidad: nombre y foto visibles en comentarios (CU-43).';
comment on column public.perfiles.analitica_uso is
  'Privacidad: permite registrar eventos de uso (CU-33, CU-43).';
comment on column public.perfiles.recibe_reflexion_semanal is
  'Comunicación: correo de reflexión semanal (CU-44).';
comment on column public.perfiles.recibe_novedades is
  'Comunicación: correo de novedades del Apostolado (CU-44).';

create index perfiles_rol_idx on public.perfiles (rol);
create index perfiles_creado_en_idx on public.perfiles (creado_en desc);

create trigger perfiles_actualizado_en
  before update on public.perfiles
  for each row execute function public.fijar_actualizado_en();

create or replace function public.crear_perfil_de_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre, correo)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'nombre'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'Usuario'
      ),
      120
    ),
    new.email
  );
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_de_usuario();

create or replace function public.sincronizar_correo_de_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.perfiles set correo = new.email where id = new.id;
  return new;
end;
$$;

create trigger al_cambiar_correo_de_usuario
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sincronizar_correo_de_perfil();
