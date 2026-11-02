USE gestion_educativa;

-- ============================================================
-- Estructura académica configurable por periodo:
-- Periodo académico -> Nivel -> Grado -> Curso -> Profesor
--
-- El "Nivel" (Inicial, Primaria, Secundaria) ya vive en grados.nivel.
-- ============================================================

-- 1. Grados habilitados en cada periodo académico
CREATE TABLE IF NOT EXISTS periodo_grados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    periodo_academico_id INT NOT NULL,
    grado_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_periodo_grado (periodo_academico_id, grado_id),
    KEY idx_periodo_grados_grado (grado_id),
    CONSTRAINT fk_periodo_grados_periodo FOREIGN KEY (periodo_academico_id)
        REFERENCES periodos_academicos(id) ON DELETE CASCADE,
    CONSTRAINT fk_periodo_grados_grado FOREIGN KEY (grado_id)
        REFERENCES grados(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Cursos que se dictan en cada grado del periodo
CREATE TABLE IF NOT EXISTS periodo_grado_cursos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    periodo_academico_id INT NOT NULL,
    grado_id INT NOT NULL,
    curso_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_periodo_grado_curso (periodo_academico_id, grado_id, curso_id),
    KEY idx_pgc_curso (curso_id),
    KEY idx_pgc_grado (grado_id),
    CONSTRAINT fk_pgc_periodo FOREIGN KEY (periodo_academico_id)
        REFERENCES periodos_academicos(id) ON DELETE CASCADE,
    CONSTRAINT fk_pgc_grado FOREIGN KEY (grado_id)
        REFERENCES grados(id) ON DELETE CASCADE,
    CONSTRAINT fk_pgc_curso FOREIGN KEY (curso_id)
        REFERENCES cursos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Profesores asignados a cada (periodo, grado, curso). Permite varios profesores por curso
CREATE TABLE IF NOT EXISTS periodo_grado_curso_profesores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    periodo_grado_curso_id INT NOT NULL,
    profesor_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_pgcp (periodo_grado_curso_id, profesor_id),
    KEY idx_pgcp_profesor (profesor_id),
    CONSTRAINT fk_pgcp_pgc FOREIGN KEY (periodo_grado_curso_id)
        REFERENCES periodo_grado_cursos(id) ON DELETE CASCADE,
    CONSTRAINT fk_pgcp_profesor FOREIGN KEY (profesor_id)
        REFERENCES profesores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Origen de cada asignación profesor<->curso:
--    'manual'        = asignada desde Profesores (no se toca)
--    'configuracion' = generada por la estructura académica (se reconstruye sola)
SET @existe_origen := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'profesor_curso' AND COLUMN_NAME = 'origen'
);
SET @ddl_origen := IF(@existe_origen = 0,
    'ALTER TABLE profesor_curso ADD COLUMN origen ENUM(''manual'',''configuracion'') NOT NULL DEFAULT ''manual''',
    'SELECT ''La columna profesor_curso.origen ya existe'' AS info');
PREPARE stmt_origen FROM @ddl_origen;
EXECUTE stmt_origen;
DEALLOCATE PREPARE stmt_origen;
