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
    debe_cambiar_password TINYINT(1) NOT NULL DEFAULT 0,
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
    periodo_academico_id INT,
    Estado ENUM('matriculado', 'retirado', 'egresado') DEFAULT 'matriculado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (grado_id) REFERENCES grados(id),
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
    periodo_academico_id INT NOT NULL,
    periodo_grado_curso_id INT NULL,
    dia_semana ENUM('Lunes','Martes','Miercoles','Jueves','Viernes','Sabado') NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    aula VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (profesor_id) REFERENCES profesores(id) ON DELETE CASCADE,
    FOREIGN KEY (periodo_academico_id) REFERENCES periodos_academicos(id)
);

CREATE TABLE matriculas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alumno_id INT NOT NULL,
    curso_id INT NULL,
    periodo_academico_id INT NOT NULL,
    grado_id INT NULL,
    fecha_matricula TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('activa', 'pendiente', 'cancelada', 'completada') DEFAULT 'activa',
    observaciones TEXT,
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (grado_id) REFERENCES grados(id),
    FOREIGN KEY (periodo_academico_id) REFERENCES periodos_academicos(id),
    UNIQUE KEY unique_matricula (alumno_id, curso_id, periodo_academico_id)
);

CREATE TABLE calificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alumno_id INT NOT NULL,
    curso_id INT NOT NULL,
    periodo_academico_id INT NOT NULL,
    periodo_grado_curso_id INT NULL,
    evaluacion_id INT NULL,
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
    periodo_grado_curso_id INT NULL,
    fecha DATE NOT NULL,
    estado ENUM('presente', 'ausente', 'tardanza', 'justificado') NOT NULL DEFAULT 'presente',
    minutos_tardanza INT DEFAULT 0,
    observaciones TEXT,
    registrado_por INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES cursos(id),
    FOREIGN KEY (registrado_por) REFERENCES profesores(id),
    UNIQUE KEY unique_asistencia_oferta (alumno_id, fecha, curso_id, periodo_grado_curso_id)
);

CREATE TABLE documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    archivo_url VARCHAR(500),
    tipo_archivo ENUM('pdf', 'imagen', 'documento', 'otro') NOT NULL,
    tamano_bytes BIGINT DEFAULT 0,
    categoria VARCHAR(100),
    categoria_id INT NULL,
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

CREATE TABLE documento_categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    nombre_normalizado VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL UNIQUE,
    estado ENUM('activa', 'archivada') NOT NULL DEFAULT 'activa',
    creado_por INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

ALTER TABLE documentos
    ADD KEY idx_documentos_categoria_id (categoria_id),
    ADD CONSTRAINT fk_documentos_categoria FOREIGN KEY (categoria_id)
        REFERENCES documento_categorias(id) ON DELETE SET NULL;

CREATE TABLE formularios_documentales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    categoria_id INT NULL,
    campos JSON NOT NULL,
    estado ENUM('borrador', 'publicada', 'archivada') NOT NULL DEFAULT 'borrador',
    creado_por INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_formularios_documentales_estado (estado, created_at),
    FOREIGN KEY (categoria_id) REFERENCES documento_categorias(id) ON DELETE SET NULL,
    FOREIGN KEY (creado_por) REFERENCES usuarios(id)
);

CREATE TABLE formularios_documentales_envios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    formulario_id INT NOT NULL,
    usuario_id INT NOT NULL,
    alumno_id INT NULL,
    respuestas JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_formularios_envios_usuario (usuario_id, formulario_id, created_at),
    FOREIGN KEY (formulario_id) REFERENCES formularios_documentales(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE SET NULL
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

CREATE INDEX idx_alumnos_grado ON alumnos(grado_id);
CREATE INDEX idx_calificaciones_alumno ON calificaciones(alumno_id);
CREATE INDEX idx_calificaciones_curso ON calificaciones(curso_id, periodo_academico_id);
CREATE INDEX idx_asistencias_alumno ON asistencias(alumno_id, fecha);
CREATE INDEX idx_documentos_categoria ON documentos(categoria, subcategoria);
CREATE INDEX idx_alertas_estado ON alertas_academicas(estado, tipo_riesgo);
CREATE INDEX idx_registro_actividades_usuario ON registro_actividades(usuario_id, created_at);

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

CREATE TABLE mensualidades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alumno_id INT NOT NULL,
    curso_id INT NULL,
    periodo_academico_id INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL DEFAULT 0,
    mes VARCHAR(20) NOT NULL,
    año YEAR NOT NULL,
    estado ENUM('pendiente', 'pagado', 'vencido', 'descuento') DEFAULT 'pendiente',
    fecha_pago DATE,
    metodo_pago VARCHAR(50),
    observaciones TEXT,
    registrado_por INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_mensualidad (alumno_id, periodo_academico_id, mes, año),
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (periodo_academico_id) REFERENCES periodos_academicos(id),
    FOREIGN KEY (registrado_por) REFERENCES profesores(id)
);

