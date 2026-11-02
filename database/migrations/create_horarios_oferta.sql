USE gestion_educativa;

-- Ejecutar despues de crear periodo_grado_cursos.
-- Los horarios historicos no incluyen grado. Se dejan sin oferta para evitar
-- asociarlos a una combinacion periodo/curso que pudiera ser ambigua.
SET @column_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'horarios'
      AND COLUMN_NAME = 'periodo_grado_curso_id'
);
SET @ddl := IF(@column_exists = 0,
    'ALTER TABLE horarios ADD COLUMN periodo_grado_curso_id INT NULL AFTER periodo_academico_id',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'horarios'
      AND INDEX_NAME = 'idx_horarios_oferta'
);
SET @ddl := IF(@index_exists = 0,
    'ALTER TABLE horarios ADD KEY idx_horarios_oferta (periodo_grado_curso_id)',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @constraint_exists := (
    SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'horarios'
      AND CONSTRAINT_NAME = 'fk_horarios_oferta'
);
SET @ddl := IF(@constraint_exists = 0,
    'ALTER TABLE horarios ADD CONSTRAINT fk_horarios_oferta FOREIGN KEY (periodo_grado_curso_id) REFERENCES periodo_grado_cursos(id) ON DELETE SET NULL',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
