-- =====================================================================
-- Sistema de gestión educativa · 08/11/2026
-- 1) Crea la tabla incidencias (módulo de conducta).
-- 2) Limpia restos sin uso: tabla secciones, columnas seccion_id
--    (alumnos, horarios, matriculas; todas vacías) y la tabla
--    profesor_curso (sistema de asignaciones reemplazado por la
--    Estructura académica).
-- 3) Registra la versión 20261108_incidencias de schema.sql.
--
-- NO toca alertas_academicas: se conserva y ahora la llena el motor de
-- reglas del backend (faltas, tardanzas, notas e incidencias), sin IA.
-- Las alertas no necesitan cambios en la base.
--
-- ANTES: Server > Data Export de gestion_educativa (respaldo completo).
-- Ejecutar completo en MySQL Workbench (rayo ⚡). Es seguro repetirlo:
-- cada paso comprueba si ya se hizo. Si alguna seccion_id tuviera datos,
-- se detiene sin borrar esa columna.
-- =====================================================================
USE gestion_educativa;

-- 1) Tabla incidencias -------------------------------------------------
CREATE TABLE IF NOT EXISTS incidencias (
 id INT AUTO_INCREMENT PRIMARY KEY,
 alumno_id INT NOT NULL,
 periodo_academico_id INT NULL,
 reportado_por INT NOT NULL,
 fecha DATE NOT NULL,
 hora TIME NULL,
 tipo ENUM('derivacion_direccion','conducta','citacion_apoderado','agresion','otro') NOT NULL,
 gravedad ENUM('leve','moderada','grave') NOT NULL DEFAULT 'leve',
 lugar VARCHAR(120) NULL,
 descripcion TEXT NOT NULL,
 medida_tomada TEXT NULL,
 apoderado_notificado TINYINT(1) NOT NULL DEFAULT 0,
 estado ENUM('abierta','en_seguimiento','cerrada') NOT NULL DEFAULT 'abierta',
 resolucion TEXT NULL,
 cerrada_por INT NULL,
 cerrada_en TIMESTAMP NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_incidencias_alumno (alumno_id, fecha),
 KEY idx_incidencias_estado (estado, gravedad),
 FOREIGN KEY (alumno_id) REFERENCES alumnos(id),
 FOREIGN KEY (periodo_academico_id) REFERENCES periodos_academicos(id),
 FOREIGN KEY (reportado_por) REFERENCES usuarios(id),
 FOREIGN KEY (cerrada_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Limpieza ------------------------------------------------------------
DROP PROCEDURE IF EXISTS limpiar_seccion;
DELIMITER //
CREATE PROCEDURE limpiar_seccion(IN tabla VARCHAR(64))
BEGIN
  DECLARE fk VARCHAR(64) DEFAULT NULL;
  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = tabla AND COLUMN_NAME = 'seccion_id') THEN
    -- Seguridad: si la columna tuviera algún dato, se detiene sin borrar.
    SET @q = CONCAT('SELECT COUNT(*) INTO @con_datos FROM `', tabla, '` WHERE seccion_id IS NOT NULL');
    PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
    IF @con_datos > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Hay seccion_id con datos; revisar antes de borrar';
    END IF;
    SELECT CONSTRAINT_NAME INTO fk FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tabla AND COLUMN_NAME = 'seccion_id'
       AND REFERENCED_TABLE_NAME IS NOT NULL LIMIT 1;
    IF fk IS NOT NULL THEN
      SET @q = CONCAT('ALTER TABLE `', tabla, '` DROP FOREIGN KEY `', fk, '`');
      PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
    END IF;
    SET @q = CONCAT('ALTER TABLE `', tabla, '` DROP COLUMN seccion_id');
    PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
  END IF;
END //
DELIMITER ;

CALL limpiar_seccion('alumnos');
CALL limpiar_seccion('horarios');
CALL limpiar_seccion('matriculas');
DROP PROCEDURE limpiar_seccion;

DROP TABLE IF EXISTS secciones;
DROP TABLE IF EXISTS profesor_curso;

-- 3) Versión del esquema (la usa npm run production:check) ---------------
CREATE TABLE IF NOT EXISTS schema_migrations (
 version VARCHAR(100) PRIMARY KEY,
 checksum CHAR(64) NOT NULL,
 applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT IGNORE INTO schema_migrations (version, checksum)
VALUES ('20261108_incidencias', '5ad5e321060f6e65b05ca23c4ed69de48e4a7d7c98664ca142f932c69b00f153');

-- Verificación: debe listar alertas_academicas e incidencias,
-- y NO listar secciones ni profesor_curso.
SELECT TABLE_NAME FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('alertas_academicas','incidencias','secciones','profesor_curso');
-- Debe devolver 0 filas (columnas seccion_id eliminadas).
SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'seccion_id';
