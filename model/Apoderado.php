<?php
require_once __DIR__ . '/Model.php';

class Apoderado extends Model {
    protected $table = 'apoderados';

    public function findAllWithDetails($where = '1', $params = []) {
        return $this->db->select(
            "SELECT ap.*, CONCAT(ap.apellido_paterno, ' ', ap.apellido_materno, ', ', ap.nombre) as nombre_completo
             FROM apoderados ap 
             WHERE {$where} 
             ORDER BY ap.apellido_paterno, ap.apellido_materno, ap.nombre",
            $params
        );
    }

    public function findWithDetails($id) {
        return $this->db->selectOne(
            "SELECT ap.*, CONCAT(ap.apellido_paterno, ' ', ap.apellido_materno, ', ', ap.nombre) as nombre_completo
             FROM apoderados ap WHERE ap.id = ?",
            [$id]
        );
    }

    public function getAlumnos($apoderadoId) {
        return $this->db->select(
            "SELECT a.*, g.nombre as grado, s.nombre as seccion,
                    CONCAT(a.apellido_paterno, ' ', a.apellido_materno, ', ', a.nombre) as nombre_completo
             FROM alumnos a
             JOIN alumno_apoderado aa ON a.id = aa.alumno_id
             LEFT JOIN matriculas m ON a.id = m.alumno_id AND m.estado = 'Activa'
             LEFT JOIN grados g ON m.grado_id = g.id
             LEFT JOIN secciones s ON m.seccion_id = s.id
             WHERE aa.apoderado_id = ?
             ORDER BY a.apellido_paterno",
            [$apoderadoId]
        );
    }

    public function buscar($termino) {
        return $this->findAllWithDetails(
            "(ap.nombre LIKE ? OR ap.apellido_paterno LIKE ? OR ap.apellido_materno LIKE ? OR ap.dni LIKE ?)",
            ["%$termino%", "%$termino%", "%$termino%", "%$termino%"]
        );
    }
}
