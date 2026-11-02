# Prompt: unificar estructura académica, profesores, cursos y horarios

Actualizado: 21/10/2026. Proyecto: `C:\xampp\htdocs\Tesis`.

Este documento es una instrucción de implementación. Redactarlo no significa que sus cambios ya estén aplicados. Antes de ejecutar, verifica el código vigente y las instrucciones del repositorio; algunos documentos anteriores describen herramientas o reglas reemplazadas. No copies credenciales de esos documentos ni introduzcas valores de acceso en código, comandos, pruebas o informes.

## Objetivo

Inspecciona e implementa una única fuente de asignaciones docentes por periodo académico, grado y curso, reutilizando `periodo_grado_cursos` y `periodo_grado_curso_profesores`. La relación del catálogo `profesor_curso` no debe seguir concediendo acceso global a grados y periodos ni exigir repetir asignaciones en varias pantallas. Una fuente única no significa limitar cada oferta a un solo profesor: conserva la posibilidad existente de varios docentes asignados explícitamente.

Ejemplo esperado: configurar una vez **2026 → Primero de primaria → Matemática → Profesor A**. Desde Cursos y Profesores debe verse esa misma asignación. Al crear un horario para ella, solo faltan día, hora inicial, hora final y aula conforme a las reglas actuales; el docente ya está identificado si hay uno solo.

## 1. Diagnóstico antes de modificar

Revisa tablas, claves, rutas, controladores, permisos, consultas académicas, formularios y pruebas. Identifica todos los usos de asignaciones manuales y de la sincronización del catálogo. Examina los datos existentes con consultas de solo lectura y resultados agregados. Conserva cambios locales, matrículas, calificaciones, asistencia, horarios e historial.

Inspecciona especialmente:

- Tablas `cursos`, `profesores`, `usuarios`, `periodos_academicos`, `grados`, `periodo_grados`, `periodo_grado_cursos`, `periodo_grado_curso_profesores`, `profesor_curso`, `horarios`, `matriculas`, `evaluaciones`, `calificaciones` y `asistencias`.
- `backend/src/controllers/configuracion.controller.ts`, `profesores.controller.ts`, `cursos.controller.ts` y `horarios.controller.ts`, sus rutas y los contratos que consumen sus clientes.
- `backend/src/utils/profesorAlcance.ts` y las demás utilidades de alcance, horarios, matrícula y consulta del estudiante/apoderado. Busca usos de `profesor_curso`, `origen`, `syncProfesorCurso` y consultas equivalentes en todo el backend, no solamente en los cuatro controladores.
- Las páginas `ConfiguracionAcademicaPage`, `CursosPage`, `OfertaDetailPage`, `ProfesoresPage`, `ProfesorDetailPage`, `HorariosPage`, los paneles por rol y el cliente API.
- Migraciones, restricciones únicas, pruebas y documentación relacionadas. Comprueba la estructura real antes de proponer DDL.

Entrega un diagnóstico breve que distinga catálogo, oferta, asignación docente y bloque horario. Identifica qué operaciones actuales escriben cada relación y cuáles la utilizan para autorizar acceso. Mantén el alcance de esta tarea: no rehagas pagos, autenticación, superadministración ni otros módulos ajenos.

## 2. Flujo único

- Cursos: catálogo y consulta de las ofertas por grado/periodo; acceso directo a la estructura para gestionarlas.
- Profesores: datos personales y consulta de asignaciones reales con grado y periodo. Retira la selección genérica de cursos al crear/editar un profesor; proporciona acceso al mismo flujo de estructura.
- Estructura académica: único lugar para habilitar grados/cursos y asignar responsables. Todos los accesos deben utilizar estos mismos registros y endpoints, sin sincronizaciones que creen una segunda fuente de verdad.
- Horarios: selecciona una oferta ya configurada y registra día, horas y aula. Si hay un solo docente asignado activo, úsalo automáticamente y muéstralo; si hay varios, exige elegir entre ellos. Si no hay ninguno, bloquea el registro y enlaza a la estructura.

