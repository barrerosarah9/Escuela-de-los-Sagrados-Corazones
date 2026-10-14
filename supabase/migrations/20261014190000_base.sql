-- T-007 · Base común del modelo de datos

create or replace function public.fijar_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

comment on function public.fijar_actualizado_en() is
  'Actualiza la columna actualizado_en en cada UPDATE.';

create type public.rol_usuario as enum ('usuario', 'administrador');

create type public.medio_pago as enum ('tarjeta', 'pse', 'nequi', 'daviplata');
