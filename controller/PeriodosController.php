<?php
require_once __DIR__ . '/Controller.php';
require_once __DIR__ . '/../model/Periodo.php';

class PeriodosController extends Controller {
    private $periodoModel;

    public function __construct() {
        parent::__construct();
        $this->periodoModel = new Periodo();
    }

    public function index() {
        requireRole([ROLE_ADMIN]);
        $this->view('periodos/index', [
            'pageTitle' => 'Periodos Académicos',
            'periodos' => $this->periodoModel->getAll(),
        ]);
    }

    public function store() {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $id = $this->periodoModel->create([
                'nombre' => trim($this->getPost('nombre')),
                'fecha_inicio' => $this->getPost('fecha_inicio'),
                'fecha_fin' => $this->getPost('fecha_fin'),
                'estado' => $this->getPost('estado') ? 1 : 0,
            ]);
            logActividad('Periodo creado', 'periodos_academicos', $id);
            $this->setFlash('success', 'Periodo creado correctamente');
        }
        redirect('index.php?route=periodos');
    }

    public function update($id) {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $this->periodoModel->update($id, [
                'nombre' => trim($this->getPost('nombre')),
                'fecha_inicio' => $this->getPost('fecha_inicio'),
                'fecha_fin' => $this->getPost('fecha_fin'),
                'estado' => $this->getPost('estado') ? 1 : 0,
            ]);
            logActividad('Periodo actualizado', 'periodos_academicos', $id);
            $this->setFlash('success', 'Periodo actualizado correctamente');
        }
        redirect('index.php?route=periodos');
    }

    public function delete($id) {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $this->periodoModel->delete($id);
            logActividad('Periodo eliminado', 'periodos_academicos', $id);
            $this->setFlash('success', 'Periodo eliminado correctamente');
        }
        redirect('index.php?route=periodos');
    }
}
