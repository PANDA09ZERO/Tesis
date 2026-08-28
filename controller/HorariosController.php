<?php
require_once __DIR__ . '/Controller.php';
require_once __DIR__ . '/../model/Periodo.php';

class HorariosController extends Controller {
    private $periodoModel;

    public function __construct() {
        parent::__construct();
        $this->periodoModel = new Periodo();
    }

    public function index() {
        requireRole([ROLE_ADMIN]);
        $periodoId = $this->getGet('periodo_id');
        $periodos = $this->periodoModel->getAll();

        $horarios = $this->db->select(
            "SELECT h.*, c.nombre as curso_nombre, c.codigo as curso_codigo,
                    CONCAT(p.apellido_paterno, ' ', p.nombre) as profesor_nombre,
                    g.nombre as grado, s.nombre as seccion
             FROM horarios h
             JOIN cursos c ON h.curso_id = c.id
             JOIN profesores p ON h.profesor_id = p.id
             JOIN grados g ON h.grado_id = g.id
             JOIN secciones s ON h.seccion_id = s.id
             " . ($periodoId ? "WHERE h.periodo_id = ?" : "") . "
             ORDER BY FIELD(h.dia, 'Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'), h.hora_inicio",
            $periodoId ? [$periodoId] : []
        );

        $this->view('horarios/index', [
            'pageTitle' => 'Gestión de Horarios',
            'horarios' => $horarios,
            'periodos' => $periodos,
            'periodoId' => $periodoId,
        ]);
    }

    public function create() {
        requireRole([ROLE_ADMIN]);
        $this->view('horarios/form', [
            'pageTitle' => 'Nuevo Horario',
            'horario' => null,
            'cursos' => $this->db->select("SELECT * FROM cursos WHERE estado = 1 ORDER BY nombre"),
            'profesores' => $this->db->select("SELECT *, CONCAT(apellido_paterno, ' ', nombre) as nombre_completo FROM profesores WHERE estado = 1 ORDER BY apellido_paterno"),
            'grados' => $this->db->select("SELECT * FROM grados ORDER BY nivel, nombre"),
            'secciones' => $this->db->select("SELECT * FROM secciones ORDER BY nombre"),
            'periodos' => $this->periodoModel->getAll(),
        ]);
    }

    public function store() {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $horaInicio = $this->getPost('hora_inicio');
            $horaFin = $this->getPost('hora_fin');

            if ($horaInicio >= $horaFin) {
                $this->setFlash('error', 'La hora de fin debe ser mayor a la hora de inicio');
                redirect('index.php?route=horarios/create');
                return;
            }

            $conflictos = $this->db->select(
                "SELECT * FROM horarios 
                 WHERE profesor_id = ? AND dia = ? AND periodo_id = ?
                 AND ((hora_inicio < ? AND hora_fin > ?) OR (hora_inicio < ? AND hora_fin > ?) OR (hora_inicio >= ? AND hora_fin <= ?))",
                [
                    $this->getPost('profesor_id'), $this->getPost('dia'), $this->getPost('periodo_id'),
                    $horaFin, $horaInicio, $horaFin, $horaInicio, $horaInicio, $horaFin
                ]
            );

            if (!empty($conflictos)) {
                $this->setFlash('error', 'El profesor ya tiene un horario en ese rango de tiempo');
                redirect('index.php?route=horarios/create');
                return;
            }

            $id = $this->db->insert('horarios', [
                'curso_id' => $this->getPost('curso_id'),
                'profesor_id' => $this->getPost('profesor_id'),
                'grado_id' => $this->getPost('grado_id'),
                'seccion_id' => $this->getPost('seccion_id'),
                'periodo_id' => $this->getPost('periodo_id'),
                'dia' => $this->getPost('dia'),
                'hora_inicio' => $horaInicio,
                'hora_fin' => $horaFin,
                'aula' => trim($this->getPost('aula')),
            ]);

            logActividad('Horario creado', 'horarios', $id);
            $this->setFlash('success', 'Horario registrado correctamente');
            redirect('index.php?route=horarios');
        }
        redirect('index.php?route=horarios/create');
    }

    public function edit($id) {
        requireRole([ROLE_ADMIN]);
        $horario = $this->db->selectOne("SELECT * FROM horarios WHERE id = ?", [$id]);
        if (!$horario) { redirect('index.php?route=horarios'); return; }

        $this->view('horarios/form', [
            'pageTitle' => 'Editar Horario',
            'horario' => $horario,
            'cursos' => $this->db->select("SELECT * FROM cursos WHERE estado = 1 ORDER BY nombre"),
            'profesores' => $this->db->select("SELECT *, CONCAT(apellido_paterno, ' ', nombre) as nombre_completo FROM profesores WHERE estado = 1 ORDER BY apellido_paterno"),
            'grados' => $this->db->select("SELECT * FROM grados ORDER BY nivel, nombre"),
            'secciones' => $this->db->select("SELECT * FROM secciones ORDER BY nombre"),
            'periodos' => $this->periodoModel->getAll(),
        ]);
    }

    public function update($id) {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $this->db->update('horarios', [
                'curso_id' => $this->getPost('curso_id'),
                'profesor_id' => $this->getPost('profesor_id'),
                'grado_id' => $this->getPost('grado_id'),
                'seccion_id' => $this->getPost('seccion_id'),
                'periodo_id' => $this->getPost('periodo_id'),
                'dia' => $this->getPost('dia'),
                'hora_inicio' => $this->getPost('hora_inicio'),
                'hora_fin' => $this->getPost('hora_fin'),
                'aula' => trim($this->getPost('aula')),
            ], 'id = ?', [$id]);

            logActividad('Horario actualizado', 'horarios', $id);
            $this->setFlash('success', 'Horario actualizado correctamente');
            redirect('index.php?route=horarios');
        }
        redirect("index.php?route=horarios/edit/{$id}");
    }

    public function delete($id) {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $this->db->delete('horarios', 'id = ?', [$id]);
            logActividad('Horario eliminado', 'horarios', $id);
            $this->setFlash('success', 'Horario eliminado correctamente');
        }
        redirect('index.php?route=horarios');
    }

    public function grilla() {
        requireRole([ROLE_ADMIN, ROLE_PROFESOR]);
        $periodoId = $this->getGet('periodo_id');
        $periodos = $this->periodoModel->getAll();

        $horarios = $this->db->select(
            "SELECT h.*, c.nombre as curso_nombre, c.codigo as curso_codigo,
                    CONCAT(p.apellido_paterno, ' ', p.nombre) as profesor_nombre,
                    g.nombre as grado, s.nombre as seccion
             FROM horarios h
             JOIN cursos c ON h.curso_id = c.id
             JOIN profesores p ON h.profesor_id = p.id
             JOIN grados g ON h.grado_id = g.id
             JOIN secciones s ON h.seccion_id = s.id
             " . ($periodoId ? "WHERE h.periodo_id = ?" : "") . "
             ORDER BY FIELD(h.dia, 'Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'), h.hora_inicio",
            $periodoId ? [$periodoId] : []
        );

        $grilla = [];
        foreach ($horarios as $h) {
            $grilla[$h['dia']][] = $h;
        }

        $this->view('horarios/grilla', [
            'pageTitle' => 'Grilla de Horarios',
            'grilla' => $grilla,
            'periodos' => $periodos,
            'periodoId' => $periodoId,
        ]);
    }
}
