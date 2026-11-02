# PROMPT — Horarios y calendario académico

> Copia todo este texto en una sesión nueva del agente (modo Act). Es autocontenido y orienta la implementación de horarios y calendario dentro del sistema existente.

## 0. Contexto del proyecto

Trabaja en el **Sistema Inteligente de Gestión Educativa** de `C:\xampp\htdocs\Tesis`.

- Backend: Node.js, Express, TypeScript y `mysql2/promise`.
- Frontend: React, TypeScript, Vite, Tailwind y Axios.
- Base de datos: MySQL.
- No hagas commit ni push. El repositorio puede tener cambios sin commit: revisa `git status`, conserva los cambios ajenos y no los reviertas.
- No expongas ni copies credenciales. Usa la configuración local existente y evita imprimir secretos en logs o en la entrega.

Sigue las convenciones ya usadas:

- Backend: pool compartido, respuestas `sendSuccess`/`sendError`, middleware de autenticación/autorización y transacciones para operaciones que lo requieran.
- Frontend: `frontend/src/api/client.ts`, funciones por módulo en `frontend/src/api/endpoints.ts`, componentes compartidos, Tailwind del proyecto y `react-hot-toast`.
- Respeta los roles, nombres, estilos, rutas y patrones de carga/error existentes. No agregues una arquitectura paralela.

## 1. Diagnóstico conocido: verifica antes de cambiar

Confirma el estado actual en los archivos y la base de datos del workspace. No des por hecho que este diagnóstico sigue completo:

- `backend/src/controllers/horarios.controller.ts` implementa consulta, creación, edición y eliminación de horarios.
- `backend/src/routes/horarios.routes.ts` deja la lectura a usuarios autenticados y limita las mutaciones al administrador.
- La tabla `horarios` de `database/schema.sql` tiene `curso_id`, `profesor_id`, `periodo_academico_id`, `dia_semana`, `hora_inicio`, `hora_fin` y `aula`. No identifica el grado ni la oferta académica exacta.
- El filtro de profesor actual limita la consulta a su profesor asociado. La creación valida solapamientos del profesor, pero no necesariamente conflictos de oferta o aula, y las escrituras no deben considerarse seguras hasta verificar sus validaciones.
- `frontend/src/pages/academics/HorariosPage.tsx` muestra horarios por día y periodo. Sus selects consultan cursos maestros y profesores, lo que puede ser ambiguo si un mismo curso se ofrece en más de un grado.
- `frontend/src/pages/CalendarPage.tsx` inicializa una fecha fija y genera eventos de ejemplo en memoria. No representa todavía un calendario alimentado por los horarios y evaluaciones reales.
- `frontend/src/api/endpoints.ts` ya tiene `horariosApi`; `frontend/src/App.tsx` registra `/horarios` y `/calendario`.
- La estructura académica incluye `periodo_grado_cursos`, cuya identidad es la oferta `periodo + grado + curso` y cuyo identificador preferido es `periodo_grado_curso_id`.
- El esquema contiene `evaluaciones`, vinculadas a `periodo_grado_curso_id` y con `fecha_evaluacion`.
- Revisa también `backend/src/utils/ofertaAcademica.ts`, `backend/src/utils/profesorAlcance.ts`, rutas/páginas de ofertas, periodos y asistencia, y cualquier migración existente antes de diseñar cambios.

Primero traza los flujos desde la interfaz hasta las consultas SQL y la autorización. Separa lo persistido de lo simulado y reutiliza helpers y contratos existentes.

## 2. Objetivo

Completar la gestión de horarios y el calendario para que sean coherentes con la oferta académica y los permisos existentes:

1. Administrar horarios asociados a una oferta académica exacta, no solo a un curso maestro.
2. Mostrar a cada rol únicamente la información que le corresponde.
3. Presentar en el calendario clases recurrentes derivadas de los horarios dentro de las fechas del periodo y eventos académicos reales, empezando por las evaluaciones existentes.
4. Retirar datos ficticios, fechas fijas y acciones visuales que aparenten funcionar sin hacerlo.
5. Preservar el historial y los horarios actuales: no inferir silenciosamente grado/oferta para filas antiguas ambiguas.

No conviertas este trabajo en un sistema de reservas de aulas, tareas, notificaciones o exámenes en línea. No agregues tipos de eventos persistidos que no tengan respaldo en el modelo actual, salvo que el análisis demuestre que son indispensables y se documente y valide una migración mínima y compatible.

## 3. Identidad y reglas del horario

La clave académica autoritativa de un horario nuevo debe identificar la oferta concreta:

`periodo_grado_curso_id`

o, si los patrones del repositorio justifican usar la clave compuesta:

`periodo_academico_id + grado_id + curso_id`.

Prefiere `periodo_grado_curso_id` si es compatible con la implementación existente. Verifica en backend que la oferta, el periodo, el curso, el grado y el profesor sean consistentes; nunca confíes únicamente en IDs enviados por el cliente.

