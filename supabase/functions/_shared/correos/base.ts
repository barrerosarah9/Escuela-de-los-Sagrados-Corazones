const FUENTE_TITULO = "'Lora',Georgia,'Times New Roman',serif";
const FUENTE_TEXTO = "'Source Sans 3','Segoe UI',Helvetica,Arial,sans-serif";
const URL_FUENTES =
  'https://fonts.googleapis.com/css2?family=Lora:wght@400;500&family=Source+Sans+3:wght@400;600;700&display=swap';
const URL_LOGO =
  'https://mwmrcunefvapawpocvof.supabase.co/storage/v1/object/public/marca/logo-escuela.png';

export const COLORES = {
  rojo: '#A11E21',
  rojoOscuro: '#761619',
  azulClaro: '#DBEAF4',
  azulOscuro: '#315F7E',
  enlace: '#397AA8',
  verde: '#477B70',
  crema: '#F2E6BC',
  carbon: '#190E0E',
  gris: '#786F68',
  fondo: '#F2F3F4',
  borde: '#E2E3E5',
  blanco: '#FFFFFF',
} as const;

export const ESQUEMA_APP = 'sagradoscorazones://';

export interface Correo {
  asunto: string;
  html: string;
  texto: string;
}

export type MedioPago = 'tarjeta' | 'nequi' | 'daviplata' | 'pse';

const NUMERO_PESOS = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

