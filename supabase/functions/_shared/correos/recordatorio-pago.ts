import {
  boton,
  COLORES,
  type Correo,
  encabezado,
  ESQUEMA_APP,
  formatoFecha,
  formatoFechaHora,
  formatoPesos,
  fuente,
  parrafo,
  plantillaBase,
  tablaDetalles,
  textoPlano,
} from './base.ts';

export interface DatosRecordatorioPago {
  nombre: string;
  montoCentavos: number;
  fechaIntento: Date | string;
  metodoPago: string;
  motivo?: string | null;
  proximoIntento?: string | null;
}

const PIE = [
  'Por tu seguridad, nunca te pediremos los datos completos de tu tarjeta por correo. Actualízalos solo dentro de la app.',
];
const AYUDA = '¿Necesitas ayuda?';
const AVISO_TITULO = 'No pudimos procesar tu pago';
const AVISO_TEXTO = 'No se te realizó ningún cobro. Solo necesitas actualizar tu método de pago.';
const MENSAJE =
  'Intentamos realizar el cobro de tu donación mensual, pero tu banco lo rechazó. Para que tu aporte siga llegando a la comunidad, actualiza tu método de pago.';
const QUE_HACER =
  'Revisa que tu tarjeta esté vigente y tenga fondos disponibles, o registra otro método de pago desde la app.';

function aviso(): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 32px;">
  <tr>
    <td style="background:${COLORES.crema};border-radius:14px;padding:20px 22px;">
      <table role="presentation" cellspacing="0" cellpadding="0">
        <tr>
          <td valign="top" style="padding:0 14px 0 0;${fuente(20, COLORES.rojo)}">&#9888;&#xFE0E;</td>
          <td valign="top">
            <p style="margin:0;${fuente(16, COLORES.carbon, 'font-weight:700;')}">${AVISO_TITULO}</p>
            <p style="margin:4px 0 0;${fuente(15, COLORES.carbon)}">${AVISO_TEXTO}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

export function recordatorioPagoRechazado(datos: DatosRecordatorioPago): Correo {
  const monto = formatoPesos(datos.montoCentavos);
  const filas: Array<[string, string]> = [
    ['Donación', `Mensual · ${monto}`],
    ['Fecha del intento', formatoFechaHora(datos.fechaIntento)],
    ['Método de pago', datos.metodoPago],
  ];
  if (datos.motivo) filas.push(['Motivo', datos.motivo]);
  const reintento = datos.proximoIntento
    ? `Intentaremos el cobro de nuevo el ${formatoFecha(datos.proximoIntento)}.`
    : null;
  const asunto = 'No pudimos procesar tu donación mensual';

  const html = plantillaBase({
    titulo: asunto,
    vistaPrevia: `Tu banco rechazó el cobro de ${monto}. Actualiza tu método de pago para continuar.`,
    contenido: [
      aviso(),
      encabezado(null, `Hola, ${datos.nombre}`),
      parrafo(MENSAJE),
      tablaDetalles(filas),
      `<p style="margin:28px 0 0;${fuente(16, COLORES.carbon, 'font-weight:700;')}">¿Qué puedes hacer?</p>`,
      parrafo(QUE_HACER, 15, COLORES.carbon, 8),
      reintento ? parrafo(reintento, 15, COLORES.carbon, 8) : '',
      boton('Actualizar método de pago', `${ESQUEMA_APP}donaciones`),
    ].join(''),
    pie: PIE,
    ayuda: AYUDA,
  });

  const texto = textoPlano(
    [
      `${AVISO_TITULO}. ${AVISO_TEXTO}`,
      '',
      `Hola, ${datos.nombre}`,
      '',
      MENSAJE,
      '',
      ...filas.map(([etiqueta, valor]) => `${etiqueta}: ${valor}`),
      '',
      '¿Qué puedes hacer?',
      QUE_HACER,
      reintento,
    ],
    PIE,
    AYUDA,
  );

  return { asunto, html, texto };
}
