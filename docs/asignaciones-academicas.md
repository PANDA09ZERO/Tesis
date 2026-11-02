# Asignaciones académicas: fuente única

Implementación del 21/10/2026, a partir de `PROMPT-unificar-asignaciones-academicas.md`.

## Flujo de trabajo

1. Registrar el curso en el catálogo y los datos personales del profesor.
2. En **Estructura académica**, elegir periodo, habilitar grados/cursos y asignar los docentes responsables de cada oferta.
3. Consultar esa misma relación desde Cursos y el detalle del Profesor. Los accesos a Estructura llevan el contexto disponible y no crean otra asignación.
4. En **Horarios**, elegir una oferta existente y añadir día, inicio, fin y aula. Con un único docente activo se completa automáticamente y se muestra su nombre. Con varios se elige quién dicta ese bloque. Sin docentes activos no se permite crear el horario y se ofrece un acceso a Estructura.

La oferta es `periodo_grado_cursos`; sus responsables están en `periodo_grado_curso_profesores`. Se conserva la posibilidad de varios docentes por oferta. La asignación se identifica por oferta/docente, no solamente por curso del catálogo. `cursos.grado_id` sigue siendo un dato heredado de catálogo; no sustituye el grado de la oferta.

## Contratos y permisos

Se reutilizan las rutas de `configuracion-academica` y las tablas existentes; no se añadió una migración ni una segunda fuente de asignaciones.

- Crear/editar Profesor ya no escribe `profesor_curso`. Un payload con `cursos`, incluso vacío, devuelve 400 y explica que la asignación se realiza desde Estructura. Actualizar los datos del perfil conserva las responsabilidades académicas.
- Las consultas de Profesor exponen los cursos/ofertas con grado y periodo, incluso sin horario. Sus alumnos se obtienen de matrículas vigentes del grupo exacto; no del grado guardado en la ficha personal del alumno.
- El catálogo y su detalle calculan profesores a partir de las ofertas. Las consultas del profesor quedan acotadas a sus asignaciones y al periodo correspondiente.
- Los permisos de profesores, ofertas, matrícula, alumnos, notas, asistencia, calendario, dashboard y consultas académicas no aceptan ya la alternativa `profesor_curso.origen='manual'`.
- El estudiante obtiene los docentes de su oferta matriculada. Los horarios sin oferta no se atribuyen a un grado por el catálogo para mostrarlos a alumnos, apoderados o profesores; se conservan para revisión administrativa.
- Administrador y superadministrador mantienen sus atribuciones. Los periodos históricos del profesor siguen siendo de consulta. Documentos no se reintrodujo en el panel del apoderado.

## Horarios

El servidor valida la oferta y deriva curso, grado y periodo. Si se envían campos redundantes contradictorios, responde 400. Un `profesor_id` explícito siempre se comprueba; no se reemplaza un ID inválido por el docente predeterminado. Si se omite, solo se completa cuando hay exactamente un candidato activo.

Editar hora/aula conserva el responsable existente. Cambiar de oferta exige validar de nuevo su relación docente. Una nueva sesión no admite docentes inactivos. Se mantiene la edición de un registro ya existente con su mismo docente inactivo y oferta, conservando esa responsabilidad explícita; esto no autoriza nuevas altas ni transferencias hacia docentes inactivos. La interfaz identifica el estado del responsable.

Se mantienen los conflictos de profesor, oferta/grupo y aula. Las operaciones académicas usan el periodo y la oferta como puntos de coordinación. Las referencias se leen con aislamiento READ COMMITTED en las mutaciones de estructura para no decidir una retirada con una vista anterior a un horario recién confirmado. Los conflictos de bloqueo se devuelven como 409 para actualizar y reintentar. Las transacciones se revierten también al salir por validación.

## Protección del historial

- No se retira una asignación con horarios o registros académicos del docente vinculados a ella. Las referencias antiguas ambiguas se tratan conservadoramente.
- No se elimina una oferta o grado con matrículas, sesiones, evaluaciones, calificaciones o asistencia vinculadas.
- Tampoco se elimina un curso del catálogo con ofertas o historial que pudiera perderse por una cascada.
- No se borran relaciones generales antiguas ni se reconstruyen mediante `syncProfesorCurso`. El clonado copia únicamente asignaciones específicas y omite docentes inactivos o inexistentes, sin duplicar las relaciones al repetirse.

