USE gestion_educativa;

-- Datos de catálogo (grados, secciones, periodos, cursos)
-- Los usuarios y datos académicos se crean ejecutando el script backend/scripts/seed.ts
-- Ver instrucciones en README.md

INSERT INTO grados (nombre, nivel, orden) VALUES
('1er Grado', 'Primaria', 1),
('2do Grado', 'Primaria', 2),
('3er Grado', 'Primaria', 3),
('4to Grado', 'Primaria', 4),
('5to Grado', 'Primaria', 5),
('6to Grado', 'Primaria', 6);

INSERT INTO secciones (nombre, grado_id, capacidad) VALUES
('A', 1, 35), ('B', 1, 35),
('A', 2, 35), ('B', 2, 35),
('A', 3, 35), ('B', 3, 35),
('A', 4, 35), ('B', 4, 35),
('A', 5, 35), ('B', 5, 35),
('A', 6, 35), ('B', 6, 35);

INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, activo) VALUES
('2026-I', '2026-03-01', '2026-07-15', 1),
('2025-II', '2025-09-01', '2025-12-20', 0);

INSERT INTO cursos (nombre, codigo, descripcion, grado_id) VALUES
('Matemáticas', 'MAT-4', 'Matemáticas 4to Grado', 4),
('Comunicación', 'COM-4', 'Comunicación 4to Grado', 4),
('Ciencia y Tecnología', 'CYT-4', 'Ciencia y Tecnología 4to Grado', 4),
('Historia', 'HIS-4', 'Historia 4to Grado', 4),
('Inglés', 'ING-4', 'Inglés 4to Grado', 4),
('Arte', 'ART-4', 'Arte 4to Grado', 4),
('Educación Física', 'EF-4', 'Educación Física 4to Grado', 4);