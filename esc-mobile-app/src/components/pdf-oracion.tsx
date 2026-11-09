import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { descargarPdf, type ResultadoDescarga } from '../lib/pdf';
import { colors, fonts } from '../theme';
import { AppText } from './app-text';
import { FormAlert } from './form-alert';

type Props = {
  contenidoId: number;
  ruta: string;
  nombre: string;
};

const MENSAJES: Partial<Record<ResultadoDescarga, string>> = {
  guardado: 'Listo. El PDF quedó guardado en tu dispositivo.',
  no_disponible: 'Este documento no está disponible en este momento. Intenta más tarde.',
  error: 'No pudimos descargar el PDF. Revisa tu conexión e inténtalo de nuevo.',
};

function BotonPdf({
  icono,
  titulo,
  onPress,
  ocupado = false,
}: {
  icono: 'book-outline' | 'download-outline';
  titulo: string;
  onPress: () => void;
  ocupado?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: ocupado, disabled: ocupado }}
      disabled={ocupado}
      onPress={onPress}
      style={({ pressed }) => [
        styles.boton,
        pressed && styles.presionado,
        ocupado && styles.ocupado,
      ]}
    >
      <Ionicons name={icono} size={18} color={colors.primary} />
      <AppText style={styles.botonTexto}>{titulo}</AppText>
    </Pressable>
  );
}

export function PdfOracion({ contenidoId, ruta, nombre }: Props) {
  const [descargando, setDescargando] = useState(false);
  const [aviso, setAviso] = useState<ResultadoDescarga | null>(null);

  const leer = () => {
    router.push({ pathname: '/visor-pdf', params: { contenido: String(contenidoId) } });
  };

  const descargar = async () => {
    if (descargando) return;
    setDescargando(true);
    setAviso(null);
    setAviso(await descargarPdf(ruta, nombre));
    setDescargando(false);
  };

  const mensaje = aviso ? MENSAJES[aviso] : undefined;

  return (
    <View style={styles.contenedor}>
      <View style={styles.encabezado}>
        <View style={styles.icono}>
          <Ionicons name="document-text-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.textos}>
          <AppText variant="eyebrow">Guía de oración</AppText>
          <AppText style={styles.titulo}>Haz la oración con nuestro PDF</AppText>
        </View>
      </View>
      <View style={styles.botones}>
        <BotonPdf icono="book-outline" titulo="Leer" onPress={leer} />
        <BotonPdf
          icono="download-outline"
          titulo={descargando ? 'Descargando…' : 'Descargar'}
          onPress={() => void descargar()}
          ocupado={descargando}
        />
      </View>
      {mensaje ? (
        <FormAlert
          icon={aviso === 'guardado' ? 'checkmark-circle-outline' : 'alert-circle-outline'}
          message={mensaje}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: 12,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icono: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  botones: {
    flexDirection: 'row',
    gap: 10,
  },
  boton: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  presionado: {
    transform: [{ scale: 0.98 }],
  },
  ocupado: {
    opacity: 0.6,
  },
  botonTexto: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.primary,
  },
});
