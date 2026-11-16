create or replace function public.total_me_gusta(p_publicacion_id bigint)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)
  from public.me_gusta m
  where m.publicacion_id = p_publicacion_id;
$$;

comment on function public.total_me_gusta(bigint) is
  'Número de «Me gusta» de una publicación, sin revelar quiénes los dieron (T-097).';

revoke execute on function public.total_me_gusta(bigint) from public, anon;
grant execute on function public.total_me_gusta(bigint) to authenticated;

create or replace view public.publicaciones_con_conteos
with (security_invoker = true)
as
select
  p.id,
  p.autor_id,
  p.texto,
  p.imagenes,
  p.creado_en,
  p.actualizado_en,
  (select count(*) from public.comentarios c where c.publicacion_id = p.id) as total_comentarios,
  public.total_me_gusta(p.id) as total_me_gusta,
  exists (
    select 1
    from public.me_gusta m
    where m.publicacion_id = p.id
      and m.usuario_id = (select auth.uid())
  ) as me_gusta_propio
from public.publicaciones p;

comment on view public.publicaciones_con_conteos is
  'Publicaciones con su número de comentarios y de «Me gusta», y si el usuario actual ya dio «Me gusta» (feed, detalle y portal).';

drop policy "me_gusta: leer" on public.me_gusta;

create policy "me_gusta: leer los propios"
  on public.me_gusta for select to authenticated
  using (usuario_id = (select auth.uid()));
