# Pagos

La sección usa los componentes existentes (DataTable, SearchInput, Modal, Badge y ConfirmDialog) y APIs administrativas autenticadas.

## Conceptos y registros

- **Matrícula:** `pagos_matricula`, un registro por alumno y periodo académico. Es un concepto financiero independiente. La tabla `matriculas` conserva las inscripciones por curso y no se usa como prueba de pago. Para registrar el cobro se selecciona una matrícula académica existente; el backend valida el alumno y deriva el periodo.
- **Mensualidad:** tabla existente `mensualidades`, un registro por alumno, periodo académico y mes/año. Mes/año identifica un mes calendario; dos octubres de distintos años son periodos mensuales distintos. Conserva importe, estado y fecha de pago propios. El curso histórico permanece, pero no es obligatorio ni forma parte de la clave del cobro.
- **Profesor:** tabla existente `sueldos`, un registro mensual por profesor y mes/año en las nuevas operaciones. El formulario solo pide profesor, mes/año y monto. Por decisión del usuario, las altas quedan **pagadas**, con fecha del registro en America/Lima. Las ediciones conservan el estado y fecha existentes; el historial pendiente puede confirmarse con Registrar pago.

Los cambios de estado no recalculan el sueldo ni borran los campos históricos de curso, salario base, horas y extras. En nuevas altas, salario_base y monto_total reciben el monto ingresado; horas y extras son cero. Una edición del monto actualiza monto_total; el desglose anterior queda como detalle histórico, no se vuelve a calcular usando la antigua tarifa de 50 por hora.

## Validación y errores

Los IDs deben ser enteros positivos y referirse a una persona y periodo existentes. El periodo académico es obligatorio en mensualidades; en pagos de matrícula se deriva de la inscripción elegida. Los meses aceptados son Enero–Diciembre; el año respeta el rango YEAR de MySQL (1901–2155). Los montos deben ser finitos, no negativos y tener hasta dos decimales, dentro de DECIMAL(10,2). Se permite cero como en el modelo existente; no se añadió una tarifa mínima.

Los estados de mensualidad siguen siendo pendiente, pagado, vencido y descuento. Matrícula usa pendiente/pagado. Sueldos conserva pendiente/pagado/rechazado para consultar y actualizar el historial. Pagado exige una fecha calendario válida; al volver a un estado sin pago, fecha_pago queda vacía.

Duplicados devuelven HTTP 409; validaciones HTTP 400; registros inexistentes HTTP 404. Las escrituras usan transacciones y bloqueo de la persona para evitar duplicados concurrentes. La interfaz confirma éxito solo después de la respuesta del backend y muestra errores del servidor sin cerrar el formulario. Los errores de consultas se muestran con Reintentar; no se representan como datos vacíos exitosos.

## Consultas

- `/api/pagos-matricula`: GET, POST; `/:id`: GET, PUT, DELETE; `/resumen`: GET.
- `/api/mensualidades` y `/api/sueldos`: mantienen sus rutas CRUD y `/resumen`.
- Mensualidades mantiene `/alumnos-con-deuda`, incluyendo pendiente y vencido.
- Listas y resúmenes admiten búsqueda, estado y, en alumnos, `periodo_academico_id`. Mensualidades y sueldos admiten `mes` y `año`. Cambiar de concepto limpia filtros incompatibles y reinicia la paginación.
- Los totales se consultan en la tabla del concepto elegido y usan los mismos filtros que la lista. Pendiente incluye vencido en mensualidades; descuento y rechazado no se contabilizan como pagado ni pendiente. Los estados no se infieren de otro concepto.

Ejemplo de pago de matrícula: `{"alumno_id":1,"matricula_id":1,"monto":120,"estado":"pendiente"}`. No se envía el periodo; enviarlo no altera el periodo obtenido por el servidor. Las ediciones conservan el alumno y periodo del pago.

Ejemplo de mensualidad: `{"alumno_id":1,"periodo_academico_id":1,"mes":"Octubre","año":2026,"monto":200,"estado":"pendiente"}`.
Ejemplo de sueldo: `{"profesor_id":1,"mes":"Octubre","año":2026,"monto":700}`.
Para confirmar un pago pendiente: PUT `/:id` con `{"estado":"pagado","fecha_pago":"2026-10-07"}`. No hace falta reenviar el monto.

## Migración y datos existentes

Para una base nueva, usar `database/schema.sql`. Para una existente, desde backend:

