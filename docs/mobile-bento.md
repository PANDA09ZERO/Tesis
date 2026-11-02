# Interfaz móvil Bento

Propuesta editable: https://www.figma.com/design/i1eFrtvXxx3VTP4tcvOaQ1

El archivo incluye Inicio, Directorio, Ficha expandida, Registro académico y Módulos; seis variables de color y un componente de registro reutilizable. Figma alcanzó el límite de llamadas del plan Starter antes de la revisión con captura.

## Aplicación

- DataTable presenta registros como tarjetas desplegables en pantallas menores de 640 px. Prioriza el nombre, título o curso como identidad y permite acceder a los campos y acciones al tocar la tarjeta.
- ResponsiveRecordTable convierte los registros específicos de asistencia, notas y alumnos de una oferta en divs y detalles nativos. Solo monta un conjunto de controles según el tamaño de pantalla y conserva los valores en el estado de cada formulario.
- Las tarjetas alternan anchuras en una cuadrícula bento. La tarjeta abierta ocupa todo el ancho; por debajo de 360 px se usa una columna.
- El panel tiene accesos desde sus estadísticas. El catálogo de módulos, formularios y diálogos comparten radios, contraste y objetivos táctiles.
- Se conserva la presentación de tablas en escritorio y la impresión existente.

## Verificación

`npm run build`

`npm run test:e2e -- bento-mobile.spec.ts --project=mobile`

`npm run test:e2e -- calificaciones.spec.ts --project=chromium`

La prueba móvil recorre alumnos, profesores, usuarios, reportes, documentos, calificaciones, asistencia y módulos. Comprueba apertura/cierre, campos únicos, persistencia al plegar y cambiar de ancho, ausencia de tablas visibles en teléfono y desbordamiento a 320 px. Las pruebas usan una base temporal con datos sintéticos. No equivalen a una auditoría de todas las rutas y roles.