Los accesos desde Cursos y Profesores pueden abrir Estructura académica con el periodo, grado, curso o docente preseleccionados. Deben reutilizar la misma operación y persistir en los mismos registros; no construir otro editor con reglas o almacenamiento diferentes. Valida los parámetros de navegación y limpia selecciones incompatibles al cambiar de contexto.

En Profesores, reemplaza los checkboxes de cursos genéricos por una consulta de asignaciones que indique periodo, grado, curso y condición actual/histórica. Crear o editar datos personales no debe escribir, borrar ni reconstruir esas asignaciones. Desde Cursos, distingue visualmente catálogo y ofertas por periodo para evitar que un cambio del catálogo parezca una asignación de docentes.

El campo heredado `cursos.grado_id`, si existe, no sustituye el grado de la oferta. Compartir un curso del catálogo entre grados no debe mezclar sus docentes, alumnos ni horarios. No añadas secciones, sedes, turnos u otras dimensiones que el modelo actual no contemple.

## 3. Backend e integridad

Valida los datos en servidor. El horario debe referir una oferta existente y un docente efectivamente asignado a ella; no debe crear asignaciones. Resuelve también en backend la omisión del docente cuando haya exactamente uno. No elijas arbitrariamente cuando haya varios. Rechaza los antiguos payloads que intenten asignar cursos genéricos desde Profesores, en lugar de ignorarlos silenciosamente.

Conserva la prevención de cruces de profesor, curso/oferta y aula. Protege las asignaciones con horarios u otros registros vinculados para evitar que una eliminación en estructura rompa los datos existentes; utiliza transacciones y mensajes claros. No elimines historial en cascada al quitar grados/cursos. Mantén los permisos por rol, superadministrador y consulta histórica de profesores.

Retira el permiso alternativo basado únicamente en `profesor_curso.origen=manual` de todas las consultas de profesores, alumnos, notas, asistencia, calendarios, ofertas y horarios. Los docentes que ve un estudiante deben proceder de su oferta exacta. El catálogo puede mostrar información derivada de asignaciones reales, sin usarla como autorización.

### 3.1. Contratos y validación

- Reutiliza los endpoints de `configuracion-academica` para grados, cursos y responsables. Conserva el identificador de oferta `periodo_grado_curso_id` como referencia académica del horario.
- El periodo, grado y curso de un horario se derivan de esa oferta en el servidor. Si el contrato mantiene campos redundantes por compatibilidad, valida su coherencia; no aceptes combinaciones contradictorias ni confíes solo en un selector del frontend.
- En el alta de horario, si se omite `profesor_id`, resuélvelo únicamente cuando haya exactamente un docente asignado y habilitado. Cuando haya varios, exige selección explícita; cuando no haya ninguno, devuelve un error claro. Un ID enviado expresamente debe validarse siempre, aunque solo haya un candidato.
- En edición, conserva el profesor ya registrado mientras la relación siga siendo válida. Cambiar la lista de docentes no debe sustituir silenciosamente al responsable de sesiones existentes. Distingue un cambio intencional de oferta/docente de la edición de hora o aula.
- Deshabilitar un docente no debe borrar sus asignaciones ni el historial. Evita nuevas sesiones con usuarios inactivos y muestra el estado en consultas históricas. Si la edición de registros históricos con docentes inactivos no tiene una regla definida, reporta esa decisión pendiente y conserva el historial.
- Rechaza IDs inválidos, inexistentes y duplicados; devuelve estados HTTP coherentes con las convenciones existentes. Los payloads antiguos de Profesores que incluyan asignaciones genéricas deben recibir una explicación para usar Estructura, no producir un éxito sin aplicarlas.
- Usa transacciones y bloqueos adecuados para que una asignación no pueda retirarse entre la validación y el guardado de un horario. Conserva unicidad en BD y el comportamiento ante solicitudes concurrentes. No dependas únicamente de comprobar antes de insertar.

