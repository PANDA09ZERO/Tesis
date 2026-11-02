import { controladoresPago } from '../utils/pagos';
const pagos = controladoresPago('matricula');
export const getAllPagosMatricula = pagos.list;
export const getPagoMatriculaById = pagos.get;
export const createPagoMatricula = pagos.create;
export const updatePagoMatricula = pagos.update;
export const deletePagoMatricula = pagos.remove;
export const getResumenPagosMatricula = pagos.summary;
