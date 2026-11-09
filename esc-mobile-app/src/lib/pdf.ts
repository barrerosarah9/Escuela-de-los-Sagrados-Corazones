import { Directory, File, Paths } from 'expo-file-system';
import { Platform, Share } from 'react-native';
import { supabase } from './supabase';

export const BUCKET_PDF = 'contenidos-pdf';

export type ResultadoDescarga = 'guardado' | 'cancelado' | 'no_disponible' | 'error';

const DURACION_URL_S = 3600;

export async function urlDelPdf(ruta: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET_PDF)
    .createSignedUrl(ruta, DURACION_URL_S);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export function nombreDeArchivo(nombre: string) {
  const limpio = nombre
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^A-Za-z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${limpio || 'oracion'}.pdf`;
}

async function bajarACache(url: string, nombre: string) {
  const carpeta = new Directory(Paths.cache, 'pdf');
  carpeta.create({ intermediates: true, idempotent: true });
  const destino = new File(carpeta, nombre);
  if (destino.exists) destino.delete();
  return File.downloadFileAsync(url, destino);
}

export async function descargarPdf(ruta: string, nombre: string): Promise<ResultadoDescarga> {
  const url = await urlDelPdf(ruta);
  if (!url) return 'no_disponible';

  const archivoNombre = nombreDeArchivo(nombre);
  let descargado: File;
  try {
    descargado = await bajarACache(url, archivoNombre);
  } catch {
    return 'error';
  }

  if (Platform.OS === 'android') {
    let carpeta: Directory;
    try {
      carpeta = await Directory.pickDirectoryAsync();
    } catch {
      return 'cancelado';
    }
    try {
      const copia = carpeta.createFile(archivoNombre, 'application/pdf');
      await copia.write(await descargado.bytes());
      return 'guardado';
    } catch {
      return 'error';
    }
  }

  try {
    const resultado = await Share.share({ url: descargado.uri, title: nombre });
    return resultado.action === Share.dismissedAction ? 'cancelado' : 'guardado';
  } catch {
    return 'error';
  }
}

export function htmlDelVisor(url: string) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4, user-scalable=yes">
<style>
body{margin:0;background:#F2F3F4;font-family:sans-serif}
#paginas{display:flex;flex-direction:column;align-items:center;gap:12px;padding:12px}
canvas{width:100%;height:auto;background:#fff;border-radius:6px;box-shadow:0 4px 16px rgba(25,14,14,.12)}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</head>
<body>
<div id="paginas"></div>
<script>
const avisar = (mensaje) => window.ReactNativeWebView.postMessage(JSON.stringify(mensaje));
(async () => {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const documento = await pdfjsLib.getDocument(${JSON.stringify(url)}).promise;
    const contenedor = document.getElementById('paginas');
    const ancho = document.body.clientWidth - 24;
    const densidad = window.devicePixelRatio || 2;
    for (let numero = 1; numero <= documento.numPages; numero++) {
      const pagina = await documento.getPage(numero);
      const base = pagina.getViewport({ scale: 1 });
      const vista = pagina.getViewport({ scale: (ancho / base.width) * densidad });
      const lienzo = document.createElement('canvas');
      lienzo.width = vista.width;
      lienzo.height = vista.height;
      contenedor.appendChild(lienzo);
      await pagina.render({ canvasContext: lienzo.getContext('2d'), viewport: vista }).promise;
      if (numero === 1) avisar({ tipo: 'listo', paginas: documento.numPages });
    }
  } catch (error) {
    avisar({ tipo: 'error', mensaje: String((error && error.message) || error) });
  }
})();
</script>
</body>
</html>`;
}
