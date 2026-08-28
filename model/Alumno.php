<?php
require_once __DIR__ . '/Model.php';

class Alumno extends Model {
    protected $table = 'alumnos';

    public function findAllWithGrado($where = '1', $params = []) {
        return $this->db->select(
            "SELECT a.*, g.nombre as grado, s.nombre as seccion, 
                    CONCAT(a.apellido_paterno, ' ', a.apellido_materno, ', ', a.nombre) as nombre_completo
             FROM alumnos a 
             LEFT JOIN matriculas m ON a.id = m.alumno_id AND m.estado = 'Activa'
             LEFT JOIN grados g ON m.grado_id = g.id
             LEFT JOIN secciones s ON m.seccion_id = s.id
             WHERE {$where} 
             ORDER BY a.apellido_paterno, a.apellido_materno, a.nombre",
            $params
        );
    }

    public function findWithDetails($id) {
        return $this->db->selectOne(
            "SELECT a.*, g.nombre as grado, s.nombre as seccion, 
                    g.id as grado_id, s.id as seccion_id, m.periodo_id,
                    CONCAT(a.apellido_paterno, ' ', a.apellido_materno, ', ', a.nombre) as nombre_completo
             FROM alumnos a 
             LEFT JOIN matriculas m ON a.id = m.alumno_id AND m.estado = 'Activa'
             LEFT JOIN grados g ON m.grado_id = g.id
             LEFT JOIN secciones s ON m.seccion_id = s.id
             WHERE a.id = ?",
            [$id]
        );
    }

    public function getApoderados($alumnoId) {
        return $this->db->select(
            "SELECT ap.*, CONCAT(ap.apellido_paterno, ' ', ap.apellido_materno, ', ', ap.nombre) as nombre_completo
             FROM apoderados ap
             JOIN alumno_apoderado aa ON ap.id = aa.apoderado_id
             WHERE aa.alumno_id = ?",
            [$alumnoId]
        );
    }

    public function getCalificaciones($alumnoId, $periodoId = null) {
        $where = $periodoId ? "AND c.periodo_id = ?" : "";
        $params = $periodoId ? [$alumnoId, $periodoId] : [$alumnoId];
        return $this->db->select(
            "SELECT c.*, cur.nombre as curso_nombre, p.nombre as periodo_nombre
             FROM calificaciones c
             JOIN cursos cur ON c.curso_id = cur.id
             JOIN periodos_academicos p ON c.periodo_id = p.id
             WHERE c.alumno_id = ? {$where}
             ORDER BY p.fecha_inicio DESC, cur.nombre",
            $params
        );
    }

    public function getAsistencias($alumnoId, $fechaInicio = null, $fechaFin = null) {
        $conditions = ["a.alumno_id = ?"];
        $params = [$alumnoId];
        if ($fechaInicio) { $conditions[] = "a.fecha >= ?"; $params[] = $fechaInicio; }
        if ($fechaFin) { $conditions[] = "a.fecha <= ?"; $params[] = $fechaFin; }
        $where = implode(' AND ', $conditions);
        return $this->db->select(
            "SELECT a.*, h.dia, cur.nombre as curso_nombre, h.hora_inicio, h.hora_fin
             FROM asistencias a
             JOIN horarios h ON a.horario_id = h.id
             JOIN cursos cur ON h.curso_id = cur.id
             WHERE {$where}
             ORDER BY a.fecha DESC",
            $params
        );
    }

    public function buscar($termino) {
        return $this->findAllWithGrado(
            "(a.nombre LIKE ? OR a.apellido_paterno LIKE ? OR a.apellido_materno LIKE ? OR a.dni LIKE ? OR a.codigo LIKE ?)",
            ["%$termino%", "%$termino%", "%$termino%", "%$termino%", "%$termino%"]
        );
    }

    public function getDocumentos($alumnoId) {
        return $this->db->select(
            "SELECT * FROM documentos WHERE alumno_id = ? ORDER BY created_at DESC",
            [$alumnoId]
        );
    }
}
