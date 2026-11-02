import { validDate, positiveId } from './academicValidation';
export function validPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 6 && Buffer.byteLength(value,'utf8') <= 72;
}
export function accountError(body: any, create: boolean, generatedCredentials = false): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Datos de cuenta inválidos';
  if (generatedCredentials && (Object.prototype.hasOwnProperty.call(body, 'email') || Object.prototype.hasOwnProperty.call(body, 'password'))) {
    return 'El usuario institucional y la contraseña inicial se generan automáticamente';
  }
  for (const [key,max] of [['nombre',100],['apellido',100],['email',255],['dni',20],['telefono',20],['direccion',500],['especialidad',200],['titulo_profesional',200],['ocupacion',100]] as const) {
    const value = body[key];
    const required = ['nombre','apellido'].includes(key) || (key === 'email' && !generatedCredentials);
    if ((create || value !== undefined) && required && (typeof value !== 'string' || !value.trim())) return 'Nombre, apellido y correo son obligatorios';
    if (value != null && (typeof value !== 'string' || value.length > max)) return `Campo inválido: ${key}`;
  }
  if (body.email !== undefined && (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()))) return 'Correo inválido';
  if (((create && !generatedCredentials) || (body.password !== undefined && body.password !== '')) && !validPassword(body.password)) return 'La contraseña es obligatoria: entre 6 caracteres y 72 bytes';
  for (const key of ['fecha_nacimiento','fecha_ingreso']) if (body[key] != null && body[key] !== '' && !validDate(body[key])) return `Fecha inválida: ${key}`;
  if (body.genero !== undefined && !['M','F','Otro'].includes(body.genero)) return 'Género inválido';
  if (body.activo !== undefined && ![0,1,true,false].includes(body.activo)) return 'Estado de cuenta inválido';
  if (body.cursos !== undefined && (!Array.isArray(body.cursos) || body.cursos.some((id: unknown)=>!positiveId(id)) || new Set(body.cursos.map(Number)).size !== body.cursos.length)) return 'Cursos inválidos o duplicados';
  return null;
}
