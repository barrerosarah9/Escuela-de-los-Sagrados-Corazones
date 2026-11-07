# Subir contenidos · Portal (T-036)

Panel del portal para subir imágenes y PDF o registrar enlaces de YouTube en la biblioteca, con su clasificación.
Historia: HU-40 · Caso de uso: CU-21 · Tarea de fase: F3-09 · Issue: #36.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `portal-admin/src/lib/contenidos.ts` | Valida el formulario, sube los archivos a Storage e inserta la fila en `contenidos`; si el guardado falla, borra lo que alcanzó a subir. |
| `portal-admin/src/App.tsx` (`FormularioContenido`, `CampoArchivo`, `Library`) | Panel lateral de subida y su conexión con la biblioteca. |
| `portal-admin/src/index.css` | Ancho del panel (640 px), recuadro al arrastrar y vista previa de la imagen. |

No hay migraciones nuevas: usa la tabla `contenidos` (T-007), su política de administrador (T-008) y los buckets
`contenidos-pdf` y `contenidos-imagenes` (T-035).

## Dónde se abre

- **«Subir nuevo»** dentro de una oración o en la cuadrícula del widget: el tipo viene elegido.
- **«Subir contenido»** arriba de la biblioteca:
  - en la portada, el selector muestra todos los tipos;
  - dentro de una sección, solo las oraciones de esa sección, y si hay una sola disponible (el widget) queda
    elegida.
- Las oraciones fijas que ya tienen su máximo salen como «(completa)» y no se pueden elegir.

## Campos

| Campo | Cuándo | Regla |
| --- | --- | --- |
| Tipo de oración | Siempre | Obligatorio |
| Número de variante | Oficios de la semana (menos la Hora de María) y oraciones del mes | Obligatorio, entero mayor que 0; se propone el siguiente libre |
| Día de la consagración | Consagraciones | Obligatorio, de 1 a 30; se propone el siguiente libre |
| Fecha del sábado | Hora de María | Obligatoria y debe ser sábado |
| Nombre | Siempre | Obligatorio, hasta 120 caracteres; se sugiere solo («Lunes 4», «Viernes diurno 2», «Hora de María · 28 de noviembre», «Día 5») hasta que se edita |
| PDF | Todos menos el widget | PDF de hasta 10 MB |
| Video de YouTube | Todos menos el widget | Enlace con id de video; se guarda como `https://www.youtube.com/watch?v=<id>` |
| Imagen | Todos; obligatoria en el widget | JPG o PNG de hasta 5 MB |

Fuera del widget hace falta al menos un PDF, un video o una imagen. Los archivos se revisan apenas se eligen
(con el botón o arrastrando) y los errores de los campos obligatorios aparecen al pulsar «Guardar».

## Guardado

1. Sube el PDF a `contenidos-pdf` y la imagen a `contenidos-imagenes`, con la ruta
   `<seccion>/<clave de la oración>/<uuid>.<ext>` (convención de T-035) y sin reemplazar archivos existentes.
2. Inserta la fila en `contenidos` con las rutas, la URL de YouTube normalizada y `creado_por`.
3. Si algo falla después de subir, borra los archivos subidos para no dejar huérfanos.
4. Cierra el panel, muestra «Contenido agregado a la biblioteca», actualiza los totales y abre la oración donde
   quedó el contenido (si se subió desde la portada, lleva a su sección).

Errores que devuelve el servidor y dónde se muestran:

| Origen | Caso | Mensaje |
| --- | --- | --- |
| Storage `413` | Archivo más grande que el límite | Debajo del PDF o la imagen |
| Storage `415` | Formato no permitido | Debajo del PDF o la imagen |
| Storage `403` / Postgres `42501` | Sin permisos | Arriba de los botones |
| Postgres `23505` (`contenidos_numero_key`) | Número repetido en la oración | Debajo del número |
| Postgres `23505` (`contenidos_fecha_key`) | Sábado con Hora de María | Debajo de la fecha |
| Postgres `23514` | Oración fija llena | Debajo del tipo |

## Cómo probar en local

Con Supabase local, el portal en `npm run dev` y el administrador local:

1. «Subir contenido» y «Guardar» sin llenar nada: errores de tipo, nombre y archivos.
2. Lunes: propone el número siguiente; sin número da «Escribe el número de la variante».
3. Un `.txt` como PDF, un PDF de más de 10 MB y una imagen de más de 5 MB se rechazan al elegirlos.
4. Lunes con un PDF válido: aparece en la lista y la vista previa abre el PDF.
5. Lunes con un número que ya existe: «Ya existe un contenido con ese número…», y el PDF no queda en Storage.
6. Hora de María: fecha que no es sábado, enlace de Vimeo y sábado repetido dan error; un sábado nuevo con
   YouTube queda arriba con la miniatura.
7. Widget: solo pide la imagen y la muestra en vista previa.
8. Las oraciones fijas completas no se pueden elegir.

Para revisar en la base: `contenidos` con `creado_por` del administrador y `storage.objects` en los buckets
`contenidos-*`.
