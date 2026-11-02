import { controladoresPago } from '../utils/pagos';
const pagos = controladoresPago('sueldo');
export const getAllSueldos = pagos.list;
export const getSueldoById = pagos.get;
export const createSueldo = pagos.create;
export const updateSueldo = pagos.update;
export const deleteSueldo = pagos.remove;
export const getResumenSueldos = pagos.summary;
