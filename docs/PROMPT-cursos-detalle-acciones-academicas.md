# Prompt: Cursos, detalle del curso y acciones académicas

## Propósito

Implementar una experiencia real, segura y escalable para que administración y docentes gestionen una oferta académica concreta desde las secciones **Cursos** y **Detalle del curso**. Desde el detalle se debe poder consultar a los alumnos asignados, registrar y revisar asistencias, y consultar/gestionar evaluaciones y calificaciones.

No hagas commit ni push. El repositorio puede tener cambios previos sin commitear: inspecciónalos y trabaja con ellos. No reviertas ni sobrescribas cambios ajenos a esta tarea.

## Diagnóstico conocido: verifica antes de cambiar

- `frontend/src/pages/academics/CursosPage.tsx` lista cursos maestros y usa `curso.grado_id` para representar el grado. La configuración académica permite que el mismo curso pertenezca a varios grados y periodos.
- La ruta actual es `/cursos/:id`. Un `curso_id` por sí solo no identifica una oferta cuando, por ejemplo, Comunicación está configurada en 5.º y 6.º en el mismo periodo.
- `frontend/src/pages/academics/CursoDetailPage.tsx` incluye textos y datos de ejemplo para calendario, libro de notas, estado y periodo; varias acciones rápidas no navegan ni ejecutan operaciones.
- `backend/src/controllers/cursos.controller.ts` devuelve matrículas activas de un curso sin restringirlas a una combinación exacta de periodo y grado. También obtiene profesores desde `profesor_curso`, que no distingue por sí solo una oferta concreta.
- `frontend/src/pages/academics/AsistenciasPage.tsx` carga alumnos generales y filtra por grado en el navegador para el profesor. El grado no es suficiente para probar que un alumno pertenece al curso y periodo elegidos.
- Ya existen endpoints de asistencia y calificaciones. Revisa sus parámetros, autorización y semántica antes de reutilizarlos o ampliarlos.
- `database/schema.sql` tiene `calificaciones` con nota, tipo y fecha, pero no una entidad `evaluaciones`. `asistencias` no incluye periodo/oferta y su unicidad actual es por alumno, fecha y curso.
- Existe `backend/src/utils/profesorAlcance.ts`; inspecciona su estado y reutilízalo. No crees una política de autorización paralela.

## Instrucciones iniciales

1. Lee las instrucciones del repositorio y revisa `git status` antes de editar.
2. Inspecciona las páginas, rutas, controladores, tipos, esquema y migraciones mencionados en este documento, además de la configuración académica, matrícula y middleware de autorización.
3. Traza los flujos desde React hasta SQL. Separa datos reales, datos simulados y operaciones que ya funcionan.
4. Presenta una hipótesis local comprobable y una prueba pequeña antes de realizar la primera edición.
5. Implementa en fases pequeñas y ejecuta una validación enfocada después de cada fase.
6. Sigue los patrones existentes: Axios en `frontend/src/api/client.ts`, funciones por módulo en `frontend/src/api/endpoints.ts`, `sendSuccess`/`sendError`, `mysql2/promise`, componentes compartidos, `react-hot-toast` y Tailwind del proyecto.

## Regla central: contexto de oferta

El contexto académico que gobierna las acciones debe ser la relación de `periodo_grado_cursos` —identificada por `periodo_grado_curso_id`— o su clave compuesta equivalente:

`periodo + grado + curso`

No filtres listas ni autorices escrituras únicamente por `curso_id` o `grado_id`.

Define una ruta canónica para abrir el detalle contextual. Se recomienda identificar la oferta con `periodo_grado_curso_id` y actualizar los enlaces desde Cursos. Si conservas `/cursos/:id` por compatibilidad, resuelve explícitamente la oferta y no permitas operaciones académicas ambiguas. Documenta la estrategia elegida.

El detalle y sus respuestas de API deben incluir, como mínimo:

