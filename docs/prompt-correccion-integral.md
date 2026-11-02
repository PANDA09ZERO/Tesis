# Revisión y corrección integral del sistema educativo

Trabaja sobre el proyecto `C:\xampp\htdocs\Tesis`.

Tu objetivo es analizar y corregir los problemas de periodos académicos, reportes, autenticación, matrículas y experiencia del apoderado. Después, analiza las mejoras de evaluaciones, auditoría y pruebas funcionales.

Conserva las funcionalidades y cambios existentes de alumnos, profesores, pagos y matrículas. No dupliques componentes, endpoints, tablas ni fuentes de información.

## Capítulo 1. Diagnóstico y alcance

### 1.1. Inspección previa

Antes de modificar código:

- Lee las instrucciones del repositorio y la documentación relacionada.
- Inspecciona frontend, backend, rutas, middleware, controladores, servicios, tablas, índices, relaciones y migraciones.
- Revisa las pruebas existentes de profesores, estudiantes y pagos.
- Identifica las fuentes oficiales de grado, periodo, cursos, identidad y permisos.
- Comprueba cómo se ejecutan actualmente el proyecto y sus compilaciones.

No supongas que el esquema SQL del repositorio coincide exactamente con la base instalada. Cuando tengas acceso autorizado, verifica la estructura real sin modificar datos.

### 1.2. Clasificación de hallazgos

Para cada problema, presenta:

1. Comportamiento actual.
2. Evidencia: archivo, función o consulta implicada.
3. Consecuencia para el usuario o los datos.
4. Solución propuesta.
5. Archivos y módulos afectados.
6. Pruebas necesarias.
7. Reglas de negocio que requieren confirmación.

Distingue entre errores confirmados, riesgos detectados por inspección y mejoras opcionales.

### 1.3. Restricciones generales

- No borres ni reclasifiques datos históricos por inferencia.
- No alteres reglas financieras fuera del alcance.
- Conserva los periodos históricos de solo consulta para profesores.
- Mantén matrícula financiera y mensualidades como conceptos independientes.
- No amplíes permisos por suposición.
- No marques operaciones como exitosas cuando fallen.
- No ejecutes pruebas destructivas contra la base real.
- No publiques ni despliegues cambios como parte de esta revisión.

## Capítulo 2. Periodos académicos

### 2.1. Problema que debe comprobarse

Revisa la creación y actualización de periodos. Actualmente existen operaciones que desactivan otros periodos antes de completar el guardado, sin garantizar que ambas acciones se confirmen juntas.

Comprueba también qué ocurre al actualizar o eliminar un periodo inexistente.

### 2.2. Solución requerida

- Realiza la activación y el guardado mediante una transacción.
- Si cualquier operación falla, revierte todos los cambios.
- Verifica la existencia del periodo antes de modificar otros registros.
- Valida nombre, fechas, tipos de datos y rango temporal.
- Devuelve errores claros para referencias inexistentes y datos inválidos.
- Protege las activaciones simultáneas mediante un mecanismo compatible con el modelo existente.
- No elimines automáticamente periodos que tengan matrículas, pagos o historial académico.

**Regla por confirmar:** determina si la institución permite varios periodos activos simultáneamente o exige uno solo. El código actual parece intentar mantener uno activo; documenta esa evidencia y conserva el comportamiento mientras no exista una definición distinta.

### 2.3. Pruebas y aceptación

Comprueba que:

- Un guardado fallido no desactiva el periodo anterior.
- Actualizar un ID inexistente devuelve 404 y no modifica otros periodos.
- Fechas inválidas se rechazan antes de escribir.
- Dos activaciones simultáneas respetan la regla vigente.
- El frontend conserva la selección y muestra el error si la operación falla.

## Capítulo 3. Reportes académicos

### 3.1. Fuente de información

Revisa todos los reportes y resúmenes que usan `alumnos.grado_id` o `alumnos.periodo_academico_id`.

El grado y periodo de un registro académico deben obtenerse de su matrícula u oferta correspondiente, conforme al modelo existente. El perfil personal no debe redefinir el historial.

### 3.2. Reporte de rendimiento

- Agrupa por curso, grado y periodo correctos.
- Evita duplicar notas mediante joins con varias matrículas.
- Conserva las calificaciones antiguas sin evaluación vinculada.
- Distingue cantidad de alumnos, cantidad de evaluaciones y cantidad de notas registradas.
- Comprueba que los filtros se aplican igual a tablas, gráficos y exportaciones existentes.
- Evita mezclar periodos en un mismo resumen sin indicarlo expresamente.

### 3.3. Escalas y aprobación

El sistema admite evaluaciones con máximos distintos, pero algunos reportes utilizan un umbral fijo de 11.

