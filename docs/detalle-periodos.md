# Detalle e historial de periodos

Desde Periodos, cada tarjeta ofrece **Ver detalle**. La ruta `/periodos/:id` admite administración y profesores, con comprobación de acceso también en el servidor. No se cambiaron reglas académicas, fechas, matrículas ni registros financieros de la base instalada.

## Información disponible

- Resumen de grados configurados, cursos distintos, ofertas, profesores asignados, alumnos con matrícula activa, inscripciones y bloques de horario.
- Estructura por grado y curso con sus docentes. La administración puede abrir la configuración existente con el periodo ya seleccionado.
- Administración consulta las inscripciones de curso de todos los estados, paginadas. Un alumno puede tener varias filas; el contador de alumnos activos lo cuenta una sola vez.
- Profesores consultan sus alumnos a través de las ofertas asignadas y los detalles existentes de cada curso. No se les concede acceso al listado administrativo de matrículas.
- Horarios del periodo; el profesor solo ve sesiones propias respaldadas por su asignación.
- Enlaces a los libros de calificaciones y al historial de asistencia de cada oferta exacta. Los profesores conservan el bloqueo de escritura en históricos.
- Administración consulta pagos de matrícula y mensualidades en secciones distintas, con importes registrados, pagados y pendientes/vencidos separados. Las consultas usan exclusivamente el ID del periodo; las mensualidades muestran mes y año, sin imponer el año actual a un histórico.

Los profesores no reciben información financiera ni controles administrativos. Estudiantes y apoderados mantienen sus portales existentes y no acceden a esta vista. Los sueldos se registran por mes/año y no se atribuyen a un periodo académico por inferencia.

Las cifras financieras representan cargos existentes. La ausencia de cargos no demuestra que un alumno haya pagado. Los estados adicionales, como descuento, conservan el tratamiento del módulo financiero existente. Los cursos, docentes y alumnos no se copian a nuevas tablas.

## Implementación

`GET /api/periodos/:id` valida el ID y la pertenencia docente al periodo. Devuelve únicamente metadatos y un resumen académico; no incluye campos financieros, correos ni teléfonos. Los contadores proceden de sus fuentes por separado para no multiplicar alumnos al combinar cursos, profesores y horarios. Un periodo sin datos devuelve sus metadatos y ceros; un periodo inexistente o ajeno al profesor devuelve 404; errores de consulta devuelven un error real.

Las secciones reutilizan las APIs existentes de estructura, ofertas, matrículas, horarios y pagos. Cada petición lleva el periodo seleccionado. La pestaña se conserva en la URL con `seccion`, también al recargar. Las respuestas antiguas se descartan al cambiar de periodo o sección. Los fallos se muestran con reintento, sin presentar resúmenes financieros de cero como respaldo de un error.

## Archivos principales

- Backend: `src/controllers/periodoDetalle.controller.ts`, `src/routes/periodos.routes.ts`.
- Frontend: `src/pages/academics/PeriodoDetailPage.tsx`, `PeriodosPage.tsx`, `src/api/endpoints.ts`, `src/types/index.ts`, `src/App.tsx`, `src/components/layout/Sidebar.tsx`.
- Pruebas: `backend/tests/profesores.integration.test.cjs`, `backend/tests/periodo-vigencia.test.cjs`, `frontend/tests/e2e/periodo-detalle.spec.ts`.

## Validación

```powershell
# backend
npm run build
node --test tests/periodo-vigencia.test.cjs tests/profesores.integration.test.cjs
npm run test:all
# frontend
npm run build
npm run test:e2e -- periodo-detalle.spec.ts
npm run test:e2e
```

Las pruebas utilizan bases temporales y datos sintéticos. Cubren periodos históricos y vacíos, alumno inscrito en varios cursos sin duplicar el total, IDs inválidos, periodos ajenos, errores recuperables, separación financiera, navegación y recarga en escritorio y móvil.

Resultado: backend y frontend compilaron; suite completa del backend correcta y 40 pruebas de navegador correctas entre escritorio y móvil. Capturas revisadas en ambos tamaños.