```sh
npm run migrate:payments
```

El script `scripts/migrate-payments.cjs` aplica `database/migrations/separate_payments.sql` y agrega índices únicos cuando corresponde. Puede repetirse. Conserva las filas e importes anteriores, hace opcional curso en mensualidades/sueldos y periodo académico en sueldos, y crea la tabla de pagos de matrícula. No crea cargos automáticamente ni convierte inscripciones en pagos.

Antes de cambiar la estructura revisa duplicados de mensualidades; si existen, se detiene sin borrar ni sumar datos. Los sueldos históricos duplicados por profesor y mes/año se conservan y generan un aviso: el índice único de sueldos queda pendiente de revisión. En ese caso, las altas y modificaciones de la API siguen protegidas por transacción y bloqueo del profesor. Se permite actualizar importe/estado/fecha de un sueldo histórico sin cambiar su profesor o mes/año, aunque haya otro registro histórico con esa clave; esto no crea un nuevo duplicado. No hacer inserciones directas de sueldos fuera de la API en una base con ese historial pendiente. Las bases nuevas y las existentes sin duplicados tienen el índice único adicional.

La aplicación no identifica si un cobro histórico se guardó erróneamente como mensualidad de matrícula. No se convierte ningún cobro sin revisión explícita.

## Reglas que necesitan confirmación

El código no define tarifas de matrícula/mensualidad, meses exigibles, vencimientos, fraccionamiento, descuentos ni si un pago requiere una inscripción académica activa. Se mantiene el registro manual con referencias válidas; no se generan cargos, importes ni vencimientos automáticos. El estado descuento se conserva sin reinterpretarlo como pago o deuda.

Si hay sueldos históricos por curso en el mismo mes, debe confirmarse si corresponden a pagos independientes válidos o a duplicados antes de consolidarlos e instalar el índice único sobre todo el historial. No se suman ni eliminan automáticamente.

## Validación

```sh
cd backend
npm run test:payments
npm run test:payments:db
cd ../frontend
npm run build
```

Las pruebas unitarias cubren validación, fallos de escritura, rollback, duplicados, 404, filtros de resumen y conservación del sueldo histórico. Las de integración usan rutas HTTP reales con JWT y MySQL en una base temporal `payments_test_*`, que se elimina al terminar. Comprueban separación en ambos sentidos, unicidad, concurrencia, filtros por periodo/mes/año, registro de profesor sin curso, migración repetible, historial y lectura desde una conexión independiente. Requieren MySQL local y permiso para crear/eliminar exclusivamente la base temporal. No usan registros reales para crear pagos de prueba.

## Registro del alumno, matrícula y detalle

El alta y edición del alumno guardan sus datos personales. No aceptan grado_id ni periodo_academico_id: estos valores se establecen mediante la matrícula académica. Se conserva la información ya guardada y no se modifica el historial. Para crear una matrícula se validan alumno, periodo y grado; se reutiliza la inscripción automática de cursos configurados. No se generan cursos cuando no hay configuración.

GET /api/alumnos/:id devuelve matriculas_academicas, agrupadas por periodo y grado, con inscripciones y referencia al pago único por alumno/periodo. GET /api/alumnos/:id/matriculas devuelve esos mismos grupos para elegir la matrícula a pagar. Si existen varias filas de curso, el formulario las reúne en una sola opción financiera por periodo; si hay un solo periodo disponible, lo selecciona automáticamente. Los cursos se consultan desde matriculas/cursos, no se copian a pagos_matricula.

El detalle muestra los cursos desde la inscripción y el aviso Matrícula pendiente de pago hasta que se registre un pago realizado. Al entrar, volver a enfocar la ventana o pulsar Actualizar, consulta el estado persistido. Gestionar matrícula conduce al formulario administrativo existente para establecer grado/periodo/cursos sin duplicar ese flujo.

Un alumno consulta solo su propio detalle; apoderados mantienen la comprobación de vínculo. Profesores ven únicamente cursos dentro de su alcance y no reciben el bloque financiero. Los errores se muestran con Reintentar. Sin matrícula, la interfaz indica Sin matrícula sin inventar un estado nuevo en la base.

No se necesita otra migración: el vínculo financiero sigue siendo alumno_id + periodo_academico_id y el representante matricula_id se obtiene de las inscripciones existentes. Se exige matrícula existente, pero no se añadió una regla sobre su estado académico; si se quiere impedir cobros de inscripciones canceladas, debe definirse expresamente.
