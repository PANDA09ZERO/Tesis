# Corrección integral: implementación e informe por capítulos

Fecha: 14 de octubre de 2026. Proyecto: `C:\xampp\htdocs\Tesis`.

Se aplicaron las correcciones autorizadas del [prompt integral](prompt-correccion-integral.md). Se preservaron los cambios anteriores de profesores, estudiantes, matrículas y pagos. Las decisiones institucionales pendientes se documentan como propuestas; no se incorporaron transiciones de evaluación ni fórmulas de conversión nuevas.

## 1. Diagnóstico y alcance

Se inspeccionaron controladores, rutas, middleware, frontend, pruebas, migraciones y la estructura instalada de MySQL. Se verificaron columnas, índices y relaciones con `SHOW CREATE TABLE`, sin consultar ni copiar información personal para los fixtures. La base real tiene un periodo activo; esta revisión no modificó filas de esa base.

Fuentes de información conservadas:

- Identidad: usuario vigente de `usuarios` y `roles`, comprobado después de validar el JWT.
- Grado y periodo académicos: oferta `periodo_grado_cursos` y matrícula correspondiente. Los campos del perfil de alumno se mantienen como compatibilidad, pero no definen los reportes históricos.
- Calificaciones: cada fila de `calificaciones`, con su evaluación y máximo originales cuando existen.
- Asistencia: oferta del registro; para datos antiguos, matrícula, curso y fechas solamente cuando el periodo y grado son inequívocos.
- Vínculo familiar: `apoderados` y `apoderado_alumno`.
- Pagos: `pagos_matricula`, `mensualidades` y `sueldos`, conservando su separación y permisos.

### Hallazgos y acciones

| Hallazgo | Evidencia y consecuencia | Acción y validación |
|---|---|---|
| Error confirmado: desactivar periodos antes de guardar | `periodos.controller.ts`: un fallo posterior podía dejar todos inactivos; actualizar un ID inexistente devolvía éxito | Transacción y bloqueo compartido por base. Pruebas de rollback, inexistencia y concurrencia |
| Error confirmado: grado del perfil usado para historial | `reportes.controller.ts`, `dashboard.controller.ts` y consultas de matrícula: cambiar el perfil alteraba la clasificación de notas anteriores | Oferta/matrícula y subconsultas de cardinalidad controlada; alumno sin grado personal, cambio de grado y varias matrículas probados |
| Error confirmado: mezcla de escalas y conteos | Reportes y resúmenes antiguos promediaban todas las notas, aplicaban 11 universalmente y llamaban días a registros | Agrupación por periodo, grado, curso y escala; notas/evaluaciones/alumnos separados; días únicos y registros separados |
| Error confirmado: JWT aceptado sin comprobar cuenta vigente | `middleware/auth.ts`: una cuenta desactivada o con rol cambiado conservaba acceso con su token | Consulta vigente, revocación por credencial, respuestas 401/403/503 y pruebas de cambios posteriores al login |
| Error confirmado: caché de sesión sin verificar | `AuthContext.tsx`: `JSON.parse` sin protección y usuario almacenado concediendo acceso | La caché no autoriza; verificación inicial con backend y estado recuperable ante error temporal. Cinco pruebas del contexto real |
| Error confirmado: conexión de matrícula fuera del manejo de errores | `matriculas.controller.ts`: un fallo de adquisición escapaba al controlador | Adquisición protegida, rollback en salida fallida y liberación/destrucción segura. Fallo intermedio y lote concurrente probados |
| Error confirmado: validar curso por su grado de catálogo | Matrícula de un curso compartido podía rechazarse aun perteneciendo a la oferta correcta | Validación de la terna periodo/grado/curso en `periodo_grado_cursos` |
| Error confirmado: cancelar un curso retiraba al alumno | `updateMatricula`: no comprobaba otras matrículas activas | Retirada solo cuando no queda otra inscripción activa; conservar notas e historial |
| Error confirmado: apoderado sin perfil/cambio de contraseña | Filtro general no permitía `PUT /auth/change-password`; no había enlace personal | Perfil reutilizado, contraseña propia y permiso específico, manteniendo las otras escrituras bloqueadas |
| Error confirmado: pago de matrícula expuesto en detalle familiar | Helper de matrículas añadía pago a toda cuenta distinta de profesor | Se excluye consulta y salida financiera para apoderado; prueba de ausencia de campo `pago` |
| Riesgo pendiente: vistas antiguas comparan escalas con umbral fijo | Archivos antiguos `CalificacionesPage.tsx`/`CursoDetailPage.tsx` conservan comparaciones fijas | Requiere política de escala y revisión del uso de esas pantallas. La predicción con IA fue retirada por decisión posterior del usuario |
| Mejora pendiente: publicación/cierre/auditoría | No hay rutas de publicación, cierre o reapertura de evaluación, ni auditoría académica/financiera general | Propuestas de capítulos 7 y 8, sujetas a confirmación |

