USE gestion_educativa;

-- Mantener intactos los registros historicos; solo las nuevas filas quedan ligadas a una oferta.
SET @column_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asistencias'
      AND COLUMN_NAME = 'periodo_grado_curso_id'
);
SET @ddl := IF(@column_exists = 0,
    'ALTER TABLE asistencias ADD COLUMN periodo_grado_curso_id INT NULL AFTER curso_id',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calificaciones'
      AND COLUMN_NAME = 'periodo_grado_curso_id'
);
SET @ddl := IF(@column_exists = 0,
    'ALTER TABLE calificaciones ADD COLUMN periodo_grado_curso_id INT NULL AFTER periodo_academico_id',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calificaciones'
      AND COLUMN_NAME = 'evaluacion_id'
);
SET @ddl := IF(@column_exists = 0,
    'ALTER TABLE calificaciones ADD COLUMN evaluacion_id INT NULL AFTER periodo_grado_curso_id',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS evaluaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    periodo_grado_curso_id INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) NOT NULL DEFAULT 'practica',
    fecha_evaluacion DATE NOT NULL,
    nota_maxima DECIMAL(4,2) NOT NULL DEFAULT 20.00,
    estado ENUM('activa', 'cerrada') NOT NULL DEFAULT 'activa',
    creado_por_usuario_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_evaluaciones_oferta (periodo_grado_curso_id, fecha_evaluacion),
    CONSTRAINT fk_evaluaciones_oferta FOREIGN KEY (periodo_grado_curso_id)
        REFERENCES periodo_grado_cursos(id) ON DELETE CASCADE,
    CONSTRAINT fk_evaluaciones_usuario FOREIGN KEY (creado_por_usuario_id)
        REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT chk_evaluaciones_nota_maxima CHECK (nota_maxima > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @index_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asistencias'
      AND INDEX_NAME = 'unique_asistencia'
);
SET @ddl := IF(@index_exists > 0, 'ALTER TABLE asistencias DROP INDEX unique_asistencia', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'asistencias'
      AND INDEX_NAME = 'unique_asistencia_oferta'
);
SET @ddl := IF(@index_exists = 0,
    'ALTER TABLE asistencias ADD UNIQUE KEY unique_asistencia_oferta (alumno_id, fecha, curso_id, periodo_grado_curso_id)',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calificaciones'
      AND INDEX_NAME = 'idx_calificaciones_oferta'
);
SET @ddl := IF(@index_exists = 0,
    'ALTER TABLE calificaciones ADD KEY idx_calificaciones_oferta (periodo_grado_curso_id, alumno_id)',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calificaciones'
      AND INDEX_NAME = 'unique_calificacion_evaluacion_alumno'
);
SET @ddl := IF(@index_exists = 0,
    'ALTER TABLE calificaciones ADD UNIQUE KEY unique_calificacion_evaluacion_alumno (evaluacion_id, alumno_id)',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @constraint_exists := (
    SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'asistencias'
      AND CONSTRAINT_NAME = 'fk_asistencias_oferta'
);
SET @ddl := IF(@constraint_exists = 0,
    'ALTER TABLE asistencias ADD CONSTRAINT fk_asistencias_oferta FOREIGN KEY (periodo_grado_curso_id) REFERENCES periodo_grado_cursos(id) ON DELETE SET NULL',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @constraint_exists := (
    SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'calificaciones'
      AND CONSTRAINT_NAME = 'fk_calificaciones_oferta'
);
SET @ddl := IF(@constraint_exists = 0,
    'ALTER TABLE calificaciones ADD CONSTRAINT fk_calificaciones_oferta FOREIGN KEY (periodo_grado_curso_id) REFERENCES periodo_grado_cursos(id) ON DELETE SET NULL',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @constraint_exists := (
    SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'calificaciones'
      AND CONSTRAINT_NAME = 'fk_calificaciones_evaluacion'
);
SET @ddl := IF(@constraint_exists = 0,
    'ALTER TABLE calificaciones ADD CONSTRAINT fk_calificaciones_evaluacion FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id) ON DELETE SET NULL',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;