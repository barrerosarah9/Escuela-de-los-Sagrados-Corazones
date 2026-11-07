import { type Correo, correoContacto } from './base.ts';

const API_RESEND = 'https://api.resend.com/emails';
const REMITENTE_POR_DEFECTO =
  'Escuela de los Sagrados Corazones <notificaciones@escuelasagradoscorazones.com>';

export interface OpcionesEnvio {
  para: string | string[];
  correo: Correo;
  idempotencia?: string;
}

export async function enviarCorreo({ para, correo, idempotencia }: OpcionesEnvio): Promise<string> {
  const clave = Deno.env.get('RESEND_API_KEY');
  if (!clave) throw new Error('Falta el secreto RESEND_API_KEY');

  const encabezados: Record<string, string> = {
    Authorization: `Bearer ${clave}`,
    'Content-Type': 'application/json',
  };
  if (idempotencia) encabezados['Idempotency-Key'] = idempotencia;

  const contacto = correoContacto();
  const respuesta = await fetch(API_RESEND, {
    method: 'POST',
    headers: encabezados,
    body: JSON.stringify({
      from: Deno.env.get('CORREO_REMITENTE') ?? REMITENTE_POR_DEFECTO,
      to: Array.isArray(para) ? para : [para],
      subject: correo.asunto,
      html: correo.html,
      text: correo.texto,
      ...(contacto ? { reply_to: contacto } : {}),
    }),
  });

  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(`Resend respondió ${respuesta.status}: ${cuerpo?.message ?? 'error desconocido'}`);
  }
  return cuerpo.id as string;
}
