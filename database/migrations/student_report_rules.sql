CREATE TABLE IF NOT EXISTS libreta_reglas (
 periodo_academico_id INT NOT NULL,
 grado_id INT NOT NULL,
 configuracion JSON NOT NULL,
 revision INT NOT NULL DEFAULT 1,
 cerrado TINYINT(1) NOT NULL DEFAULT 0,
 actualizado_por INT NOT NULL,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY (periodo_academico_id, grado_id),
 FOREIGN KEY (periodo_academico_id) REFERENCES periodos_academicos(id),
 FOREIGN KEY (grado_id) REFERENCES grados(id),
 FOREIGN KEY (actualizado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS libreta_emisiones (
 id INT AUTO_INCREMENT PRIMARY KEY,
 alumno_id INT NOT NULL,
 periodo_academico_id INT NOT NULL,
 grado_id INT NOT NULL,
 version INT NOT NULL,
 solicitud_id VARCHAR(64) NOT NULL,
 contenido JSON NOT NULL,
 emitido_por INT NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY libreta_version (alumno_id, periodo_academico_id, grado_id, version),
 UNIQUE KEY libreta_solicitud (solicitud_id),
 FOREIGN KEY (alumno_id) REFERENCES alumnos(id),
 FOREIGN KEY (periodo_academico_id) REFERENCES periodos_academicos(id),
 FOREIGN KEY (grado_id) REFERENCES grados(id),
 FOREIGN KEY (emitido_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
