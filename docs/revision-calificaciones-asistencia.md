# Revisión de calificaciones, evaluaciones y asistencia

Fecha: 23/10/2026. Alcance: navegación administrativa y docente, libros por oferta, rutas antiguas, consultas por periodo y persistencia. Se reutilizan los componentes y tablas existentes.

## Problemas corregidos

1. **Entrada administrativa incorrecta.** Calificaciones usaba el ID de usuario del administrador como ID de alumno, consultaba el catálogo general y mezclaba cursos y periodos. Ahora Calificaciones y Asistencias reutilizan el selector existente de ofertas por periodo, grado y curso. La asistencia administrativa deja de ofrecer todos los alumnos sin comprobar su matrícula en el curso seleccionado.
2. **Errores ocultos del libro.** Un fallo de carga aparecía como oferta inexistente. Ahora se muestra el mensaje del servidor con reintento. Si una escritura tiene éxito y falla la actualización posterior de pantalla, se informa del fallo de lectura sin presentar el registro como fallido ni mantener abierta una creación que ya terminó.
3. **Creación repetida y fecha fuera del periodo.** Crear evaluación no activaba el estado de guardado. Ahora hay bloqueo inmediato de envíos repetidos, indicador de carga y fecha inicial/reinicio acotada al periodo. No se inventó una clave de unicidad de evaluaciones por nombre o fecha.
4. **Escalas mezcladas.** El libro promediaba todas las evaluaciones juntas. Ahora la media simple usa únicamente evaluaciones de la misma oferta y escala que la seleccionada; se muestra el máximo. Las notas sin evaluación permanecen separadas y no intervienen en esa media. No se presenta como promedio final ni ponderado.
5. **Edición antigua con validación incompleta.** Administración podía superar el máximo de una evaluación o editar notas de una evaluación cerrada. Se comprueban existencia, tipos, escala, cierre y coincidencia de oferta para todos los roles. Un ID inexistente devuelve 404. Se permite guardar cero y limpiar observaciones. El profesor mantiene las comprobaciones de asignación, matrícula y periodo histórico de solo consulta.
6. **Registro antiguo de notas.** También para administración se validan IDs, fecha, matrícula activa y pertenencia al periodo. Se rechazan referencias de evaluación/oferta enviadas a una operación que antes las ignoraba: una nota vinculada se registra por el endpoint de su oferta y evaluación. Las rutas antiguas siguen admitiendo registros sin evaluación y escala desconocida para conservar compatibilidad; no se inventa su identidad ni un criterio de duplicado.
7. **Redondeo silencioso.** Las columnas de nota y máximo son DECIMAL(4,2). Se rechazan valores con más de dos decimales, máximos que redondearían a cero, booleanos y otros tipos inválidos.
8. **Asistencia antigua con NULL en la clave única.** MySQL permite repetir claves que contienen NULL. Las operaciones antiguas coordinan por alumno, validan matrícula y resuelven una oferta inequívoca para los registros con curso; actualizan esa oferta y no otra. La asistencia general sin curso conserva su tratamiento antiguo y comprueba existencia de alumno y duplicados bajo bloqueo. Los lotes son transaccionales y rechazan elementos repetidos. Si ya hay varias filas antiguas para la misma clave, se devuelve 409 y se solicita revisión, sin elegir ni borrar una arbitrariamente.
9. **Filtros y resúmenes.** El filtro de periodo de asistencia se aplica también a administración y consultas autorizadas de alumno. Los IDs y rangos inválidos devuelven 400. El resumen mensual obtiene el grado de la oferta o matrícula inequívoca, en vez del caché del perfil del alumno. La clasificación antigua ambigua permanece sin atribución.
10. **Consulta histórica y cargas.** Los campos de observación de asistencia también respetan el estado de solo consulta. Se bloquean cambios durante guardado, las fechas inválidas no conservan marcas utilizables de otra fecha y hay reintento de oferta/sesión/historial. Los envíos de notas/asistencia se limitan a alumnos de la lista activa, sin borrar el historial de quienes ya salieron.
11. **Coordinación con Estructura.** Crear evaluaciones y guardar lotes por oferta bloquea periodo y oferta en el mismo orden que Estructura/Horarios, con lectura vigente. La evaluación se bloquea al guardar notas; matrícula, cierre, asignaciones y periodo se comprueban antes de escribir. Las salidas de validación liberan la transacción.

## Diagnóstico de datos instalados

Se ejecutaron consultas agregadas en una transacción de **solo lectura**, sin mostrar identidades ni modificar filas:

