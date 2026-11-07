# Búsqueda y filtros de la biblioteca · Portal (T-034)

Búsqueda por nombre y filtro por tipo en la Biblioteca del portal.
Historia: HU-39 · Caso de uso: CU-21 · Tarea de fase: F3-08 · Issue: #34.
Parte de la vista de [Biblioteca (T-033)](Biblioteca%20(T-033).md).

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `portal-admin/src/lib/biblioteca.ts` (`buscarContenidos`) | Busca en `contenidos` por nombre (`ilike`) y por sección, con paginación. |
| `portal-admin/src/App.tsx` (`BarraBusqueda`, `ResultadosBusqueda`, `Library`) | Buscador, selector de tipo, lista de resultados y estado vacío. |
| `portal-admin/src/index.css` | Estilos de la barra y de la lista de resultados. |

No hay migraciones nuevas.

## Comportamiento

- **Búsqueda por nombre:** encuentra los contenidos cuyo **nombre** contiene el texto, sin distinguir mayúsculas.
  - No busca en el nombre de la oración: «hora» encuentra las Horas de María, pero no los contenidos de la Hora
    Santa, que se llaman «Jueves 1», «Jueves 2»…
  - Espera 300 ms después de la última tecla antes de consultar.
  - La ✕ o la tecla Esc borran el texto.
  - Los espacios repetidos se ignoran y el texto se limita a 80 caracteres.
  - Los comodines `%` y `_` se buscan como caracteres normales.
- **Filtro por tipo (portada):** el selector «Todos los tipos / Santifica el día / … / Imágenes del widget» filtra por
  `contenidos.seccion`. Puede usarse solo o junto con el texto.
- **Dentro de un tipo:** el buscador solo busca en ese tipo. Al entrar o salir de un tipo el texto se borra.
- **Resultados:**
  - mientras haya texto o tipo, las tarjetas (o los acordeones) se reemplazan por una lista paginada de 10;
  - cada fila tiene la misma vista previa, nombre, formatos y fecha de T-033, más el tipo y la oración a la que
    pertenece;
  - el orden es por tipo, por oración (orden del catálogo) y dentro de cada oración como en los acordeones;
  - arriba a la derecha se muestra «N resultados» o «Buscando…».
- **Sin resultados:** «No encontramos contenidos» con el botón «Limpiar búsqueda», que borra el texto y, en la portada,
  también el tipo.

## Limitación conocida

`ilike` distingue tildes: «dia» no encuentra «Día 2», y «maria» no encuentra «María». Para ignorarlas hace falta la
extensión `unaccent` y una migración (por ejemplo, una columna generada o una función de búsqueda). Queda como mejora
futura.

## Cómo probar en local

Con los contenidos de prueba de T-033:

| Búsqueda | Resultado esperado |
| --- | --- |
| `hora` | 4 (Horas de María) |
| `JACULATORIAS` | 12, en dos páginas |
| `viernes` | 2 (Viacrucis y Primeros viernes diurnos) |
| Tipo «Santifica el mes», sin texto | 4 |
| Tipo «Santifica el mes» + `viernes` | 1 |
| Tipo «Imágenes del widget» + `hora` | Estado vacío |
| En Santifica el año, `día 2` / `dia 2` | 1 / 0 (tildes) |
| `50%` o `_` | Estado vacío, sin errores |
