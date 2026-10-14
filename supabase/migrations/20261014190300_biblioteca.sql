-- T-007 · Biblioteca: catálogo de oraciones y sus contenidos (CU-10, CU-21, CU-34)
--
-- «oraciones» es el catálogo fijo de lo que la app muestra:
--   dia    → las ocho de Santifica el día (tres fijas y cinco que cambian a diario)
--   semana → el oficio de cada día de la semana (sábado = Hora de María)
--   mes    → oraciones del primer jueves, viernes y sábado del mes
--   anio   → las tres consagraciones, cada una con sus días 1 a 30
--   widget → la imagen del widget
-- «contenidos» guarda cada variante (Lunes 3, Día 5, Hora de María de un sábado…)
-- con su PDF, su video de YouTube o su imagen.

create type public.seccion_oracion as enum ('dia', 'semana', 'mes', 'anio', 'widget');

create table public.oraciones (
  id smallint generated always as identity primary key,
  clave text not null unique check (clave ~ '^[a-z0-9-]+$'),
  nombre text not null,
  seccion public.seccion_oracion not null,
  es_fija boolean not null default false,
  max_contenidos smallint check (max_contenidos > 0),
  dia_semana smallint check (dia_semana between 1 and 7),
  orden smallint not null default 0,
  constraint oraciones_id_seccion_key unique (id, seccion),
  constraint oraciones_fija_solo_en_dia check (not es_fija or seccion = 'dia'),
  constraint oraciones_dia_semana_segun_seccion
    check ((seccion in ('semana', 'mes')) = (dia_semana is not null))
);

comment on table public.oraciones is 'Catálogo de oraciones de la app (datos de referencia).';
comment on column public.oraciones.es_fija is
  'Oración fija de Santifica el día: no se programa en el calendario, se edita en la biblioteca.';
comment on column public.oraciones.max_contenidos is
  'Límite de contenidos (solo oraciones fijas); NULL = sin límite.';
comment on column public.oraciones.dia_semana is
  'Día ISO (1 = lunes … 7 = domingo) del oficio de la semana o de la oración del mes.';

insert into public.oraciones (clave, nombre, seccion, es_fija, max_contenidos, dia_semana, orden) values
  ('oracion-iniciar-dia',       'Oración para iniciar el día',        'dia',    true,  2,    null, 1),
  ('divina-cita',               'Divina Cita',                        'dia',    true,  1,    null, 2),
  ('jaculatorias',              'Jaculatorias',                       'dia',    false, null, null, 3),
  ('evangelio-hoy',             'Evangelio de Hoy',                   'dia',    false, null, null, 4),
  ('santo-rosario-hoy',         'Santo Rosario de Hoy',               'dia',    false, null, null, 5),
  ('diario-espiritual',         'Diario Espiritual',                  'dia',    false, null, null, 6),
  ('hora-reparacion',           'Hora de reparación',                 'dia',    false, null, null, 7),
  ('oracion-noche',             'Oración de la Noche',                'dia',    true,  1,    null, 8),
  ('almas-purgatorio',          'Oración a las almas del purgatorio', 'semana', false, null, 1,    1),
  ('santos-angeles',            'Oración a los Santos Ángeles',       'semana', false, null, 2,    2),
  ('lirios-san-jose',           'Lirios de San José',                 'semana', false, null, 3,    3),
  ('hora-santa',                'Hora Santa',                         'semana', false, null, 4,    4),
  ('viacrucis',                 'Viacrucis',                          'semana', false, null, 5,    5),
  ('hora-maria',                'Hora de María',                      'semana', false, null, 6,    6),
  ('dolores-gozos-san-jose',    '7 Dolores y Gozos de San José',      'semana', false, null, 7,    7),
  ('primer-jueves',             'Primer jueves',                      'mes',    false, null, 4,    1),
  ('primeros-viernes-diurnos',  'Primeros viernes diurnos',           'mes',    false, null, 5,    2),
  ('vigilias-reparacion',       'Vigilias de reparación',             'mes',    false, null, 5,    3),
  ('primer-sabado',             'Primer sábado',                      'mes',    false, null, 6,    4),
  ('consagracion-san-jose',     'Consagración a San José',            'anio',   false, null, null, 1),
  ('consagracion-virgen-maria', 'Consagración a la Santísima Virgen María', 'anio', false, null, null, 2),
  ('consagracion-sagrado-corazon', 'Consagración al Sagrado Corazón de Jesús', 'anio', false, null, null, 3),
  ('imagen-widget',             'Imagen del widget',                  'widget', false, null, null, 1);

create table public.contenidos (
  id bigint generated always as identity primary key,
  oracion_id smallint not null,
  seccion public.seccion_oracion not null,
  nombre text not null check (btrim(nombre) <> ''),
  numero smallint check (numero > 0),
  fecha date,
  pdf_path text,
  youtube_url text check (youtube_url ~* '^https://((www|m)\.)?(youtube\.com|youtu\.be)/'),
  imagen_path text,
  creado_por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint contenidos_oracion_fk foreign key (oracion_id, seccion)
    references public.oraciones (id, seccion) on update cascade on delete restrict,
  constraint contenidos_id_oracion_key unique (id, oracion_id),
  constraint contenidos_numero_key unique (oracion_id, numero),
  constraint contenidos_fecha_key unique (oracion_id, fecha),
  constraint contenidos_algun_archivo check (coalesce(pdf_path, youtube_url, imagen_path) is not null),
  constraint contenidos_widget_solo_imagen
    check (seccion <> 'widget' or (pdf_path is null and youtube_url is null)),
  constraint contenidos_dia_consagracion
    check (seccion <> 'anio' or numero between 1 and 30),
  constraint contenidos_fecha_es_sabado
    check (fecha is null or (seccion = 'semana' and extract(isodow from fecha) = 6))
);

comment on table public.contenidos is 'Contenidos de la biblioteca (variantes de cada oración).';
comment on column public.contenidos.seccion is
  'Copia de oraciones.seccion; se completa sola al insertar y permite validar con CHECK.';
comment on column public.contenidos.numero is
  'Número de variante (Lunes 3) o día de la consagración (Día 5).';
comment on column public.contenidos.fecha is 'Sábado al que corresponde una Hora de María.';
comment on column public.contenidos.pdf_path is 'Ruta del PDF en Storage.';
comment on column public.contenidos.imagen_path is 'Ruta de la imagen en Storage.';

create index contenidos_creado_por_idx on public.contenidos (creado_por);

create trigger contenidos_actualizado_en
  before update on public.contenidos
  for each row execute function public.fijar_actualizado_en();

create or replace function public.validar_contenido()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_oracion public.oraciones%rowtype;
  v_total integer;
begin
  select * into v_oracion from public.oraciones where id = new.oracion_id;
  if not found then
    raise exception 'La oración % no existe', new.oracion_id using errcode = '23503';
  end if;

  new.seccion := v_oracion.seccion;

  if tg_op = 'INSERT' and v_oracion.max_contenidos is not null then
    select count(*) into v_total from public.contenidos where oracion_id = new.oracion_id;
    if v_total >= v_oracion.max_contenidos then
      raise exception '«%» admite como máximo % contenido(s)', v_oracion.nombre, v_oracion.max_contenidos
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger contenidos_validar
  before insert or update of oracion_id on public.contenidos
  for each row execute function public.validar_contenido();
