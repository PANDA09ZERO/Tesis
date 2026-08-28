<?php
require_once __DIR__ . '/Controller.php';
require_once __DIR__ . '/../model/Asistencia.php';
require_once __DIR__ . '/../model/Periodo.php';

class AsistenciasController extends Controller {
    private $asistenciaModel;
    private $periodoModel;

    public function __construct() {
        parent::__construct();
        $this->asistenciaModel = new Asistencia();
        $this->periodoModel = new Periodo();
    }

    public function index() {
        requireRole([ROLE_ADMIN, ROLE_PROFESOR]);
        $periodoActual = $this->periodoModel->getActual();
        $periodos = $this->periodoModel->getAll();

        $horarios = [];
        $profesorId = null;

        if ($_SESSION['rol_id'] === ROLE_PROFESOR) {
            $prof = $this->db->selectOne("SELECT id FROM profesores WHERE usuario_id = ?", [$_SESSION['user_id']]);
            $profesorId = $prof ? $prof['id'] : null;
        }

        if ($profesorId) {
            $periodoId = $this->getGet('periodo_id') ?? ($periodoActual ? $periodoActual['id'] : null);
            $horarios = $this->db->select(
                "SELECT h.*, c.nombre as curso_nombre, g.nombre as grado, s.nombre as seccion
                 FROM horarios h
                 JOIN cursos c ON h.curso_id = c.id
                 JOIN grados g ON h.grado_id = g.id
                 JOIN secciones s ON h.seccion_id = s.id
                 WHERE h.profesor_id = ? " . ($periodoId ? "AND h.periodo_id = ?" : "") . "
                 ORDER BY FIELD(h.dia, 'Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'), h.hora_inicio",
                $periodoId ? [$profesorId, $periodoId] : [$profesorId]
            );
        } elseif ($_SESSION['rol_id'] === ROLE_ADMIN) {
            $horarios = $this->db->select(
                "SELECT h.*, c.nombre as curso_nombre, g.nombre as grado, s.nombre as seccion,
                        CONCAT(p.apellido_paterno, ' ', p.nombre) as profesor_nombre
                 FROM horarios h
                 JOIN cursos c ON h.curso_id = c.id
                 JOIN grados g ON h.grado_id = g.id
                 JOIN secciones s ON h.seccion_id = s.id
                 JOIN profesores p ON h.profesor_id = p.id
                 ORDER BY FIELD(h.dia, 'Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'), h.hora_inicio"
            );
        }

        $this->view('asistencias/index', [
            'pageTitle' => 'Gestión de Asistencias',
            'horarios' => $horarios,
            'periodos' => $periodos,
        ]);
    }

    public function registrar($horarioId) {
        requireRole([ROLE_ADMIN, ROLE_PROFESOR]);
        $horario = $this->db->selectOne(
            "SELECT h.*, c.nombre as curso_nombre, g.nombre as grado, s.nombre as seccion
             FROM horarios h
             JOIN cursos c ON h.curso_id = c.id
             JOIN grados g ON h.grado_id = g.id
             JOIN secciones s ON h.seccion_id = s.id
             WHERE h.id = ?",
            [$horarioId]
        );

        if (!$horario) { redirect('index.php?route=asistencias'); return; }

        $fecha = $this->getGet('fecha') ?? date('Y-m-d');
        $alumnos = $this->asistenciaModel->getAlumnosPorHorario($horarioId);
        $existentes = $this->asistenciaModel->getPorFecha($horarioId, $fecha);

        $asistenciasMap = [];
        foreach ($existentes as $e) {
            $asistenciasMap[$e['alumno_id']] = $e['estado'];
        }

        $this->view('asistencias/registrar', [
            'pageTitle' => 'Registrar Asistencia',
            'horario' => $horario,
            'alumnos' => $alumnos,
            'asistenciasMap' => $asistenciasMap,
            'fecha' => $fecha,
            'horarioId' => $horarioId,
        ]);
    }

    public function guardar() {
        requireRole([ROLE_ADMIN, ROLE_PROFESOR]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $horarioId = $this->getPost('horario_id');
            $fecha = $this->getPost('fecha');
            $estados = $this->getPost('estados');

            if ($estados) {
                foreach ($estados as $alumnoId => $estado) {
                    $existing = $this->db->selectOne(
                        "SELECT id FROM asistencias WHERE alumno_id = ? AND horario_id = ? AND fecha = ?",
                        [$alumnoId, $horarioId, $fecha]
                    );
                    if ($existing) {
                        $this->db->update('asistencias', ['estado' => $estado], 'id = ?', [$existing['id']]);
                    } else {
                        $this->db->insert('asistencias', [
                            'alumno_id' => $alumnoId,
                            'horario_id' => $horarioId,
                            'fecha' => $fecha,
                            'estado' => $estado,
                        ]);
                    }
                }
            }

            logActividad('Asistencia registrada', 'asistencias', null, "Horario: {$horarioId}, Fecha: {$fecha}");
            $this->setFlash('success', 'Asistencia guardada correctamente');
            redirect("index.php?route=asistencias/registrar/{$horarioId}&fecha={$fecha}");
        }
        redirect('index.php?route=asistencias');
    }

    public function resumen($alumnoId) {
        requireRole([ROLE_ADMIN, ROLE_PROFESOR]);
        $alumno = $this->db->selectOne(
            "SELECT *, CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) as nombre_completo
             FROM alumnos WHERE id = ?",
            [$alumnoId]
        );
        $periodoActual = $this->periodoModel->getActual();
        $resumen = $periodoActual ? $this->asistenciaModel->getResumenAlumno($alumnoId, $periodoActual['id']) : null;

        $this->view('asistencias/resumen', [
            'pageTitle' => 'Resumen de Asistencia',
            'alumno' => $alumno,
            'resumen' => $resumen,
        ]);
    }
}
