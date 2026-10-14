-- T-007 · Racha, eventos de uso y tokens de dispositivo (CU-11, CU-29, CU-33, CU-35)

create table public.dias_oracion (
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  fecha date not null,
  creado_en timestamptz not null default now(),
  primary key (usuario_id, fecha)
);

comment on table public.dias_oracion is
  'Días en que el usuario abrió al menos una oración de Santifica el día (fecha en hora de Colombia); base de la racha.';

create type public.tipo_evento as enum ('apertura_app', 'oracion_consultada');

create table public.eventos (
  id bigint generated always as identity primary key,
  usuario_id uuid references public.perfiles (id) on delete cascade,
  tipo public.tipo_evento not null,
  oracion_id smallint references public.oraciones (id) on delete set null,
  contenido_id bigint references public.contenidos (id) on delete set null,
  creado_en timestamptz not null default now()
);

comment on table public.eventos is
  'Eventos de uso para estadísticas; solo se registran si el usuario permite la analítica.';

create index eventos_tipo_creado_en_idx on public.eventos (tipo, creado_en desc);
create index eventos_usuario_id_idx on public.eventos (usuario_id);
create index eventos_oracion_id_idx on public.eventos (oracion_id);
create index eventos_contenido_id_idx on public.eventos (contenido_id);

create type public.plataforma_dispositivo as enum ('ios', 'android');

create table public.tokens_dispositivo (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  token text not null unique,
  plataforma public.plataforma_dispositivo not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table public.tokens_dispositivo is 'Tokens de FCM para notificaciones push.';

create index tokens_dispositivo_usuario_id_idx on public.tokens_dispositivo (usuario_id);

create trigger tokens_dispositivo_actualizado_en
  before update on public.tokens_dispositivo
  for each row execute function public.fijar_actualizado_en();
