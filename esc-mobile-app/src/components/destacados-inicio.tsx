import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState, type ComponentProps } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ScrollViewInstance,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { abrirSeccion, diaDeHoy, type ClaveSeccion } from '../lib/secciones-oracion';
import { colors, fonts, shadows } from '../theme';
import { AppText } from './app-text';

type Destacado = {
  clave: ClaveSeccion;
  etiqueta: string;
  titulo: string;
  descripcion: string;
  icono: ComponentProps<typeof Ionicons>['name'];
  fondo: string;
};

const AZUL_OSCURO = '#315F7E';

export function DestacadosInicio() {
  const dia = diaDeHoy();
  const carrusel = useRef<ScrollViewInstance>(null);
  const [ancho, setAncho] = useState(0);
  const [activo, setActivo] = useState(0);

  const destacados: Destacado[] = [
    {
      clave: 'dia',
      etiqueta: 'Oración diaria',
      titulo: 'Santifica tu día',
      descripcion: 'Accede a las oraciones de la jornada',
      icono: 'play',
      fondo: colors.text,
    },
    {
      clave: 'semana',
      etiqueta: 'Oficio semanal',
      titulo: `Santifica tu ${dia.nombre}`,
      descripcion: dia.oficio,
      icono: 'calendar-outline',
      fondo: AZUL_OSCURO,
    },
  ];

  const medir = (evento: LayoutChangeEvent) => {
    setAncho(evento.nativeEvent.layout.width);
  };

  const alDesplazar = (evento: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!ancho) return;
    const indice = Math.round(evento.nativeEvent.contentOffset.x / ancho);
    setActivo(Math.min(Math.max(indice, 0), destacados.length - 1));
  };

  const irA = (indice: number) => {
    carrusel.current?.scrollTo({ x: ancho * indice, animated: true });
    setActivo(indice);
  };

  return (
    <View style={styles.contenedor}>
      <View style={styles.encabezado}>
        <AppText variant="eyebrow">{dia.nombre}</AppText>
        <AppText variant="title" accessibilityRole="header">
          Oficios de hoy
        </AppText>
      </View>

      <View style={styles.marco} onLayout={medir}>
        <ScrollView
          ref={carrusel}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={alDesplazar}
          scrollEventThrottle={16}
        >
          {destacados.map((destacado) => (
            <Pressable
              key={destacado.clave}
              accessibilityRole="button"
              accessibilityLabel={`${destacado.titulo}. ${destacado.descripcion}`}
              onPress={() => abrirSeccion(destacado.clave)}
              style={({ pressed }) => [
                styles.tarjeta,
                { width: ancho || undefined, backgroundColor: destacado.fondo },
                pressed && styles.presionada,
              ]}
            >
              <View style={styles.anillos} />
              <View style={styles.textos}>
                <AppText style={styles.etiqueta}>{destacado.etiqueta}</AppText>
                <AppText style={styles.titulo} numberOfLines={2}>
                  {destacado.titulo}
                </AppText>
                <AppText style={styles.descripcion} numberOfLines={2}>
                  {destacado.descripcion}
                </AppText>
              </View>
              <View style={styles.icono}>
                <Ionicons name={destacado.icono} size={25} color={colors.text} />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.puntos}>
        {destacados.map((destacado, indice) => (
          <Pressable
            key={destacado.clave}
            accessibilityRole="button"
            accessibilityLabel={`Ver destacado ${indice + 1}`}
            hitSlop={8}
            onPress={() => irA(indice)}
            style={[styles.punto, indice === activo && styles.puntoActivo]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    paddingTop: 16,
  },
  encabezado: {
    gap: 4,
    paddingHorizontal: 24,
    paddingBottom: 14,
  },
  marco: {
    marginHorizontal: 14,
    borderRadius: 28,
    overflow: 'hidden',
    boxShadow: shadows.card,
  },
  tarjeta: {
    height: 220,
    overflow: 'hidden',
  },
  presionada: {
    opacity: 0.92,
  },
  anillos: {
    position: 'absolute',
    width: 220,
    height: 220,
    right: -70,
    top: -90,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(224, 188, 88, 0.3)',
    boxShadow:
      '0px 0px 0px 28px rgba(224, 188, 88, 0.06), 0px 0px 0px 56px rgba(224, 188, 88, 0.035)',
  },
  textos: {
    position: 'absolute',
    left: 22,
    right: 84,
    bottom: 22,
    gap: 4,
  },
  etiqueta: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  titulo: {
    fontFamily: fonts.serif,
    fontSize: 29,
    lineHeight: 31,
    letterSpacing: -0.7,
    color: colors.white,
  },
  descripcion: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  icono: {
    position: 'absolute',
    right: 20,
    bottom: 22,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    boxShadow: '0px 8px 22px rgba(25, 14, 14, 0.22)',
  },
  puntos: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  punto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(25, 14, 14, 0.2)',
  },
  puntoActivo: {
    width: 20,
    backgroundColor: colors.primary,
  },
});
