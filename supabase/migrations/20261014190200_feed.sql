-- T-007 · Feed: publicaciones, comentarios, «Me gusta», oración en vivo y asistencias
-- (CU-07, CU-08, CU-09, CU-18, CU-19, CU-20)

create table public.publicaciones (
  id bigint generated always as identity primary key,
  autor_id uuid references public.perfiles (id) on delete set null,
  texto text not null default '',
  imagenes text[] not null default '{}',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint publicaciones_no_vacia check (btrim(texto) <> '' or cardinality(imagenes) > 0)
);

comment on table public.publicaciones is 'Publicaciones del feed; solo las crean administradores.';
comment on column public.publicaciones.imagenes is 'Rutas de las imágenes en Storage, en orden.';

create index publicaciones_creado_en_idx on public.publicaciones (creado_en desc);
create index publicaciones_autor_id_idx on public.publicaciones (autor_id);

create trigger publicaciones_actualizado_en
  before update on public.publicaciones
  for each row execute function public.fijar_actualizado_en();

create table public.comentarios (
  id bigint generated always as identity primary key,
  publicacion_id bigint not null references public.publicaciones (id) on delete cascade,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  texto text not null check (btrim(texto) <> '' and char_length(texto) <= 2000),
  creado_en timestamptz not null default now()
);

create index comentarios_publicacion_idx on public.comentarios (publicacion_id, creado_en);
create index comentarios_usuario_id_idx on public.comentarios (usuario_id);

create table public.me_gusta (
  publicacion_id bigint not null references public.publicaciones (id) on delete cascade,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (publicacion_id, usuario_id)
);

comment on table public.me_gusta is 'Un «Me gusta» por usuario y publicación (no aplica a comentarios).';

create index me_gusta_usuario_id_idx on public.me_gusta (usuario_id);

create table public.oraciones_en_vivo (
  id bigint generated always as identity primary key,
  fecha date not null unique,
  hora time not null,
  titulo text not null check (btrim(titulo) <> ''),
  enlace_meet text not null check (enlace_meet ~ '^https://meet\.google\.com/[A-Za-z0-9-]+'),
  creado_por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table public.oraciones_en_vivo is
  'Una oración en vivo por día; el título es el nombre del oficio de ese día.';

create index oraciones_en_vivo_creado_por_idx on public.oraciones_en_vivo (creado_por);

create trigger oraciones_en_vivo_actualizado_en
  before update on public.oraciones_en_vivo
  for each row execute function public.fijar_actualizado_en();

create table public.asistencias (
  oracion_en_vivo_id bigint not null references public.oraciones_en_vivo (id) on delete cascade,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (oracion_en_vivo_id, usuario_id)
);

comment on table public.asistencias is 'Confirmaciones de asistencia a la oración en vivo.';

create index asistencias_usuario_id_idx on public.asistencias (usuario_id);

create view public.publicaciones_con_conteos
with (security_invoker = true)
as
select
  p.id,
  p.autor_id,
  p.texto,
  p.imagenes,
  p.creado_en,
  p.actualizado_en,
  (select count(*) from public.comentarios c where c.publicacion_id = p.id) as total_comentarios,
  (select count(*) from public.me_gusta m where m.publicacion_id = p.id) as total_me_gusta
from public.publicaciones p;

comment on view public.publicaciones_con_conteos is
  'Publicaciones con su número de comentarios y de «Me gusta» (feed y portal).';