- Identifica dónde se mezclan escalas.
- No conviertas automáticamente notas ni inventes ponderaciones.
- No presentes un promedio de escalas distintas como si fuera una nota final comparable.
- Conserva las notas originales y muestra sus máximos cuando estén disponibles.
- Señala los indicadores de aprobación que no puedan calcularse correctamente sin una regla institucional.

**Requiere confirmación:** escala común, fórmula de conversión, umbral de aprobación y ponderaciones. Prepara la propuesta, pero no implementes una fórmula no autorizada.

### 3.4. Reporte de asistencia

- Distingue días únicos de sesiones o registros de asistencia.
- No llames “días” a un conteo que incluye varias clases del mismo día.
- Usa el periodo y grado correspondientes al registro.
- Valida fechas y rangos de filtros.
- Conserva el tratamiento existente de registros antiguos sin oferta.
- Documenta los casos ambiguos de periodos superpuestos.

### 3.5. Pruebas y aceptación

Incluye casos con:

- Un alumno que cambia de grado entre periodos.
- Un perfil sin grado, pero con matrícula válida.
- Varias clases del mismo día.
- Varias matrículas que podrían multiplicar filas en un join.
- Evaluaciones con máximos de 10 y 20.
- Registros históricos sin evaluación u oferta.

## Capítulo 4. Autenticación y sesiones

### 4.1. Verificación del usuario

Revisa el middleware que acepta el JWT y asigna identidad y rol.

- Comprueba que el usuario exista y continúe activo.
- Evita que un rol anterior contenido en un token siga concediendo permisos después de un cambio de rol.
- Define una estrategia coherente para comprobar el rol vigente o invalidar sesiones.
- Conserva la distinción entre credenciales inválidas, sesión inválida, falta de permisos y errores del servidor.
- Un fallo de base de datos debe impedir la autorización y devolver un error controlado; no debe convertirse en autorización exitosa.

### 4.2. Cambios de contraseña y revocación

Inspecciona el comportamiento actual al cambiar contraseña, desactivar una cuenta o cambiar su rol.

**Requiere confirmación:** si un cambio de contraseña debe cerrar todas las sesiones o conservar la sesión actual. No inventes esa política; documenta alternativas y sus efectos.

### 4.3. Protección del inicio de sesión

- Comprueba si existe limitación de intentos.
- Si falta, propón e implementa una protección compatible con el entorno del proyecto.
- Evita depender solamente de la interfaz.
- Mantén mensajes que no revelen si una cuenta existe.
- No registres contraseñas, tokens completos ni datos sensibles en logs.
- Documenta los límites y cómo se configuran.

### 4.4. Sesión en el frontend

- Maneja contenido inexistente o dañado en `localStorage`.
- Valida la estructura mínima del usuario almacenado.
- Verifica la sesión con el backend al iniciar.
- Descarta una sesión vencida o inválida de forma controlada.
- Ante un fallo temporal del servidor, muestra un estado recuperable; no lo confudas automáticamente con credenciales inválidas.
- Evita mostrar durante la carga pantallas pertenecientes a un rol anterior.
- Conserva el comportamiento existente del interceptor donde sea correcto.

### 4.5. Pruebas y aceptación

Comprueba:

- Token válido de usuario activo.
- Token vencido, manipulado o con estructura inválida.
- Usuario desactivado después del login.
- Cambio de rol después del login.
- Usuario eliminado.
- Error de base de datos durante la autenticación.
- Datos corruptos en `localStorage`.
- Aplicación de la limitación de intentos.

## Capítulo 5. Matrículas y manejo de errores

### 5.1. Adquisición de conexiones

Inspecciona las operaciones que obtienen una conexión antes del bloque de manejo de errores.

- Incluye la adquisición dentro del flujo protegido.
- Libera la conexión en todos los caminos.
- Revierte únicamente cuando corresponda y existe una conexión.
- Evita que un error de rollback o liberación oculte el error original.
- Devuelve una respuesta clara cuando no se pueda obtener conexión.

### 5.2. Consistencia de la matrícula

- Conserva la matrícula como fuente de grado, periodo y cursos.
- Valida alumno, periodo, grado y cursos en el backend.
- Evita duplicados según las reglas e índices existentes.
- Garantiza que una operación de varios cursos no quede parcialmente registrada.
- No crees ni marques pagos como realizados al registrar una matrícula académica.
- Conserva el historial cuando se cancela una inscripción, conforme al modelo actual.

### 5.3. Pruebas y aceptación

Comprueba:

- Fallo al obtener conexión.
- Fallo en una escritura intermedia.
- Lote inválido.
- Matrícula duplicada.
- Curso ajeno al grado o periodo.
- Referencia inexistente.
- Reversión completa y liberación de conexión.
- Persistencia después de una operación exitosa.

## Capítulo 6. Perspectiva del apoderado

### 6.1. Perfil y contraseña

