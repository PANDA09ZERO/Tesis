# Expediente estudiantil

En **Documentos → Expediente estudiantil**, selecciona un alumno por nombre, apellido o código.

- **Libreta de notas:** elige un periodo académico y uno de los grados con registros. Cada curso conserva las evaluaciones y sus escalas. Las evaluaciones sin nota muestran «Sin registrar»; los registros históricos sin escala permanecen identificados. Las notas finales y la condición de aprobación se calculan según las reglas configuradas.
- **Historial académico:** consulta las matrículas e inscripciones de cada grado y periodo, con acceso a su libreta.
- **Asistencia:** resumen por estado del grado y periodo seleccionados. La asistencia histórica sin periodo inequívoco se informa aparte.
- **Ficha y apoderados:** identidad, contactos y apoderados vinculados.
- **Documentos vinculados:** descarga o adjunta archivos al alumno seleccionado. Los archivos nuevos siguen las categorías y validaciones de Documentos.

## Imprimir

Pulsa **Imprimir libreta seleccionada**. El formato A4 incluye únicamente la libreta elegida, con identificación del alumno, grado, periodo, evaluaciones, fecha de emisión y espacio para firma/sello. Puedes seleccionar «Guardar como PDF» en el diálogo de impresión del navegador.

La preliminar se actualiza desde los registros académicos. Cada emisión definitiva conserva una copia independiente de sus notas, reglas y resultados; se puede seleccionar e imprimir una versión anterior.

## Acceso y compatibilidad

La sección mantiene el acceso administrativo de Documentos. El endpoint `GET /api/alumnos/:id/expediente` exige autenticación y rol administrador. No expone contraseñas, datos financieros ni documentos de otros alumnos. Las reglas y las versiones requieren la migración aditiva indicada más abajo. La atribución de notas/asistencia a grados y periodos reutiliza las fuentes de Reportes.

Los formularios y sus respuestas anteriores siguen disponibles en **Solicitudes**.

## Validación

- Backend: `npm run build`.
- Frontend: `npm run build`.
- E2E: `npm run test:e2e -- expediente.spec.ts` (móvil y escritorio, base temporal y archivos sintéticos).

## Cálculo automático y emisión definitiva

En la libreta seleccionada, pulsa **Configurar reglas**. Las reglas corresponden al grado y periodo y se comparten entre sus alumnos y cursos.

- Propuesta inicial editable: escala numérica 0–20, mínimo 11, un decimal; prácticas 30 %, trabajos/proyectos 30 % y exámenes 40 %. Esta propuesta no habilita emisión hasta que se guarde y revise.
- La nota de cada categoría es la media simple de sus evaluaciones originales. Luego se aplican los porcentajes; deben sumar 100 %. Las categorías con peso cero se excluyen. No se redistribuyen porcentajes por notas faltantes.
- La conversión entre escalas requiere autorización explícita y usa `nota / máximo original × escala elegida`.
- La escala literal es configurable mediante los cortes mínimos AD, A y B; C queda por debajo de B. Los cortes iniciales 17/14/11 son editables, no una regla oficial de la institución.
- Recuperaciones: una recuperación por evaluación original, dentro del mismo curso/grado/periodo. Se puede elegir mayor nota, reemplazo o promedio de ambas. La recuperación no se pondera como una evaluación adicional. El reemplazo puede cubrir una original faltante; las otras modalidades requieren ambas notas.
- Se redondea una sola vez al final. La aprobación y los niveles literales se determinan con esa nota final redondeada.
- Las notas históricas sin evaluación vinculada no se usan automáticamente: requieren revisión y exclusión explícita, conservando su visualización.
- Las matrículas canceladas se identifican como «No aplica». Los cursos pendientes o sin matrícula revisada bloquean la emisión.

Después de revisar, marca el cierre del grado/periodo y guarda. Cada alumno requiere además notas completas y confirmación individual de revisión para **Emitir versión definitiva**. El cierre corresponde a las reglas de emisión; no bloquea las correcciones académicas en los libros de notas.

Las versiones emitidas guardan una copia de identificación, notas, reglas y resultado. La lista **Versión para consultar e imprimir** permite recuperar cualquier versión. Corregir una nota no cambia las versiones anteriores; una nueva emisión crea una versión adicional. El servidor rechaza emisiones si cambiaron notas o reglas desde la revisión y protege los reintentos contra duplicados.

### Instalación y pruebas de las reglas

- Migración aditiva: `npm run migrate:libretas` en backend. Crea `libreta_reglas` y `libreta_emisiones`, sin modificar las notas existentes.
- Cálculo: `npm run test:libretas` en backend.
- Flujo completo: `npm run test:e2e -- libretas-reglas.spec.ts` en frontend.
