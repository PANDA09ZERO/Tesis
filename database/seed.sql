USE gestion_educativa;

-- Datos de catálogo (grados, periodos, cursos)
-- Los usuarios y datos académicos se crean ejecutando el script backend/scripts/seed.ts
-- Ver instrucciones en README.md

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

INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, activo) VALUES
('2026-I', '2026-03-01', '2026-07-15', 1),
('2025-II', '2025-09-01', '2025-12-20', 0);

INSERT IGNORE INTO cursos (nombre, codigo, descripcion, grado_id)
SELECT ejemplo.nombre, ejemplo.codigo, ejemplo.descripcion, g.id
FROM (
	SELECT 'Matemáticas' AS nombre, 'MAT-4' AS codigo, 'Matemáticas 1er Grado' AS descripcion
	UNION ALL SELECT 'Comunicación', 'COM-4', 'Comunicación 1er Grado'
	UNION ALL SELECT 'Ciencia y Tecnología', 'CYT-4', 'Ciencia y Tecnología 1er Grado'
	UNION ALL SELECT 'Historia', 'HIS-4', 'Historia 1er Grado'
	UNION ALL SELECT 'Inglés', 'ING-4', 'Inglés 1er Grado'
	UNION ALL SELECT 'Arte', 'ART-4', 'Arte 1er Grado'
	UNION ALL SELECT 'Educación Física', 'EF-4', 'Educación Física 1er Grado'
) AS ejemplo
JOIN grados g ON g.id = (
	SELECT id FROM grados WHERE nombre = '1er Grado' AND nivel = 'Primaria'
	ORDER BY id DESC LIMIT 1
);