| Comprobación | Resultado |
|---|---:|
| Notas vinculadas fuera de escala o sin evaluación existente | 0 |
| Notas cuya oferta difiere de su evaluación | 0 |
| Notas con curso/periodo inconsistente con su oferta | 0 |
| Notas sin evaluación vinculada | 32 |
| Asistencias sin oferta | 103 |
| Grupos de asistencias duplicadas | 51 |
| Grupos duplicados de asistencia general sin curso | 51 |
| Grupos duplicados con estados distintos | 0 |

Un grupo duplicado significa varias filas con el mismo alumno, fecha, curso y oferta; no significa 51 alumnos distintos. Que compartan estado no demuestra que actor, observación y demás datos sean intercambiables. Las 32 notas sin evaluación y las asistencias sin oferta son registros heredados, no evidencia automática de corrupción. No se convirtieron ni borraron.

## Reglas que requieren confirmación

- Cómo depurar los duplicados antiguos y conservar su trazabilidad: qué registro conservar y qué hacer con observaciones, autores y fechas. No se ejecutó una limpieza automática.
- A qué evaluación/escala corresponden las notas heredadas y cómo resolver una asistencia cuya oferta no sea inequívoca. No se eligió una correspondencia por suposición.
- Ponderación, nota final, regla de aprobación, publicación de notas y reapertura de evaluaciones cerradas. El modelo no define estas políticas; se conserva el cierre existente y la consulta histórica docente.
- Unicidad o idempotencia de una evaluación creada con igual nombre y fecha. El formulario impide el doble envío local; no se inventó que dos evaluaciones con el mismo nombre sean necesariamente la misma.

## Archivos principales

- Backend: `src/controllers/calificaciones.controller.ts`, `src/controllers/evaluaciones.controller.ts`, `src/controllers/asistencias.controller.ts`, `src/utils/ofertaAcademica.ts`, `src/utils/academicValidation.ts`.
- Frontend: `src/pages/academics/CalificacionesPage.tsx`, `AsistenciasPage.tsx`, `OfertaCalificacionesPage.tsx`, `OfertaAsistenciasPage.tsx`, `src/pages/teachers/ProfesorOfertasPage.tsx`.
- Pruebas: `backend/tests/profesores.test.cjs`, `backend/tests/profesores.integration.test.cjs`, `frontend/tests/e2e/calificaciones.spec.ts`.

## Validación

Comandos ejecutados desde las carpetas correspondientes:

```powershell
# backend
npm run test:profesores
npm run test:all
# frontend
npm run build
npm run test:e2e -- calificaciones.spec.ts
npm run test:e2e
# raíz
git diff --check
```

Las pruebas HTTP usan bases temporales y datos sintéticos. La base instalada solo se consultó en modo de lectura. No se aplicaron migraciones, modificaciones de cuentas ni correcciones de datos reales.

### Resultado final

- Suite completa del backend: correcta, incluida la regresión de duplicados existentes, periodos superpuestos y precisión decimal.
- Compilación del frontend: correcta; permanece el aviso de Vite por el tamaño del bundle.
- Suite completa de navegador: 30 pruebas correctas, en escritorio y móvil.
- Capturas del libro revisadas en ambos tamaños: evaluación, escala visible, cero persistente e historial separado.
- `git diff --check`: sin errores; avisos existentes de finales de línea en Windows.

Si el servidor se ejecuta con `npm start`, reiniciar el backend para cargar los controladores compilados y recargar el navegador.

## Fechas del libro y periodo anterior

La revisión de la captura confirmó que `2026-I` está configurado del 01/03/2026 al 15/07/2026 y aún marcado activo. El usuario aclaró que desconocía que estaba consultando el periodo anterior. No se extendieron sus fechas ni se cambiaron registros académicos. Para registrar octubre debe configurarse el periodo correspondiente con su estructura y matrículas, sin alterar el historial del anterior.

El libro ahora muestra el rango del periodo y avisa si la fecha actual queda fuera de él. La ventana de nueva evaluación explica el rango permitido; administración tiene acceso a Periodos para revisar el calendario. Se conserva la validación en frontend y backend. Se añadió una prueba de escritorio y móvil con la fecha fija 23/10/2026 y límite de periodo 15/07/2026.

Validación de este ajuste de fechas: `npm run build` correcto y `npm run test:e2e -- calificaciones.spec.ts` con 8 pruebas correctas en escritorio y móvil. Sin cambios de backend ni de base de datos.
