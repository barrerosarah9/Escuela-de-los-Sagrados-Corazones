begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

insert into auth.users (id, email, raw_user_meta_data) values
  ('f9700000-0000-4000-8000-000000000001', 'uno.t097@prueba.local', '{"nombre": "Uno"}'),
  ('f9700000-0000-4000-8000-000000000002', 'dos.t097@prueba.local', '{"nombre": "Dos"}'),
  ('f9700000-0000-4000-8000-000000000003', 'bloqueado.t097@prueba.local', '{"nombre": "Bloqueado"}');

update public.perfiles
set bloqueado = true
where id = 'f9700000-0000-4000-8000-000000000003';

insert into public.publicaciones (texto) values ('Publicación T-097');

create temporary table publicacion_t097 on commit drop as
select id from public.publicaciones where texto = 'Publicación T-097';

grant select on publicacion_t097 to authenticated;

set local role authenticated;
set local request.jwt.claims to '{"sub": "f9700000-0000-4000-8000-000000000001", "role": "authenticated"}';

select is(
  (select me_gusta_propio from public.publicaciones_con_conteos where id = (select id from publicacion_t097)),
  false,
  'Vista: antes de reaccionar, me_gusta_propio es falso'
);

select lives_ok(
  $$insert into public.me_gusta (publicacion_id, usuario_id)
    values ((select id from publicacion_t097), 'f9700000-0000-4000-8000-000000000001')$$,
  'Dar: el usuario da «Me gusta»'
);

select is(
  (select array[total_me_gusta::int, me_gusta_propio::int]
   from public.publicaciones_con_conteos where id = (select id from publicacion_t097)),
  array[1, 1],
  'Vista: el contador sube a 1 y me_gusta_propio es verdadero'
);

select throws_ok(
  $$insert into public.me_gusta (publicacion_id, usuario_id)
    values ((select id from publicacion_t097), 'f9700000-0000-4000-8000-000000000001')$$,
  '23505',
  null,
  'Uno por usuario: un segundo «Me gusta» de la misma persona se rechaza'
);

select throws_ok(
  $$insert into public.me_gusta (publicacion_id, usuario_id)
    values ((select id from publicacion_t097), 'f9700000-0000-4000-8000-000000000002')$$,
  '42501',
  null,
  'RLS: no se puede dar «Me gusta» a nombre de otro usuario'
);

set local request.jwt.claims to '{"sub": "f9700000-0000-4000-8000-000000000002", "role": "authenticated"}';

select is(
  (select array[total_me_gusta::int, me_gusta_propio::int]
   from public.publicaciones_con_conteos where id = (select id from publicacion_t097)),
  array[1, 0],
  'Vista: otro usuario ve el contador pero no la marca propia'
);

select is(
  (select count(*)::int from public.me_gusta where publicacion_id = (select id from publicacion_t097)),
  0,
  'Privacidad: otro usuario no ve quién dio «Me gusta», solo el número'
);

select lives_ok(
  $$delete from public.me_gusta where publicacion_id = (select id from publicacion_t097)$$,
  'Quitar: borrar sin ser el dueño no falla'
);

reset role;

select is(
  (select count(*)::int from public.me_gusta where publicacion_id = (select id from publicacion_t097)),
  1,
  'RLS: el «Me gusta» de otro usuario no se borra'
);

set local role authenticated;
set local request.jwt.claims to '{"sub": "f9700000-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$delete from public.me_gusta
    where publicacion_id = (select id from publicacion_t097)
      and usuario_id = 'f9700000-0000-4000-8000-000000000001'$$,
  'Quitar: el usuario quita su «Me gusta»'
);

select is(
  (select array[total_me_gusta::int, me_gusta_propio::int]
   from public.publicaciones_con_conteos where id = (select id from publicacion_t097)),
  array[0, 0],
  'Vista: el contador baja a 0 y la marca desaparece'
);

set local request.jwt.claims to '{"sub": "f9700000-0000-4000-8000-000000000003", "role": "authenticated"}';

select throws_ok(
  $$insert into public.me_gusta (publicacion_id, usuario_id)
    values ((select id from publicacion_t097), 'f9700000-0000-4000-8000-000000000003')$$,
  '42501',
  null,
  'Bloqueado: un usuario bloqueado no puede dar «Me gusta»'
);

select * from finish();

rollback;
