# Sistema de Gestión Educativa

Sistema web para gestión académica y documental.

## Arquitectura

```
sis-gestion-educativa/
├── backend/          # Node.js + Express + TypeScript
├── frontend/         # React + TypeScript + Vite + Tailwind CSS
└── database/         # Schema SQL y datos de prueba
```

## Requisitos Previos

- [Node.js](https://nodejs.org/) 24 LTS (con npm; misma versión mayor en CI y alojamiento)
- [XAMPP](https://www.apachefriends.org/) (MySQL)
- Git

## Instalación

### 1. Base de datos y configuración

Crear una base MySQL vacía y configurar las variables de `backend/.env.example` en una copia local `.env` ignorada. Generar un JWT aleatorio local; no reutilizarlo en producción. Node lee la configuración raíz y luego backend solo en desarrollo; las variables de proceso tienen prioridad.

### 2. Backend

```bash
cd backend
npm ci --include=dev
npm run build
npm run db:install -- --empty-database-confirmed
# Proporcionar ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_EMAIL y ADMIN_PASSWORD
# como variables privadas de sesión para el primer administrador.
npm run admin:bootstrap
npm run dev
```

El instalador rechaza tablas existentes. Para una base ya instalada, seguir [la guía de migraciones](database/migrations/README.md); no importar todos los scripts ni reinstalar sobre datos. El backend de producción arranca con `npm start` después de compilar, utilizando `dist/server.js`.

Los seeds son opcionales y exclusivos de una base de desarrollo desechable. Requieren `ENABLE_DEMO_SEED=true` explícito; se bloquean en producción. No importar `database/seed.sql` ni ejecutar seeds en una base institucional.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

La aplicación se iniciará en http://localhost:5173. Vite también mostrará en la terminal una dirección `Network` (por ejemplo, `http://192.168.1.10:5173`); abre esa dirección desde el teléfono conectado a la misma red Wi-Fi. Si no carga, permite Node.js o el puerto 5173 en el Firewall de Windows para redes privadas.

### Orden de inicio recomendado

MySQL → backend (`npm run dev`) → frontend (`npm run dev`). El frontend utiliza el proxy local solo en desarrollo. En Vercel requiere `VITE_API_BASE_URL` HTTPS con sufijo `/api` y el CORS exacto correspondiente en el backend.

## Preparación para producción

Consultar [la guía operativa](docs/operacion-produccion.md), [el estado y evidencias](docs/estado-produccion.md) y [el plan por fases](docs/plan-produccion-vercel.md). La configuración está preparada para frontend Vercel y backend/MySQL/volumen privado en Railway. Todavía no se ha publicado ni se certifica aptitud para datos reales: faltan cuentas/infraestructura, revisión de credenciales heredadas, política institucional y aceptación en preproducción.

Las altas requieren contraseña explícita, sin `123456` de respaldo. El login no muestra credenciales demo. Archivar documentos conserva archivo e historial; no hay purga programada. En producción el borrado definitivo de matrícula está suspendido mientras se define la política; se puede cancelar la inscripción.

```bash
# Backend (MySQL y clientes mysql/mysqldump compatibles disponibles)
npm run test:all
npm run production:check
# Frontend
npm run build
npm run test:session
npx playwright install --no-shell chromium
npm run test:e2e
```

Las pruebas crean y eliminan exclusivamente bases temporales sintéticas. Nunca ejecutarlas con credenciales de producción. Los usuarios/contraseñas de fixtures están limitados a esas bases; no son cuentas publicables.

## Módulos del Sistema

### Gestión de Alumnos
- Registro de datos personales y apoderados
- Matrícula y asignación de grado
- Historial académico y expediente

### Gestión de Profesores
- Registro y especialización
- Asignación de cursos
- Horarios y alumnos asignados

### Gestión Académica
- Cursos y grados
- Periodos académicos
- Calificaciones (registro individual y masivo)
- Asistencia (registro diario y masivo)
- Horarios semanales por curso y grado

### Gestión Documental
- Carga de archivos PDF e imágenes
- Clasificación por categoría
- Control de documentos obligatorios
- Historial de modificaciones

### Usuarios y Seguridad
- 4 roles: Administrador, Profesor, Alumno, Apoderado
- Autenticación JWT
- Apoderados con acceso de solo lectura a sus alumnos vinculados
- Administración y desactivación de profesores reservada al administrador
- Registro de actividades

Los esquemas nuevos no crean tablas ni campos de secciones. Las bases existentes conservan esos datos históricos; no se muestran ni se usan en los flujos actuales.

### Dashboard y Reportes
- Estadísticas generales en tiempo real
- Gráficos de rendimiento por grado
- Tendencia de asistencia
- Alertas académicas activas
- Reportes exportables

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

## Cuenta de estudiante

La cuenta de alumno dispone de un panel personal con perfil, cursos de su matrícula, notas, asistencia, horarios, calendario y pagos separados por concepto. El acceso se limita en el servidor a sus propios datos; los pagos y registros académicos son de consulta. Consulta [la documentación de estudiantes](docs/estudiantes.md) para las rutas, pruebas y reglas pendientes de definición.

## Cuenta de profesor

El profesor dispone de un panel con periodos propios, grupos, horarios, próximas evaluaciones y avisos personales, además de su perfil de consulta y cambio de contraseña. Mis cursos utiliza las ofertas asignadas; los periodos históricos siguen siendo de solo consulta. Consulta [la documentación de profesores](docs/profesores.md).

## Superadministración

La supercuenta se aprovisiona por consola privada mediante `npm run superadmin:bootstrap` desde backend. No aparece en Usuarios; mantiene auditoría y dispone de Control del sistema para suspensión reversible, respaldos y recuperación aislada. No se crea ninguna credencial predeterminada. Consulta [configuración y recuperación de acceso](docs/superadministracion.md) antes de utilizar las operaciones con datos institucionales.


## Corrección integral y cuenta de apoderado

Los periodos se guardan mediante transacción y permiten como máximo uno activo. Los reportes utilizan oferta/matrícula y separan escalas, periodos, días y registros. La autenticación verifica la cuenta vigente; cambiar contraseña cierra todas las sesiones. El apoderado dispone de Mi perfil y contraseña propia, manteniendo su acceso a alumnos vinculados sin información financiera. Consulta [el informe por capítulos](docs/correccion-integral.md) para la validación, los archivos y las propuestas pendientes de evaluaciones/auditoría. No se requiere una migración nueva para esta revisión.

## Alcance sin predicción con IA

El módulo de predicción y el servicio Python se retiraron del proyecto. La gestión académica, los reportes y la consulta/atención de alertas existentes siguen disponibles. No se generan alertas nuevas mediante IA. Consulta [el retiro del módulo](docs/retiro-prediccion-ia.md) para los cambios y la validación.

## Asignaciones académicas

Estructura académica es la fuente de la relación periodo/grado/curso/docente. Profesores consulta esas asignaciones; Horarios las reutiliza y completa al docente cuando hay uno solo. Las relaciones manuales antiguas requieren revisión y no otorgan permisos generales. Consulta [flujo, diagnóstico y protección del historial](docs/asignaciones-academicas.md).

La [revisión de calificaciones y asistencia](docs/revision-calificaciones-asistencia.md) describe las correcciones del 23/10/2026, sus pruebas y los datos heredados que necesitan revisión institucional.

La [vigencia de periodos académicos](docs/periodos-vigencia.md) se sincroniza por fecha de Lima y protege la consulta histórica de profesores.

El [detalle de periodos](docs/detalle-periodos.md) reúne estructura, matrículas, horarios, libros académicos e historial de pagos, según el rol y el periodo seleccionado.


## Dashboard móvil

El inicio administrativo dispone de una vista móvil con indicadores del periodo, accesos y actividad, además de navegación por rol y tema oscuro opcional. El escritorio conserva su distribución. Consulta [alcance y prueba desde el teléfono](docs/dashboard-mobile.md).


La sección [Alumnos](docs/alumnos-interfaz.md) dispone de tarjetas móviles, consulta por secciones y formularios con contraste oscuro, conservando su tabla de escritorio y permisos.


El catálogo de [Módulos](docs/modulos-interfaz.md) reúne los accesos de cada rol con tarjetas y búsqueda, reutilizando el inventario del menú lateral.


El [Perfil personal](docs/perfil-interfaz.md) comparte diseño entre roles, con datos de consulta, seguridad y navegación adaptable; la administración dispone de una página propia en `/perfil`.

La interfaz de [Horarios](docs/horarios-interfaz.md) comparte tarjetas semanales, búsqueda y selección por día entre administración, profesores y alumnos, conservando el alcance de cada cuenta.

Los directorios de [Profesores y Apoderados](docs/profesores-apoderados-interfaz.md) tienen tarjetas móviles, formularios adaptables y gestión de vínculos con las operaciones existentes.

La [interfaz unificada](docs/interfaz-global.md) extiende el diseño adaptable y el tema oscuro neutro a todas las secciones mediante componentes y estilos compartidos.
