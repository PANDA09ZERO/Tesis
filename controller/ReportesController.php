<?php
require_once __DIR__ . '/Controller.php';
require_once __DIR__ . '/../model/Periodo.php';
require_once __DIR__ . '/../model/Calificacion.php';
require_once __DIR__ . '/../model/Asistencia.php';

class ReportesController extends Controller {
    private $periodoModel;
    private $calModel;
    private $asistenciaModel;

    public function __construct() {
        parent::__construct();
        $this->periodoModel = new Periodo();
        $this->calModel = new Calificacion();
        $this->asistenciaModel = new Asistencia();
    }

    public function index() {
        requireRole([ROLE_ADMIN]);
        $this->view('reportes/index', [
            'pageTitle' => 'Reportes',
            'periodos' => $this->periodoModel->getAll(),
        ]);
    }

    public function rendimiento() {
        requireRole([ROLE_ADMIN]);
        $periodoId = $this->getGet('periodo_id');
        $gradoId = $this->getGet('grado_id');

        $periodos = $this->periodoModel->getAll();
        $grados = $this->db->select("SELECT * FROM grados ORDER BY nivel, nombre");
        $rendimiento = [];

        if ($periodoId) {
            $where = "m.periodo_id = ? AND m.estado = 'Activa'";
            $params = [$periodoId];
            if ($gradoId) {
                $where .= " AND m.grado_id = ?";
                $params[] = $gradoId;
            }

            $rendimiento = $this->db->select(
                "SELECT a.id, a.codigo, 
                        CONCAT(a.apellido_paterno, ' ', a.apellido_materno, ', ', a.nombre) as nombre_completo,
                        g.nombre as grado, s.nombre as seccion,
                        ROUND(AVG(c.nota), 2) as promedio,
                        COUNT(DISTINCT c.curso_id) as total_cursos,
                        SUM(CASE WHEN c.nota < 11 THEN 1 ELSE 0 END) as desaprobados
                 FROM alumnos a
                 JOIN matriculas m ON a.id = m.alumno_id
                 JOIN grados g ON m.grado_id = g.id
                 JOIN secciones s ON m.seccion_id = s.id
                 LEFT JOIN calificaciones c ON a.id = c.alumno_id AND c.periodo_id = ?
                 WHERE {$where}
                 GROUP BY a.id, a.codigo, nombre_completo, grado, seccion
                 ORDER BY promedio ASC",
                array_merge([$periodoId], $params)
            );
        }

        $this->view('reportes/rendimiento', [
            'pageTitle' => 'Rendimiento Académico',
            'rendimiento' => $rendimiento,
            'periodos' => $periodos,
            'grados' => $grados,
            'periodoId' => $periodoId,
            'gradoId' => $gradoId,
        ]);
    }

    public function asistencia() {
        requireRole([ROLE_ADMIN]);
        $periodoId = $this->getGet('periodo_id');
        $periodos = $this->periodoModel->getAll();

        $resumenAsistencia = [];
        if ($periodoId) {
            $resumenAsistencia = $this->db->select(
                "SELECT a.id, a.codigo,
                        CONCAT(a.apellido_paterno, ' ', a.apellido_materno, ', ', a.nombre) as nombre_completo,
                        g.nombre as grado, s.nombre as seccion,
                        COUNT(asist.id) as total_clases,
                        SUM(CASE WHEN asist.estado = 'Presente' THEN 1 ELSE 0 END) as presentes,
                        SUM(CASE WHEN asist.estado = 'Ausente' THEN 1 ELSE 0 END) as ausentes,
                        SUM(CASE WHEN asist.estado = 'Tardanza' THEN 1 ELSE 0 END) as tardanzas,
                        ROUND(SUM(CASE WHEN asist.estado = 'Ausente' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(asist.id), 0), 2) as pct_inasistencias
                 FROM alumnos a
                 JOIN matriculas m ON a.id = m.alumno_id AND m.estado = 'Activa' AND m.periodo_id = ?
                 JOIN grados g ON m.grado_id = g.id
                 JOIN secciones s ON m.seccion_id = s.id
                 LEFT JOIN asistencias asist ON a.id = asist.alumno_id
                 LEFT JOIN horarios h ON asist.horario_id = h.id AND h.periodo_id = ?
                 GROUP BY a.id, a.codigo, nombre_completo, grado, seccion
                 ORDER BY pct_inasistencias DESC",
                [$periodoId, $periodoId]
            );
        }

        $this->view('reportes/asistencia', [
            'pageTitle' => 'Reporte de Asistencia',
            'resumenAsistencia' => $resumenAsistencia,
            'periodos' => $periodos,
            'periodoId' => $periodoId,
        ]);
    }

    public function cursos() {
        requireRole([ROLE_ADMIN]);
        $periodoId = $this->getGet('periodo_id');
        $periodos = $this->periodoModel->getAll();

        $estadisticas = [];
        if ($periodoId) {
            $estadisticas = $this->db->select(
                "SELECT c.id, c.nombre, c.codigo,
                        COUNT(DISTINCT cal.alumno_id) as total_alumnos,
                        ROUND(AVG(cal.nota), 2) as promedio_curso,
                        SUM(CASE WHEN cal.nota < 11 THEN 1 ELSE 0 END) as desaprobados,
                        ROUND(SUM(CASE WHEN cal.nota < 11 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(cal.id), 0), 2) as pct_desaprobados,
                        MIN(cal.nota) as nota_minima,
                        MAX(cal.nota) as nota_maxima
                 FROM cursos c
                 LEFT JOIN calificaciones cal ON c.id = cal.curso_id AND cal.periodo_id = ?
                 WHERE c.estado = 1
                 GROUP BY c.id, c.nombre, c.codigo
                 HAVING total_alumnos > 0
                 ORDER BY promedio_curso ASC",
                [$periodoId]
            );
        }

        $this->view('reportes/cursos', [
            'pageTitle' => 'Rendimiento por Curso',
            'estadisticas' => $estadisticas,
            'periodos' => $periodos,
            'periodoId' => $periodoId,
        ]);
    }

    public function alertas() {
        requireRole([ROLE_ADMIN]);
        $estadisticas = $this->db->select(
            "SELECT al.tipo_riesgo, COUNT(*) as total,
                    ROUND(AVG(al.porcentaje_riesgo), 2) as promedio_riesgo,
                    ROUND(AVG(al.promedio_general), 2) as promedio_notas
             FROM alertas_academicas al
             WHERE al.estado = 'Activa'
             GROUP BY al.tipo_riesgo
             ORDER BY FIELD(al.tipo_riesgo, 'Alto', 'Medio', 'Bajo')"
        );

        $topRiesgo = $this->db->select(
            "SELECT al.*, 
                    CONCAT(a.apellido_paterno, ' ', a.apellido_materno, ', ', a.nombre) as alumno_nombre,
                    g.nombre as grado, s.nombre as seccion
             FROM alertas_academicas al
             JOIN alumnos a ON al.alumno_id = a.id
             LEFT JOIN matriculas m ON a.id = m.alumno_id AND m.estado = 'Activa' AND m.periodo_id = al.periodo_id
             LEFT JOIN grados g ON m.grado_id = g.id
             LEFT JOIN secciones s ON m.seccion_id = s.id
             WHERE al.estado = 'Activa' AND al.tipo_riesgo = 'Alto'
             ORDER BY al.porcentaje_riesgo DESC
             LIMIT 10"
        );

        $this->view('reportes/alertas_reporte', [
            'pageTitle' => 'Reporte de Alertas IA',
            'estadisticas' => $estadisticas,
            'topRiesgo' => $topRiesgo,
        ]);
    }
}
