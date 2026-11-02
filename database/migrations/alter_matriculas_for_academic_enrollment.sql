USE gestion_educativa;

ALTER TABLE matriculas
    MODIFY COLUMN curso_id INT NULL,
    ADD COLUMN grado_id INT NULL AFTER periodo_academico_id,
    ADD COLUMN observaciones TEXT NULL AFTER estado,
    MODIFY COLUMN estado ENUM('activa', 'pendiente', 'cancelada', 'completada') DEFAULT 'activa',
    ADD CONSTRAINT fk_matriculas_grado FOREIGN KEY (grado_id) REFERENCES grados(id);