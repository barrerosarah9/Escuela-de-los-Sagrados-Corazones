begin;

create extension if not exists pgtap with schema extensions;

select no_plan();

delete from public.contenidos
where oracion_id in (select id from public.oraciones where clave in ('divina-cita', 'oracion-noche', 'jaculatorias'));

insert into public.contenidos (oracion_id, nombre, numero, youtube_url)
select id, 'Jaculatorias T-037', 9001, 'https://www.youtube.com/watch?v=jNQXAC9IVRw'
from public.oraciones where clave = 'jaculatorias';

insert into public.contenidos (oracion_id, nombre, youtube_url)
select id, 'Divina Cita T-037', 'https://www.youtube.com/watch?v=jNQXAC9IVRw'
from public.oraciones where clave = 'divina-cita';

select throws_ok(
  $$update public.contenidos
    set oracion_id = (select id from public.oraciones where clave = 'divina-cita'), numero = null
    where nombre = 'Jaculatorias T-037'$$,
  '23514', null,
  'Editar: no se puede mover un contenido a una oración fija llena'
);

select lives_ok(
  $$update public.contenidos
    set oracion_id = (select id from public.oraciones where clave = 'oracion-noche'), numero = null
    where nombre = 'Jaculatorias T-037'$$,
  'Editar: sí se puede mover a una oración fija con espacio'
);

select is(
  (select seccion::text from public.contenidos where nombre = 'Jaculatorias T-037'),
  'dia',
  'Editar: la sección se copia de la nueva oración'
);

select lives_ok(
  $$update public.contenidos set nombre = 'Divina Cita T-037 editada' where nombre = 'Divina Cita T-037'$$,
  'Editar: cambiar el nombre de una fija llena no cuenta como contenido nuevo'
);

select throws_ok(
  $$insert into public.contenidos (oracion_id, nombre, youtube_url)
    select id, 'Otra noche', 'https://www.youtube.com/watch?v=jNQXAC9IVRw'
    from public.oraciones where clave = 'oracion-noche'$$,
  '23514', null,
  'Insertar: el límite de las fijas se mantiene'
);

select * from finish();

rollback;
