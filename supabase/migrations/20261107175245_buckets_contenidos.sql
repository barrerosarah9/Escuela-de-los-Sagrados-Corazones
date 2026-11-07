insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'contenidos-imagenes',
    'contenidos-imagenes',
    false,
    5242880,
    array['image/jpeg', 'image/png']
  ),
  (
    'contenidos-pdf',
    'contenidos-pdf',
    false,
    10485760,
    array['application/pdf']
  )
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.ruta_contenido_valida(p_bucket text, p_ruta text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    array_length(storage.foldername(p_ruta), 1) = 2
    and exists (
      select 1
      from public.oraciones o
      where o.seccion::text = (storage.foldername(p_ruta))[1]
        and o.clave = (storage.foldername(p_ruta))[2]
        and (p_bucket <> 'contenidos-pdf' or o.seccion <> 'widget')
    )
    and case p_bucket
      when 'contenidos-imagenes' then lower(storage.extension(p_ruta)) in ('jpg', 'jpeg', 'png')
      when 'contenidos-pdf' then lower(storage.extension(p_ruta)) = 'pdf'
      else false
    end;
$$;

comment on function public.ruta_contenido_valida(text, text) is
  'Ruta de la biblioteca: <seccion>/<clave de la oración>/<archivo> con la extensión del bucket (T-035).';

revoke execute on function public.ruta_contenido_valida(text, text) from public, anon;
grant execute on function public.ruta_contenido_valida(text, text) to authenticated;

create policy "contenidos: leer con sesión"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('contenidos-imagenes', 'contenidos-pdf')
);

create policy "contenidos: subir si es administrador"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('contenidos-imagenes', 'contenidos-pdf')
  and public.es_admin()
  and public.ruta_contenido_valida(bucket_id, name)
);

create policy "contenidos: reemplazar si es administrador"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('contenidos-imagenes', 'contenidos-pdf')
  and public.es_admin()
)
with check (
  bucket_id in ('contenidos-imagenes', 'contenidos-pdf')
  and public.es_admin()
  and public.ruta_contenido_valida(bucket_id, name)
);

create policy "contenidos: borrar si es administrador"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('contenidos-imagenes', 'contenidos-pdf')
  and public.es_admin()
);
