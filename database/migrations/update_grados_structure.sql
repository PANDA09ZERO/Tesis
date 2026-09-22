USE gestion_educativa;

-- Desactivar safe update mode
SET SQL_SAFE_UPDATES = 0;

-- Primero eliminar referencias a secciones en alumnos (poner seccion_id a NULL)
UPDATE alumnos SET seccion_id = NULL WHERE seccion_id IS NOT NULL;

-- Eliminar referencias a secciones en horarios
DELETE FROM horarios WHERE seccion_id IS NOT NULL;

-- Eliminar secciones existentes (ya que no se usan)
DELETE FROM secciones;

-- Eliminar referencias a grados en cursos (poner grado_id a NULL)
UPDATE cursos SET grado_id = NULL WHERE grado_id IS NOT NULL;

-- Eliminar referencias a grados en alumnos (poner grado_id a NULL)
UPDATE alumnos SET grado_id = NULL WHERE grado_id IS NOT NULL;

-- Eliminar grados existentes
DELETE FROM grados;

-- Insertar nueva estructura de grados
INSERT INTO grados (nombre, nivel, orden) VALUES
('3 años', 'Inicial', 1),
('4 años', 'Inicial', 2),
('5 años', 'Inicial', 3),
('1er Grado', 'Primaria', 1),
('2do Grado', 'Primaria', 2),
('3er Grado', 'Primaria', 3),
('4to Grado', 'Primaria', 4),
('5to Grado', 'Primaria', 5),
('6to Grado', 'Primaria', 6),
('1er Grado', 'Secundaria', 1),
('2do Grado', 'Secundaria', 2),
('3er Grado', 'Secundaria', 3),
('4to Grado', 'Secundaria', 4),
('5to Grado', 'Secundaria', 5);

-- Reactivar safe update mode
SET SQL_SAFE_UPDATES = 1;