## 2. Periodos académicos

Regla confirmada por el usuario: **como máximo un periodo activo**. Se conserva la posibilidad existente de no tener ninguno activo; no se inventó una obligación de mantener exactamente uno.

Creación, actualización y eliminación comparten un bloqueo MySQL `GET_LOCK` por base y una transacción. Se comprueba existencia antes de desactivar otros periodos. Un fallo revierte la operación completa. El bloqueo se libera antes de devolver la conexión; si la conexión no puede revertirse o liberar el bloqueo, se destruye.

Se valida ID entero positivo, nombre no vacío de hasta 100 caracteres, fechas reales `YYYY-MM-DD`, orden inicio/fin y activo booleano o 0/1. Las actualizaciones parciales se validan contra los valores guardados. Se devuelven 400 para datos inválidos, 404 para inexistencia y 409 para conflicto o registros vinculados.

La eliminación comprueba las tablas instaladas con `periodo_academico_id`, incluidas configuraciones, matrículas, pagos e historial. No permite que un borrado en cascada elimine información vinculada. No se borraron ni desactivaron periodos reales.

El formulario conserva los datos cuando falla, impide envíos repetidos, informa errores de carga y permite reintentar.

## 3. Reportes y consultas académicas

El reporte de rendimiento separa **periodo, grado, curso y máximo de evaluación**. El dashboard utiliza la misma normalización, restringida al periodo activo. Los resúmenes por alumno y curso también se separan, sin multiplicar notas al unir matrículas.

Se distinguen `total_alumnos`, `total_evaluaciones` vinculadas y `total_notas`. Las notas sin evaluación continúan disponibles y se identifican como históricas sin escala. Sus mínimos/máximos originales se conservan; su promedio comparable se devuelve como `null`. No se convirtieron notas ni se calculó una nota final.

Los indicadores de aprobación/desaprobación de estos reportes devuelven `null` hasta definir umbral y escala institucional. La interfaz explica esta ausencia; no presenta cero como si nadie hubiera aprobado.

La asistencia distingue días únicos de registros de clase. El porcentaje conserva la fórmula existente: presentes / registros, sin sumar tardanzas o justificadas como presentes. Los filtros de fecha, grado y periodo se validan y aplican en backend. La asistencia antigua con periodos/grados superpuestos permanece sin clasificación en la consulta general; no aparece en un periodo concreto por suposición.

El detalle del alumno muestra notas originales con periodo y escala en una tabla, y días/registros de asistencia separados. Cuando se elige un periodo, el filtro afecta notas, asistencia y matrículas. Sin filtro, el resumen de asistencia indica expresamente el año actual y todos sus periodos.

**Pendiente institucional:** escala común, conversión, umbrales por escala y ponderaciones. La predicción con IA fue retirada por decisión posterior del usuario; ya no forma parte de las mejoras pendientes.

## 4. Autenticación y sesiones

Regla confirmada por el usuario: **cambiar contraseña cierra todas las sesiones de esa cuenta**, incluida la actual.

El JWT incorpora una huella HMAC de la credencial almacenada. El middleware verifica firma/expiración, estructura, existencia del usuario, activo=1, rol vigente y huella. Cambiar el hash, desactivar la cuenta, eliminarla o cambiar su rol invalida las solicitudes posteriores. Una contraseña cambiada concurrentemente no se sobrescribe ni mediante el rehash de un login antiguo: la actualización exige que el hash todavía sea el comprobado.

