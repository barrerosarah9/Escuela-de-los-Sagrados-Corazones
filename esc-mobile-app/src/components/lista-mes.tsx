import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { disponibilidadDelMes, fechaLarga, OFICIOS_DEL_MES } from '../lib/oraciones-mes';
import { OpcionOracion } from './opcion-oracion';

export function ListaMes() {
  return (
    <View style={styles.lista}>
      {OFICIOS_DEL_MES.map((oficio) => {
        const { disponible, siguiente } = disponibilidadDelMes(oficio.diaIso);
        return (
          <OpcionOracion
            key={oficio.dia}
            titulo={oficio.titulo}
            descripcion={
              disponible
                ? `Disponible hoy, ${fechaLarga(siguiente)}`
                : `El siguiente será el ${fechaLarga(siguiente)}`
            }
            icono={oficio.icono}
            tono={oficio.tono}
            habilitada={disponible}
            onPress={() => router.push({ pathname: '/mes/[dia]', params: { dia: oficio.dia } })}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: {
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 20,
  },
});
