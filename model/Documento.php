<?php
require_once __DIR__ . '/Model.php';

class Documento extends Model {
    protected $table = 'documentos';

    public function findAllWithDetails($where = '1', $params = []) {
        return $this->db->select(
            "SELECT d.*, 
                    CASE 
                        WHEN d.alumno_id IS NOT NULL THEN CONCAT(a.apellido_paterno, ' ', a.nombre)
                        WHEN d.profesor_id IS NOT NULL THEN CONCAT(p.apellido_paterno, ' ', p.nombre)
                        ELSE NULL 
                    END as persona_nombre,
                    CONCAT(u.username) as subido_por
             FROM documentos d
             LEFT JOIN alumnos a ON d.alumno_id = a.id
             LEFT JOIN profesores p ON d.profesor_id = p.id
             JOIN usuarios u ON d.usuario_subio = u.id
             WHERE {$where}
             ORDER BY d.created_at DESC",
            $params
        );
    }

    public function getVencidos() {
        return $this->db->select(
            "SELECT d.*, CONCAT(a.apellido_paterno, ' ', a.nombre) as alumno_nombre
             FROM documentos d
             LEFT JOIN alumnos a ON d.alumno_id = a.id
             WHERE d.fecha_vencimiento IS NOT NULL 
             AND d.fecha_vencimiento < CURDATE()
             AND d.estado != 'Vencido'",
            []
        );
    }

    public function getProximosAVencer($dias = 30) {
        return $this->db->select(
            "SELECT d.*, CONCAT(a.apellido_paterno, ' ', a.nombre) as alumno_nombre
             FROM documentos d
             LEFT JOIN alumnos a ON d.alumno_id = a.id
             WHERE d.fecha_vencimiento IS NOT NULL 
             AND d.fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
             AND d.estado = 'Vigente'",
            [$dias]
        );
    }

    public function buscar($termino) {
        return $this->findAllWithDetails(
            "(d.titulo LIKE ? OR d.descripcion LIKE ? OR d.categoria LIKE ? OR a.nombre LIKE ? OR a.apellido_paterno LIKE ?)",
            ["%$termino%", "%$termino%", "%$termino%", "%$termino%", "%$termino%"]
        );
    }

    public function actualizarEstados() {
        $this->db->query(
            "UPDATE documentos SET estado = 'Vencido' 
             WHERE fecha_vencimiento IS NOT NULL AND fecha_vencimiento < CURDATE() AND estado != 'Vencido'"
        );
    }

    public function getCategorias() {
        return $this->db->select("SELECT DISTINCT categoria FROM documentos WHERE categoria IS NOT NULL ORDER BY categoria");
    }
}