### Compatibilidad e historial

- Propón una migración incremental, reversible cuando sea razonable y que no borre horarios.
- Inspecciona los horarios existentes antes de poblar cualquier nueva relación.
- Si una fila antigua se puede asociar a una sola oferta sin ambigüedad, documenta y valida esa regla antes de migrarla.
- Si hay más de una oferta posible, no elijas una por suposición ni dupliques el horario. Conserva el dato y define una estrategia explícita de compatibilidad o revisión administrativa.
- Actualiza `database/schema.sql` solo para mantenerlo coherente con la migración y los patrones del repositorio. No reemplaces datos ni vuelvas a inicializar la base de datos.

### Validaciones de horario

En backend y frontend valida:

- Campos obligatorios, IDs existentes y pertenencia del profesor a la oferta, según la política vigente de asignaciones académicas.
- Día permitido de lunes a sábado (o el conjunto que confirme el sistema); horas válidas y hora de fin posterior a hora de inicio.
- Periodo y oferta coherentes.
- Conflictos de horario del profesor en el mismo periodo y día: dos intervalos se solapan si `inicio_existente < fin_nuevo` y `fin_existente > inicio_nuevo`.
- Conflictos de la misma oferta en el mismo día y rango, salvo que el dominio permita expresamente más de una sesión simultánea.
- Si se reutiliza un aula, conflicto de aula en el mismo periodo/día/rango, si el modelo actual permite identificarla. Si no se puede aplicar de forma fiable, documenta la limitación y no simules una validación.
- Al editar, excluir el registro que se está editando de las búsquedas de conflicto.
- Respuestas de conflicto con un código y mensaje coherentes con el estilo actual, sin errores silenciosos.

Usa consultas parametrizadas. Asegura las mutaciones con transacción cuando la validación y escritura deban ser atómicas. No dependas solo de la validación del navegador.

## 4. Alcance funcional por fase

### Fase A: inspección y diseño

1. Revisa instrucciones del repositorio, `git status`, esquema y migraciones, rutas, controladores, tipos, páginas y permisos.
2. Identifica el origen de las ofertas y cómo resolver profesor/usuario para cada rol.
3. Antes de editar, deja clara una hipótesis verificable: cuál será la identidad de un horario, cómo se tratarán filas históricas ambiguas y de dónde salen los eventos del calendario.
4. Implementa sin cambiar de forma no solicitada las reglas académicas, la navegación global o las funciones de evaluación.

### Fase B: gestión de horarios

- Cambia el formulario para seleccionar una oferta distinguible por periodo, grado y curso. Muestra etiquetas comprensibles, por ejemplo: `2026-I · 5.º Primaria · Comunicación`.
- Si un mismo curso aparece en varias ofertas, no permitas elegirlo de manera ambigua.
- Presenta profesor, día, rango horario y aula; precarga el periodo activo solo como conveniencia, no como sustituto de una elección/validación válida.
- Permite crear, editar y eliminar de acuerdo con los controles y confirmaciones existentes. Si la interfaz actual carece de edición, incorpora una experiencia consistente con `Modal` y componentes disponibles.
- Muestra nombre de periodo, grado, curso/oferta, docente, aula y horas en la lista.
- Incluye estados explícitos de carga, error, lista vacía y guardado; evita doble envío y notifica errores mediante el patrón del proyecto.
- No muestres controles de gestión a roles sin permiso. Mantén la autorización efectiva en el backend.

### Fase C: calendario real

- El mes/día inicial debe ser la fecha actual, sin valores fijos ni eventos generados en memoria.
- Mantén la navegación temporal y selección de día correctas al cambiar de mes/año, incluyendo años bisiestos, límites de mes y la fecha de hoy.
- Integra información persistida:
  - **Clases:** proyecta las recurrencias de `horarios.dia_semana` entre las fechas de inicio y fin del periodo correspondiente. El evento es una ocurrencia de calendario, no una fila nueva en la base de datos para cada fecha.
  - **Evaluaciones:** utiliza la entidad/endpoints de evaluaciones existentes y `fecha_evaluacion`; no inventes evaluaciones ni fechas.
- Para cualquier evento, muestra fecha/hora cuando exista, título, tipo, curso y contexto de oferta. Los eventos sin hora deben presentarse sin inventar una.
- Los filtros de periodo, mes/día y modo de vista deben afectar de forma consistente a las marcas y a la agenda del día.
- Conserva filtros o modos de calendario únicamente si tienen significado respaldado por datos reales. Elimina las secciones ficticias de tareas/vencimientos si no hay fuente persistida; no las rellenes con placeholders que parezcan datos reales.
- Quita o implementa los botones `+` y ajustes. No dejes controles sin acción o con apariencia de funcionalidad.
- Define límites de consulta para no descargar todos los periodos/eventos innecesariamente. No hagas una petición por cada día del mes.
- Maneja de forma explícita fechas locales y formatos `DATE`/`TIME`: no desplaces fechas un día por conversiones de zona horaria.

