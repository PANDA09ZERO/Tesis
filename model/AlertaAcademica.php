<?php
require_once __DIR__ . '/Model.php';

class AlertaAcademica extends Model {
    protected $table = 'alertas_academicas';

    public function findAllWithAlumno($where = '1', $params = []) {
        return $this->db->select(
            "SELECT al.*, 
                    CONCAT(a.apellido_paterno, ' ', a.apellido_materno, ', ', a.nombre) as alumno_nombre,
                    a.codigo as alumno_codigo, a.dni as alumno_dni,
                    g.nombre as grado, s.nombre as seccion,
                    p.nombre as periodo_nombre
             FROM alertas_academicas al
             JOIN alumnos a ON al.alumno_id = a.id
             LEFT JOIN matriculas m ON a.id = m.alumno_id AND m.estado = 'Activa' AND m.periodo_id = al.periodo_id
             LEFT JOIN grados g ON m.grado_id = g.id
             LEFT JOIN secciones s ON m.seccion_id = s.id
             JOIN periodos_academicos p ON al.periodo_id = p.id
             WHERE {$where}
             ORDER BY 
                CASE al.tipo_riesgo WHEN 'Alto' THEN 1 WHEN 'Medio' THEN 2 WHEN 'Bajo' THEN 3 END,
                al.created_at DESC",
            $params
        );
    }

    public function getActivas() {
        return $this->findAllWithAlumno("al.estado = 'Activa'");
    }

    public function getPorAlumno($alumnoId) {
        return $this->findAllWithAlumno("al.alumno_id = ?", [$alumnoId]);
    }

    public function contarPorRiesgo() {
        return $this->db->select(
            "SELECT tipo_riesgo, COUNT(*) as total 
             FROM alertas_academicas 
             WHERE estado = 'Activa'
             GROUP BY tipo_riesgo"
        );
    }

    public function marcarAtendida($id) {
        return $this->db->update('alertas_academicas', ['estado' => 'Atendida'], 'id = ?', [$id]);
    }

    public function marcarCerrada($id) {
        return $this->db->update('alertas_academicas', ['estado' => 'Cerrada'], 'id = ?', [$id]);
    }

    public function generarAlertas($periodoId) {
        $db = Database::getInstance();
        
        $alumnos = $db->select(
            "SELECT DISTINCT m.alumno_id 
             FROM matriculas m 
             WHERE m.periodo_id = ? AND m.estado = 'Activa'",
            [$periodoId]
        );

        $alertasGeneradas = 0;

        foreach ($alumnos as $alumno) {
            $alumnoId = $alumno['alumno_id'];
            
            $promedio = $db->selectOne(
                "SELECT AVG(nota) as promedio, COUNT(*) as total,
                        SUM(CASE WHEN nota < 11 THEN 1 ELSE 0 END) as desaprobados
                 FROM calificaciones 
                 WHERE alumno_id = ? AND periodo_id = ?",
                [$alumnoId, $periodoId]
            );

            $asistencia = $db->selectOne(
                "SELECT COUNT(*) as total,
                        SUM(CASE WHEN estado = 'Ausente' THEN 1 ELSE 0 END) as ausentes
                 FROM asistencias a
                 JOIN horarios h ON a.horario_id = h.id
                 WHERE a.alumno_id = ? AND h.periodo_id = ?",
                [$alumnoId, $periodoId]
            );

            if (!$promedio || $promedio['total'] == 0) continue;

            $prom = $promedio['promedio'];
            $desaprobados = $promedio['desaprobados'];
            $totalAsist = $asistencia['total'] ?? 0;
            $ausentes = $asistencia['ausentes'] ?? 0;
            $pctInasistencias = $totalAsist > 0 ? ($ausentes * 100.0 / $totalAsist) : 0;

            $riesgoScore = 0;
            $indicadores = [];

            if ($prom < 11) { $riesgoScore += 30; $indicadores[] = "Promedio general: " . number_format($prom, 1); }
            if ($prom < 8) { $riesgoScore += 20; $indicadores[] = "Promedio muy bajo (< 8)"; }
            if ($pctInasistencias > 20) { $riesgoScore += 25; $indicadores[] = "Inasistencias: " . number_format($pctInasistencias, 1) . "%"; }
            elseif ($pctInasistencias > 10) { $riesgoScore += 10; $indicadores[] = "Inasistencias elevadas: " . number_format($pctInasistencias, 1) . "%"; }
            if ($desaprobados >= 3) { $riesgoScore += 25; $indicadores[] = "{$desaprobados} cursos desaprobados"; }
            elseif ($desaprobados >= 1) { $riesgoScore += 10; $indicadores[] = "{$desaprobados} curso(s) desaprobado(s)"; }

            if ($riesgoScore >= 50) $tipoRiesgo = 'Alto';
            elseif ($riesgoScore >= 25) $tipoRiesgo = 'Medio';
            elseif ($riesgoScore >= 10) $tipoRiesgo = 'Bajo';
            else continue;

            $existing = $db->selectOne(
                "SELECT id FROM alertas_academicas 
                 WHERE alumno_id = ? AND periodo_id = ? AND estado = 'Activa'",
                [$alumnoId, $periodoId]
            );

            $data = [
                'alumno_id' => $alumnoId,
                'periodo_id' => $periodoId,
                'tipo_riesgo' => $tipoRiesgo,
                'porcentaje_riesgo' => min($riesgoScore, 100),
                'inasistencias_pct' => $pctInasistencias,
                'promedio_general' => $prom,
                'cursos_desaprobados' => $desaprobados,
                'descripcion' => implode('. ', $indicadores) . '.',
                'recomendacion' => 'Realizar seguimiento académico del estudiante.',
                'fecha_deteccion' => date('Y-m-d'),
            ];

            if ($existing) {
                $db->update('alertas_academicas', $data, 'id = ?', [$existing['id']]);
            } else {
                $db->insert('alertas_academicas', $data);
                $alertasGeneradas++;
            }
        }

        return $alertasGeneradas;
    }
}
