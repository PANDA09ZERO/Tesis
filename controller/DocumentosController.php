<?php
require_once __DIR__ . '/Controller.php';
require_once __DIR__ . '/../model/Documento.php';

class DocumentosController extends Controller {
    private $docModel;

    public function __construct() {
        parent::__construct();
        $this->docModel = new Documento();
    }

    public function index() {
        requireLogin();
        $this->docModel->actualizarEstados();
        $busqueda = $this->getGet('q');
        $categoria = $this->getGet('categoria');

        $where = "1";
        $params = [];
        if ($busqueda) {
            $where = "(d.titulo LIKE ? OR d.descripcion LIKE ? OR d.categoria LIKE ?)";
            $params = ["%$busqueda%", "%$busqueda%", "%$busqueda%"];
        }
        if ($categoria) {
            $where .= " AND d.categoria = ?";
            $params[] = $categoria;
        }

        if ($_SESSION['rol_id'] === ROLE_ALUMNO) {
            $alumno = $this->db->selectOne("SELECT id FROM alumnos WHERE usuario_id = ?", [$_SESSION['user_id']]);
            if ($alumno) {
                $where .= " AND d.alumno_id = ?";
                $params[] = $alumno['id'];
            }
        }

        $documentos = $this->docModel->findAllWithDetails($where, $params);
        $categorias = $this->docModel->getCategorias();
        $vencidos = $this->docModel->getVencidos();
        $proximos = $this->docModel->getProximosAVencer(30);

        $this->view('documentos/index', [
            'pageTitle' => 'Gestión Documental',
            'documentos' => $documentos,
            'categorias' => $categorias,
            'vencidos' => $vencidos,
            'proximos' => $proximos,
            'busqueda' => $busqueda,
            'categoria' => $categoria,
        ]);
    }

    public function create() {
        requireRole([ROLE_ADMIN, ROLE_PROFESOR]);
        $this->view('documentos/form', [
            'pageTitle' => 'Subir Documento',
            'documento' => null,
            'alumnos' => $this->db->select("SELECT id, codigo, nombre, apellido_paterno, apellido_materno FROM alumnos WHERE estado = 1 ORDER BY apellido_paterno"),
            'profesores' => $this->db->select("SELECT id, codigo, nombre, apellido_paterno FROM profesores WHERE estado = 1 ORDER BY apellido_paterno"),
        ]);
    }

    public function store() {
        requireRole([ROLE_ADMIN, ROLE_PROFESOR]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $titulo = trim($this->getPost('titulo'));
            $descripcion = trim($this->getPost('descripcion'));
            $categoria = trim($this->getPost('categoria'));
            $alumnoId = $this->getPost('alumno_id') ?: null;
            $profesorId = $this->getPost('profesor_id') ?: null;
            $fechaVencimiento = $this->getPost('fecha_vencimiento') ?: null;

            $archivoRuta = null;
            $tipoArchivo = 'Otro';

            if (isset($_FILES['archivo']) && $_FILES['archivo']['error'] === UPLOAD_ERR_OK) {
                $archivo = $_FILES['archivo'];
                $extension = strtolower(pathinfo($archivo['name'], PATHINFO_EXTENSION));

                $permitidos = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'doc', 'docx', 'xls', 'xlsx'];
                if (!in_array($extension, $permitidos)) {
                    $this->setFlash('error', 'Tipo de archivo no permitido');
                    redirect('index.php?route=documentos/create');
                    return;
                }

                if ($archivo['size'] > MAX_FILE_SIZE) {
                    $this->setFlash('error', 'El archivo excede el tamaño máximo');
                    redirect('index.php?route=documentos/create');
                    return;
                }

                $tipos = ['pdf' => 'PDF', 'jpg' => 'Imagen', 'jpeg' => 'Imagen', 'png' => 'Imagen', 'gif' => 'Imagen'];
                $tipoArchivo = $tipos[$extension] ?? 'Documento';

                $directorio = UPLOAD_PATH . date('Y/m/');
                if (!is_dir($directorio)) {
                    mkdir($directorio, 0777, true);
                }

                $nombreArchivo = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $archivo['name']);
                $archivoRuta = 'uploads/' . date('Y/m/') . $nombreArchivo;
                move_uploaded_file($archivo['tmp_name'], $directorio . $nombreArchivo);
            }

            $id = $this->docModel->create([
                'titulo' => $titulo,
                'descripcion' => $descripcion,
                'archivo' => $archivoRuta,
                'tipo' => $tipoArchivo,
                'categoria' => $categoria,
                'alumno_id' => $alumnoId,
                'profesor_id' => $profesorId,
                'usuario_subio' => $_SESSION['user_id'],
                'fecha_vencimiento' => $fechaVencimiento,
                'estado' => $fechaVencimiento ? ($fechaVencimiento >= date('Y-m-d') ? 'Vigente' : 'Vencido') : 'Vigente',
            ]);

            logActividad('Documento subido', 'documentos', $id, $titulo);
            $this->setFlash('success', 'Documento subido correctamente');
            redirect('index.php?route=documentos');
        }
        redirect('index.php?route=documentos/create');
    }

    public function delete($id) {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $doc = $this->docModel->findById($id);
            if ($doc && $doc['archivo'] && file_exists(ROOT_PATH . $doc['archivo'])) {
                unlink(ROOT_PATH . $doc['archivo']);
            }
            $this->docModel->delete($id);
            logActividad('Documento eliminado', 'documentos', $id);
            $this->setFlash('success', 'Documento eliminado');
        }
        redirect('index.php?route=documentos');
    }

    public function download($id) {
        requireLogin();
        $doc = $this->docModel->findById($id);
        if (!$doc || !$doc['archivo']) {
            redirect('index.php?route=documentos');
            return;
        }
        $filePath = ROOT_PATH . $doc['archivo'];
        if (file_exists($filePath)) {
            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename="' . $doc['titulo'] . '"');
            header('Content-Length: ' . filesize($filePath));
            readfile($filePath);
            exit;
        }
        $this->setFlash('error', 'Archivo no encontrado');
        redirect('index.php?route=documentos');
    }
}
