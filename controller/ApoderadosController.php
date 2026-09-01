<?php
require_once __DIR__ . '/Controller.php';
require_once __DIR__ . '/../model/Apoderado.php';

class ApoderadosController extends Controller {
    private $apoderadoModel;

    public function __construct() {
        parent::__construct();
        $this->apoderadoModel = new Apoderado();
    }

    public function index() {
        requireRole([ROLE_ADMIN]);
        $busqueda = $this->getGet('q');
        $apoderados = $busqueda
            ? $this->apoderadoModel->buscar($busqueda)
            : $this->apoderadoModel->findAllWithDetails();

        $this->view('apoderados/index', [
            'pageTitle' => 'Gestión de Apoderados',
            'apoderados' => $apoderados,
            'busqueda' => $busqueda,
        ]);
    }

    public function create() {
        requireRole([ROLE_ADMIN]);
        $this->view('apoderados/form', [
            'pageTitle' => 'Registrar Apoderado',
            'apoderado' => null,
        ]);
    }

    public function store() {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $nombre = trim($this->getPost('nombre'));
            $apellido_paterno = trim($this->getPost('apellido_paterno'));
            $apellido_materno = trim($this->getPost('apellido_materno'));
            $email = trim($this->getPost('email'));
            $id = $this->apoderadoModel->create([
                'dni' => trim($this->getPost('dni')),
                'nombre' => $nombre,
                'apellido_paterno' => $apellido_paterno,
                'apellido_materno' => $apellido_materno,
                'telefono' => trim($this->getPost('telefono')),
                'email' => $email,
                'direccion' => trim($this->getPost('direccion')),
                'ocupacion' => trim($this->getPost('ocupacion')),
                'parentesco' => $this->getPost('parentesco'),
            ]);

            $this->gestionarCredencialAcceso('apoderados', $id, ROLE_APODERADO, $nombre, $apellido_paterno, $apellido_materno);

            logActividad('Apoderado registrado', 'apoderados', $id);
            $this->setFlash('success', 'Apoderado registrado correctamente');
            redirect('index.php?route=apoderados');
        }
        redirect('index.php?route=apoderados/create');
    }

    public function edit($id) {
        requireRole([ROLE_ADMIN]);
        $apoderado = $this->apoderadoModel->findWithDetails($id);
        if (!$apoderado) { redirect('index.php?route=apoderados'); return; }

        $this->view('apoderados/form', [
            'pageTitle' => 'Editar Apoderado',
            'apoderado' => $apoderado,
            'alumnos' => $this->db->select("SELECT * FROM alumnos ORDER BY apellido_paterno"),
            'apoderadoAlumnos' => $this->db->select(
                "SELECT alumno_id FROM alumno_apoderado WHERE apoderado_id = ?", [$id]
            ),
        ]);
    }

    public function update($id) {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $this->apoderadoModel->update($id, [
                'dni' => trim($this->getPost('dni')),
                'nombre' => trim($this->getPost('nombre')),
                'apellido_paterno' => trim($this->getPost('apellido_paterno')),
                'apellido_materno' => trim($this->getPost('apellido_materno')),
                'telefono' => trim($this->getPost('telefono')),
                'email' => trim($this->getPost('email')),
                'direccion' => trim($this->getPost('direccion')),
                'ocupacion' => trim($this->getPost('ocupacion')),
                'parentesco' => $this->getPost('parentesco'),
            ]);

            $this->gestionarCredencialAcceso('apoderados', $id, ROLE_APODERADO,
                trim($this->getPost('nombre')), trim($this->getPost('apellido_paterno')),
                trim($this->getPost('apellido_materno')));

            $this->db->delete('alumno_apoderado', 'apoderado_id = ?', [$id]);
            $alumnos = $this->getPost('alumnos');
            if ($alumnos) {
                foreach ($alumnos as $alumnoId) {
                    $this->db->insert('alumno_apoderado', [
                        'alumno_id' => $alumnoId,
                        'apoderado_id' => $id,
                    ]);
                }
            }

            logActividad('Apoderado actualizado', 'apoderados', $id);
            $this->setFlash('success', 'Apoderado actualizado correctamente');
            redirect('index.php?route=apoderados');
        }
        redirect("index.php?route=apoderados/edit/{$id}");
    }

    public function delete($id) {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $this->apoderadoModel->delete($id);
            logActividad('Apoderado eliminado', 'apoderados', $id);
            $this->setFlash('success', 'Apoderado eliminado correctamente');
        }
        redirect('index.php?route=apoderados');
    }
}
