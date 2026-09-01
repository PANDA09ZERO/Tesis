<?php
require_once __DIR__ . '/Model.php';

class Profesor extends Model {
    protected $table = 'profesores';

    public function findAllWithDetails($where = '1', $params = []) {
        return $this->db->select(
            "SELECT p.*, 
                    CONCAT(p.apellido_paterno, ' ', p.apellido_materno, ', ', p.nombre) as nombre_completo
             FROM profesores p 
             WHERE {$where} 
             ORDER BY p.apellido_paterno, p.apellido_materno, p.nombre",
            $params
        );
    }

    public function findWithDetails($id) {
        return $this->db->selectOne(
            "SELECT p.*, CONCAT(p.apellido_paterno, ' ', p.apellido_materno, ', ', p.nombre) as nombre_completo
             FROM profesores p WHERE p.id = ?",
            [$id]
        );
    }

    public function getCursoIds($profesorId) {
        $rows = $this->db->select(
            "SELECT curso_id FROM profesor_curso WHERE profesor_id = ?",
            [$profesorId]
        );
        return array_column($rows, 'curso_id');
    }

    public function guardarCursos($profesorId, $cursoIds = []) {
        $this->db->delete('profesor_curso', 'profesor_id = ?', [$profesorId]);
        foreach ($cursoIds as $cursoId) {
            if (!is_numeric($cursoId)) continue;
            $this->db->insert('profesor_curso', [
                'profesor_id' => $profesorId,
                'curso_id' => (int) $cursoId,
            ]);
        }
    }

    public function getCursosAsignados($profesorId, $periodoId = null) {
        return $this->db->select(
            "SELECT DISTINCT c.id as curso_id, c.codigo as curso_codigo, c.nombre as curso_nombre
             FROM profesor_curso pc
             JOIN cursos c ON pc.curso_id = c.id
             WHERE pc.profesor_id = ?
             ORDER BY c.nombre",
            [$profesorId]
        );
    }

    public function getHorarios($profesorId, $periodoId = null) {
        $where = $periodoId ? "AND h.periodo_id = ?" : "";
        $params = $periodoId ? [$profesorId, $periodoId] : [$profesorId];
        return $this->db->select(
            "SELECT h.*, c.nombre as curso_nombre, g.nombre as grado, s.nombre as seccion
             FROM horarios h
             JOIN cursos c ON h.curso_id = c.id
             JOIN grados g ON h.grado_id = g.id
             JOIN secciones s ON h.seccion_id = s.id
             WHERE h.profesor_id = ? {$where}
             ORDER BY FIELD(h.dia, 'Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'), h.hora_inicio",
            $params
        );
    }

    public function getAlumnosAsignados($profesorId, $periodoId = null) {
        $where = $periodoId ? "AND h.periodo_id = ?" : "";
        $params = $periodoId ? [$profesorId, $periodoId] : [$profesorId];
        return $this->db->select(
            "SELECT DISTINCT a.id, a.codigo, a.nombre, a.apellido_paterno, a.apellido_materno,
                    CONCAT(a.apellido_paterno, ' ', a.apellido_materno, ', ', a.nombre) as nombre_completo,
                    g.nombre as grado, s.nombre as seccion
             FROM horarios h
             JOIN matriculas m ON h.grado_id = m.grado_id AND h.seccion_id = m.seccion_id AND h.periodo_id = m.periodo_id
             JOIN alumnos a ON m.alumno_id = a.id
             JOIN grados g ON h.grado_id = g.id
             JOIN secciones s ON h.seccion_id = s.id
             WHERE h.profesor_id = ? {$where} AND m.estado = 'Activa'
             ORDER BY a.apellido_paterno, a.apellido_materno, a.nombre",
            $params
        );
    }

    public function buscar($termino) {
        return $this->findAllWithDetails(
            "(p.nombre LIKE ? OR p.apellido_paterno LIKE ? OR p.apellido_materno LIKE ? OR p.dni LIKE ? OR p.codigo LIKE ?)",
            ["%$termino%", "%$termino%", "%$termino%", "%$termino%", "%$termino%"]
        );
    }
}