- Revisa las rutas y restricciones actuales del apoderado.
- Habilita una sección personal de consulta reutilizando los componentes apropiados.
- Permite cambiar su propia contraseña mediante la operación existente.
- Ajusta el filtro general para permitir esa operación específica, sin abrir acceso a otras escrituras.
- No habilites edición de datos institucionales sin autorización.

### 6.2. Alumnos vinculados

- Obtén los alumnos desde los vínculos existentes con el apoderado.
- Valida cada consulta por ID en el servidor.
- Impide que cambiar parámetros permita consultar otro alumno.
- Conserva las restricciones sobre notas, asistencia, documentos y formularios.
- No amplíes acceso a pagos o información financiera si ese permiso no existe.

### 6.3. Pruebas y aceptación

Incluye:

- Dos apoderados con alumnos diferentes.
- Un apoderado con varios alumnos.
- Un apoderado sin vínculos.
- Consulta directa de un alumno ajeno.
- Cambio de contraseña propio.
- Intento de modificar datos de otro usuario.
- Acceso a una ruta administrativa.

## Capítulo 7. Evaluaciones y reglas pendientes

### 7.1. Diagnóstico

Identifica las operaciones existentes de creación, consulta, cierre, publicación y actualización de evaluaciones.

Distingue el estado de cierre de una evaluación de la publicación de sus notas para estudiantes.

### 7.2. Propuesta para analizar

Presenta una propuesta que responda:

- ¿Quién puede publicar notas?
- ¿Quién puede cerrar o reabrir una evaluación?
- ¿Puede cambiarse la escala después de registrar notas?
- ¿Qué ocurre con las notas existentes al modificar una evaluación?
- ¿Qué permisos corresponden a profesor y administrador?
- ¿Cómo se conserva el historial de cambios?

No añadas estados o transiciones hasta confirmar las reglas que no estén definidas en el código.

## Capítulo 8. Auditoría de operaciones

### 8.1. Reutilización del modelo existente

Inspecciona `registro_actividades` y los historiales específicos antes de crear otra tabla.

Propón trazabilidad para:

- Matrículas y cancelaciones.
- Registro o actualización de pagos.
- Calificaciones y asistencia.
- Activación de periodos.
- Cambios de rol o estado de usuarios.

### 8.2. Datos y consistencia

- Registra actor, operación, entidad, ID y fecha.
- Guarda únicamente los valores anteriores y nuevos necesarios.
- Excluye contraseñas, tokens y archivos completos.
- Integra la auditoría con las transacciones cuando corresponda.
- Define qué roles pueden consultar el historial.

**Requiere confirmación:** conservación del historial, permisos de consulta y comportamiento si falla el registro de auditoría.

## Capítulo 9. Pruebas funcionales y regresiones

### 9.1. Pruebas de backend

Añade pruebas significativas para los errores corregidos, usando bases temporales y datos sintéticos.

Ejecuta las suites existentes de:

- Profesores.
- Estudiantes.
- Pagos.

No copies información personal real a las pruebas.

### 9.2. Pruebas desde el navegador

Comprueba, cuando el entorno lo permita:

- Login y cierre de sesión.
- Navegación de cada rol.
- Filtros de periodo y curso.
- Formularios y errores de validación.
- Operaciones exitosas y fallidas.
- Estados vacíos y carga.
- Navegación móvil.
- Bloqueo de rutas ajenas.

Si no puedes realizar una prueba, indica claramente la limitación; no la marques como aprobada.

### 9.3. Compilación

Ejecuta las compilaciones de frontend y backend. Reporta los comandos reales, resultados y advertencias relevantes.

## Capítulo 10. Entrega y documentación

### 10.1. Informe por capítulo

Entrega una tabla con:

| Capítulo | Problema | Solución | Estado | Validación | Confirmación pendiente |
|---|---|---|---|---|---|

Usa estados claros: **corregido**, **verificado sin cambios**, **propuesta pendiente** o **bloqueado por una limitación identificada**.

### 10.2. Resumen de implementación

Incluye:

- Archivos modificados y propósito.
- Reglas conservadas y reglas nuevas autorizadas.
- Migraciones necesarias, si las hubo.
- Tratamiento de datos existentes.
- Comandos de validación y resultados.
- Limitaciones y pasos para ejecutar los cambios.

### 10.3. Orden de trabajo

Implementa primero las correcciones cuya solución se pueda deducir del código:

1. Consistencia de periodos.
2. Reportes basados en matrícula.
3. Validación de usuarios y sesiones.
4. Manejo de errores de matrículas.
5. Perfil y contraseña del apoderado.

Continúa con el análisis de escalas, evaluaciones y auditoría. Formula preguntas concretas únicamente para las reglas que no puedan deducirse, mientras avanzas en los trabajos independientes.

**No sustituyas la implementación por recomendaciones generales. Completa los cambios autorizados y deja identificadas las decisiones pendientes sin inventarlas.**
