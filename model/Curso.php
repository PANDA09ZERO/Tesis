<?php
require_once __DIR__ . '/Model.php';

class Curso extends Model {
    protected $table = 'cursos';

    public function findAllActivos() {
        return $this->findAll('estado = 1', [], 'nombre ASC');
    }

    public function getGrados($cursoId) {
        return $this->db->select(
            "SELECT g.* FROM grados g 
             JOIN curso_grado cg ON g.id = cg.grado_id 
             WHERE cg.curso_id = ?
             ORDER BY g.nombre",
            [$cursoId]
        );
    }

    public function getProfesoresAsignados($cursoId, $periodoId = null) {
        $where = $periodoId ? "AND h.periodo_id = ?" : "";
        $params = $periodoId ? [$cursoId, $periodoId] : [$cursoId];
        return $this->db->select(
            "SELECT DISTINCT p.*, CONCAT(p.apellido_paterno, ' ', p.apellido_materno, ', ', p.nombre) as nombre_completo
             FROM horarios h
             JOIN profesores p ON h.profesor_id = p.id
             WHERE h.curso_id = ? {$where}
             ORDER BY p.apellido_paterno",
            $params
        );
    }
}
