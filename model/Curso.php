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
        return $this->db->select(
            "SELECT DISTINCT p.*, CONCAT(p.apellido_paterno, ' ', p.apellido_materno, ', ', p.nombre) as nombre_completo
             FROM profesor_curso pc
             JOIN profesores p ON pc.profesor_id = p.id
             WHERE pc.curso_id = ?
             ORDER BY p.apellido_paterno",
            [$cursoId]
        );
    }

    public function contarProfesoresPorCurso() {
        return $this->db->select(
            "SELECT pc.curso_id, COUNT(DISTINCT pc.profesor_id) as total
             FROM profesor_curso pc
             GROUP BY pc.curso_id"
        );
    }
}
