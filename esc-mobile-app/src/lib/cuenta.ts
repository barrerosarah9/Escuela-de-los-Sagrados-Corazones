import { supabase } from './supabase';

export const MENSAJE_CUENTA_BLOQUEADA =
  'Tu cuenta está bloqueada y no puede iniciar sesión. Si crees que es un error, comunícate con la comunidad.';

export async function cuentaBloqueada(usuarioId: string) {
  const { data, error } = await supabase
    .from('perfiles')
    .select('bloqueado')
    .eq('id', usuarioId)
    .maybeSingle();

  if (error) {
    return false;
  }

  return data?.bloqueado === true;
}
