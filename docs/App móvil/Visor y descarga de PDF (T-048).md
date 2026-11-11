# Visor y descarga de PDF · T-048

Leer el PDF de una oración dentro de la app y descargarlo al dispositivo.
Historia: HU-17 · Caso de uso: CU-10 (pasos 6–7 y E1) · Tarea de fase: F2-07 · Issue: #48.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `esc-mobile-app/src/lib/pdf.ts` | URL firmada del PDF, nombre seguro del archivo, descarga y HTML del visor. |
| `esc-mobile-app/src/components/pdf-oracion.tsx` | Tarjeta del PDF en el detalle con «Leer» y «Descargar». |
| `esc-mobile-app/src/app/visor-pdf.tsx` | Pantalla del visor con la barra «Descargar». |
| `esc-mobile-app/src/app/detalle-oracion.tsx` | Usa la tarjeta del PDF en lugar de «Disponible pronto». |
| `esc-mobile-app/src/app/_layout.tsx` | Registra `visor-pdf` entre las rutas con sesión. |
| `esc-mobile-app/package.json` | Agrega `react-native-webview` 14.0.1 (`npx expo install`, incluido en Expo Go). |

Sin migraciones.

## Comportamiento

- **Leer:** abre `/visor-pdf?contenido=<id>`. Se pide una URL firmada de 1 hora del bucket privado `contenidos-pdf`
  (T-035) y una WebView carga pdf.js 3.11.174 desde cdnjs, que dibuja cada página a lo ancho de la pantalla. Arriba
  se ve «N páginas · pellizca para ampliar».
- **Descargar** (en la tarjeta y en el visor): baja el PDF a la caché de la app y luego:
  - **Android:** abre el selector de carpetas del sistema (`Directory.pickDirectoryAsync`) y guarda ahí el archivo.
    Android no permite elegir la raíz de *Descargas*; se usa una carpeta dentro (por ejemplo `Download/Oraciones`).
  - **iOS:** abre la hoja de compartir con el archivo para «Guardar en Archivos».
  - El nombre sale del contenido sin tildes ni símbolos (`PRUEBA-T-048-Guia-de-la-Divina-Cita.pdf`).
  - Resultado: «Listo. El PDF quedó guardado en tu dispositivo.»; si se cancela el selector no se muestra nada.
- **Errores:** si el archivo no existe en Storage o pdf.js no lo puede abrir: «Este documento no está disponible en
  este momento. Intenta más tarde.», con «Reintentar» en el visor. Si falla la descarga: «No pudimos descargar el PDF.
  Revisa tu conexión e inténtalo de nuevo.».

## Decisiones

- Visor con pdf.js en una WebView: la WebView de Android no muestra PDF por sí sola y los visores nativos
  (`react-native-pdf`) no funcionan en Expo Go. Leer en el visor necesita internet (pdf.js se carga de cdnjs); el
  archivo descargado se abre sin conexión con cualquier lector de PDF del teléfono.
- La descarga deja que el usuario elija dónde guardar, en lugar de escribir en una carpeta fija, porque Android e iOS
  no permiten a la app guardar directamente en *Descargas* o *Archivos* sin pasar por el sistema.

## Cómo probar en local

1. App apuntando a Supabase local (ver T-046), Expo con `npx expo start --go` y el portal local (`npm run dev` en
   `portal-admin`).
2. En el portal, Biblioteca → Santifica el día: subir un PDF a Divina Cita con el nombre `[PRUEBA T-048] …`.
3. En Studio local, un contenido con un PDF que no existe:

   ```sql
   insert into public.contenidos (oracion_id, nombre, pdf_path)
   select id, '[PRUEBA T-048] PDF que no existe', 'dia/oracion-noche/no-existe.pdf'
   from public.oraciones where clave = 'oracion-noche';
   ```

4. Santifica el día → Divina Cita: «Leer» muestra las páginas y «Descargar» guarda el archivo en la carpeta elegida
   (revisar en la app Archivos). Oración de la Noche: «Leer» y «Descargar» muestran el mensaje de no disponible.
5. Limpiar: eliminar el contenido de Divina Cita desde el portal (así se borra también el archivo de Storage, T-037) y:

   ```sql
   delete from public.contenidos where nombre like '[PRUEBA T-048]%';
   ```
