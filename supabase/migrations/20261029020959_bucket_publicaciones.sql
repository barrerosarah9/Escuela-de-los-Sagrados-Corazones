insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'publicaciones',
  'publicaciones',
  true,
  5242880,
  array['image/jpeg', 'image/png']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "publicaciones: listar si es administrador"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'publicaciones'
  and public.es_admin()
);

create policy "publicaciones: subir si es administrador"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'publicaciones'
  and public.es_admin()
);

create policy "publicaciones: reemplazar si es administrador"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'publicaciones'
  and public.es_admin()
)
with check (
  bucket_id = 'publicaciones'
  and public.es_admin()
);

create policy "publicaciones: borrar si es administrador"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'publicaciones'
  and public.es_admin()
);