- `periodo_grado_curso_id`, `periodo_academico_id`, nombre del periodo.
- `grado_id`, nombre del grado y nivel.
- `curso_id`, nombre, código y descripción del curso.
- Profesores asignados a esa oferta, no una lista global engañosa.
- Matrículas activas de esa oferta, con id de matrícula, id/código/nombre del alumno y estado.
- Cantidad real de alumnos y estado de carga/error/vacío.

## Fase 1: lista de cursos y detalle real

- Representa las ofertas académicas configuradas para un periodo, no solo cursos maestros con un `grado_id` global.
- Permite al administrador seleccionar/filtrar periodo, nivel y grado. Un mismo curso en dos grados debe aparecer como dos ofertas distinguibles.
- Al profesor muéstrale únicamente las ofertas accesibles según su asignación. Las asignaciones manuales existentes por curso deben seguir funcionando según la política actual.
- Actualiza la navegación para preservar el id de oferta. Acciones del detalle deben operar sobre esa misma oferta.
- Sustituye en `CursoDetailPage.tsx` los estados y calendarios ficticios por información persistida. Si una función todavía no existe, no la presentes como funcional.
- Limpia logs de depuración del flujo tocado y usa tipos explícitos para oferta, roster, evaluación y asistencia en vez de ampliar el uso de `any`.

## Fase 2: acciones rápidas

Conecta acciones visibles y funcionales para:

1. **Lista de alumnos:** mostrar roster activo de la oferta y abrir el detalle del alumno.
2. **Registrar asistencia:** abrir la lista activa del mismo periodo, grado y curso.
3. **Ver asistencia:** historial y resumen por oferta, fecha y rango.
4. **Libro de calificaciones:** abrir el libro del mismo periodo, grado y curso.
5. **Gestionar evaluación/notas:** permitir crear o elegir una evaluación y registrar notas cuando el usuario tenga permiso.

Oculta o deshabilita las acciones según rol y asignación, pero vuelve a validar todos los permisos en backend. Muestra estados de carga, guardado, error y vacío. Evita doble envío.

## Fase 3: asistencia por oferta

- La lista de alumnos debe salir del backend y contener solo matrículas `activas` de la oferta exacta. No uses `alumnosApi.getAll()` como roster ni filtres el roster solo en React.
- El profesor solo puede registrar y consultar asistencia de alumnos y ofertas a las que tiene acceso. Un alumno de otra oferta debe producir `403` o `404` de acuerdo con el contrato de la ruta.
- Estados admitidos: `presente`, `ausente`, `tardanza` y `justificado`. Solicita minutos de tardanza solo cuando corresponda y valida el valor en frontend y backend.
- Carga registros existentes para la fecha; define explícitamente si guardar de nuevo actualiza o rechaza duplicados. No crees filas duplicadas.
- La operación masiva debe ser consistente: usa transacción cuando corresponda o devuelve un resultado por alumno si el contrato acepta resultados parciales.
- El historial, conteos y porcentajes deben limitarse a la oferta y periodo consultados.
- Evalúa la estructura actual de `asistencias`: no identifica periodo/oferta. Si hace falta una migración, conserva el historial; no asignes una oferta antigua por suposición cuando la relación sea ambigua. Mantén compatibles los casos históricos o generales que no pertenezcan a un curso.

## Fase 4: evaluaciones y libro de calificaciones

- El libro debe mostrar alumnos activos de la oferta en filas y las calificaciones persistidas de esa oferta, sin mezclar periodos ni grados que compartan el curso maestro.
- Mantén la escala actual de 0 a 20 y valida límites, fechas, periodo, oferta y matrícula tanto en frontend como en backend.
- Define el comportamiento de guardar y editar notas. No insertes duplicados al editar una nota existente.
- No conviertas una nota faltante en cero. No inventes ponderaciones ni reglas de aprobación: reutiliza reglas documentadas; si no existen, usa y etiqueta claramente el promedio simple de notas registradas.
- Antes de introducir una entidad `evaluaciones`, presenta el diseño mínimo y comprueba la compatibilidad con datos actuales. Para una solución escalable, considera una entidad vinculada a `periodo_grado_curso_id` con título, tipo, fecha, nota máxima, peso opcional, estado y creador; `calificaciones` podría referenciarla de forma nullable para preservar datos históricos.
- Si agregas migraciones, deben ser incrementales, conservar calificaciones existentes y documentar cómo se manejan las filas antiguas sin evaluación asociada.
- No implementes exámenes en línea, preguntas ni corrección automática en esta fase salvo que ya exista una base funcional comprobada. El objetivo aquí es gestión de evaluaciones y libro de notas.

