import {
  boton,
  cajaMonto,
  COLORES,
  type Correo,
  encabezado,
  ESQUEMA_APP,
  formatoFecha,
  formatoFechaHora,
  formatoPesos,
  parrafo,
  plantillaBase,
  tablaDetalles,
  textoPlano,
} from './base.ts';

export interface DatosComprobanteDonacion {
  nombre: string;
  numero: string;
  fecha: Date | string;
  montoCentavos: number;
  tipo: 'unica' | 'mensual';
  metodoPago: string;
  donante: string;
  proximoCobro?: string | null;
}

const PIE = [
  'Recibes este correo porque realizaste una donación en la app de la Escuela de los Sagrados Corazones. Guarda este mensaje como soporte de tu aporte.',
];
const AYUDA = '¿Algo no está bien con tu donación?';
const MENSAJE =
  'Tu generosidad sostiene la misión de la comunidad y permite que más personas oren cada día. Este es el comprobante de tu donación.';

export function comprobanteDonacion(datos: DatosComprobanteDonacion): Correo {
  const mensual = datos.tipo === 'mensual';
  const monto = formatoPesos(datos.montoCentavos);
  const tipoDonacion = mensual ? 'Donación mensual' : 'Donación única';
  const filas: Array<[string, string]> = [
    ['N.º de comprobante', datos.numero],
    ['Fecha', formatoFechaHora(datos.fecha)],
    ['Tipo', mensual ? 'Mensual' : 'Única'],
    ['Método de pago', datos.metodoPago],
    ['Donante', datos.donante],
  ];
  if (mensual && datos.proximoCobro) {
    filas.push(['Próximo cobro', formatoFecha(datos.proximoCobro)]);
  }
  const nota = mensual
    ? 'Puedes consultar y gestionar tus donaciones mensuales en cualquier momento desde la sección Donaciones de la app.'
    : 'Puedes consultar tus donaciones en cualquier momento desde la sección Donaciones de la app.';
  const asunto = `Gracias por tu donación · Comprobante N.º ${datos.numero}`;

  const html = plantillaBase({
    titulo: asunto,
    vistaPrevia: `Recibimos tu donación de ${monto}. Aquí tienes tu comprobante.`,
    contenido: [
      encabezado('Donación recibida', `Gracias, ${datos.nombre}`),
      parrafo(MENSAJE),
      cajaMonto('Monto donado', monto, tipoDonacion),
      tablaDetalles(filas),
      parrafo(nota, 15, COLORES.carbon, 24),
      boton('Ver mis donaciones', `${ESQUEMA_APP}donaciones`),
    ].join(''),
    pie: PIE,
    ayuda: AYUDA,
  });

  const texto = textoPlano(
    [
      `Gracias, ${datos.nombre}`,
      '',
      MENSAJE,
      '',
      `Monto donado: ${monto} (${tipoDonacion})`,
      ...filas.map(([etiqueta, valor]) => `${etiqueta}: ${valor}`),
      '',
      nota,
    ],
    PIE,
    AYUDA,
  );

  return { asunto, html, texto };
}
