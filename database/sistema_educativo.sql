-- =====================================================
-- BASE DE DATOS: Sistema de Gestión Educativa Inteligente
-- Proyecto de Tesis - Ingeniería de Software con IA
-- =====================================================

CREATE DATABASE IF NOT EXISTS sistema_educativo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sistema_educativo;

-- =====================================================
-- TABLA: roles
-- =====================================================
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO roles (nombre, descripcion) VALUES
('Administrador', 'Acceso total al sistema'),
('Profesor', 'Gestión de cursos, calificaciones y asistencia'),
('Alumno', 'Consulta de información académica'),
('Apoderado', 'Consulta de información del alumno asignado');

-- =====================================================
-- TABLA: usuarios
-- =====================================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    rol_id INT NOT NULL,
    estado TINYINT(1) DEFAULT 1 COMMENT '1=activo, 0=inactivo',
    ultimo_acceso DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: periodos_academicos
-- =====================================================
CREATE TABLE periodos_academicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado TINYINT(1) DEFAULT 1 COMMENT '1=activo, 0=inactivo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: grados
-- =====================================================
CREATE TABLE grados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    nivel VARCHAR(50) NOT NULL COMMENT 'Primaria, Secundaria',
    descripcion VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO grados (nombre, nivel, descripcion) VALUES
('1ro Primaria', 'Primaria', 'Primer grado de primaria'),
('2do Primaria', 'Primaria', 'Segundo grado de primaria'),
('3ro Primaria', 'Primaria', 'Tercer grado de primaria'),
('4to Primaria', 'Primaria', 'Cuarto grado de primaria'),
('5to Primaria', 'Primaria', 'Quinto grado de primaria'),
('6to Primaria', 'Primaria', 'Sexto grado de primaria'),
('1ro Secundaria', 'Secundaria', 'Primer grado de secundaria'),
('2do Secundaria', 'Secundaria', 'Segundo grado de secundaria'),
('3ro Secundaria', 'Secundaria', 'Tercer grado de secundaria'),
('4to Secundaria', 'Secundaria', 'Cuarto grado de secundaria'),
('5to Secundaria', 'Secundaria', 'Quinto grado de secundaria');

-- =====================================================
-- TABLA: secciones
-- =====================================================
CREATE TABLE secciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(10) NOT NULL COMMENT 'A, B, C, etc.',
    grado_id INT NOT NULL,
    capacidad INT DEFAULT 40,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grado_id) REFERENCES grados(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: apoderados
-- =====================================================
CREATE TABLE apoderados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,
    dni VARCHAR(20) UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion VARCHAR(255),
    ocupacion VARCHAR(100),
    parentesco VARCHAR(50) COMMENT 'Padre, Madre, Tutor, etc.',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: alumnos
-- =====================================================
CREATE TABLE alumnos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,
    dni VARCHAR(20) UNIQUE,
    codigo VARCHAR(20) UNIQUE COMMENT 'Código del alumno',
    nombre VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100),
    fecha_nacimiento DATE,
    sexo ENUM('M', 'F') NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion VARCHAR(255),
    foto VARCHAR(255) NULL,
    estado TINYINT(1) DEFAULT 1 COMMENT '1=activo, 0=inactivo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: alumno_apoderado (relación N:N)
-- =====================================================
CREATE TABLE alumno_apoderado (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alumno_id INT NOT NULL,
    apoderado_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
    FOREIGN KEY (apoderado_id) REFERENCES apoderados(id) ON DELETE CASCADE,
    UNIQUE KEY unique_alumno_apoderado (alumno_id, apoderado_id)
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: profesores
-- =====================================================
CREATE TABLE profesores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,
    dni VARCHAR(20) UNIQUE,
    codigo VARCHAR(20) UNIQUE COMMENT 'Código del profesor',
    nombre VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100),
    fecha_nacimiento DATE,
    sexo ENUM('M', 'F'),
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion VARCHAR(255),
    especialidad VARCHAR(100),
    fecha_contratacion DATE,
    estado TINYINT(1) DEFAULT 1 COMMENT '1=activo, 0=inactivo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: cursos
