<?php
require_once __DIR__ . '/Controller.php';
require_once __DIR__ . '/../model/AlertaAcademica.php';
require_once __DIR__ . '/../model/Periodo.php';

class AlertasController extends Controller {
    private $alertaModel;
    private $periodoModel;

    public function __construct() {
        parent::__construct();
        $this->alertaModel = new AlertaAcademica();
        $this->periodoModel = new Periodo();
    }

    public function index() {
        requireRole([ROLE_ADMIN]);
        $estado = $this->getGet('estado');
        $riesgo = $this->getGet('riesgo');

        $where = "1";
        $params = [];
        if ($estado) { $where .= " AND al.estado = ?"; $params[] = $estado; }
        if ($riesgo) { $where .= " AND al.tipo_riesgo = ?"; $params[] = $riesgo; }

        $alertas = $this->alertaModel->findAllWithAlumno($where, $params);
        $contadores = $this->alertaModel->contarPorRiesgo();
        $totalActivas = $this->db->count('alertas_academicas', "estado = 'Activa'");

        $this->view('alertas/index', [
            'pageTitle' => 'Alertas Académicas IA',
            'alertas' => $alertas,
            'contadores' => $contadores,
            'totalActivas' => $totalActivas,
            'estado' => $estado,
            'riesgo' => $riesgo,
        ]);
    }

    public function generar() {
        requireRole([ROLE_ADMIN]);
        $periodos = $this->periodoModel->getAll();

        if ($this->isPost()) {
            $this->validateCSRF();
            $periodoId = $this->getPost('periodo_id');

            $alertasGeneradas = $this->alertaModel->generarAlertas($periodoId);

            logActividad('Alertas IA generadas', 'alertas_academicas', null, "Periodo: {$periodoId}, Generadas: {$alertasGeneradas}");
            $this->setFlash('success', "Se generaron/actualizaron {$alertasGeneradas} alerta(s) académica(s)");
            redirect('index.php?route=alertas');
        }

        $this->view('alertas/generar', [
            'pageTitle' => 'Generar Alertas IA',
            'periodos' => $periodos,
        ]);
    }

    public function atender($id) {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $this->alertaModel->marcarAtendida($id);
            logActividad('Alerta atendida', 'alertas_academicas', $id);
            $this->setFlash('success', 'Alerta marcada como atendida');
        }
        redirect('index.php?route=alertas');
    }

    public function cerrar($id) {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $this->alertaModel->marcarCerrada($id);
            logActividad('Alerta cerrada', 'alertas_academicas', $id);
            $this->setFlash('success', 'Alerta cerrada');
        }
        redirect('index.php?route=alertas');
    }

    public function alumno($alumnoId) {
        requireRole([ROLE_ADMIN]);
        $alertas = $this->alertaModel->getPorAlumno($alumnoId);
        $alumno = $this->db->selectOne(
            "SELECT *, CONCAT(apellido_paterno, ' ', apellido_materno, ', ', nombre) as nombre_completo FROM alumnos WHERE id = ?",
            [$alumnoId]
        );

        $this->view('alertas/alumno', [
            'pageTitle' => 'Alertas del Alumno',
            'alertas' => $alertas,
            'alumno' => $alumno,
        ]);
    }
}