### 3.2. Eliminaciones y compatibilidad

Antes de quitar grado, curso de una oferta o docente, identifica referencias existentes. Evita borrados en cascada que destruyan matrícula, evaluaciones, notas, asistencia o sesiones. Si un docente tiene horarios vinculados, rechaza su retiro con un mensaje que indique qué debe resolver el administrador, o reutiliza un mecanismo de vigencia ya existente que preserve el vínculo; no inventes una reasignación automática.

Revisa específicamente `syncProfesorCurso`: actualmente reconstruye relaciones del catálogo. Elimina su papel como fuente de autorización y como escritura repetida si deja de tener consumidores válidos. Si hace falta una vista agregada de cursos de un profesor, calcúlala desde las asignaciones específicas. No borres toda la tabla heredada para simplificar la implementación.

## 4. Datos antiguos

Conserva físicamente las relaciones antiguas para revisión y ofrece diagnóstico de las que aún no tienen asignaciones específicas. No infieras un periodo/grado por ser el activo o el único disponible. No conviertas automáticamente una asignación general en acceso a todas las ofertas del curso.

Los casos sin evidencia suficiente quedan señalados para asignación explícita desde estructura. No borres datos ni ejecutes migraciones sobre la base real sin un procedimiento revisado y respaldo apropiado. Diferencia conservación de un registro histórico de autorización para operar sobre otros grupos.

Prepara un informe agregado de transición que distinga: relaciones específicas válidas, relaciones generales sin correspondencia explícita, docentes inactivos, referencias huérfanas y horarios antiguos sin oferta inequívoca. Si propones mapear registros, muestra candidatos y el motivo, pero no los apliques sin una decisión explícita. Un único candidato técnico no demuestra cuál era el grado o periodo original.

Ensaya cualquier migración con datos sintéticos y en un destino aislado. Si se aprueba una migración real, debe ser revisable, repetible sin duplicar y con verificación posterior; no ejecutar DDL al arrancar el servidor ni modificar historiales para hacer pasar pruebas. Advierte qué docentes perderían acceso concedido solamente por relaciones generales antes de hacer el cambio de permisos en producción.

Conserva los periodos históricos de los profesores como consulta y las operaciones permitidas en los activos según las reglas vigentes. No amplíes permisos para compensar una asignación histórica ambigua. La política de edición administrativa de periodos históricos debe deducirse del código o quedar indicada como decisión pendiente, sin imponer un cierre nuevo por inferencia.

## 5. Interfaz y pruebas

Reutiliza componentes y diseño adaptable, muestra carga/errores/reintento y evita datos anteriores al cambiar de oferta. Actualiza pruebas del backend y navegador: catálogo/profesor sin doble asignación, único docente automático, varios docentes, oferta sin docente, rechazo de docente ajeno, asignación manual sin permisos amplios, unicidad/concurrencia y eliminación con vínculos. Verifica los cuatro roles y superadministración.

Ejecuta las compilaciones y pruebas relevantes existentes, ampliando solo cuando haya cambios o fallos que lo justifiquen. Documenta reglas, archivos, comandos ejecutados y resultados. Distingue pruebas sintéticas de datos reales. Declara los casos históricos que necesiten revisión; no inventes su pertenencia académica.

### Casos mínimos de prueba

