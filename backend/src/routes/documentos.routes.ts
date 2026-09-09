import { Router } from 'express';
import { getAllDocumentos, getDocumentoById, uploadDocumento, updateDocumento, deleteDocumento, getDocumentosPendientes } from '../controllers/documentos.controller';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authenticate);

router.get('/', getAllDocumentos);
router.get('/pendientes', getDocumentosPendientes);
router.get('/:id', getDocumentoById);
router.post('/upload', upload.single('archivo'), uploadDocumento);
router.put('/:id', updateDocumento);
router.delete('/:id', authorize('administrador'), deleteDocumento);

export default router;
