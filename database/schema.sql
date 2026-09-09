CREATE DATABASE IF NOT EXISTS gestion_educativa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gestion_educativa;

CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO roles (nombre, descripcion) VALUES
    ('administrador', 'Acceso total al sistema'),
    ('profesor', 'Gestión académica y registro de notas'),
    ('alumno', 'Consulta de información académica'),
    ('apoderado', 'Consulta del estudiante representado');

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    dni VARCHAR(20) UNIQUE,
    telefono VARCHAR(20),
    direccion TEXT,
    fecha_nacimiento DATE,
    genero ENUM('M', 'F', 'Otro') DEFAULT 'Otro',
    foto_url VARCHAR(500),
    rol_id INT NOT NULL,
    activo TINYINT(1) DEFAULT 1,
    ultimo_acceso TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES roles(id)
);

CREATE TABLE grados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    nivel VARCHAR(50) NOT NULL,
    orden INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE secciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(10) NOT NULL,
    grado_id INT NOT NULL,
    capacidad INT DEFAULT 40,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grado_id) REFERENCES grados(id),
    UNIQUE KEY unique_seccion (nombre, grado_id)
);

CREATE TABLE periodos_academicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    activo TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE alumnos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE,
    codigo_alumno VARCHAR(20) UNIQUE,
    grado_id INT,
    seccion_id INT,
    periodo_academico_id INT,
    Estado ENUM('matriculado', 'retirado', 'egresado') DEFAULT 'matriculado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (grado_id) REFERENCES grados(id),
    FOREIGN KEY (seccion_id) REFERENCES secciones(id),
    FOREIGN KEY (periodo_academico_id) REFERENCES periodos_academicos(id)
);

CREATE TABLE apoderados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE,
    ocupacion VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE apoderado_alumno (
    id INT AUTO_INCREMENT PRIMARY KEY,
    apoderado_id INT NOT NULL,
    alumno_id INT NOT NULL,
    parentesco VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (apoderado_id) REFERENCES apoderados(id) ON DELETE CASCADE,
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_apoderado_alumno (apoderado_id, alumno_id)
);

CREATE TABLE profesores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE,
    especialidad VARCHAR(200),
    fecha_ingreso DATE,
    titulo_profesional VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE cursos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    codigo VARCHAR(20) UNIQUE,
    descripcion TEXT,
    grado_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grado_id) REFERENCES grados(id)
);

CREATE TABLE horarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    curso_id INT NOT NULL,
    profesor_id INT NOT NULL,
    seccion_id INT NOT NULL,
    periodo_academico_id INT NOT NULL,
    dia_semana ENUM('Lunes','Martes','Miercoles','Jueves','Viernes','Sabado') NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    aula VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (profesor_id) REFERENCES profesores(id) ON DELETE CASCADE,
    FOREIGN KEY (seccion_id) REFERENCES secciones(id),
    FOREIGN KEY (periodo_academico_id) REFERENCES periodos_academicos(id)
);

CREATE TABLE matriculas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alumno_id INT NOT NULL,
    curso_id INT NOT NULL,
    periodo_academico_id INT NOT NULL,
    fecha_matricula TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('activa', 'cancelada', 'completada') DEFAULT 'activa',
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (periodo_academico_id) REFERENCES periodos_academicos(id),
    UNIQUE KEY unique_matricula (alumno_id, curso_id, periodo_academico_id)
);

CREATE TABLE calificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alumno_id INT NOT NULL,
    curso_id INT NOT NULL,
    periodo_academico_id INT NOT NULL,
    nota DECIMAL(4,2) NOT NULL CHECK (nota >= 0 AND nota <= 20),
    tipo_evaluacion VARCHAR(50) DEFAULT 'general',
    observaciones TEXT,
    registrado_por INT,
    fecha_evaluacion DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (periodo_academico_id) REFERENCES periodos_academicos(id),
    FOREIGN KEY (registrado_por) REFERENCES profesores(id)
);

CREATE TABLE asistencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alumno_id INT NOT NULL,
    curso_id INT,
    fecha DATE NOT NULL,
    estado ENUM('presente', 'ausente', 'tardanza', 'justificado') NOT NULL DEFAULT 'presente',
    minutos_tardanza INT DEFAULT 0,
    observaciones TEXT,
    registrado_por INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES cursos(id),
    FOREIGN KEY (registrado_por) REFERENCES profesores(id),
    UNIQUE KEY unique_asistencia (alumno_id, fecha, curso_id)
);

CREATE TABLE documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    archivo_url VARCHAR(500) NOT NULL,
    tipo_archivo ENUM('pdf', 'imagen', 'documento', 'otro') NOT NULL,
    tamano_bytes BIGINT DEFAULT 0,
    categoria VARCHAR(100),
    subcategoria VARCHAR(100),
    alumno_id INT,
    profesor_id INT,
    usuario_subio INT NOT NULL,
    obligatorio TINYINT(1) DEFAULT 0,
    fecha_vencimiento DATE,
    estado ENUM('activo', 'pendiente', 'vencido', 'archivado') DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE SET NULL,
    FOREIGN KEY (profesor_id) REFERENCES profesores(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_subio) REFERENCES usuarios(id)
);

CREATE TABLE documentos_historial (
    id INT AUTO_INCREMENT PRIMARY KEY,
    documento_id INT NOT NULL,
    usuario_id INT NOT NULL,
    accion VARCHAR(100) NOT NULL,
    detalles TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE alertas_academicas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alumno_id INT NOT NULL,
    tipo_riesgo ENUM('bajo', 'medio', 'alto') NOT NULL DEFAULT 'medio',
    nivel_riesgo DECIMAL(5,2) DEFAULT 0,
    indicadores JSON,
    descripcion TEXT,
    recomendacion TEXT,
    estado ENUM('activa', 'atendida', 'resuelta', 'expirada') DEFAULT 'activa',
    generada_por_ia TINYINT(1) DEFAULT 1,
    asignada_a INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
    FOREIGN KEY (asignada_a) REFERENCES usuarios(id)
);

CREATE TABLE registro_actividades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    accion VARCHAR(100) NOT NULL,
    entidad VARCHAR(50),
    entidad_id INT,
    detalles JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_alumnos_grado ON alumnos(grado_id, seccion_id);
CREATE INDEX idx_calificaciones_alumno ON calificaciones(alumno_id);
CREATE INDEX idx_calificaciones_curso ON calificaciones(curso_id, periodo_academico_id);
CREATE INDEX idx_asistencias_alumno ON asistencias(alumno_id, fecha);
CREATE INDEX idx_documentos_categoria ON documentos(categoria, subcategoria);
CREATE INDEX idx_alertas_estado ON alertas_academicas(estado, tipo_riesgo);
CREATE INDEX idx_registro_actividades_usuario ON registro_actividades(usuario_id, created_at);
