create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles p
    where p.id = (select auth.uid())
      and p.rol = 'administrador'
      and not p.bloqueado
  );
$$;

create or replace function public.usuario_activo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles p
    where p.id = (select auth.uid())
      and not p.bloqueado
  );
$$;

revoke execute on function public.es_admin() from public, anon;
revoke execute on function public.usuario_activo() from public, anon;
grant execute on function public.es_admin() to authenticated;
grant execute on function public.usuario_activo() to authenticated;


create or replace function public.proteger_campos_perfil()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.correo is distinct from old.correo
     or new.creado_en is distinct from old.creado_en then
    raise exception 'El id, el correo y la fecha de creación del perfil no se pueden modificar'
      using errcode = '42501';
  end if;

  if (new.rol is distinct from old.rol or new.bloqueado is distinct from old.bloqueado)
     and (not public.es_admin() or new.id = (select auth.uid())) then
    raise exception 'Solo otro administrador puede cambiar el rol o el bloqueo de una cuenta'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger proteger_campos_perfil
  before update on public.perfiles
  for each row execute function public.proteger_campos_perfil();


create policy "perfiles: ver el propio o todos si es administrador"
  on public.perfiles for select to authenticated
  using (id = (select auth.uid()) or (select public.es_admin()));

create policy "perfiles: editar el propio o cualquiera si es administrador"
  on public.perfiles for update to authenticated
  using (id = (select auth.uid()) or (select public.es_admin()))
  with check (id = (select auth.uid()) or (select public.es_admin()));

create view public.perfiles_publicos as
select
  p.id,
  case when p.perfil_visible then p.nombre end as nombre,
  case when p.perfil_visible then p.foto_path end as foto_path
from public.perfiles p;

revoke all on public.perfiles_publicos from public, anon, authenticated;
grant select on public.perfiles_publicos to authenticated;


create policy "publicaciones: leer"
  on public.publicaciones for select to authenticated
  using (true);

create policy "publicaciones: crear si es administrador"
  on public.publicaciones for insert to authenticated
  with check ((select public.es_admin()) and autor_id = (select auth.uid()));

create policy "publicaciones: editar si es administrador"
  on public.publicaciones for update to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

create policy "publicaciones: borrar si es administrador"
  on public.publicaciones for delete to authenticated
  using ((select public.es_admin()));

alter view public.publicaciones_con_conteos set (security_invoker = true);
revoke all on public.publicaciones_con_conteos from anon;


create policy "comentarios: leer"
  on public.comentarios for select to authenticated
  using (true);

create policy "comentarios: crear los propios"
  on public.comentarios for insert to authenticated
  with check (usuario_id = (select auth.uid()) and (select public.usuario_activo()));

create policy "comentarios: borrar los propios o cualquiera si es administrador"
  on public.comentarios for delete to authenticated
  using (usuario_id = (select auth.uid()) or (select public.es_admin()));


create policy "me_gusta: leer"
  on public.me_gusta for select to authenticated
  using (true);

create policy "me_gusta: crear los propios"
  on public.me_gusta for insert to authenticated
  with check (usuario_id = (select auth.uid()) and (select public.usuario_activo()));

create policy "me_gusta: borrar los propios"
  on public.me_gusta for delete to authenticated
  using (usuario_id = (select auth.uid()));


create policy "oraciones_en_vivo: leer"
  on public.oraciones_en_vivo for select to authenticated
  using (true);

create policy "oraciones_en_vivo: administrar"
  on public.oraciones_en_vivo for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));


create policy "asistencias: ver las propias o todas si es administrador"
  on public.asistencias for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.es_admin()));

create policy "asistencias: confirmar las propias"
  on public.asistencias for insert to authenticated
  with check (usuario_id = (select auth.uid()) and (select public.usuario_activo()));

create policy "asistencias: cancelar las propias"
  on public.asistencias for delete to authenticated
  using (usuario_id = (select auth.uid()));


create policy "oraciones: leer"
  on public.oraciones for select to authenticated
  using (true);


create policy "contenidos: leer"
  on public.contenidos for select to authenticated
  using (true);

create policy "contenidos: administrar"
  on public.contenidos for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));


create policy "calendario_dias: leer los publicados o todos si es administrador"
  on public.calendario_dias for select to authenticated
  using (publicado_en is not null or (select public.es_admin()));

create policy "calendario_dias: administrar"
  on public.calendario_dias for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

create policy "calendario_contenidos: leer los de días publicados o todos si es administrador"
  on public.calendario_contenidos for select to authenticated
  using (
    (select public.es_admin())
    or exists (
      select 1
      from public.calendario_dias d
      where d.fecha = calendario_contenidos.fecha
        and d.publicado_en is not null
    )
  );

create policy "calendario_contenidos: administrar"
  on public.calendario_contenidos for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

create policy "asignaciones_oficios: leer las de días publicados o todas si es administrador"
  on public.asignaciones_oficios for select to authenticated
  using (
    (select public.es_admin())
    or exists (
      select 1
      from public.calendario_dias d
      where d.fecha = asignaciones_oficios.fecha
        and d.publicado_en is not null
    )
  );

create policy "asignaciones_oficios: administrar"
  on public.asignaciones_oficios for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));


create policy "dias_oracion: ver los propios o todos si es administrador"
  on public.dias_oracion for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.es_admin()));

create policy "dias_oracion: registrar el día de hoy"
  on public.dias_oracion for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and fecha = (now() at time zone 'America/Bogota')::date
    and (select public.usuario_activo())
  );


create policy "eventos: ver si es administrador"
  on public.eventos for select to authenticated
  using ((select public.es_admin()));

create policy "eventos: registrar los propios si acepta la analítica"
  on public.eventos for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and exists (
      select 1
      from public.perfiles p
      where p.id = (select auth.uid())
        and p.analitica_uso
    )
  );


create policy "tokens_dispositivo: administrar los propios"
  on public.tokens_dispositivo for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));


create policy "donaciones_mensuales: ver las propias o todas si es administrador"
  on public.donaciones_mensuales for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.es_admin()));


create policy "tipos_articulo: leer"
  on public.tipos_articulo for select to authenticated
  using (true);

create policy "tipos_articulo: administrar"
  on public.tipos_articulo for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

create policy "articulos: leer los visibles o todos si es administrador"
  on public.articulos for select to authenticated
  using (visible or (select public.es_admin()));

create policy "articulos: administrar"
  on public.articulos for all to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));


create policy "pedidos: ver los propios o todos si es administrador"
  on public.pedidos for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.es_admin()));

create policy "pedidos: el administrador cambia el estado de envío"
  on public.pedidos for update to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()) and estado in ('enviado', 'entregado'));

revoke update on public.pedidos from authenticated;
grant update (estado) on public.pedidos to authenticated;

create policy "pedido_items: ver los de pedidos propios o todos si es administrador"
  on public.pedido_items for select to authenticated
  using (
    (select public.es_admin())
    or exists (
      select 1
      from public.pedidos p
      where p.id = pedido_items.pedido_id
        and p.usuario_id = (select auth.uid())
    )
  );


create policy "transacciones: ver las propias o todas si es administrador"
  on public.transacciones for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.es_admin()));