<?php
require_once __DIR__ . '/Model.php';

class Asistencia extends Model {
    protected $table = 'asistencias';

    public function getResumenAlumno($alumnoId, $periodoId) {
        return $this->db->selectOne(
            "SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN estado = 'Presente' THEN 1 ELSE 0 END) as presentes,
                SUM(CASE WHEN estado = 'Ausente' THEN 1 ELSE 0 END) as ausentes,
                SUM(CASE WHEN estado = 'Tardanza' THEN 1 ELSE 0 END) as tardanzas,
                SUM(CASE WHEN estado = 'Justificado' THEN 1 ELSE 0 END) as justificados,
                ROUND(SUM(CASE WHEN estado = 'Ausente' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as pct_inasistencias
             FROM asistencias a
             JOIN horarios h ON a.horario_id = h.id
             WHERE a.alumno_id = ? AND h.periodo_id = ?",
            [$alumnoId, $periodoId]
        );
    }

    public function getPorFecha($horarioId, $fecha) {
        return $this->db->select(
            "SELECT a.*, CONCAT(al.apellido_paterno, ' ', al.nombre) as alumno_nombre
             FROM asistencias a
             JOIN alumnos al ON a.alumno_id = al.id
             WHERE a.horario_id = ? AND a.fecha = ?
             ORDER BY al.apellido_paterno",
            [$horarioId, $fecha]
        );
    }

    public function getAlumnosPorHorario($horarioId) {
        return $this->db->select(
            "SELECT a.id, a.codigo, a.nombre, a.apellido_paterno, a.apellido_materno
             FROM alumnos a
             JOIN matriculas m ON a.id = m.alumno_id AND m.estado = 'Activa'
             JOIN horarios h ON m.grado_id = h.grado_id AND m.seccion_id = h.seccion_id AND m.periodo_id = h.periodo_id
             WHERE h.id = ?
             ORDER BY a.apellido_paterno",
            [$horarioId]
        );
    }
}
