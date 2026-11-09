import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { AppText } from '../components/app-text';
import { BackHeader } from '../components/back-header';
import { Button } from '../components/button';
import { EstadoMensaje } from '../components/estado-mensaje';
import { FormAlert } from '../components/form-alert';
import { obtenerContenidosPorId } from '../lib/oraciones-hoy';
import { descargarPdf, htmlDelVisor, urlDelPdf, type ResultadoDescarga } from '../lib/pdf';
import { useCarga } from '../lib/use-carga';
import { colors, fonts } from '../theme';

const NO_DISPONIBLE = 'Este documento no está disponible en este momento. Intenta más tarde.';

const AVISOS: Partial<Record<ResultadoDescarga, string>> = {
  guardado: 'Listo. El PDF quedó guardado en tu dispositivo.',
  no_disponible: NO_DISPONIBLE,
  error: 'No pudimos descargar el PDF. Revisa tu conexión e inténtalo de nuevo.',
};

async function cargarPdf(contenidoId: number | null) {
  if (!contenidoId) return null;
  const [contenido] = await obtenerContenidosPorId([contenidoId]);
  if (!contenido?.pdf_path) return null;
  const url = await urlDelPdf(contenido.pdf_path);
  if (!url) return null;
  return { nombre: contenido.nombre, ruta: contenido.pdf_path, url };
}

export default function VisorPdfScreen() {
  const { contenido } = useLocalSearchParams<{ contenido?: string }>();
  const numero = Number(contenido);
  const contenidoId = Number.isInteger(numero) && numero > 0 ? numero : null;
  const carga = useCarga(useCallback(() => cargarPdf(contenidoId), [contenidoId]));
  const [mostrando, setMostrando] = useState(false);
  const [fallo, setFallo] = useState(false);
  const [paginas, setPaginas] = useState<number | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [aviso, setAviso] = useState<ResultadoDescarga | null>(null);

  const recibir = (evento: WebViewMessageEvent) => {
    try {
      const mensaje = JSON.parse(evento.nativeEvent.data) as { tipo: string; paginas?: number };
      if (mensaje.tipo === 'listo') {
        setMostrando(true);
        setPaginas(mensaje.paginas ?? null);
      } else if (mensaje.tipo === 'error') {
        setFallo(true);
      }
    } catch {
      setFallo(true);
    }
  };

  const reintentar = () => {
    setFallo(false);
    setMostrando(false);
    carga.reintentar();
  };

  const descargar = async () => {
    if (!carga.datos || descargando) return;
    setDescargando(true);
    setAviso(null);
    setAviso(await descargarPdf(carga.datos.ruta, carga.datos.nombre));
    setDescargando(false);
  };

  const sinDocumento = carga.estado === 'listo' && !carga.datos;
  const conError = carga.estado === 'error' || sinDocumento || fallo;
  const mensajeAviso = aviso ? AVISOS[aviso] : undefined;

  return (
    <SafeAreaView style={styles.pantalla} edges={['top', 'left', 'right', 'bottom']}>
      <BackHeader />
      <View style={styles.titulo}>
        <AppText variant="eyebrow">Guía de oración</AppText>
        <AppText style={styles.nombre} numberOfLines={2}>
          {carga.datos?.nombre ?? 'Documento'}
        </AppText>
        {paginas ? (
          <AppText variant="caption">
            {paginas === 1 ? '1 página' : `${paginas} páginas`} · pellizca para ampliar
          </AppText>
        ) : null}
      </View>

      {conError ? (
        <EstadoMensaje
          tono="error"
          icono="document-text-outline"
          titulo="No pudimos abrir el PDF"
          mensaje={NO_DISPONIBLE}
        >
          {sinDocumento ? null : <Button title="Reintentar" onPress={reintentar} />}
        </EstadoMensaje>
      ) : (
        <View style={styles.visor}>
          {carga.datos ? (
            <WebView
              originWhitelist={['*']}
              source={{ html: htmlDelVisor(carga.datos.url) }}
              onMessage={recibir}
              onError={() => setFallo(true)}
              javaScriptEnabled
              setBuiltInZoomControls
              setDisplayZoomControls={false}
              style={styles.webview}
            />
          ) : null}
          {mostrando ? null : (
            <View style={styles.cargando}>
              <ActivityIndicator color={colors.primary} />
              <AppText variant="caption">Abriendo el documento…</AppText>
            </View>
          )}
        </View>
      )}

      {carga.datos && !fallo ? (
        <View style={styles.barra}>
          {mensajeAviso ? (
            <FormAlert
              icon={aviso === 'guardado' ? 'checkmark-circle-outline' : 'alert-circle-outline'}
              message={mensajeAviso}
            />
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: descargando, disabled: descargando }}
            disabled={descargando}
            onPress={() => void descargar()}
            style={({ pressed }) => [styles.descargar, pressed && styles.presionado]}
          >
            <Ionicons name="download-outline" size={20} color={colors.white} />
            <AppText style={styles.descargarTexto}>
              {descargando ? 'Descargando…' : 'Descargar'}
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  titulo: {
    gap: 4,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  nombre: {
    fontFamily: fonts.serif,
    fontSize: 24,
    lineHeight: 27,
    color: colors.text,
  },
  visor: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  cargando: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.surface,
  },
  barra: {
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  descargar: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 17,
    backgroundColor: colors.primary,
  },
  presionado: {
    transform: [{ scale: 0.98 }],
  },
  descargarTexto: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.white,
  },
});
