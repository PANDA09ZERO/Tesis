<?php
require_once __DIR__ . '/Controller.php';
require_once __DIR__ . '/../model/Alumno.php';

class AlumnosController extends Controller {
    private $alumnoModel;

    public function __construct() {
        parent::__construct();
        $this->alumnoModel = new Alumno();
    }

    public function index() {
        requireRole([ROLE_ADMIN, ROLE_PROFESOR]);
        $busqueda = $this->getGet('q');
        $alumnos = $busqueda 
            ? $this->alumnoModel->buscar($busqueda)
            : $this->alumnoModel->findAllWithGrado();

        $this->view('alumnos/index', [
            'pageTitle' => 'Gestión de Alumnos',
            'alumnos' => $alumnos,
            'busqueda' => $busqueda,
        ]);
    }

    public function create() {
        requireRole([ROLE_ADMIN]);
        $this->view('alumnos/form', [
            'pageTitle' => 'Registrar Alumno',
            'alumno' => null,
            'grados' => $this->db->select("SELECT * FROM grados ORDER BY nivel, nombre"),
            'secciones' => $this->db->select("SELECT * FROM secciones ORDER BY nombre"),
            'apoderados' => $this->db->select("SELECT * FROM apoderados ORDER BY apellido_paterno"),
        ]);
    }

    public function store() {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $codigo = trim($this->getPost('codigo'));
            if ($codigo === '') { $codigo = $this->db->generarCodigo('alumnos', 'A', 6); }
            $dni = trim($this->getPost('dni'));
            $nombre = trim($this->getPost('nombre'));
            $apellido_paterno = trim($this->getPost('apellido_paterno'));
            $apellido_materno = trim($this->getPost('apellido_materno'));
            $fecha_nacimiento = $this->getPost('fecha_nacimiento');
            $sexo = $this->getPost('sexo');
            $telefono = trim($this->getPost('telefono'));
            $email = trim($this->getPost('email'));
            $direccion = trim($this->getPost('direccion'));

            $grado_id = $this->getPost('grado_id');
            $seccion_id = $this->getPost('seccion_id');
            $periodo = $this->db->selectOne("SELECT * FROM periodos_academicos WHERE estado = 1 LIMIT 1");

            $alumnoId = $this->alumnoModel->create([
                'codigo' => $codigo,
                'dni' => $dni,
                'nombre' => $nombre,
                'apellido_paterno' => $apellido_paterno,
                'apellido_materno' => $apellido_materno,
                'fecha_nacimiento' => $fecha_nacimiento,
                'sexo' => $sexo,
                'telefono' => $telefono,
                'email' => $email,
                'direccion' => $direccion,
            ]);

            if ($grado_id && $seccion_id && $periodo) {
                $this->db->insert('matriculas', [
                    'alumno_id' => $alumnoId,
                    'grado_id' => $grado_id,
                    'seccion_id' => $seccion_id,
                    'periodo_id' => $periodo['id'],
                    'fecha_matricula' => date('Y-m-d'),
                    'estado' => 'Activa',
                ]);
            }

            $apoderados = $this->getPost('apoderados');
            if ($apoderados) {
                foreach ($apoderados as $apoderadoId) {
                    $this->db->insert('alumno_apoderado', [
                        'alumno_id' => $alumnoId,
                        'apoderado_id' => $apoderadoId,
                    ]);
                }
            }

            $this->gestionarCredencialAcceso('alumnos', $alumnoId, ROLE_ALUMNO, $nombre, $apellido_paterno, $apellido_materno);

            logActividad('Alumno registrado', 'alumnos', $alumnoId, $nombre . ' ' . $apellido_paterno);
            $this->setFlash('success', 'Alumno registrado correctamente');
            redirect('index.php?route=alumnos');
        }
        redirect('index.php?route=alumnos/create');
    }

    public function edit($id) {
        requireRole([ROLE_ADMIN]);
        $alumno = $this->alumnoModel->findWithDetails($id);
        if (!$alumno) { redirect('index.php?route=alumnos'); return; }

        $this->view('alumnos/form', [
            'pageTitle' => 'Editar Alumno',
            'alumno' => $alumno,
            'grados' => $this->db->select("SELECT * FROM grados ORDER BY nivel, nombre"),
            'secciones' => $this->db->select("SELECT * FROM secciones ORDER BY nombre"),
            'apoderados' => $this->db->select("SELECT * FROM apoderados ORDER BY apellido_paterno"),
            'alumnoApoderados' => $this->db->select(
                "SELECT apoderado_id FROM alumno_apoderado WHERE alumno_id = ?", [$id]
            ),
        ]);
    }

    public function update($id) {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $this->alumnoModel->update($id, [
                'dni' => trim($this->getPost('dni')),
                'nombre' => trim($this->getPost('nombre')),
                'apellido_paterno' => trim($this->getPost('apellido_paterno')),
                'apellido_materno' => trim($this->getPost('apellido_materno')),
                'fecha_nacimiento' => $this->getPost('fecha_nacimiento'),
                'sexo' => $this->getPost('sexo'),
                'telefono' => trim($this->getPost('telefono')),
                'email' => trim($this->getPost('email')),
                'direccion' => trim($this->getPost('direccion')),
            ]);

            $this->gestionarCredencialAcceso('alumnos', $id, ROLE_ALUMNO,
                trim($this->getPost('nombre')), trim($this->getPost('apellido_paterno')),
                trim($this->getPost('apellido_materno')));

            logActividad('Alumno actualizado', 'alumnos', $id);
            $this->setFlash('success', 'Alumno actualizado correctamente');
            redirect('index.php?route=alumnos');
        }
        redirect("index.php?route=alumnos/edit/{$id}");
    }

    public function delete($id) {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $this->alumnoModel->delete($id);
            logActividad('Alumno eliminado', 'alumnos', $id);
            $this->setFlash('success', 'Alumno eliminado correctamente');
        }
        redirect('index.php?route=alumnos');
    }

    public function profile($id) {
        requireRole([ROLE_ADMIN, ROLE_PROFESOR]);
        $alumno = $this->alumnoModel->findWithDetails($id);
        if (!$alumno) { redirect('index.php?route=alumnos'); return; }

        $this->view('alumnos/profile', [
            'pageTitle' => 'Expediente del Alumno',
            'alumno' => $alumno,
            'calificaciones' => $this->alumnoModel->getCalificaciones($id),
            'asistencias' => $this->alumnoModel->getAsistencias($id),
            'apoderados' => $this->alumnoModel->getApoderados($id),
            'documentos' => $this->alumnoModel->getDocumentos($id),
        ]);
    }
}
