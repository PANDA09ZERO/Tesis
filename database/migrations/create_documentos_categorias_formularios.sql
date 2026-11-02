USE gestion_educativa;

CREATE TABLE IF NOT EXISTS documento_categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    nombre_normalizado VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL UNIQUE,
    estado ENUM('activa', 'archivada') NOT NULL DEFAULT 'activa',
    creado_por INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_documento_categorias_creador
        FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @column_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documentos'
      AND COLUMN_NAME = 'categoria_id'
);
SET @ddl := IF(@column_exists = 0,
    'ALTER TABLE documentos ADD COLUMN categoria_id INT NULL AFTER categoria',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documentos'
      AND COLUMN_NAME = 'archivo_url'
);
SET @ddl := IF(@column_exists > 0,
    'ALTER TABLE documentos MODIFY COLUMN archivo_url VARCHAR(500) NULL',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Importar cada nombre historico una sola vez; no se altera el texto ni se
-- descartan documentos que tengan categoria vacia.
INSERT INTO documento_categorias (nombre, nombre_normalizado)
SELECT MIN(TRIM(categoria)), LOWER(TRIM(categoria))
FROM documentos
WHERE categoria IS NOT NULL AND TRIM(categoria) <> ''
GROUP BY LOWER(TRIM(categoria))
ON DUPLICATE KEY UPDATE nombre_normalizado = VALUES(nombre_normalizado);

UPDATE documentos d
JOIN documento_categorias c
  ON c.nombre_normalizado = LOWER(TRIM(d.categoria))
SET d.categoria_id = c.id
WHERE d.categoria_id IS NULL
  AND d.categoria IS NOT NULL
  AND TRIM(d.categoria) <> '';

SET @index_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documentos'
      AND INDEX_NAME = 'idx_documentos_categoria'
);
SET @ddl := IF(@index_exists = 0,
    'ALTER TABLE documentos ADD KEY idx_documentos_categoria (categoria_id)',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @constraint_exists := (
    SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'documentos'
      AND CONSTRAINT_NAME = 'fk_documentos_categoria'
);
SET @ddl := IF(@constraint_exists = 0,
    'ALTER TABLE documentos ADD CONSTRAINT fk_documentos_categoria FOREIGN KEY (categoria_id) REFERENCES documento_categorias(id) ON DELETE SET NULL',
    'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS formularios_documentales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    categoria_id INT NULL,
    campos JSON NOT NULL,
    estado ENUM('borrador', 'publicada', 'archivada') NOT NULL DEFAULT 'borrador',
    creado_por INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_formularios_documentales_estado (estado, created_at),
    CONSTRAINT fk_formularios_documentales_categoria
        FOREIGN KEY (categoria_id) REFERENCES documento_categorias(id) ON DELETE SET NULL,
    CONSTRAINT fk_formularios_documentales_creador
        FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS formularios_documentales_envios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    formulario_id INT NOT NULL,
    usuario_id INT NOT NULL,
    alumno_id INT NULL,
    respuestas JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_formularios_envios_usuario (usuario_id, formulario_id, created_at),
    CONSTRAINT fk_formularios_envios_formulario
        FOREIGN KEY (formulario_id) REFERENCES formularios_documentales(id) ON DELETE CASCADE,
    CONSTRAINT fk_formularios_envios_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT fk_formularios_envios_alumno
        FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
