begin;
select plan(9);

select trigger_is(
  'auth', 'users', 'al_crear_usuario',
  'public', 'crear_perfil_de_usuario',
  'auth.users tiene el trigger que crea el perfil'
);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000009a1', 'ana@ejemplo.co', '{"nombre":"  Ana María  "}'),
  ('00000000-0000-0000-0000-0000000009a2', 'luis.perez@ejemplo.co', '{}'),
  ('00000000-0000-0000-0000-0000000009a3', 'intruso@ejemplo.co', '{"nombre":"Intruso","rol":"administrador"}');

select is(
  (select count(*)::int from public.perfiles
    where id in ('00000000-0000-0000-0000-0000000009a1',
                 '00000000-0000-0000-0000-0000000009a2',
                 '00000000-0000-0000-0000-0000000009a3')),
  3,
  'cada registro crea exactamente un perfil'
);

select is(
  (select nombre from public.perfiles where id = '00000000-0000-0000-0000-0000000009a1'),
  'Ana María',
  'el perfil toma el nombre del formulario sin espacios sobrantes'
);

select is(
  (select correo::text from public.perfiles where id = '00000000-0000-0000-0000-0000000009a1'),
  'ana@ejemplo.co',
  'el perfil guarda el correo de la cuenta'
);

select is(
  (select nombre from public.perfiles where id = '00000000-0000-0000-0000-0000000009a2'),
  'luis.perez',
  'sin nombre, usa la parte del correo antes de la @'
);

select is(
  (select rol::text from public.perfiles where id = '00000000-0000-0000-0000-0000000009a3'),
  'usuario',
  'el rol enviado en los metadatos se ignora: todo registro es usuario'
);

select is(
  (select bloqueado from public.perfiles where id = '00000000-0000-0000-0000-0000000009a3'),
  false,
  'un perfil nuevo no está bloqueado'
);

update auth.users set email = 'ana.maria@ejemplo.co'
  where id = '00000000-0000-0000-0000-0000000009a1';

select is(
  (select correo::text from public.perfiles where id = '00000000-0000-0000-0000-0000000009a1'),
  'ana.maria@ejemplo.co',
  'cambiar el correo en Auth lo actualiza en el perfil'
);

delete from auth.users where id = '00000000-0000-0000-0000-0000000009a2';

select is_empty(
  $$select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000009a2'$$,
  'borrar la cuenta borra su perfil'
);

select * from finish();
rollback;
