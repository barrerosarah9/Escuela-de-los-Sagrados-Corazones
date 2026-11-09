begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('eeeeeeee-0000-4000-8000-000000000001', 'token.a@prueba.local', '{"nombre": "Usuario A"}'),
  ('eeeeeeee-0000-4000-8000-000000000002', 'token.b@prueba.local', '{"nombre": "Usuario B"}');

set local role authenticated;
set local request.jwt.claims to '{"sub": "eeeeeeee-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$select public.registrar_token_dispositivo('prueba-t050-token', 'android')$$,
  'Usuario A: registra su token'
);

select is(
  (select usuario_id::text from public.tokens_dispositivo where token = 'prueba-t050-token'),
  'eeeeeeee-0000-4000-8000-000000000001',
  'El token queda a nombre del usuario A'
);

select lives_ok(
  $$select public.registrar_token_dispositivo('prueba-t050-token', 'android')$$,
  'Usuario A: registrar el mismo token otra vez no falla'
);

set local request.jwt.claims to '{"sub": "eeeeeeee-0000-4000-8000-000000000002", "role": "authenticated"}';

select lives_ok(
  $$select public.registrar_token_dispositivo('prueba-t050-token', 'android')$$,
  'Usuario B: registra el mismo token en el mismo teléfono'
);

select is(
  (select count(*)::int from public.tokens_dispositivo where token = 'prueba-t050-token' and usuario_id = 'eeeeeeee-0000-4000-8000-000000000002'),
  1,
  'Usuario B en el mismo teléfono: el token pasa a su nombre'
);

select throws_ok(
  $$select public.registrar_token_dispositivo('   ', 'android')$$,
  '22023', null,
  'Un token vacío se rechaza'
);

delete from public.tokens_dispositivo where token = 'prueba-t050-token';

select is(
  (select count(*)::int from public.tokens_dispositivo where token = 'prueba-t050-token'),
  0,
  'Usuario B: borra su token al cerrar sesión'
);

reset role;
set local role anon;
set local request.jwt.claims to '{"role": "anon"}';

select throws_ok(
  $$select public.registrar_token_dispositivo('prueba-t050-otro', 'android')$$,
  '42501', null,
  'Sin sesión no se puede registrar un token'
);

select * from finish();

rollback;
