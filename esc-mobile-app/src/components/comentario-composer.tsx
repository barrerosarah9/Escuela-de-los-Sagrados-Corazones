import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import {
  contarCaracteres,
  MAXIMO_CARACTERES_COMENTARIO,
  puedeEnviarComentario,
  type MotivoErrorComentario,
} from '../lib/comentarios';
import { colors, fonts, radius } from '../theme';
import { AppText } from './app-text';
import { FormAlert } from './form-alert';

type Props = {
  onEnviar: (texto: string) => Promise<MotivoErrorComentario | null>;
  deshabilitado?: boolean;
};

const UMBRAL_CONTADOR = MAXIMO_CARACTERES_COMENTARIO - 200;

const MENSAJES: Record<MotivoErrorComentario, string> = {
  sin_conexion: 'No hay conexión. Tu comentario sigue aquí para que lo envíes de nuevo.',
  cuenta_bloqueada: 'Tu cuenta no puede comentar en este momento.',
  publicacion_eliminada: 'Esta publicación ya no está disponible.',
  texto_invalido: `El comentario no puede estar vacío ni pasar de ${MAXIMO_CARACTERES_COMENTARIO} caracteres.`,
  desconocido: 'No pudimos enviar tu comentario. Inténtalo de nuevo.',
};

export function ComentarioComposer({ onEnviar, deshabilitado = false }: Props) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<MotivoErrorComentario | null>(null);

  const total = contarCaracteres(texto);
  const excedido = total > MAXIMO_CARACTERES_COMENTARIO;
  const puedeEnviar = !deshabilitado && !enviando && puedeEnviarComentario(texto);
  const reintentable = error === 'sin_conexion' || error === 'desconocido';

  async function enviar() {
    if (!puedeEnviar) return;
    setEnviando(true);
    setError(null);
    const motivo = await onEnviar(texto);
    setEnviando(false);
    if (motivo) {
      setError(motivo);
      return;
    }
    setTexto('');
  }

  function cambiarTexto(nuevo: string) {
    setTexto(nuevo);
    if (error && error !== 'cuenta_bloqueada' && error !== 'publicacion_eliminada') setError(null);
  }

  return (
    <View style={styles.contenedor}>
      {error ? (
        <FormAlert
          message={MENSAJES[error]}
          icon={error === 'sin_conexion' ? 'cloud-offline-outline' : 'alert-circle-outline'}
        >
          {reintentable ? (
            <Pressable
              onPress={enviar}
              disabled={!puedeEnviar}
              accessibilityRole="button"
              hitSlop={8}
            >
              <AppText style={styles.reintentar}>Reintentar</AppText>
            </Pressable>
          ) : null}
        </FormAlert>
      ) : null}

      <View style={styles.fila}>
        <TextInput
          value={texto}
          onChangeText={cambiarTexto}
          placeholder="Escribe un comentario…"
          placeholderTextColor={colors.placeholder}
          accessibilityLabel="Comentario"
          multiline
          editable={!enviando && !deshabilitado}
          textAlignVertical="top"
          style={[styles.campo, excedido && styles.campoExcedido]}
        />
        <Pressable
          onPress={enviar}
          disabled={!puedeEnviar}
          accessibilityRole="button"
          accessibilityLabel="Enviar comentario"
          accessibilityState={{ disabled: !puedeEnviar, busy: enviando }}
          style={({ pressed }) => [
            styles.boton,
            !puedeEnviar && !enviando && styles.botonInactivo,
            pressed && styles.botonPresionado,
          ]}
        >
          {enviando ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <AppText style={[styles.textoBoton, !puedeEnviar && styles.textoBotonInactivo]}>
              Enviar
            </AppText>
          )}
        </Pressable>
      </View>

      {total > UMBRAL_CONTADOR ? (
        <AppText style={[styles.contador, excedido && styles.contadorExcedido]}>
          {total}/{MAXIMO_CARACTERES_COMENTARIO}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: 8,
    paddingHorizontal: 17,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  campo: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  campoExcedido: {
    borderColor: colors.primary,
  },
  boton: {
    minWidth: 76,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  botonInactivo: {
    backgroundColor: colors.surface,
  },
  botonPresionado: {
    backgroundColor: colors.primaryDark,
  },
  textoBoton: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.white,
  },
  textoBotonInactivo: {
    color: colors.placeholder,
  },
  reintentar: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.link,
  },
  contador: {
    alignSelf: 'flex-end',
    fontSize: 11,
    color: colors.textSecondary,
  },
  contadorExcedido: {
    color: colors.primary,
  },
});