CREATE TABLE sueldos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profesor_id INT NOT NULL,
    curso_id INT NULL,
    periodo_academico_id INT NULL,
    salario_base DECIMAL(10,2) NOT NULL DEFAULT 0,
    horas_clase DECIMAL(5,2) DEFAULT 0,
    monto_extra DECIMAL(10,2) DEFAULT 0,
    monto_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    mes VARCHAR(20) NOT NULL,
    año YEAR NOT NULL,
    estado ENUM('pendiente', 'pagado', 'rechazado') DEFAULT 'pendiente',
    fecha_pago DATE,
    observaciones TEXT,
    registrado_por INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_sueldo_mensual (profesor_id, mes, año),
    FOREIGN KEY (profesor_id) REFERENCES profesores(id) ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (periodo_academico_id) REFERENCES periodos_academicos(id),
    FOREIGN KEY (registrado_por) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS notificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo ENUM('info', 'warning', 'success', 'error', 'alerta') DEFAULT 'info',
    usuario_id INT,
    link VARCHAR(500),
    prioridad ENUM('baja', 'normal', 'alta', 'urgente') DEFAULT 'normal',
    leida TINYINT(1) DEFAULT 0,
    fecha_leida TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_leida (leida),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Estructura académica configurable:
-- Periodo académico -> Nivel -> Grado -> Curso -> Profesor
-- (el Nivel se toma de grados.nivel: Inicial, Primaria, Secundaria)
-- ============================================================

-- Grados habilitados en cada periodo académico
CREATE TABLE periodo_grados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    periodo_academico_id INT NOT NULL,
    grado_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_periodo_grado (periodo_academico_id, grado_id),
    FOREIGN KEY (periodo_academico_id) REFERENCES periodos_academicos(id) ON DELETE CASCADE,
    FOREIGN KEY (grado_id) REFERENCES grados(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cursos que se dictan en cada grado del periodo
CREATE TABLE periodo_grado_cursos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    periodo_academico_id INT NOT NULL,
    grado_id INT NOT NULL,
    curso_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_periodo_grado_curso (periodo_academico_id, grado_id, curso_id),
    FOREIGN KEY (periodo_academico_id) REFERENCES periodos_academicos(id) ON DELETE CASCADE,
    FOREIGN KEY (grado_id) REFERENCES grados(id) ON DELETE CASCADE,
    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE horarios
    ADD KEY idx_horarios_oferta (periodo_grado_curso_id),
    ADD CONSTRAINT fk_horarios_oferta FOREIGN KEY (periodo_grado_curso_id)
        REFERENCES periodo_grado_cursos(id) ON DELETE SET NULL;

-- Profesores asignados a cada (periodo, grado, curso). Permite varios profesores por curso
CREATE TABLE periodo_grado_curso_profesores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    periodo_grado_curso_id INT NOT NULL,
    profesor_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_pgcp (periodo_grado_curso_id, profesor_id),
    FOREIGN KEY (periodo_grado_curso_id) REFERENCES periodo_grado_cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (profesor_id) REFERENCES profesores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE evaluaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    periodo_grado_curso_id INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) NOT NULL DEFAULT 'practica',
    fecha_evaluacion DATE NOT NULL,
    nota_maxima DECIMAL(4,2) NOT NULL DEFAULT 20.00,
    estado ENUM('activa', 'cerrada') NOT NULL DEFAULT 'activa',
    creado_por_usuario_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_evaluaciones_oferta (periodo_grado_curso_id, fecha_evaluacion),
    FOREIGN KEY (periodo_grado_curso_id) REFERENCES periodo_grado_cursos(id) ON DELETE CASCADE,
    FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    CHECK (nota_maxima > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE eventos_calendario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    fecha DATE NOT NULL,
    hora_inicio TIME NULL,
    hora_fin TIME NULL,
    tipo ENUM('institucional', 'feriado', 'reunion', 'otro') DEFAULT 'institucional',
    periodo_academico_id INT NULL,
    creado_por_usuario_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (periodo_academico_id) REFERENCES periodos_academicos(id) ON DELETE SET NULL,
    FOREIGN KEY (creado_por_usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE asistencias
    ADD CONSTRAINT fk_asistencias_oferta FOREIGN KEY (periodo_grado_curso_id)
    REFERENCES periodo_grado_cursos(id) ON DELETE SET NULL;

ALTER TABLE calificaciones
    ADD KEY idx_calificaciones_oferta (periodo_grado_curso_id, alumno_id),
    ADD UNIQUE KEY unique_calificacion_evaluacion_alumno (evaluacion_id, alumno_id),
    ADD CONSTRAINT fk_calificaciones_oferta FOREIGN KEY (periodo_grado_curso_id)
        REFERENCES periodo_grado_cursos(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_calificaciones_evaluacion FOREIGN KEY (evaluacion_id)
        REFERENCES evaluaciones(id) ON DELETE SET NULL;

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

-- Incidencias de conducta (20261108)
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
