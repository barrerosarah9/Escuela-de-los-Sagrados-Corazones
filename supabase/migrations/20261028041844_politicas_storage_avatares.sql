create or replace function public.foto_perfil_visible(p_usuario_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles p
    where p.id::text = p_usuario_id
      and p.perfil_visible
  );
$$;

revoke execute on function public.foto_perfil_visible(text) from public, anon;
grant execute on function public.foto_perfil_visible(text) to authenticated;

create policy "avatares: leer propia, de perfiles visibles o como admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatares'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.foto_perfil_visible((storage.foldername(name))[1])
    or public.es_admin()
  )
);

create policy "avatares: subir en carpeta propia"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatares'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.usuario_activo()
);

create policy "avatares: reemplazar en carpeta propia"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatares'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatares'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.usuario_activo()
);

create policy "avatares: borrar en carpeta propia"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatares'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.usuario_activo()
);
