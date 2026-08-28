<?php
require_once __DIR__ . '/Model.php';

class Calificacion extends Model {
    protected $table = 'calificaciones';

    public function getPorCursoPeriodo($cursoId, $periodoId) {
        return $this->db->select(
            "SELECT c.*, CONCAT(a.apellido_paterno, ' ', a.apellido_materno, ', ', a.nombre) as alumno_nombre,
                    a.codigo as alumno_codigo
             FROM calificaciones c
             JOIN alumnos a ON c.alumno_id = a.id
             WHERE c.curso_id = ? AND c.periodo_id = ?
             ORDER BY a.apellido_paterno, a.apellido_materno, a.nombre",
            [$cursoId, $periodoId]
        );
    }

    public function getPromedioAlumno($alumnoId, $periodoId) {
        return $this->db->selectOne(
            "SELECT ROUND(AVG(nota), 2) as promedio, COUNT(*) as total_cursos,
                    SUM(CASE WHEN nota < 11 THEN 1 ELSE 0 END) as desaprobados
             FROM calificaciones 
             WHERE alumno_id = ? AND periodo_id = ?",
            [$alumnoId, $periodoId]
        );
    }

    public function guardar($alumnoId, $cursoId, $periodoId, $nota, $conducta = null, $observacion = null) {
        $existing = $this->db->selectOne(
            "SELECT id FROM calificaciones WHERE alumno_id = ? AND curso_id = ? AND periodo_id = ?",
            [$alumnoId, $cursoId, $periodoId]
        );
        $data = [
            'nota' => $nota,
            'conducta' => $conducta,
            'observacion' => $observacion,
        ];
        if ($existing) {
            return $this->db->update('calificaciones', $data, 'id = ?', [$existing['id']]);
        } else {
            return $this->db->insert('calificaciones', array_merge($data, [
                'alumno_id' => $alumnoId,
                'curso_id' => $cursoId,
                'periodo_id' => $periodoId,
            ]));
        }
    }
}