No se añadió columna ni tabla. Al cargar este backend, los tokens antiguos sin huella deben iniciar sesión otra vez. La huella no contiene ni expone el hash de contraseña. Se conserva el mínimo existente de seis caracteres y se aplica el límite técnico de bcrypt de 72 bytes para nuevas contraseñas.

- 400: datos de formulario inválidos.
- 401: credenciales o sesión inválidas.
- 403: usuario autenticado sin permiso para la operación.
- 429: demasiados intentos de login, con `Retry-After`.
- 503: no se pudo comprobar la cuenta por un fallo de base de datos.

El login limita por IP y combinación IP/cuenta normalizada, sin guardar email en sus claves de control ni registrar contraseñas/tokens. Valores predeterminados configurables por entorno:

| Variable | Predeterminado | Uso |
|---|---:|---|
| `LOGIN_WINDOW_MS` | 900000 | Ventana de 15 minutos |
| `LOGIN_ACCOUNT_LIMIT` | 20 | Intentos por combinación IP/cuenta |
| `LOGIN_IP_LIMIT` | 100 | Intentos totales por IP |

El límite cuenta solicitudes de login, incluidas exitosas. Usa memoria por proceso, caduca entradas y limita su número. En varias instancias, el contador no es compartido: un almacén común requeriría una mejora de infraestructura. No se habilitó confianza general en cabeceras de proxy; debe configurarse únicamente si la instalación dispone de un proxy conocido.

El frontend obtiene el perfil al iniciar antes de autorizar vistas. Descarta la caché de usuario incluso cuando contiene JSON corrupto. Ante 401 cierra sesión; ante un fallo temporal conserva el token y muestra reintento/cierre. Descarta respuestas tardías tras logout y evita que una solicitud antigua cierre una sesión nueva con otro token. Un cambio de contraseña exitoso limpia la sesión local y las otras pestañas reciben el cambio de almacenamiento.

## 5. Matrículas

La conexión se adquiere dentro del bloque protegido. Cada lote usa transacción y bloqueo del alumno, con rollback en cualquier salida fallida. Una segunda escritura fallida no deja el primer curso ni cambia el estado del alumno. Si falla el rollback se destruye la conexión sin ocultar el error original.

Se validan IDs, tipos de observaciones/selección automática, existencia de alumno/periodo/grado/curso y oferta exacta. Los cursos compartidos se validan por oferta, no por su grado del catálogo. La selección automática conserva todos los cursos configurados para ese grado y periodo. Se mantiene la inscripción existente sin curso cuando el modelo/formulario la permite; no se impuso una regla nueva sobre grados sin cursos configurados.

Se conservan la protección de duplicados, la reactivación de inscripción del mismo grado y las respuestas 409. No se reasigna por reactivación una inscripción de otro grado. Cambiar grado/curso de una matrícula con historial académico se rechaza para no reclasificarlo. Una matrícula cancelada permanece en la base; cancelar un solo curso no retira al alumno si tiene otras inscripciones activas.

Actualización y eliminación de un ID inexistente devuelven 404. La operación académica no crea ni paga conceptos financieros. Las reglas financieras previamente implementadas permanecen intactas.

## 6. Perspectiva del apoderado

Se añadió `/familia/perfil`, reutilizando el perfil/formulario existente con `GET /api/auth/profile` y `PUT /api/auth/change-password`. Los datos personales/institucionales son de consulta; las correcciones se solicitan a administración.

El filtro general permite exclusivamente el cambio de contraseña propio además de las lecturas y envío de formularios existentes. No abre escrituras de usuarios, notas, asistencia, matrículas o pagos. Los alumnos se obtienen por vínculo y cada consulta directa conserva la comprobación en el servidor.

Los grados del listado familiar proceden de matrículas activas del periodo vigente. Los errores de carga se muestran con reintento, sin convertirse en “sin alumnos”. El detalle académico familiar excluye campos financieros, aunque exista un pago de matrícula.

Se probaron dos apoderados con alumnos diferentes, un apoderado con varios alumnos, otro sin vínculos, acceso por ID ajeno, formularios/documentos propios, contraseña y rutas administrativas/financieras bloqueadas.

## 7. Evaluaciones: diagnóstico y propuesta pendiente

