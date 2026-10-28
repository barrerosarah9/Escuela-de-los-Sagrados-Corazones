insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'avatares',
    'avatares',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'marca',
    'marca',
    true,
    2097152,
    array['image/png', 'image/jpeg', 'image/webp']
  )
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
