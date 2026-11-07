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

  if v_oracion.max_contenidos is not null
     and (tg_op = 'INSERT' or new.oracion_id is distinct from old.oracion_id) then
    select count(*) into v_total
    from public.contenidos
    where oracion_id = new.oracion_id
      and id is distinct from new.id;
    if v_total >= v_oracion.max_contenidos then
      raise exception '«%» admite como máximo % contenido(s)', v_oracion.nombre, v_oracion.max_contenidos
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;