La tabla `evaluaciones` distingue `activa`/`cerrada`, pero **no tiene estado de publicación**. Las rutas existentes son creación y consulta por oferta. El backend bloquea notas sobre evaluaciones cerradas y escritura de profesores en periodos históricos. El estudiante consulta sus notas registradas según el comportamiento vigente.

No hay endpoints implementados para cerrar, reabrir, publicar o actualizar la definición de una evaluación. Tener un estado en la tabla no equivale a disponer de un flujo autorizado para modificarlo.

Propuesta para confirmar antes de implementar:

| Decisión | Propuesta para analizar | Confirmación necesaria |
|---|---|---|
| Publicación | Estado separado del cierre; ocultar notas a estudiantes/apoderados solo cuando se autorice esta política | Quién publica y cuándo se hace visible |
| Cierre | Comprobar oferta, periodo y estado; rechazar nuevas notas al cerrar | Quién puede cerrar y requisitos |
| Reapertura | Acción explícita, motivo y trazabilidad | Qué rol puede reabrir y si procede en históricos |
| Cambio de escala | Preferible bloquearlo cuando existen notas, hasta definir una operación revisable | Si se permite y cómo tratar valores existentes |
| Cambio de fecha/nombre/tipo | Preservar notas y registrar cambios necesarios | Campos editables y restricciones |
| Roles | Mantener alcance de profesor y administración; no ampliar permisos históricos | Permisos concretos de cada transición |

No se añadió una fórmula, ponderación, estado o transición sin confirmar estas reglas.

## 8. Auditoría: diagnóstico y propuesta pendiente

Existe `registro_actividades` con actor, acción, entidad, ID de entidad, JSON de detalles y fecha. El login escribe allí; el dashboard muestra actividad de administración y actividad propia del profesor. `documentos_historial` ya registra operaciones documentales. No se creó otra tabla.

Propuesta: un helper que reciba la misma conexión de la transacción, el actor autenticado, acción, entidad, ID y únicamente campos anteriores/nuevos necesarios. Aplicarlo a matrícula/cancelación, pagos, notas, asistencia, activación de periodos y cambios de rol/estado. Excluir contraseñas, hashes, tokens, archivos completos y datos personales innecesarios.

Pendiente de confirmación:

1. Tiempo de conservación y procedimiento de eliminación/archivo.
2. Roles que consultan auditoría global y si habrá vista de actividad propia.
3. Si un fallo de auditoría revierte la operación principal o se acepta con reintento/cola. Una escritura obligatoria en la misma transacción ofrece consistencia, pero esta política necesita autorización.
4. Campos anteriores/nuevos y motivos obligatorios por operación.

## 9. Validación

Resultado: **91 casos individuales aprobados**, sin fallos ni pruebas omitidas. Los cuatro contenedores de pruebas HTTP hacen que Node contabilice 95 pruebas en total.

| Suite | Casos individuales |
|---|---:|
| Profesores: unitarias + HTTP/MySQL | 7 + 17 |
| Estudiantes: unitarias + HTTP/MySQL | 4 + 11 |
| Pagos: unitarias + HTTP/MySQL | 10 + 14 |
| Integral: unitarias + HTTP/MySQL | 9 + 14 |
| Sesión frontend | 5 |

Las pruebas HTTP crean exclusivamente bases temporales con nombres verificados y datos sintéticos; clonan estructura sin copiar filas reales y eliminan sus bases al finalizar. Las pruebas integrales simulan un fallo de escritura con un trigger únicamente dentro de su base temporal. La persistencia se comprueba con una conexión independiente. Las pruebas del frontend ejecutan el contexto real transpilado con un entorno controlado de hooks/almacenamiento/API; no sustituyen una prueba visual de navegador.

### Comandos ejecutados

Desde la raíz:

```powershell
npm.cmd --prefix backend run build
```

Desde `backend`, cada archivo en un proceso independiente:

```powershell
node tests/profesores.test.cjs
node tests/profesores.integration.test.cjs
node tests/estudiantes.test.cjs
node tests/estudiantes.integration.test.cjs
node tests/payments.test.cjs
node tests/payments.integration.test.cjs
node tests/integral.test.cjs
node tests/integral.integration.test.cjs
```

Desde `frontend`:

```powershell
npm.cmd run test:session
npm.cmd run build
```

