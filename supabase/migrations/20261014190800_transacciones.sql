-- T-007 · Transacciones de Wompi (CU-12, CU-13, CU-26, CU-31, CU-32, CU-38)
-- Cada pago (donación única, cobro de una donación mensual o compra) es una transacción.

create type public.tipo_transaccion as enum ('donacion_unica', 'donacion_mensual', 'compra');

create type public.estado_transaccion as enum ('pendiente', 'aprobada', 'rechazada', 'anulada', 'error');

create table public.transacciones (
  id uuid primary key default gen_random_uuid(),
  referencia text not null unique,
  wompi_id text unique,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  tipo public.tipo_transaccion not null,
  donacion_mensual_id uuid references public.donaciones_mensuales (id) on delete cascade,
  pedido_id uuid references public.pedidos (id) on delete cascade,
  monto_centavos bigint not null check (monto_centavos > 0),
  moneda char(3) not null default 'COP',
  medio_pago public.medio_pago,
  estado public.estado_transaccion not null default 'pendiente',
  comprobante_enviado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint transacciones_donacion_mensual_segun_tipo
    check ((tipo = 'donacion_mensual') = (donacion_mensual_id is not null)),
  constraint transacciones_pedido_segun_tipo
    check ((tipo = 'compra') = (pedido_id is not null))
);

comment on table public.transacciones is 'Pagos procesados por Wompi y su estado.';
comment on column public.transacciones.referencia is 'Referencia única que se envía a Wompi.';
comment on column public.transacciones.wompi_id is 'Id de la transacción en Wompi (llega con el webhook).';
comment on column public.transacciones.medio_pago is 'Medio usado; puede llegar con el webhook.';
comment on column public.transacciones.comprobante_enviado_en is
  'Momento en que se envió el comprobante; evita enviarlo dos veces.';

create index transacciones_usuario_id_idx on public.transacciones (usuario_id);
create index transacciones_tipo_creado_en_idx on public.transacciones (tipo, creado_en desc);
create index transacciones_donacion_mensual_id_idx on public.transacciones (donacion_mensual_id);
create index transacciones_pedido_id_idx on public.transacciones (pedido_id);

create trigger transacciones_actualizado_en
  before update on public.transacciones
  for each row execute function public.fijar_actualizado_en();
