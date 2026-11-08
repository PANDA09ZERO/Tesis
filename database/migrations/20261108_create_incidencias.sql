-- Registro de incidencias de conducta (p. ej., alumno derivado a dirección).
-- Idempotente: no modifica tablas existentes ni datos.
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
