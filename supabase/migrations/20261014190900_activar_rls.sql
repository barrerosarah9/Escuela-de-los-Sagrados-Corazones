-- T-007 · RLS activado en todas las tablas
-- Sin políticas, la clave pública no puede leer ni escribir nada; las políticas por rol
-- (usuario / administrador) se agregan en T-008.

alter table public.perfiles               enable row level security;
alter table public.publicaciones          enable row level security;
alter table public.comentarios            enable row level security;
alter table public.me_gusta               enable row level security;
alter table public.oraciones_en_vivo      enable row level security;
alter table public.asistencias            enable row level security;
alter table public.oraciones              enable row level security;
alter table public.contenidos             enable row level security;
alter table public.calendario_dias        enable row level security;
alter table public.calendario_contenidos  enable row level security;
alter table public.asignaciones_oficios   enable row level security;
alter table public.dias_oracion           enable row level security;
alter table public.eventos                enable row level security;
alter table public.tokens_dispositivo     enable row level security;
alter table public.donaciones_mensuales   enable row level security;
alter table public.tipos_articulo         enable row level security;
alter table public.articulos              enable row level security;
alter table public.pedidos                enable row level security;
alter table public.pedido_items           enable row level security;
alter table public.transacciones          enable row level security;