En este entorno Windows, la compilación frontend se ejecutó con `NODE_OPTIONS` apuntando al shim local `work/realpath-compat.cjs` del espacio de trabajo, que utiliza `fs.realpathSync` en lugar de `fs.realpathSync.native`. El proyecto no se modificó para introducir ese ajuste del entorno.

Ambos proyectos compilan. Vite advierte que el archivo principal es mayor de 500 kB: aproximadamente 945 kB sin comprimir y 255 kB gzip. No se cambió el empaquetado fuera de este alcance. `git diff --check` pasó; aparecieron avisos de conversión LF/CRLF sobre cambios existentes.

También quedó disponible `npm.cmd run test:integral` en backend. Requiere el esquema ya instalado, igual que las suites HTTP anteriores.

### Navegador y límite del entorno

Se iniciaron versiones auxiliares con datos sintéticos mediante `node scripts/serve-integral-fixture.cjs` y Vite en el puerto 5181, apuntando al backend temporal en 4011. La herramienta de navegador devolvió `net::ERR_CONNECTION_TIMED_OUT` tanto con `localhost` como con `127.0.0.1`; tampoco fue posible conectarlos desde otra ejecución del entorno.

**No se aprobaron visualmente login/navegación móvil/formularios desde navegador.** Los flujos de backend se verificaron por HTTP y MySQL, y la sesión frontend mediante sus cinco pruebas. Se proporciona el script de fixture para repetir la comprobación visual en una terminal local accesible; utiliza exclusivamente una base `integral_test_*`. Sus cuentas `user1@test.local`, `user2@test.local`, `user11@test.local` y `user21@test.local` representan administrador, profesor, alumno y apoderado, con contraseña sintética `originalTest`.

La política del entorno rechazó enviar entrada para detener las dos instancias auxiliares (`sandbox_approval` deshabilitada) y el intento de señal al proceso temporal devolvió `EPERM`. La base temporal de esa prueba se eliminó expresamente y se verificó que no queda ninguna `integral_test_*`. No se confirmó la detención de esas instancias; cerrar sus terminales de prueba o verificar los procesos de los puertos 4011/5181 desde PowerShell local. El proceso conocido del fixture fue PID 19108. No detener procesos del proyecto principal por aproximación.

## 10. Entrega

| Capítulo | Problema | Solución | Estado | Validación | Confirmación pendiente |
|---|---|---|---|---|---|
| 1 | Fuentes y esquema no comprobados | Inspección de código, estructura real e índices | Verificado sin cambios en datos reales | Estructura instalada y suites existentes | Ninguna |
| 2 | Activación parcial/concurrente | Transacción, bloqueo, validaciones y protección de vínculos | Corregido | Rollback, 404, fechas, concurrencia y borrado protegido | Regla de máximo un activo confirmada |
| 3 | Perfil usado como historial; escalas y días mezclados | Oferta/matrícula, resúmenes separados y días únicos | Corregido en reportes/consultas descritos; propuesta pendiente de escalas | Grado histórico, perfil sin grado, varias matrículas, escalas 10/20 y legado | Conversión, umbrales y ponderación |
| 4 | Cuenta vigente/sesión no verificadas | DB vigente, huella de credencial, límite de login y verificación frontend | Corregido | JWT, cuentas, revocación, 429, 503 y caché | Cierre de todas las sesiones confirmado |
| 5 | Conexión/lote/cancelación inconsistentes | Transacción protegida, oferta exacta y estados coherentes | Corregido | Fallo de adquisición/escritura/rollback, duplicados, persistencia | Ninguna para correcciones; se conserva grado sin cursos según comportamiento existente |
| 6 | Perfil y contraseña familiar ausentes; exposición de pago | Reutilización de perfil, permiso específico y exclusión financiera | Corregido | Vínculos, IDs ajenos, documentos/formularios y contraseña | Ninguna |
| 7 | Cierre/publicación no definidos como flujo | Diagnóstico y propuesta separada | Propuesta pendiente | Inspección de tabla, rutas y restricciones actuales | Publicar, cerrar, reabrir, cambiar escala |
| 8 | Auditoría académica/financiera general ausente | Propuesta reutilizando tablas existentes | Propuesta pendiente | Inspección de escritores y lectores actuales | Conservación, acceso y fallo de auditoría |
| 9 | Regresiones y validación visual | 91 casos, builds y fixture sintético | Automatización verificada; navegador bloqueado por limitación identificada | Todos los casos y compilaciones pasan | Prueba visual local pendiente |
| 10 | Entrega sin trazabilidad de alcance | Este informe y referencias de uso | Corregido | Documentación por capítulo y archivos | Ninguna |

