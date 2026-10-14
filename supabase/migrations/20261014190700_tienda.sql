-- T-007 · Tienda: tipos de artículo, artículos, pedidos e ítems (CU-36 a CU-41)
-- El carrito vive en el dispositivo; solo se guarda el pedido al pagar.

create table public.tipos_articulo (
  clave text primary key check (clave ~ '^[a-z_]+$'),
  nombre text not null,
  orden smallint not null default 0
);

comment on table public.tipos_articulo is
  'Tipos de artículo de la tienda; la clienta puede pedir más (se agregan con una migración).';

insert into public.tipos_articulo (clave, nombre, orden) values
  ('libro',            'Libro',            1),
  ('rosario',          'Rosario',          2),
  ('figura_religiosa', 'Figura religiosa', 3),
  ('medalla',          'Medalla',          4),
  ('otro',             'Otro',             5);

create table public.articulos (
  id bigint generated always as identity primary key,
  tipo text not null references public.tipos_articulo (clave) on update cascade on delete restrict,
  nombre text not null check (btrim(nombre) <> ''),
  autor text,
  categoria text,
  formato text,
  descripcion text not null default '',
  detalles text not null default '',
  precio_centavos bigint not null check (precio_centavos > 0),
  unidades_disponibles integer not null default 0 check (unidades_disponibles >= 0),
  imagen_path text,
  visible boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint articulos_campos_de_libro check (
    case
      when tipo = 'libro' then autor is not null and categoria is not null and formato is not null
      else autor is null and categoria is null and formato is null
    end
  )
);

comment on table public.articulos is 'Artículos físicos a la venta (libros y artículos religiosos).';
comment on column public.articulos.nombre is 'Título si es un libro; nombre del artículo en los demás tipos.';
comment on column public.articulos.imagen_path is 'Portada del libro o foto del artículo en Storage.';
comment on column public.articulos.visible is 'FALSE = oculto en la tienda sin borrar sus pedidos.';

create index articulos_tipo_idx on public.articulos (tipo);

create trigger articulos_actualizado_en
  before update on public.articulos
  for each row execute function public.fijar_actualizado_en();

create or replace function public.impedir_cambio_tipo_articulo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tipo is distinct from old.tipo then
    raise exception 'El tipo de un artículo no se puede cambiar después de crearlo'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger articulos_tipo_inmutable
  before update of tipo on public.articulos
  for each row execute function public.impedir_cambio_tipo_articulo();

create type public.estado_pedido as enum ('pendiente_pago', 'pagado', 'rechazado', 'enviado', 'entregado');

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  contacto_nombre text not null check (btrim(contacto_nombre) <> ''),
  contacto_correo text not null check (contacto_correo ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contacto_telefono text not null check (contacto_telefono ~ '^\+?[0-9 ]{7,20}$'),
  envio_direccion text not null check (btrim(envio_direccion) <> ''),
  envio_ciudad text not null check (btrim(envio_ciudad) <> ''),
  envio_departamento text not null check (btrim(envio_departamento) <> ''),
  subtotal_centavos bigint not null check (subtotal_centavos > 0),
  costo_envio_centavos bigint not null check (costo_envio_centavos >= 0),
  total_centavos bigint not null,
  estado public.estado_pedido not null default 'pendiente_pago',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint pedidos_total_cuadra check (total_centavos = subtotal_centavos + costo_envio_centavos)
);

comment on table public.pedidos is 'Compras de la tienda con sus datos de contacto y envío.';

create index pedidos_usuario_id_idx on public.pedidos (usuario_id);
create index pedidos_estado_creado_en_idx on public.pedidos (estado, creado_en desc);

create trigger pedidos_actualizado_en
  before update on public.pedidos
  for each row execute function public.fijar_actualizado_en();

create table public.pedido_items (
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  articulo_id bigint not null references public.articulos (id) on delete restrict,
  nombre text not null,
  cantidad integer not null check (cantidad > 0),
  precio_unitario_centavos bigint not null check (precio_unitario_centavos > 0),
  primary key (pedido_id, articulo_id)
);

comment on table public.pedido_items is
  'Artículos de cada pedido; nombre y precio se copian al comprar. Un artículo con pedidos no se puede borrar.';

create index pedido_items_articulo_id_idx on public.pedido_items (articulo_id);
