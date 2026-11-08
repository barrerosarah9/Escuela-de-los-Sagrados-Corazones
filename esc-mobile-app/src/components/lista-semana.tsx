import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import {
  diaSemanaIso,
  numeroDeVariante,
  obtenerAsignacionesDeHoy,
  obtenerContenidosDeOraciones,
  obtenerOracionesDeSeccion,
  ordenarConHabilitadoPrimero,
} from '../lib/oraciones-hoy';
import { useCarga } from '../lib/use-carga';
import { EstadoError } from './estado-error';
import { EstadoVacio } from './estado-vacio';
import { FormAlert } from './form-alert';
import { ListaCarga } from './lista-carga';
import { OpcionOracion } from './opcion-oracion';

async function cargarOficioDeHoy() {
  const diaIso = diaSemanaIso();
  const [oficios, asignaciones] = await Promise.all([
    obtenerOracionesDeSeccion('semana'),
    obtenerAsignacionesDeHoy(),
  ]);
  const oficio = oficios.find((candidato) => candidato.dia_semana === diaIso);
  if (!oficio) return null;
  const contenidos = await obtenerContenidosDeOraciones([oficio.id]);
  return { oficio, contenidos, habilitadoId: asignaciones.get(oficio.id) };
}

export function ListaSemana() {
  const carga = useCarga(cargarOficioDeHoy);

  if (carga.estado === 'cargando') return <ListaCarga />;

  if (carga.estado === 'error') {
    return (
      <EstadoError
        motivo={carga.motivo}
        titulo="No pudimos cargar el oficio de hoy"
        onReintentar={carga.reintentar}
      />
    );
  }

  if (!carga.datos || carga.datos.contenidos.length === 0) {
    return (
      <EstadoVacio
        icono="time-outline"
        titulo="Esta oración estará disponible próximamente."
        mensaje="Estamos preparando este espacio con cuidado para acompañar tu oración."
      />
    );
  }

  const { oficio, contenidos, habilitadoId } = carga.datos;
  const hayHabilitada = contenidos.some((contenido) => contenido.id === habilitadoId);

  return (
    <View style={styles.lista}>
      {hayHabilitada ? null : (
        <FormAlert
          icon="time-outline"
          message="El oficio de hoy todavía no está disponible. Vuelve a intentarlo más tarde."
        />
      )}
      {ordenarConHabilitadoPrimero(contenidos, habilitadoId).map((contenido) => {
        const habilitada = contenido.id === habilitadoId;
        return (
          <OpcionOracion
            key={contenido.id}
            numero={numeroDeVariante(contenido, contenidos.indexOf(contenido))}
            titulo={contenido.nombre}
            descripcion={
              habilitada ? 'Habilitada esta semana' : 'Disponible en su semana correspondiente'
            }
            insignia="ESTA SEMANA"
            habilitada={habilitada}
            onPress={() =>
              router.push({
                pathname: '/detalle-oracion',
                params: { oracion: oficio.clave, contenido: String(contenido.id) },
              })
            }
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
