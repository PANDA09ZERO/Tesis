import { Router } from 'express';
import {
  deleteDocumento,
  downloadDocumento,
  getAllDocumentos,
  getDocumentoById,
  getDocumentosPendientes,
  updateDocumento,
  uploadDocumento
} from '../controllers/documentos.controller';
import {
  createDocumentoCategoria,
  getDocumentoCategorias,
  updateDocumentoCategoria
} from '../controllers/documentoCategorias.controller';
import {
  createFormulario,
  getEnviosFormulario,
  getFormulario,
  getFormularios,
  submitFormulario,
  updateEstadoFormulario,
  updateFormulario
} from '../controllers/formulariosDocumentales.controller';
import { authenticate, authorize } from '../middleware/auth';
import { uploadDocumentoFile } from '../middleware/upload';

const router = Router();

router.use(authenticate);

router.get('/categorias', getDocumentoCategorias);
router.post('/categorias', authorize('administrador'), createDocumentoCategoria);
router.patch('/categorias/:id', authorize('administrador'), updateDocumentoCategoria);

router.get('/formularios', getFormularios);
router.post('/formularios', authorize('administrador'), createFormulario);
router.get('/formularios/:id/envios', getEnviosFormulario);
router.post('/formularios/:id/envios', submitFormulario);
router.patch('/formularios/:id/estado', authorize('administrador'), updateEstadoFormulario);
router.get('/formularios/:id', getFormulario);
router.put('/formularios/:id', authorize('administrador'), updateFormulario);

router.get('/', getAllDocumentos);
router.get('/pendientes', getDocumentosPendientes);
router.get('/:id/archivo', downloadDocumento);
router.get('/:id', getDocumentoById);
router.post('/upload', authorize('administrador', 'profesor'), uploadDocumentoFile, uploadDocumento);
router.put('/:id', updateDocumento);
router.delete('/:id', authorize('administrador'), deleteDocumento);

export default router;