### Fase D: acceso y visibilidad

- **Administrador:** consulta y gestiona horarios de las ofertas permitidas por la aplicación; ve el calendario de acuerdo con los filtros disponibles.
- **Profesor:** solo consulta horarios y eventos de ofertas a las que tiene acceso en el periodo, grado y curso pertinentes. Reutiliza `profesorAlcance` y las reglas actuales de asignación manual/configurada donde correspondan.
- **Alumno y apoderado:** sigue las relaciones y los permisos que ya usan las páginas y endpoints para datos propios/vinculados. No expongas el calendario de otros alumnos ni datos globales por el mero hecho de estar autenticado.
- Los filtros enviados por cliente nunca sustituyen la autorización en backend. Prueba accesos directos a endpoints con IDs ajenos.
- Evita filtrar en React información que el endpoint no debía entregar al usuario.

## 5. Diseño de API y frontend

Antes de añadir rutas, amplía las rutas existentes si el contrato lo permite. Conserva formato de respuesta y paginación actuales.

Como mínimo, deja definida y consistente la consulta que alimenta:

- Horarios para un periodo/oferta, respetando el alcance del rol.
- Eventos del calendario de un rango de fechas y, cuando aplique, periodo/oferta.
- Creación, actualización y eliminación segura de horarios para administradores.

El calendario puede combinar horarios recurrentes y evaluaciones en el backend o en frontend, siempre que los permisos sean aplicados en el servidor, las fuentes estén tipadas y la consulta no genere carga excesiva. Evita duplicar lógica de autorización o convertir evaluaciones en eventos ficticios.

Añade o actualiza tipos TypeScript para respuestas, parámetros y formularios. Sustituye `any` en las superficies tocadas por tipos concretos cuando sea viable, siguiendo el estándar local.

## 6. Pruebas y criterios de aceptación

Usa las herramientas de prueba existentes y datos aislados. No borres ni cambies datos preexistentes para probar. Si la prueba requiere datos persistidos, registra el estado previo y limpia únicamente los registros creados por ella; ante riesgo de afectar información del usuario, usa mocks o una base de pruebas.

1. Admin crea un horario para una oferta concreta y aparece con su periodo, grado, curso, docente, día, rango y aula.
2. La misma materia configurada en dos grados se distingue; crear o consultar una no mezcla datos de la otra.
3. El sistema rechaza hora de fin anterior/igual al inicio, profesor no asignado según la política, IDs incoherentes y conflictos reales de profesor/oferta/aula.
4. Editar un horario no entra en conflicto consigo mismo; eliminar requiere los permisos apropiados y actualiza la vista.
5. Un profesor no puede listar ni manipular horarios de otro profesor/oferta enviando IDs o filtros manuales. Verifica la respuesta HTTP y ausencia de datos filtrados.
6. Un alumno/apoderado solo ve lo autorizado por las relaciones existentes; verifica la denegación de acceso a otros usuarios.
7. El calendario inicia en hoy, navega meses/años y marca correctamente ocurrencias semanales únicamente dentro del periodo.
8. Las evaluaciones visibles corresponden a registros existentes, fechas reales y ofertas permitidas. Sin registros, se presenta estado vacío, no ejemplos.
9. Cambiar de día/mes/periodo actualiza correctamente la agenda y no repite ni pierde eventos.
10. Comprueba fechas al inicio/fin del periodo, cambios de año, febrero bisiesto y riesgo de desfase por zona horaria.
11. Filas históricas de horario ambiguas se preservan sin asignación inventada. Confirma que la migración no duplica, elimina ni altera horarios.
12. Ejecuta pruebas enfocadas, `npx tsc --noEmit` en los paquetes frontend y backend que tengan ese script, y el build/test disponible. Prueba los módulos editados con Vite si el servidor ya está disponible.
13. Informa únicamente pruebas ejecutadas y resultados observados. Si falta infraestructura o una prueba no es segura, indícalo sin declarar éxito.

## 7. Entrega final

Al terminar, resume en español:

- Archivos modificados y migraciones agregadas.
- Modelo/identificador usado para asociar cada horario a una oferta.
- Estrategia aplicada para conservar horarios antiguos ambiguos.
- Cómo crear, editar, consultar y eliminar horarios; reglas de conflictos.
- Qué datos reales alimentan el calendario y cómo se proyectan las clases recurrentes.
- Cómo se controla el acceso de cada rol.
- Pruebas ejecutadas con resultados observados y aspectos pendientes.

No afirmes que un evento, acción, autorización o prueba funciona si no lo verificaste. No dejes datos de prueba ni procesos temporales innecesarios.