const FORMATO_BOGOTA = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function escapar(valor: string | number): string {
  return String(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatoPesos(centavos: number): string {
  return `$${NUMERO_PESOS.format(Math.round(centavos / 100))} COP`;
}

function partesBogota(fecha: Date | string): Record<string, string> {
  const partes = FORMATO_BOGOTA.formatToParts(new Date(fecha));
  return Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
}

export function formatoFecha(fecha: Date | string): string {
  if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
  }
  const p = partesBogota(fecha);
  return `${p.day}/${p.month}/${p.year}`;
}

export function formatoFechaHora(fecha: Date | string): string {
  const p = partesBogota(fecha);
  return `${p.day}/${p.month}/${p.year} · ${p.hour}:${p.minute}`;
}

export function formatoMedioPago(medio: MedioPago, ultimosDigitos?: string | null): string {
  switch (medio) {
    case 'tarjeta':
      return ultimosDigitos ? `Tarjeta •••• ${ultimosDigitos}` : 'Tarjeta';
    case 'nequi':
      return 'Nequi';
    case 'daviplata':
      return 'Daviplata';
    case 'pse':
      return 'PSE';
  }
}

export function correoContacto(): string | null {
  return Deno.env.get('CORREO_CONTACTO') ?? null;
}

export function fuente(tamano: number, color: string, extra = ''): string {
  return `font-family:${FUENTE_TEXTO};font-size:${tamano}px;line-height:${Math.round(tamano * 1.6)}px;color:${color};${extra}`;
}

export function fuenteTitulo(tamano: number, color: string, extra = ''): string {
  return `font-family:${FUENTE_TITULO};font-size:${tamano}px;font-weight:500;line-height:${Math.round(tamano * 1.25)}px;color:${color};${extra}`;
}

export function encabezado(etiqueta: string | null, titulo: string): string {
  const antetitulo = etiqueta
    ? `<p style="margin:0 0 12px;${fuente(13, COLORES.verde, 'font-weight:700;letter-spacing:2px;text-transform:uppercase;')}">${escapar(etiqueta)}</p>`
    : '';
  return `${antetitulo}<h1 style="margin:0;${fuenteTitulo(30, COLORES.carbon)}">${escapar(titulo)}</h1>`;
}

export function parrafo(
  texto: string,
  tamano = 17,
  color: string = COLORES.carbon,
  margen = 16,
): string {
  return `<p style="margin:${margen}px 0 0;${fuente(tamano, color)}">${escapar(texto)}</p>`;
}

export function subtitulo(texto: string, margen = 32): string {
  return `<p style="margin:${margen}px 0 0;${fuente(13, COLORES.gris, 'font-weight:700;letter-spacing:2px;text-transform:uppercase;')}">${escapar(texto)}</p>`;
}

export function boton(texto: string, url: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:32px 0 0;">
  <tr>
    <td style="background:${COLORES.rojo};border-radius:10px;">
      <a href="${escapar(url)}" style="display:inline-block;padding:16px 30px;${fuente(16, COLORES.blanco, 'font-weight:700;text-decoration:none;')}">${escapar(texto)}</a>
    </td>
  </tr>
</table>`;
}

export function cajaMonto(etiqueta: string, monto: string, detalle: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0 0;">
  <tr>
    <td align="center" style="background:${COLORES.azulClaro};border-radius:14px;padding:26px 16px;">
      <p style="margin:0;${fuente(14, COLORES.azulOscuro)}">${escapar(etiqueta)}</p>
      <p style="margin:6px 0 0;${fuenteTitulo(40, COLORES.carbon)}">${escapar(monto)}</p>
      <p style="margin:6px 0 0;${fuente(14, COLORES.azulOscuro, 'font-weight:700;')}">${escapar(detalle)}</p>
    </td>
  </tr>
</table>`;
}

export function tablaDetalles(filas: Array<[string, string]>): string {
  const contenido = filas
    .map(
      ([etiqueta, valor]) => `<tr>
    <td style="padding:14px 12px 14px 0;border-bottom:1px solid ${COLORES.borde};${fuente(15, COLORES.gris)}">${escapar(etiqueta)}</td>
    <td align="right" style="padding:14px 0;border-bottom:1px solid ${COLORES.borde};${fuente(15, COLORES.carbon, 'font-weight:700;')}">${escapar(valor)}</td>
  </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0 0;border-collapse:collapse;">${contenido}</table>`;
}

interface OpcionesPlantilla {
  titulo: string;
  vistaPrevia: string;
  contenido: string;
  pie: string[];
  ayuda: string;
}

export function plantillaBase({
  titulo,
  vistaPrevia,
  contenido,
  pie,
  ayuda,
}: OpcionesPlantilla): string {
  const contacto = correoContacto();
  const parrafosPie = pie.map(
    (texto, indice) =>
      `<p style="margin:${indice === 0 ? 0 : 10}px 0 0;${fuente(14, COLORES.carbon)}">${escapar(texto)}</p>`,
  );
  if (contacto) {
    parrafosPie.push(
      `<p style="margin:10px 0 0;${fuente(14, COLORES.carbon)}">${escapar(ayuda)} Escríbenos a <a href="mailto:${escapar(contacto)}" style="color:${COLORES.enlace};">${escapar(contacto)}</a>.</p>`,
    );
  }
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${escapar(titulo)}</title>
    <link href="${URL_FUENTES}" rel="stylesheet" />
  </head>
  <body style="margin:0;padding:0;background:${COLORES.fondo};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapar(vistaPrevia)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLORES.fondo};">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:${COLORES.blanco};border:1px solid ${COLORES.borde};border-radius:14px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:32px 24px 20px;">
                <img src="${URL_LOGO}" width="120" height="120" alt="Escuela de los Sagrados Corazones" style="display:block;border:0;width:120px;height:120px;" />
                <p style="margin:14px 0 0;font-family:${FUENTE_TITULO};font-size:22px;color:${COLORES.rojo};">Escuela de los Sagrados Corazones</p>
              </td>
            </tr>
            <tr>
              <td style="height:4px;line-height:4px;font-size:0;background:${COLORES.rojo};">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:40px 40px 44px;">${contenido}</td>
            </tr>
            <tr>
              <td style="background:${COLORES.crema};padding:24px 40px;">${parrafosPie.join('')}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function textoPlano(
  lineas: Array<string | false | null | undefined>,
  pie: string[],
  ayuda: string,
): string {
  const contacto = correoContacto();
  return [
    'Escuela de los Sagrados Corazones',
    '',
    ...lineas.filter((linea): linea is string => typeof linea === 'string'),
    '',
    '---',
    ...pie,
    ...(contacto ? [`${ayuda} Escríbenos a ${contacto}.`] : []),
  ].join('\n');
}
