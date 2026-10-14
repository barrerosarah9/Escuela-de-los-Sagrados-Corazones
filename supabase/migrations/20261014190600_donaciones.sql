-- T-007 · Donaciones mensuales (CU-13, CU-14, CU-32)
-- Un usuario puede tener varias donaciones mensuales activas y cancelar cada una por separado.

create type public.estado_donacion as enum ('activa', 'cancelada', 'suspendida');

create table public.donaciones_mensuales (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  monto_centavos bigint not null check (monto_centavos > 0),
  medio_pago public.medio_pago not null check (medio_pago <> 'pse'),
  wompi_fuente_pago_id text not null,
  estado public.estado_donacion not null default 'activa',
  proximo_cobro date,
  cancelada_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint donaciones_activa_con_proximo_cobro
    check (estado <> 'activa' or proximo_cobro is not null),
  constraint donaciones_cancelada_con_fecha
    check ((estado = 'cancelada') = (cancelada_en is not null))
);

comment on table public.donaciones_mensuales is
  'Donaciones recurrentes mensuales con su fuente de pago en Wompi (PSE no admite recurrencia).';
comment on column public.donaciones_mensuales.monto_centavos is 'Monto en centavos de peso (COP), como lo usa Wompi.';

create index donaciones_mensuales_usuario_id_idx on public.donaciones_mensuales (usuario_id);
create index donaciones_mensuales_por_cobrar_idx
  on public.donaciones_mensuales (proximo_cobro)
  where estado = 'activa';

create trigger donaciones_mensuales_actualizado_en
  before update on public.donaciones_mensuales
  for each row execute function public.fijar_actualizado_en();
