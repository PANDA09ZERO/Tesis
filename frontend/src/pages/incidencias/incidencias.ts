import type { EstadoIncidencia, GravedadIncidencia, TipoIncidencia } from '../../types';

export const tiposIncidencia: Record<TipoIncidencia, string> = {
  derivacion_direccion: 'Derivado a dirección',
  conducta: 'Falta de conducta',
  citacion_apoderado: 'Citación al apoderado',
  agresion: 'Agresión o pelea',
  otro: 'Otro',
};
export const gravedades: Record<GravedadIncidencia, string> = { leve: 'Leve', moderada: 'Moderada', grave: 'Grave' };
export const estadosIncidencia: Record<EstadoIncidencia, string> = { abierta: 'Abierta', en_seguimiento: 'En seguimiento', cerrada: 'Cerrada' };
export const gravedadVariant = (g: GravedadIncidencia) => g === 'grave' ? 'danger' : g === 'moderada' ? 'warning' : 'info';
export const estadoVariant = (e: EstadoIncidencia) => e === 'cerrada' ? 'success' : e === 'en_seguimiento' ? 'info' : 'warning';
export const fechaIncidencia = (fecha: string, hora?: string | null) => {
  const [y, m, d] = fecha.slice(0, 10).split('-');
  return `${d}/${m}/${y}${hora ? ' · ' + hora : ''}`;
};