### Archivos de esta implementación

| Archivos | Propósito |
|---|---|
| `backend/src/controllers/periodos.controller.ts` | Transacciones, validación, concurrencia y borrado protegido |
| `backend/src/utils/academicValidation.ts` | Validación compartida de IDs y fechas |
| `backend/src/controllers/reportes.controller.ts`, `dashboard.controller.ts`, `calificaciones.controller.ts` | Reportes y resúmenes según matrícula/oferta y escala |
| `backend/src/utils/reporteAcademico.ts` | Consultas comunes sin duplicación de filas e identificación del legado |
| `backend/src/controllers/matriculas.controller.ts` | Manejo de conexión, consistencia de oferta/estado/historial y 404 |
| `backend/src/controllers/alumnos.controller.ts`, `backend/src/utils/matriculasAlumno.ts` | Detalle académico, filtro de periodo, escala, días únicos y exclusión financiera familiar |
| `backend/src/controllers/apoderados.controller.ts` | Grado familiar obtenido de matrícula vigente |
| `backend/src/middleware/auth.ts`, `backend/src/utils/session.ts` | Usuario/rol vigente y revocación por contraseña |
| `backend/src/controllers/auth.controller.ts`, `backend/src/routes/auth.routes.ts`, `backend/src/middleware/loginLimit.ts` | Login validado y limitado; contraseña propia y concurrencia |
| `backend/src/app.ts`, `backend/src/middleware/apoderado.ts` | Restricción familiar reutilizable y contraseña específicamente permitida |
| `frontend/src/context/AuthContext.tsx`, `frontend/src/api/client.ts` | Verificación de sesión, errores recuperables, revocación local y respuestas tardías |
| `frontend/src/App.tsx`, `frontend/src/components/layout/Sidebar.tsx`, `frontend/src/pages/teachers/ProfesorPerfilPage.tsx` | Ruta y perfil personal familiar reutilizado |
| `frontend/src/pages/guardian/FamilyStudentsPage.tsx` | Errores visibles y reintento del listado familiar |
| `frontend/src/pages/students/EstudiantePage.tsx`, `AlumnoDetailPage.tsx` | Sesión tras contraseña y notas/asistencia con contexto claro |
| `frontend/src/pages/academics/PeriodosPage.tsx` | Validación, carga y bloqueo de envíos repetidos |
| `frontend/src/pages/reports/ReportesPage.tsx`, `frontend/src/pages/dashboard/DashboardPage.tsx` | Tablas y resúmenes sin comparar escalas incompatibles |
| `backend/tests/integral.test.cjs`, `integral.integration.test.cjs` | Nuevas reglas, errores, concurrencia y persistencia |
| Suites HTTP existentes de profesores, estudiantes y pagos | Fixtures/tokens actualizados al contrato de sesión; regresiones conservadas |
| `frontend/tests/session.test.cjs` | Casos reales del contexto de autenticación |
| `backend/scripts/serve-integral-fixture.cjs` | Entorno manual de prueba con esquema real y datos sintéticos |
| `backend/package.json`, `frontend/package.json` | Comandos de validación integral y sesión |
| `docs/correccion-integral.md`, documentación de alumnos/profesores, `README.md` | Uso, reglas, validación y decisiones pendientes |

No se añadieron migraciones ni se cambiaron tablas instaladas en esta revisión. No se borraron ni reclasificaron datos históricos reales, no se reentrenó IA y no se desplegaron/reiniciaron los servicios principales. Para utilizar el cambio, cargar el backend/frontend con sus comandos habituales y realizar un nuevo login con los tokens del formato actualizado.


## Decisión posterior: retirar predicción con IA

El usuario confirmó que la predicción con IA no formaba parte del alcance previsto. Se retiraron la pantalla, APIs de predicción/entrenamiento, proxy y servicio Python. No se eliminan las alertas académicas históricas ni su consulta/atención. Consulta [el informe de retiro](retiro-prediccion-ia.md).