No existe una vigencia por docente ni un flujo de sustitución retroactiva definido en el modelo actual. Cuando hay referencias, se bloquea el retiro y se conserva el historial; no se inventa una reasignación automática. Una futura política de reemplazo con historial requiere una definición institucional y, si procede, un modelo de vigencia explícito.

## Revisión de datos existentes

Se hizo diagnóstico **de solo lectura** sobre la instalación local. Resultado del 21/10/2026:

| Comprobación | Cantidad |
|---|---:|
| Asignaciones específicas | 9 |
| Relaciones generales manuales | 19 |
| Relaciones manuales sin ninguna asignación específica equivalente | 16 |
| Docentes con esas relaciones pendientes | 5 |
| Horarios sin oferta | 0 |
| Asignaciones a docentes inactivos | 0 |
| Relaciones generales o específicas huérfanas | 0 |

Las cifras son una fotografía, no una regla de negocio. Una relación general que tiene alguna coincidencia específica tampoco concede acceso a otros grados/periodos del curso. Ninguna de las relaciones manuales se utiliza como permiso después de esta corrección.

Para repetir el informe agregado, sin imprimir datos personales ni modificar registros:

```bash
# Desde backend
npm run academic:diagnose
```

El administrador debe revisar las relaciones pendientes y registrar explícitamente las ofertas que correspondan desde Estructura. No basta con que exista un único candidato o un periodo activo para atribuir datos antiguos a ese contexto. El código no convierte ni elimina esos registros. Antes de publicar el cambio con datos institucionales, completar esta revisión para evitar que docentes dependientes de permisos generales queden sin las asignaciones que realmente les correspondan.

## Archivos principales

- Backend: `utils/profesorAlcance.ts`, `utils/ofertaAcademica.ts`, `utils/estudianteAlcance.ts`; controladores de configuración, profesores, cursos, horarios, calificaciones y estudiante; seed de demostración; diagnóstico agregado.
- Frontend: Profesores, detalle de Profesor, Cursos, detalle de oferta, Estructura académica y Horarios, junto con el contrato del curso asignado.
- Validación: `tests/asignaciones.integration.test.cjs`, pruebas de profesores/estudiantes/pagos adaptadas a asignaciones específicas, fixture de navegador y `frontend/tests/e2e/asignaciones.spec.ts`; ejecutor y CI. `utils/operations.ts` y sus pruebas evitan contar como activa una petición que el navegador ya cerró antes de registrar sus eventos.

## Validación

La nueva suite instala un esquema completo en una base temporal sintética. Comprueba asignación única, rechazo de permisos manuales, actualización del perfil sin borrar relaciones, resolución del docente, contratos inválidos, varios responsables, duplicados concurrentes, cruces, protección de referencias, conservación de responsables inactivos en edición, clonado y retiro concurrente con alta de horario. Esta última carrera se repite ocho veces y exige que no quede ninguna sesión sin asignación.

El navegador comprueba el formulario de Profesor, los accesos a Estructura, el docente único, selección entre varios, oferta sin responsable, error y reintento de consulta, y respuestas tardías al cambiar de oferta, en escritorio y vista móvil.

Comandos utilizados desde las carpetas respectivas:

```bash
# Backend
npm run test:all
node scripts/diagnose-academic-assignments.cjs
# Frontend
npm run build
npm run test:session
npm run test:e2e
```

Los ensayos de escritura utilizan exclusivamente bases y archivos sintéticos aislados. No se aplicaron DDL, migraciones, conversiones de asignaciones, cambios de cuentas ni modificaciones académicas a la base instalada.

## Resultado de la validación (21/10/2026)

- Suite completa del backend (`npm run test:all`): correcta.
- Compilación del frontend: correcta; continúa el aviso de tamaño del bundle de Vite.
- Sesiones del frontend: 6 pruebas correctas.
- Navegador: 24 pruebas correctas entre escritorio y móvil, incluidas las nuevas de asignaciones.
- Capturas del formulario de Horarios revisadas en ambos tamaños.
- `git diff --check`: sin errores de espacios; avisos existentes de conversión de finales de línea en Windows.
