begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('ffffffff-0000-4000-8000-000000000001', 'admin.push@prueba.local', '{"nombre": "Administrador"}'),
  ('ffffffff-0000-4000-8000-000000000002', 'usuario.push@prueba.local', '{"nombre": "Usuario"}');

update public.perfiles
set rol = 'administrador'
where id = 'ffffffff-0000-4000-8000-000000000001';

insert into public.envios_push (titulo, texto, pantalla, destinatarios, enviados)
values ('[PRUEBA T-049] Título', 'Texto', '/', 1, 1);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.envios_push'::regclass),
  'envios_push tiene RLS activo'
);

set local role authenticated;
set local request.jwt.claims to '{"sub": "ffffffff-0000-4000-8000-000000000002", "role": "authenticated"}';

select is(
  (select count(*)::int from public.envios_push where titulo = '[PRUEBA T-049] Título'),
  0,
  'Usuario: no ve el registro de envíos'
);

select throws_ok(
  $$insert into public.envios_push (titulo, texto, pantalla) values ('x', 'y', '/')$$,
  '42501', null,
  'Usuario: no puede registrar envíos'
);

set local request.jwt.claims to '{"sub": "ffffffff-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(
  (select count(*)::int from public.envios_push where titulo = '[PRUEBA T-049] Título'),
  1,
  'Administrador: ve el registro de envíos'
);

select throws_ok(
  $$insert into public.envios_push (titulo, texto, pantalla) values ('x', 'y', '/')$$,
  '42501', null,
  'Administrador: tampoco registra envíos (solo la Edge Function)'
);

select * from finish();

rollback;
