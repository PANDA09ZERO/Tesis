export const ROLES = {
  ADMIN: 'administrador',
  PROFESOR: 'profesor',
  ALUMNO: 'alumno',
  APODERADO: 'apoderado'
} as const;

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'] as const;

export const EVALUACION = {
  NOTA_MINIMA: 0,
  NOTA_MAXIMA: 20,
  APROBADO: 11,
  DESAPROBADO: 10
} as const;

export const TIPOS_DOCUMENTO = ['pdf', 'imagen', 'documento', 'otro'] as const;

export const ESTADO_ALERTA = ['activa', 'atendida', 'resuelta', 'expirada'] as const;