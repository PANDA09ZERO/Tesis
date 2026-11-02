-- Ejecutar después de revisar duplicados; no combina ni elimina registros históricos.
-- La migración idempotente del backend verifica los datos antes de ejecutar este archivo.
ALTER TABLE mensualidades MODIFY curso_id INT NULL;
ALTER TABLE sueldos MODIFY curso_id INT NULL, MODIFY periodo_academico_id INT NULL;
CREATE TABLE IF NOT EXISTS pagos_matricula (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alumno_id INT NOT NULL,
    periodo_academico_id INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL DEFAULT 0,
    estado ENUM('pendiente', 'pagado') NOT NULL DEFAULT 'pendiente',
    fecha_pago DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
    FOREIGN KEY (periodo_academico_id) REFERENCES periodos_academicos(id),
    UNIQUE KEY unique_pago_matricula (alumno_id, periodo_academico_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Los índices se instalan mediante scripts/migrate-payments.cjs cuando no existen.
