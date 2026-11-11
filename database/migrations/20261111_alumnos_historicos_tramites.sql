-- =====================================================================
-- Sistema de gestión educativa · 11/11/2026
-- 1) Alumnos históricos: alumnos registrados antes del sistema, solo con
--    sus datos (sin matrícula, notas ni cuenta activa). Agrega el estado
--    'trasladado' y columnas con el último año y grado cursados.
-- 2) Crea tramites_documentales: pedidos de traslado, certificados y
--    constancias, con su estado y el documento entregado.
-- 3) Registra la versión 20261111_historicos de schema.sql.
--
-- No modifica ni borra datos existentes: los alumnos actuales quedan con
-- es_historico = 0.
--
-- ANTES: Server > Data Export de gestion_educativa (respaldo completo).
-- Ejecutar completo en MySQL Workbench (rayo ⚡). Es seguro repetirlo.
-- Alternativa desde backend: npm run migrate:historicos
-- =====================================================================
USE gestion_educativa;

-- 1) Alumnos históricos ------------------------------------------------
ALTER TABLE alumnos
 MODIFY Estado ENUM('matriculado','retirado','egresado','trasladado') DEFAULT 'matriculado';

DROP PROCEDURE IF EXISTS agregar_columna_alumnos;
DELIMITER //
CREATE PROCEDURE agregar_columna_alumnos(IN columna VARCHAR(64), IN definicion VARCHAR(200))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
                 AND TABLE_NAME = 'alumnos' AND COLUMN_NAME = columna) THEN
    SET @q = CONCAT('ALTER TABLE alumnos ADD COLUMN `', columna, '` ', definicion);
    PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
  END IF;
END //
DELIMITER ;

CALL agregar_columna_alumnos('es_historico', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL agregar_columna_alumnos('anio_ingreso', 'YEAR NULL');
CALL agregar_columna_alumnos('anio_ultimo_estudio', 'YEAR NULL');
CALL agregar_columna_alumnos('ultimo_grado_cursado', 'VARCHAR(80) NULL');
CALL agregar_columna_alumnos('observaciones_historicas', 'TEXT NULL');
DROP PROCEDURE agregar_columna_alumnos;

-- 2) Trámites documentales ---------------------------------------------
CREATE TABLE IF NOT EXISTS tramites_documentales (
 id INT AUTO_INCREMENT PRIMARY KEY,
 alumno_id INT NOT NULL,
 tipo ENUM('traslado','certificado_estudios','constancia_estudios','constancia_matricula','constancia_conducta','otro') NOT NULL,
 estado ENUM('solicitado','en_proceso','listo','entregado','anulado') NOT NULL DEFAULT 'solicitado',
 solicitante VARCHAR(150) NULL,
 destino VARCHAR(200) NULL,
 observaciones TEXT NULL,
 documento_id INT NULL,
 creado_por INT NOT NULL,
 atendido_por INT NULL,
 entregado_en TIMESTAMP NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_tramites_alumno (alumno_id, created_at),
 KEY idx_tramites_estado (estado, created_at),
 FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
 FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE SET NULL,
 FOREIGN KEY (creado_por) REFERENCES usuarios(id),
 FOREIGN KEY (atendido_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) Versión del esquema (la usa npm run production:check) ---------------
CREATE TABLE IF NOT EXISTS schema_migrations (
 version VARCHAR(100) PRIMARY KEY,
 checksum CHAR(64) NOT NULL,
 applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT IGNORE INTO schema_migrations (version, checksum)
VALUES ('20261111_historicos', 'c1f6e0c80794d7113ecdc5b0296e278a1c283abcf51a965a14873eb712b44bfa');

-- Verificación: debe listar las 5 columnas nuevas y la tabla de trámites.
SELECT COLUMN_NAME FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alumnos'
   AND COLUMN_NAME IN ('es_historico','anio_ingreso','anio_ultimo_estudio','ultimo_grado_cursado','observaciones_historicas');
SELECT TABLE_NAME FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tramites_documentales';
