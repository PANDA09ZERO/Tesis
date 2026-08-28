<?php
require_once __DIR__ . '/Controller.php';
require_once __DIR__ . '/../model/Alumno.php';
require_once __DIR__ . '/../model/Periodo.php';

class MatriculasController extends Controller {
    private $alumnoModel;
    private $periodoModel;

    public function __construct() {
        parent::__construct();
        $this->alumnoModel = new Alumno();
        $this->periodoModel = new Periodo();
    }

    public function index() {
        requireRole([ROLE_ADMIN]);
        $periodoId = $this->getGet('periodo_id');
        $gradoId = $this->getGet('grado_id');
        $seccionId = $this->getGet('seccion_id');
        $periodos = $this->periodoModel->getAll();
        $grados = $this->db->select("SELECT * FROM grados ORDER BY nivel, nombre");
        $secciones = $this->db->select("SELECT * FROM secciones ORDER BY nombre");

        $conditions = ["m.estado = 'Activa'"];
        $params = [];
        if ($periodoId) { $conditions[] = "m.periodo_id = ?"; $params[] = $periodoId; }
        if ($gradoId) { $conditions[] = "m.grado_id = ?"; $params[] = $gradoId; }
        if ($seccionId) { $conditions[] = "m.seccion_id = ?"; $params[] = $seccionId; }
        $where = implode(' AND ', $conditions);

        $matriculas = $this->db->select(
            "SELECT m.*, a.codigo, a.nombre, a.apellido_paterno, a.apellido_materno,
                    CONCAT(a.apellido_paterno, ' ', a.apellido_materno, ', ', a.nombre) as nombre_completo,
                    g.nombre as grado, s.nombre as seccion, p.nombre as periodo_nombre
             FROM matriculas m
             JOIN alumnos a ON m.alumno_id = a.id
             JOIN grados g ON m.grado_id = g.id
             JOIN secciones s ON m.seccion_id = s.id
             JOIN periodos_academicos p ON m.periodo_id = p.id
             WHERE {$where}
             ORDER BY g.nombre, s.nombre, a.apellido_paterno",
            $params
        );

        $this->view('matriculas/index', [
            'pageTitle' => 'Gestión de Matrículas',
            'matriculas' => $matriculas,
            'periodos' => $periodos,
            'grados' => $grados,
            'secciones' => $secciones,
            'periodoId' => $periodoId,
            'gradoId' => $gradoId,
            'seccionId' => $seccionId,
        ]);
    }

    public function create() {
        requireRole([ROLE_ADMIN]);
        $periodoActual = $this->periodoModel->getActual();

        $this->view('matriculas/form', [
            'pageTitle' => 'Nueva Matrícula',
            'alumnos' => $this->db->select("SELECT * FROM alumnos WHERE estado = 1 ORDER BY apellido_paterno"),
            'grados' => $this->db->select("SELECT * FROM grados ORDER BY nivel, nombre"),
            'secciones' => $this->db->select("SELECT * FROM secciones ORDER BY nombre"),
            'periodos' => $this->periodoModel->getAll(),
            'periodoActual' => $periodoActual,
        ]);
    }

    public function store() {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $alumnoId = $this->getPost('alumno_id');
            $periodoId = $this->getPost('periodo_id');

            $existing = $this->db->selectOne(
                "SELECT id FROM matriculas WHERE alumno_id = ? AND periodo_id = ? AND estado = 'Activa'",
                [$alumnoId, $periodoId]
            );

            if ($existing) {
                $this->setFlash('error', 'El alumno ya está matriculado en este periodo');
                redirect('index.php?route=matriculas/create');
                return;
            }

            $id = $this->db->insert('matriculas', [
                'alumno_id' => $alumnoId,
                'grado_id' => $this->getPost('grado_id'),
                'seccion_id' => $this->getPost('seccion_id'),
                'periodo_id' => $periodoId,
                'fecha_matricula' => date('Y-m-d'),
                'estado' => 'Activa',
            ]);

            logActividad('Matrícula realizada', 'matriculas', $id);
            $this->setFlash('success', 'Matrícula realizada correctamente');
            redirect('index.php?route=matriculas');
        }
        redirect('index.php?route=matriculas/create');
    }

    public function trasladar($id) {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $this->db->update('matriculas', ['estado' => 'Trasladada'], 'id = ?', [$id]);
            $this->db->insert('matriculas', [
                'alumno_id' => $this->getPost('alumno_id'),
                'grado_id' => $this->getPost('nuevo_grado_id'),
                'seccion_id' => $this->getPost('nueva_seccion_id'),
                'periodo_id' => $this->getPost('periodo_id'),
                'fecha_matricula' => date('Y-m-d'),
                'estado' => 'Activa',
            ]);

            logActividad('Alumno trasladado', 'matriculas', $id);
            $this->setFlash('success', 'Alumno trasladado correctamente');
        }
        redirect('index.php?route=matriculas');
    }

    public function retirar($id) {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $this->db->update('matriculas', ['estado' => 'Retirada'], 'id = ?', [$id]);
            logActividad('Alumno retirado', 'matriculas', $id);
            $this->setFlash('success', 'Alumno retirado correctamente');
        }
        redirect('index.php?route=matriculas');
    }
}
