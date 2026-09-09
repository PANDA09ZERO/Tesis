# Sistema Inteligente de Gestión Educativa

Sistema web inteligente para gestión académica, documental y predicción de riesgo académico.
Basado en la propuesta de tesis: "Sistema inteligente de gestión académica y documental con predicción de riesgo académico".

## Arquitectura

```
sis-gestion-educativa/
├── backend/          # Node.js + Express + TypeScript
├── frontend/         # React + TypeScript + Vite + Tailwind CSS
├── ai-service/       # Python + Flask (Servicio de predicción IA)
└── database/         # Schema SQL y datos de prueba
```

## Requisitos Previos

- [Node.js](https://nodejs.org/) v18+ (con npm)
- [XAMPP](https://www.apachefriends.org/) (MySQL)
- [Python](https://www.python.org/) 3.8+ (para el servicio de IA)
- Git

## Instalación

### 1. Base de Datos

1. Inicia XAMPP (Apache + MySQL)
2. Abre phpMyAdmin: http://localhost/phpmyadmin
3. Importa el schema: `database/schema.sql`
4. Importa el catálogo: `database/seed.sql` (grados, secciones, periodos, cursos)

### 2. Backend

```bash
cd backend
npm install
npm run seed       # Crea usuarios + datos académicos de prueba (con hashes bcrypt válidos)
npm run dev
```

El servidor se iniciará en http://localhost:3000

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

La aplicación se iniciará en http://localhost:5173

### 4. Servicio de IA (Opcional)

```bash
cd ai-service
pip install -r requirements.txt
python app.py
```

El servicio de IA se iniciará en http://localhost:5000

### Orden de inicio recomendado

1. Iniciar MySQL (XAMPP)
2. Importar `schema.sql` y `seed.sql`
3. `cd backend && npm run seed`
4. `cd backend && npm run dev` (puerto 3000)
5. `cd frontend && npm run dev` (puerto 5173)
6. (Opcional) `cd ai-service && python app.py` (puerto 5000)

## Credenciales de Prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| Administrador | admin@escuela.edu | admin123 |
| Profesor | profesor@escuela.edu | prof123 |
| Alumno | alumno@escuela.edu | alu123 |
| Apoderado | apoderado@escuela.edu | apo123 |

## Módulos del Sistema

### Gestión de Alumnos
- Registro de datos personales y apoderados
- Matrícula y asignación de grado/sección
- Historial académico y expediente

### Gestión de Profesores
- Registro y especialización
- Asignación de cursos y secciones
- Horarios y alumnos asignados

### Gestión Académica
- Cursos, grados, secciones
- Periodos académicos
- Calificaciones (registro individual y masivo)
- Asistencia (registro diario y masivo)
- Horarios semanales

### Gestión Documental
- Carga de archivos PDF e imágenes
- Clasificación por categoría
- Control de documentos obligatorios
- Historial de modificaciones

### Usuarios y Seguridad
- 4 roles: Administrador, Profesor, Alumno, Apoderado
- Autenticación JWT
- Control de acceso por roles
- Registro de actividades

### Dashboard y Reportes
- Estadísticas generales en tiempo real
- Gráficos de rendimiento por grado
- Tendencia de asistencia
- Alertas académicas activas
- Reportes exportables

### Inteligencia Artificial
- Predicción de riesgo académico individual
- Análisis masivo de todos los estudiantes
- Modelo de Machine Learning (Gradient Boosting)
- Variables: calificaciones, inasistencias, tardanzas, tendencia
- Generación automática de alertas

## API Endpoints Principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/login | Inicio de sesión |
| GET | /api/dashboard/stats | Estadísticas del dashboard |
| GET | /api/alumnos | Listar alumnos |
| POST | /api/alumnos | Registrar alumno |
| GET | /api/profesores | Listar profesores |
| GET | /api/calificaciones/alumno/:id | Calificaciones por alumno |
| POST | /api/calificaciones | Registrar calificación |
| POST | /api/asistencias/bulk | Registro masivo de asistencia |
| POST | /api/documentos/upload | Subir documento |
| GET | /api/alertas | Listar alertas |
| POST | /api/ai/predict/:id | Predicción IA por alumno |
| POST | /api/ai/analyze-all | Análisis masivo IA |

## Tecnologías

**Frontend:**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Recharts (gráficos)
- Lucide React (iconos)
- Axios (HTTP client)
- React Router DOM

**Backend:**
- Node.js + Express
- TypeScript
- MySQL2 (driver)
- JWT (autenticación)
- Bcrypt (hashing de contraseñas)
- Multer (subida de archivos)

**IA:**
- Python + Flask
- Scikit-learn (Machine Learning)
- Pandas (manipulación de datos)
- MySQL Connector