## Seguridad y autorización

- Administrador: puede consultar ofertas y gestionar asistencia/evaluaciones según las rutas existentes.
- Profesor: solo ofertas configuradas para su usuario en el periodo, grado y curso correspondientes. Mantén el respaldo de asignación manual por curso donde la política existente lo permita.
- Apoderado/alumno: acceso de lectura a sus propios datos únicamente si las rutas y roles existentes lo contemplan; nunca permitir registro de asistencia o calificaciones.
- Valida la oferta y pertenencia del alumno en cada endpoint de lectura/escritura. No confíes en `periodo_id`, `grado_id`, `curso_id`, `alumno_id` o `periodo_grado_curso_id` enviados por el cliente sin verificar que son consistentes.
- Asegura que un profesor de Comunicación 5.º no vea ni califique alumnos de Comunicación 6.º, aunque sea el mismo `curso_id`.

## Pruebas y criterios de aceptación

Usa datos aislados o una transacción de prueba. Guarda el estado previo y limpia toda oferta, matrícula, asistencia, evaluación o calificación creada. Restaura los alumnos modificados. No elimines datos preexistentes.

1. Configura el mismo curso maestro en dos ofertas del mismo periodo: grado 26 con profesor A y grado 27 con profesor B. Confirma que cada oferta se abre en el detalle correcto.
2. Incluye matrículas activas, canceladas y de otro periodo. El roster de cada oferta debe incluir solo matrículas activas de esa oferta.
3. Confirma que cada profesor ve su oferta y no la otra; verifica que los permisos manuales existentes siguen vigentes. Admin puede consultar ambas.
4. Registra los cuatro estados de asistencia para una oferta. Lee el historial por fecha, guarda de nuevo y verifica el comportamiento de duplicados; confirma que la otra oferta no cambió.
5. Intenta con profesor A leer y escribir asistencia para el alumno de grado 27 y con profesor B hacerlo para grado 26. Las escrituras deben ser rechazadas por backend.
6. Crea/selecciona una evaluación y registra notas válidas. Comprueba persistencia, edición, límites 0–20, alumnos exactos y aislamiento por periodo/grado. Comprueba que faltantes no se cuentan como cero.
7. Intenta registrar/editar una calificación para un alumno fuera de la oferta; debe ser rechazada por backend.
8. Prueba la navegación desde Cursos y todas las acciones rápidas con admin y profesores, incluyendo estados de carga/error/vacío.
9. Ejecuta pruebas del proyecto, `npx tsc --noEmit` en frontend y backend, y solicita a Vite los módulos editados. Exige HTTP 200 sin `Transform failed`.
10. Confirma que los servicios probados corresponden a este workspace. Si un puerto está ocupado por otro proceso, no lo detengas: inicia el servicio en otro puerto y configura explícitamente el proxy de desarrollo para apuntar al backend correcto.
11. Verifica la limpieza y que los datos de alumnos quedaron como antes de la prueba.

## Entrega final

Al terminar, informa en español:

- Archivos cambiados y migraciones agregadas.
- Ruta e identificador usados para el contexto de oferta.
- Qué acciones rápidas quedaron funcionales y cómo abrirlas.
- Cómo se limita el acceso del profesor por periodo/grado/curso.
- Cómo se registra/consulta asistencia y cómo funciona el libro de calificaciones.
- Evidencia real de cada prueba y confirmación de limpieza/restauración.
- Requisitos no verificados y motivo.

No declares terminada una prueba que no ejecutaste. No dejes datos de prueba ni procesos que hayas iniciado innecesariamente.