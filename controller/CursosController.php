<?php
require_once __DIR__ . '/Controller.php';
require_once __DIR__ . '/../model/Curso.php';

class CursosController extends Controller {
    private $cursoModel;

    public function __construct() {
        parent::__construct();
        $this->cursoModel = new Curso();
    }

    public function index() {
        requireRole([ROLE_ADMIN, ROLE_PROFESOR]);
        $cursos = $this->cursoModel->findAll();

        $profesoresPorCurso = [];
        foreach ($this->cursoModel->contarProfesoresPorCurso() as $row) {
            $profesoresPorCurso[$row['curso_id']] = $row['total'];
        }

        $this->view('cursos/index', [
            'pageTitle' => 'Gestión de Cursos',
            'cursos' => $cursos,
            'profesoresPorCurso' => $profesoresPorCurso,
        ]);
    }

    public function create() {
        requireRole([ROLE_ADMIN]);
        $this->view('cursos/form', [
            'pageTitle' => 'Registrar Curso',
            'curso' => null,
            'grados' => $this->db->select("SELECT * FROM grados ORDER BY nivel, nombre"),
        ]);
    }

    public function store() {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $codigo = trim($this->getPost('codigo'));
            if ($codigo === '') { $codigo = $this->db->generarCodigo('cursos', 'C', 4); }
            $cursoId = $this->cursoModel->create([
                'codigo' => $codigo,
                'nombre' => trim($this->getPost('nombre')),
                'descripcion' => trim($this->getPost('descripcion')),
                'area' => $this->getPost('area'),
                'horas_semanales' => $this->getPost('horas_semanales'),
            ]);

            $grados = $this->getPost('grados');
            if ($grados) {
                foreach ($grados as $gradoId) {
                    $this->db->insert('curso_grado', [
                        'curso_id' => $cursoId,
                        'grado_id' => $gradoId,
                    ]);
                }
            }

            logActividad('Curso registrado', 'cursos', $cursoId);
            $this->setFlash('success', 'Curso registrado correctamente');
            redirect('index.php?route=cursos');
        }
        redirect('index.php?route=cursos/create');
    }

    public function edit($id) {
        requireRole([ROLE_ADMIN]);
        $curso = $this->cursoModel->findById($id);
        if (!$curso) { redirect('index.php?route=cursos'); return; }

        $this->view('cursos/form', [
            'pageTitle' => 'Editar Curso',
            'curso' => $curso,
            'grados' => $this->db->select("SELECT * FROM grados ORDER BY nivel, nombre"),
            'cursoGrados' => $this->cursoModel->getGrados($id),
        ]);
    }

    public function update($id) {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $this->cursoModel->update($id, [
                'nombre' => trim($this->getPost('nombre')),
                'descripcion' => trim($this->getPost('descripcion')),
                'area' => $this->getPost('area'),
                'horas_semanales' => $this->getPost('horas_semanales'),
            ]);

            $this->db->delete('curso_grado', 'curso_id = ?', [$id]);
            $grados = $this->getPost('grados');
            if ($grados) {
                foreach ($grados as $gradoId) {
                    $this->db->insert('curso_grado', [
                        'curso_id' => $id,
                        'grado_id' => $gradoId,
                    ]);
                }
            }

            logActividad('Curso actualizado', 'cursos', $id);
            $this->setFlash('success', 'Curso actualizado correctamente');
            redirect('index.php?route=cursos');
        }
        redirect("index.php?route=cursos/edit/{$id}");
    }

    public function delete($id) {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $this->cursoModel->delete($id);
            logActividad('Curso eliminado', 'cursos', $id);
            $this->setFlash('success', 'Curso eliminado correctamente');
        }
        redirect('index.php?route=cursos');
    }
}