-- =====================================================
CREATE TABLE cursos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    area VARCHAR(50) COMMENT 'Básico, Alternativo, Especializado',
    horas_semanales INT DEFAULT 1,
    estado TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO cursos (codigo, nombre, area, horas_semanales) VALUES
('MAT', 'Matemática', 'Básico', 5),
('COM', 'Comunicación', 'Básico', 5),
('CIE', 'Ciencia y Tecnología', 'Básico', 4),
('ING', 'Inglés', 'Básico', 3),
('HIS', 'Historia', 'Básico', 3),
('GEO', 'Geografía', 'Básico', 2),
('ARTE', 'Arte', 'Alternativo', 2),
('EDF', 'Educación Física', 'Alternativo', 2),
('REL', 'Religión', 'Alternativo', 1),
('TUT', 'Tutoría', 'Especializado', 1);

-- =====================================================
-- TABLA: curso_grado (qué cursos aplica por grado)
-- =====================================================
CREATE TABLE curso_grado (
    id INT AUTO_INCREMENT PRIMARY KEY,
    curso_id INT NOT NULL,
    grado_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (grado_id) REFERENCES grados(id) ON DELETE CASCADE,
    UNIQUE KEY unique_curso_grado (curso_id, grado_id)
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: profesor_curso (cursos asignados a un profesor)
-- =====================================================
CREATE TABLE profesor_curso (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profesor_id INT NOT NULL,
    curso_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profesor_id) REFERENCES profesores(id) ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_profesor_curso (profesor_id, curso_id)
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: matriculas
-- =====================================================
CREATE TABLE matriculas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alumno_id INT NOT NULL,
    grado_id INT NOT NULL,
    seccion_id INT NOT NULL,
    periodo_id INT NOT NULL,
    fecha_matricula DATE NOT NULL,
    estado ENUM('Activa', 'Retirada', 'Trasladada') DEFAULT 'Activa',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
    FOREIGN KEY (grado_id) REFERENCES grados(id) ON DELETE RESTRICT,
    FOREIGN KEY (seccion_id) REFERENCES secciones(id) ON DELETE RESTRICT,
    FOREIGN KEY (periodo_id) REFERENCES periodos_academicos(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_matricula (alumno_id, periodo_id)
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: horarios
-- =====================================================
CREATE TABLE horarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    curso_id INT NOT NULL,
    profesor_id INT NOT NULL,
    grado_id INT NOT NULL,
    seccion_id INT NOT NULL,
    periodo_id INT NOT NULL,
    dia ENUM('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado') NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    aula VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (profesor_id) REFERENCES profesores(id) ON DELETE CASCADE,
    FOREIGN KEY (grado_id) REFERENCES grados(id) ON DELETE CASCADE,
    FOREIGN KEY (seccion_id) REFERENCES secciones(id) ON DELETE CASCADE,
    FOREIGN KEY (periodo_id) REFERENCES periodos_academicos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: asistencias
-- =====================================================
CREATE TABLE asistencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alumno_id INT NOT NULL,
    horario_id INT NOT NULL,
    fecha DATE NOT NULL,
    estado ENUM('Presente', 'Ausente', 'Tardanza', 'Justificado') NOT NULL DEFAULT 'Presente',
    observacion VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
    FOREIGN KEY (horario_id) REFERENCES horarios(id) ON DELETE CASCADE,
    UNIQUE KEY unique_asistencia (alumno_id, horario_id, fecha)
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: calificaciones
-- =====================================================
CREATE TABLE calificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alumno_id INT NOT NULL,
    curso_id INT NOT NULL,
    periodo_id INT NOT NULL,
    nota DECIMAL(4,2) NOT NULL COMMENT 'Nota de 0 a 20',
    conducta DECIMAL(4,2) NULL COMMENT 'Nota de conducta de 0 a 20',
    observacion VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (periodo_id) REFERENCES periodos_academicos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_calificacion (alumno_id, curso_id, periodo_id)
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: documentos
-- =====================================================
CREATE TABLE documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    archivo VARCHAR(255) NOT NULL COMMENT 'Ruta del archivo',
    tipo ENUM('PDF', 'Imagen', 'Documento', 'Otro') NOT NULL,
    categoria VARCHAR(100) COMMENT 'Certificado, DNI, Constancia, etc.',
    alumno_id INT NULL,
    profesor_id INT NULL,
    usuario_subio INT NOT NULL,
    fecha_vencimiento DATE NULL COMMENT 'Para documentos obligatorios',
    estado ENUM('Vigente', 'Vencido', 'Pendiente') DEFAULT 'Vigente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE SET NULL,
    FOREIGN KEY (profesor_id) REFERENCES profesores(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_subio) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: alertas_academicas
-- =====================================================
CREATE TABLE alertas_academicas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alumno_id INT NOT NULL,
    periodo_id INT NOT NULL,
    tipo_riesgo ENUM('Bajo', 'Medio', 'Alto') NOT NULL,
    porcentaje_riesgo DECIMAL(5,2) COMMENT 'Porcentaje de riesgo estimado',
    inasistencias_pct DECIMAL(5,2) COMMENT 'Porcentaje de inasistencias',
    promedio_general DECIMAL(4,2) COMMENT 'Promedio general del alumno',
    cursos_desaprobados INT DEFAULT 0,
    descripcion TEXT COMMENT 'Detalle de los indicadores',
    recomendacion TEXT,
    estado ENUM('Activa', 'Atendida', 'Cerrada') DEFAULT 'Activa',
    fecha_deteccion DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
    FOREIGN KEY (periodo_id) REFERENCES periodos_academicos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: registro_actividades (logs de auditoría)
-- =====================================================
CREATE TABLE registro_actividades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,
    accion VARCHAR(100) NOT NULL,
    tabla VARCHAR(50) NULL,
    registro_id INT NULL,
    detalles TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: mensajes
-- =====================================================
CREATE TABLE mensajes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    emisor_id INT NOT NULL,
    receptor_id INT NOT NULL,
    asunto VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    leido TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emisor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (receptor_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- TABLA: eventos_calendario
-- =====================================================
CREATE TABLE eventos_calendario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME,
    tipo ENUM('Académico', 'Examen', 'Reunión', 'Actividad', 'Otro') NOT NULL DEFAULT 'Académico',
    color VARCHAR(7) DEFAULT '#0d6efd',
    creado_por INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Usuario administrador por defecto (contraseña: admin123)
INSERT INTO usuarios (username, password, email, rol_id, estado) VALUES
('admin', '$2y$10$OQ4BwOZXw4KUaE..jHovYej55gBYi9/UyfqhNT2wgZuvcSoc1Izw6', 'admin@sistema.edu.pe', 1, 1);

-- Periodo académico actual
INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, estado) VALUES
('2026 - Ciclo Escolar', '2026-03-01', '2026-12-15', 1);

-- Secciones por grado (A y B para cada grado)
INSERT INTO secciones (nombre, grado_id, capacidad) VALUES
('A', 1, 40), ('B', 1, 40),
('A', 2, 40), ('B', 2, 40),
('A', 3, 40), ('B', 3, 40),
('A', 4, 40), ('B', 4, 40),
('A', 5, 40), ('B', 5, 40),
('A', 6, 40), ('B', 6, 40),
('A', 7, 40), ('B', 7, 40),
('A', 8, 40), ('B', 8, 40),
('A', 9, 40), ('B', 9, 40),
('A', 10, 40), ('B', 10, 40),
('A', 11, 40), ('B', 11, 40);
