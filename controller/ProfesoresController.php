<?php
require_once __DIR__ . '/Controller.php';
require_once __DIR__ . '/../model/Profesor.php';

class ProfesoresController extends Controller {
    private $profesorModel;

    public function __construct() {
        parent::__construct();
        $this->profesorModel = new Profesor();
    }

    public function index() {
        requireRole([ROLE_ADMIN]);
        $busqueda = $this->getGet('q');
        $profesores = $busqueda
            ? $this->profesorModel->buscar($busqueda)
            : $this->profesorModel->findAllWithDetails();

        $conteo = $this->db->select("SELECT profesor_id, COUNT(*) as total_cursos FROM profesor_curso GROUP BY profesor_id");
        $cursosPorProfesor = array_column($conteo, 'total_cursos', 'profesor_id');

        $this->view('profesores/index', [
            'pageTitle' => 'Gestión de Profesores',
            'profesores' => $profesores,
            'busqueda' => $busqueda,
            'cursosPorProfesor' => $cursosPorProfesor,
        ]);
    }

    public function create() {
        requireRole([ROLE_ADMIN]);
        $this->view('profesores/form', [
            'pageTitle' => 'Registrar Profesor',
            'profesor' => null,
            'cursos' => $this->db->select("SELECT * FROM cursos WHERE estado = 1 ORDER BY nombre"),
            'profesorCursoIds' => [],
        ]);
    }

    public function store() {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $codigo = trim($this->getPost('codigo'));
            if ($codigo === '') { $codigo = $this->db->generarCodigo('profesores', 'P', 4); }
            $nombre = trim($this->getPost('nombre'));
            $apellido_paterno = trim($this->getPost('apellido_paterno'));
            $apellido_materno = trim($this->getPost('apellido_materno'));
            $email = trim($this->getPost('email'));
            $id = $this->profesorModel->create([
                'codigo' => $codigo,
                'dni' => trim($this->getPost('dni')),
                'nombre' => $nombre,
                'apellido_paterno' => $apellido_paterno,
                'apellido_materno' => $apellido_materno,
                'fecha_nacimiento' => $this->getPost('fecha_nacimiento'),
                'sexo' => $this->getPost('sexo'),
                'telefono' => trim($this->getPost('telefono')),
                'email' => $email,
                'direccion' => trim($this->getPost('direccion')),
                'especialidad' => trim($this->getPost('especialidad')),
                'fecha_contratacion' => $this->getPost('fecha_contratacion'),
            ]);

            $this->profesorModel->guardarCursos($id, $this->getPost('cursos') ?: []);

            $this->gestionarCredencialAcceso('profesores', $id, ROLE_PROFESOR, $nombre, $apellido_paterno, $apellido_materno);

            logActividad('Profesor registrado', 'profesores', $id);
            $this->setFlash('success', 'Profesor registrado correctamente');
            redirect('index.php?route=profesores');
        }
        redirect('index.php?route=profesores/create');
    }

    public function edit($id) {
        requireRole([ROLE_ADMIN]);
        $profesor = $this->profesorModel->findWithDetails($id);
        if (!$profesor) { redirect('index.php?route=profesores'); return; }

        $this->view('profesores/form', [
            'pageTitle' => 'Editar Profesor',
            'profesor' => $profesor,
            'cursos' => $this->db->select("SELECT * FROM cursos WHERE estado = 1 ORDER BY nombre"),
            'profesorCursoIds' => $this->profesorModel->getCursoIds($id),
        ]);
    }

    public function update($id) {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $this->profesorModel->update($id, [
                'dni' => trim($this->getPost('dni')),
                'nombre' => trim($this->getPost('nombre')),
                'apellido_paterno' => trim($this->getPost('apellido_paterno')),
                'apellido_materno' => trim($this->getPost('apellido_materno')),
                'fecha_nacimiento' => $this->getPost('fecha_nacimiento'),
                'sexo' => $this->getPost('sexo'),
                'telefono' => trim($this->getPost('telefono')),
                'email' => trim($this->getPost('email')),
                'direccion' => trim($this->getPost('direccion')),
                'especialidad' => trim($this->getPost('especialidad')),
                'fecha_contratacion' => $this->getPost('fecha_contratacion'),
            ]);

            logActividad('Profesor actualizado', 'profesores', $id);

            $this->profesorModel->guardarCursos($id, $this->getPost('cursos') ?: []);

            $this->gestionarCredencialAcceso('profesores', $id, ROLE_PROFESOR,
                trim($this->getPost('nombre')), trim($this->getPost('apellido_paterno')),
                trim($this->getPost('apellido_materno')));

            $this->setFlash('success', 'Profesor actualizado correctamente');
            redirect('index.php?route=profesores');
        }
        redirect("index.php?route=profesores/edit/{$id}");
    }

    public function delete($id) {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $this->profesorModel->delete($id);
            logActividad('Profesor eliminado', 'profesores', $id);
            $this->setFlash('success', 'Profesor eliminado correctamente');
        }
        redirect('index.php?route=profesores');
    }

    public function profile($id) {
        requireRole([ROLE_ADMIN]);
        $profesor = $this->profesorModel->findWithDetails($id);
        if (!$profesor) { redirect('index.php?route=profesores'); return; }

        $this->view('profesores/profile', [
            'pageTitle' => 'Perfil del Profesor',
            'profesor' => $profesor,
            'cursosAsignados' => $this->profesorModel->getCursosAsignados($id),
            'horarios' => $this->profesorModel->getHorarios($id),
        ]);
    }
}
