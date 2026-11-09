create table public.envios_push (
  id bigint generated always as identity primary key,
  titulo text not null,
  texto text not null,
  pantalla text not null,
  destinatarios integer not null default 0,
  enviados integer not null default 0,
  invalidos integer not null default 0,
  fallidos integer not null default 0,
  fallos jsonb not null default '[]'::jsonb,
  error text,
  creado_en timestamptz not null default now()
);

comment on table public.envios_push is
  'Registro de cada envío push de la Edge Function enviar-push (T-049): totales, tokens inválidos borrados y fallos.';

comment on column public.envios_push.fallos is
  'Un objeto por token inválido o fallido: usuario_id, estado, codigo, mensaje e intentos. No guarda el token.';

create index envios_push_creado_en_idx on public.envios_push (creado_en desc);

alter table public.envios_push enable row level security;

create policy "envios_push: leer si es administrador"
  on public.envios_push for select to authenticated
  using ((select public.es_admin()));
