<?php
require_once __DIR__ . '/Controller.php';
require_once __DIR__ . '/../model/Calificacion.php';
require_once __DIR__ . '/../model/Curso.php';
require_once __DIR__ . '/../model/Periodo.php';
require_once __DIR__ . '/../model/Alumno.php';

class CalificacionesController extends Controller {
    private $calModel;
    private $cursoModel;
    private $periodoModel;
    private $alumnoModel;

    public function __construct() {
        parent::__construct();
        $this->calModel = new Calificacion();
        $this->cursoModel = new Curso();
        $this->periodoModel = new Periodo();
        $this->alumnoModel = new Alumno();
    }

    public function index() {
        requireRole([ROLE_ADMIN, ROLE_PROFESOR]);
        $periodoActual = $this->periodoModel->getActual();
        $periodos = $this->periodoModel->getAll();
        $cursos = $this->cursoModel->findAllActivos();

        $cursoId = $this->getGet('curso_id');
        $periodoId = $this->getGet('periodo_id') ?? ($periodoActual ? $periodoActual['id'] : null);

        $calificaciones = [];
        $cursoSeleccionado = null;
        $periodoSeleccionado = null;

        if ($cursoId && $periodoId) {
            $calificaciones = $this->calModel->getPorCursoPeriodo($cursoId, $periodoId);
            $cursoSeleccionado = $this->cursoModel->findById($cursoId);
            $periodoSeleccionado = $this->periodoModel->findById($periodoId);
        }

        $this->view('calificaciones/index', [
            'pageTitle' => 'Gestión de Calificaciones',
            'calificaciones' => $calificaciones,
            'cursos' => $cursos,
            'periodos' => $periodos,
            'cursoSeleccionado' => $cursoSeleccionado,
            'periodoSeleccionado' => $periodoSeleccionado,
            'cursoId' => $cursoId,
            'periodoId' => $periodoId,
        ]);
    }

    public function registrar() {
        requireRole([ROLE_ADMIN, ROLE_PROFESOR]);
        $periodoActual = $this->periodoModel->getActual();
        $periodos = $this->periodoModel->getAll();
        $cursos = $this->cursoModel->findAllActivos();

        $cursoId = $this->getGet('curso_id');
        $periodoId = $this->getGet('periodo_id') ?? ($periodoActual ? $periodoActual['id'] : null);

        $alumnos = [];
        $cursoSeleccionado = null;
        $periodoSeleccionado = null;

        if ($cursoId && $periodoId) {
            $alumnos = $this->db->select(
                "SELECT a.id, a.codigo, a.nombre, a.apellido_paterno, a.apellido_materno,
                        c.nota as nota_actual, c.conducta as conducta_actual, c.id as cal_id
                 FROM alumnos a
                 JOIN matriculas m ON a.id = m.alumno_id AND m.estado = 'Activa'
                 LEFT JOIN calificaciones c ON a.id = c.alumno_id AND c.curso_id = ? AND c.periodo_id = ?
                 ORDER BY a.apellido_paterno, a.apellido_materno, a.nombre",
                [$cursoId, $periodoId]
            );
            $cursoSeleccionado = $this->cursoModel->findById($cursoId);
            $periodoSeleccionado = $this->periodoModel->findById($periodoId);
        }

        $this->view('calificaciones/registrar', [
            'pageTitle' => 'Registrar Calificaciones',
            'alumnos' => $alumnos,
            'cursos' => $cursos,
            'periodos' => $periodos,
            'cursoSeleccionado' => $cursoSeleccionado,
            'periodoSeleccionado' => $periodoSeleccionado,
            'cursoId' => $cursoId,
            'periodoId' => $periodoId,
        ]);
    }

    public function guardar() {
        requireRole([ROLE_ADMIN, ROLE_PROFESOR]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $cursoId = $this->getPost('curso_id');
            $periodoId = $this->getPost('periodo_id');
            $notas = $this->getPost('notas');
            $conductas = $this->getPost('conductas');
            $observaciones = $this->getPost('observaciones');

            if ($notas) {
                foreach ($notas as $alumnoId => $nota) {
                    if ($nota !== '' && $nota !== null) {
                        $conducta = $conductas[$alumnoId] ?? null;
                        $obs = $observaciones[$alumnoId] ?? null;
                        $this->calModel->guardar($alumnoId, $cursoId, $periodoId, $nota, $conducta, $obs);
                    }
                }
            }

            logActividad('Calificaciones guardadas', 'calificaciones', null, "Curso: {$cursoId}, Periodo: {$periodoId}");
            $this->setFlash('success', 'Calificaciones guardadas correctamente');
            redirect("index.php?route=calificaciones/registrar&curso_id={$cursoId}&periodo_id={$periodoId}");
        }
        redirect('index.php?route=calificaciones');
    }

    public function alumno($id) {
        requireRole([ROLE_ADMIN, ROLE_PROFESOR, ROLE_ALUMNO, ROLE_APODERADO]);
        $alumno = $this->alumnoModel->findWithDetails($id);
        if (!$alumno) { redirect('index.php?route=calificaciones'); return; }

        $periodos = $this->periodoModel->getAll();
        $periodoId = $this->getGet('periodo_id');
        $calificaciones = $this->alumnoModel->getCalificaciones($id, $periodoId);
        $promedio = $periodoId ? $this->calModel->getPromedioAlumno($id, $periodoId) : null;

        $this->view('calificaciones/alumno', [
            'pageTitle' => 'Calificaciones del Alumno',
            'alumno' => $alumno,
            'calificaciones' => $calificaciones,
            'promedio' => $promedio,
            'periodos' => $periodos,
            'periodoId' => $periodoId,
        ]);
    }
}
