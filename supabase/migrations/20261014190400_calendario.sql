-- T-007 · Calendario de contenidos y asignación de oficios por día (CU-22, CU-23, CU-28)
--
-- calendario_dias         → un registro por fecha programada
-- calendario_contenidos   → las cinco oraciones que cambian a diario y la imagen del widget
-- asignaciones_oficios    → oficio de la semana, oraciones del mes y consagraciones del año

create table public.calendario_dias (
  fecha date primary key,
  publicado_en timestamptz,
  creado_por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table public.calendario_dias is 'Días programados en el calendario del portal.';
comment on column public.calendario_dias.publicado_en is
  'Momento en que pg_cron publicó el día; NULL = aún no publicado.';

create index calendario_dias_creado_por_idx on public.calendario_dias (creado_por);

create trigger calendario_dias_actualizado_en
  before update on public.calendario_dias
  for each row execute function public.fijar_actualizado_en();

create table public.calendario_contenidos (
  fecha date not null references public.calendario_dias (fecha) on delete cascade,
  oracion_id smallint not null,
  contenido_id bigint not null,
  primary key (fecha, oracion_id),
  constraint calendario_contenidos_contenido_fk foreign key (contenido_id, oracion_id)
    references public.contenidos (id, oracion_id) on delete cascade
);

comment on table public.calendario_contenidos is
  'Contenido elegido para cada oración diaria (no fija) y para la imagen del widget.';

create index calendario_contenidos_contenido_idx
  on public.calendario_contenidos (contenido_id, oracion_id);

create table public.asignaciones_oficios (
  fecha date not null references public.calendario_dias (fecha) on delete cascade,
  oracion_id smallint not null,
  contenido_id bigint not null,
  primary key (fecha, oracion_id),
  constraint asignaciones_oficios_contenido_fk foreign key (contenido_id, oracion_id)
    references public.contenidos (id, oracion_id) on delete cascade
);

comment on table public.asignaciones_oficios is
  'Variante asignada a un día: oficio de la semana, oración del mes o consagración del año (con su día).';

create index asignaciones_oficios_contenido_idx
  on public.asignaciones_oficios (contenido_id, oracion_id);

create or replace function public.validar_asignacion_calendario()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_oracion public.oraciones%rowtype;
begin
  select * into v_oracion from public.oraciones where id = new.oracion_id;
  if not found then
    raise exception 'La oración % no existe', new.oracion_id using errcode = '23503';
  end if;

  if tg_table_name = 'calendario_contenidos' then
    if v_oracion.seccion not in ('dia', 'widget') or v_oracion.es_fija then
      raise exception '«%» no se programa como contenido diario', v_oracion.nombre
        using errcode = '23514';
    end if;
  else
    if v_oracion.seccion not in ('semana', 'mes', 'anio') then
      raise exception '«%» no es un oficio de la semana, del mes ni del año', v_oracion.nombre
        using errcode = '23514';
    end if;

    if v_oracion.seccion in ('semana', 'mes')
       and extract(isodow from new.fecha) <> v_oracion.dia_semana then
      raise exception '«%» no corresponde al día de la semana de %', v_oracion.nombre, new.fecha
        using errcode = '23514';
    end if;

    if v_oracion.seccion = 'mes' and extract(day from new.fecha) > 7 then
      raise exception '«%» solo se asigna en la primera semana del mes', v_oracion.nombre
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger calendario_contenidos_validar
  before insert or update on public.calendario_contenidos
  for each row execute function public.validar_asignacion_calendario();

create trigger asignaciones_oficios_validar
  before insert or update on public.asignaciones_oficios
  for each row execute function public.validar_asignacion_calendario();
