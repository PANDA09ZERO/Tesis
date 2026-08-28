<?php
require_once __DIR__ . '/Controller.php';

class DashboardController extends Controller {

    public function index() {
        requireLogin();

        $data = [
            'pageTitle' => 'Dashboard',
            'totalAlumnos' => $this->db->count('alumnos', 'estado = 1'),
            'totalProfesores' => $this->db->count('profesores', 'estado = 1'),
            'totalCursos' => $this->db->count('cursos', 'estado = 1'),
            'totalDocumentos' => $this->db->count('documentos'),
            'alertasActivas' => $this->db->count('alertas_academicas', 'estado = "Activa"'),
            'alumnosRecientes' => $this->db->select(
                "SELECT a.*, g.nombre as grado, s.nombre as seccion 
                 FROM alumnos a 
                 LEFT JOIN matriculas m ON a.id = m.alumno_id AND m.estado = 'Activa'
                 LEFT JOIN grados g ON m.grado_id = g.id
                 LEFT JOIN secciones s ON m.seccion_id = s.id
                 ORDER BY a.created_at DESC LIMIT 5"
            ),
            'ultimasActividades' => $this->db->select(
                "SELECT ra.*, u.username 
                 FROM registro_actividades ra 
                 LEFT JOIN usuarios u ON ra.usuario_id = u.id 
                 ORDER BY ra.created_at DESC LIMIT 10"
            ),
            'alertasRecientes' => $this->db->select(
                "SELECT al.*, a.nombre, a.apellido_paterno, a.apellido_materno 
                 FROM alertas_academicas al 
                 JOIN alumnos a ON al.alumno_id = a.id 
                 WHERE al.estado = 'Activa' 
                 ORDER BY al.created_at DESC LIMIT 5"
            ),
        ];

        $this->view('dashboard/index', $data);
    }
}
