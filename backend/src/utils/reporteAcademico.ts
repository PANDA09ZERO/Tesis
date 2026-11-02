// Una fila por nota; las subconsultas evitan multiplicar registros por matrículas.
export const rendimientoSourceSql = `        SELECT c.*, COALESCE(o.periodo_academico_id,c.periodo_academico_id) AS periodo_id,
          COALESCE(o.grado_id, (SELECT IF(COUNT(DISTINCT COALESCE(m.grado_id,mc.grado_id))=1, MIN(COALESCE(m.grado_id,mc.grado_id)),NULL) FROM matriculas m LEFT JOIN cursos mc ON mc.id=m.curso_id WHERE m.alumno_id=c.alumno_id AND m.periodo_academico_id=c.periodo_academico_id AND m.curso_id=c.curso_id)) AS grado_id,
          e.nota_maxima AS escala_maxima
        FROM calificaciones c LEFT JOIN evaluaciones e ON e.id=c.evaluacion_id
        LEFT JOIN periodo_grado_cursos o ON o.id=COALESCE(c.periodo_grado_curso_id,e.periodo_grado_curso_id)`;

// La asistencia antigua se atribuye solo cuando periodo y grado son inequívocos.
export const asistenciaSourceSql = `        SELECT a.*, COALESCE(o.periodo_academico_id, legacy.periodo_id) AS periodo_id,
          COALESCE(o.grado_id,legacy.grado_id) AS grado_id
        FROM asistencias a LEFT JOIN periodo_grado_cursos o ON o.id=a.periodo_grado_curso_id
        LEFT JOIN (
          SELECT x.id, IF(COUNT(DISTINCT CONCAT(m.periodo_academico_id,':',COALESCE(m.grado_id,cu.grado_id,0)))=1, MIN(m.periodo_academico_id),NULL) AS periodo_id,
            IF(COUNT(DISTINCT CONCAT(m.periodo_academico_id,':',COALESCE(m.grado_id,cu.grado_id,0)))=1, MIN(COALESCE(m.grado_id,cu.grado_id)),NULL) AS grado_id
          FROM asistencias x JOIN matriculas m ON m.alumno_id=x.alumno_id AND (m.curso_id=x.curso_id OR x.curso_id IS NULL)
          JOIN periodos_academicos p ON p.id=m.periodo_academico_id AND x.fecha BETWEEN p.fecha_inicio AND p.fecha_fin
          LEFT JOIN cursos cu ON cu.id=m.curso_id WHERE x.periodo_grado_curso_id IS NULL GROUP BY x.id
        ) legacy ON legacy.id=a.id`;