1. Asignar desde Estructura se refleja en Profesor, Curso, oferta y selector de Horarios sin una segunda acción.
2. Editar datos personales del profesor no altera sus asignaciones específicas ni las de otros docentes.
3. El mismo curso en dos grados o periodos mantiene docentes, alumnos, notas y asistencia separados.
4. Una relación antigua `profesor_curso` sin asignación específica no autoriza consultar ni escribir sobre esas ofertas, incluso con URL o payload manipulados.
5. Un único docente habilitado se completa en interfaz y backend; varios exigen elección explícita; ninguno impide guardar. Docente ajeno o inactivo se rechaza para un alta.
6. Cambiar rápidamente de periodo/oferta no conserva profesores de la selección anterior ni aplica respuestas tardías. Los errores de consulta no se convierten en listas vacías exitosas.
7. La edición de hora/aula conserva al docente correcto. No se reasignan sesiones silenciosamente cuando cambia la estructura.
8. Los cruces de profesor, grupo/oferta y aula siguen rechazándose de acuerdo con las reglas actuales; comprueba también dos altas concurrentes.
9. Retirar una asignación con horarios o eliminar una oferta con datos vinculados no destruye el historial ni deja referencias inválidas.
10. Se conserva la posibilidad de varios docentes por oferta y se impide repetir la misma pareja oferta/docente.
11. Estudiante y apoderado solo ven sus grupos matriculados; el profesor solo sus asignaciones; administrador y superadministrador mantienen sus atribuciones actuales. No reintroduzcas Documentos en la vista del apoderado.

## 6. Secuencia de implementación

1. Inspecciona y presenta el diagnóstico, consumidores y riesgos de transición. Continúa con el trabajo autorizado que no dependa de información faltante.
2. Define el contrato compartido y las consultas canónicas sobre las tablas existentes. Prepara las pruebas que demuestran el aislamiento y las reglas del horario.
3. Actualiza backend, permisos y protección de referencias; después elimina las escrituras genéricas de las operaciones de Profesor y las dependencias de sincronización que correspondan.
4. Ajusta frontend: consulta y accesos a Estructura desde Cursos/Profesores; horario que reutiliza la asignación y solo pide las decisiones que faltan.
5. Ejecuta pruebas y compilaciones. Ensaya la transición con datos ficticios; no marques resueltos los datos reales que todavía necesiten revisión.
6. Actualiza la documentación relacionada y entrega el resultado por sección con sus evidencias.

Comandos orientativos desde sus respectivas carpetas; confirma los scripts disponibles y reutiliza sus ejecutores:

```bash
# backend
npm run build
npm run test:profesores
npm run test:estudiantes
npm run test:integral
npm run test:familia
npm run test:all

# frontend
npm run build
npm run test:session
npm run test:e2e
```

No repitas todas las suites individuales si ya están incluidas en la suite completa aprobada y no hubo cambios posteriores que lo justifiquen. Agrega las pruebas nuevas al ejecutor/CI correspondiente. Un fallo del entorno se informa como pendiente, no como prueba aprobada. Incluye pruebas de navegador relevantes en escritorio y vista móvil, con datos sintéticos.

## 7. Entrega y decisiones pendientes

Resume archivos modificados, contrato final, reglas implementadas, pruebas/comandos y resultados. Documenta la ruta del flujo único y cómo resolver una asignación antigua pendiente. Informa por separado el estado del código y el de la migración/revisión de datos existentes.

Si aparecen casos sin regla deducible —por ejemplo, reemplazar un docente con sesiones ya registradas o atribuir un horario antiguo a un periodo— identifica el caso y solicita la decisión concreta. Continúa las correcciones independientes y conserva los registros afectados; no presentes una decisión supuesta como regla institucional aprobada.

No hagas commit, push, publicación, contratación ni cambios ajenos a este alcance. Mantén intactas las credenciales y las cuentas; no necesitas crear usuarios reales ni suspender el sistema para desarrollar y probar esta corrección.

## Aceptación

La asignación se registra una vez en estructura y se refleja en cursos, profesores y horarios. El horario no solicita repetir una asignación ya inequívoca ni permite docentes ajenos. Ninguna relación genérica amplía permisos entre grados/periodos. No se pierde historial ni se informa éxito cuando falla la operación. El frontend compila, las pruebas relevantes pasan y los registros antiguos ambiguos quedan identificados para revisión explícita.
