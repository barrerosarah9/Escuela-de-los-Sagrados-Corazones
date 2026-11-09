import { Alert } from 'react-native';
import { cerrarSesionDeGoogle } from './auth-google';
import { olvidarTokenDelDispositivo } from './notificaciones';
import { supabase } from './supabase';

let irAIngresoTrasSalir = false;

export function consumirIrAIngreso() {
  const ir = irAIngresoTrasSalir;
  irAIngresoTrasSalir = false;
  return ir;
}

export function confirmarCierreDeSesion(alConfirmar: () => void) {
  Alert.alert('¿Cerrar sesión?', 'Tendrás que volver a iniciar sesión para entrar a la app.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Cerrar sesión', style: 'destructive', onPress: alConfirmar },
  ]);
}

export async function cerrarSesion() {
  irAIngresoTrasSalir = true;
  await olvidarTokenDelDispositivo().catch(() => undefined);
  await cerrarSesionDeGoogle();
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) {
    irAIngresoTrasSalir = false;
    throw error;
  }
}
