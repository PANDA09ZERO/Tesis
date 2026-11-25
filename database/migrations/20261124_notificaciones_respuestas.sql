-- =====================================================================
-- Sistema de gestión educativa · 24/11/2026
-- Respuestas a notificaciones:
-- 1) notificaciones.respuesta_pendiente marca que el destinatario respondió
--    y la administración aún no abrió la conversación.
-- 2) Crea notificacion_respuestas: mensajes del destinatario y de la
--    administración bajo cada notificación.
-- 3) Registra la versión 20261124_respuestas de schema.sql.
--
-- No modifica ni borra datos existentes.
--
-- ANTES: Server > Data Export de gestion_educativa (respaldo completo).
-- Ejecutar completo en MySQL Workbench (rayo ⚡). Es seguro repetirlo.
-- Alternativa desde backend: npm run migrate:respuestas
-- =====================================================================
USE gestion_educativa;

-- 1) Marca de respuesta pendiente ---------------------------------------
DROP PROCEDURE IF EXISTS agregar_respuesta_pendiente;
DELIMITER //
CREATE PROCEDURE agregar_respuesta_pendiente()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
                 AND TABLE_NAME = 'notificaciones' AND COLUMN_NAME = 'respuesta_pendiente') THEN
    ALTER TABLE notificaciones ADD COLUMN respuesta_pendiente TINYINT(1) NOT NULL DEFAULT 0 AFTER fecha_leida;
  END IF;
END //
DELIMITER ;
CALL agregar_respuesta_pendiente();
DROP PROCEDURE agregar_respuesta_pendiente;

-- 2) Respuestas ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificacion_respuestas (
 id INT AUTO_INCREMENT PRIMARY KEY,
 notificacion_id INT NOT NULL,
 usuario_id INT NOT NULL,
 mensaje TEXT NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY idx_respuestas_notificacion (notificacion_id, created_at),
 FOREIGN KEY (notificacion_id) REFERENCES notificaciones(id) ON DELETE CASCADE,
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) Versión del esquema (la usa npm run production:check) ---------------
CREATE TABLE IF NOT EXISTS schema_migrations (
 version VARCHAR(100) PRIMARY KEY,
 checksum CHAR(64) NOT NULL,
 applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT IGNORE INTO schema_migrations (version, checksum)
VALUES ('20261124_respuestas', '95da72533b9ba092184fe8eed23f2990e569fdbebdb1836742887ca513bccb8d');

-- Verificación: debe listar la columna nueva y la tabla de respuestas.
SELECT COLUMN_NAME FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notificaciones' AND COLUMN_NAME = 'respuesta_pendiente';
SELECT TABLE_NAME FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notificacion_respuestas';
