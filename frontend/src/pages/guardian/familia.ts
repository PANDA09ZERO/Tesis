export type VistaFamilia='resumen'|'cursos'|'calificaciones'|'asistencia';
export const vistasFamilia:Record<VistaFamilia,string>={resumen:'Resumen',cursos:'Cursos y horarios',calificaciones:'Calificaciones',asistencia:'Asistencia'};
export interface AsistenciaFamilia{id:number;curso:string|null;fecha:string;estado:string;minutos_tardanza:number}
export interface ResumenFamilia {
 alumno:{id:number;nombre:string;apellido:string;codigo_alumno:string;parentesco:string|null;estado:string};
 periodo:{id:number;nombre:string;activo:number}|null;
 periodos:{id:number;nombre:string;activo:number}[];
 grado:string;
 resumen:{cursos:number;calificaciones:number;registros_asistencia:number;dias_asistencia:number;ausencias:number;asistencias_sin_periodo:number};
 pendientes:{inasistencias:AsistenciaFamilia[]};
}
export interface DetalleFamilia extends ResumenFamilia{
 matriculas:{id:number;grado:string;inscripciones:{id:number;curso:string;codigo:string;estado:string}[]}[];
 calificaciones:{id:number;curso:string;nota:number;escala_maxima:number|null;fecha:string|null;tipo_evaluacion:string}[];
 asistencias:AsistenciaFamilia[];
 horarios:{id:number;curso:string;grado:string;profesor:string;dia_semana:string;hora_inicio:string;hora_fin:string;aula:string|null}[];
}
export function fechaFamilia(value:string|null){return value&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value.split('-').reverse().join('/'):'Sin fecha registrada';}
