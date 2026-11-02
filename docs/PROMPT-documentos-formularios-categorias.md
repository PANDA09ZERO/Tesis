# PROMPT — Documentos, categorías y formularios ligeros

> Copia todo este texto en una sesión nueva del agente (modo Act). Es autocontenido y está pensado para implementar esta funcionalidad en el sistema existente.

## 0. Contexto del proyecto

Trabaja en el **Sistema Inteligente de Gestión Educativa** de `C:\xampp\htdocs\Tesis`.

- Backend: Node.js, Express, TypeScript y `mysql2/promise`.
- Frontend: React, TypeScript, Vite, Tailwind, Axios y `react-hot-toast`.
- Persistencia: MySQL. Los archivos subidos se guardan actualmente en el sistema de archivos local.
- No hagas commit ni push. Revisa `git status` y conserva todos los cambios preexistentes; no reviertas ni sobrescribas cambios ajenos.
- No expongas credenciales, tokens, datos personales en logs ni el contenido de documentos a servicios externos.

Usa los patrones existentes del repositorio: `sendSuccess`/`sendError`, pool compartido, middleware de autenticación/autorización, paginación, componentes compartidos (`Modal`, `ConfirmDialog`, `DataTable`, `SearchInput`) y `frontend/src/api/endpoints.ts`.

## 1. Diagnóstico conocido: verifica antes de cambiar

Confirma primero el estado real de los archivos, rutas y esquema:

- `frontend/src/pages/documents/DocumentosPage.tsx` ofrece búsqueda, filtro por categoría y listado paginado, pero las categorías son una lista estática en frontend. El flujo visible sube archivos.
- `backend/src/controllers/documentos.controller.ts` consulta documentos, sube/actualiza/elimina registros y filtra algunos resultados de profesores. Revisa cuidadosamente alcance por rol, propietario, alumno/apoderado y validación de cada endpoint antes de reutilizarlo.
- `backend/src/routes/documentos.routes.ts` contiene las rutas de documentos y `backend/src/middleware/upload.ts` configura almacenamiento local, tipos admitidos y el límite actual del archivo. No supongas que la validación por extensión/MIME o la eliminación actual son suficientes.
- `database/schema.sql` incluye `documentos` con categoría/subcategoría como texto, URL, tamaño, propietario y estado, y `documentos_historial`.
- `frontend/src/api/endpoints.ts` y `frontend/src/types/index.ts` ya tienen la superficie API y el tipo `Documento`.
- La pantalla puede obtener listas paginadas; conserva esa propiedad y verifica cualquier diferencia entre la firma frontend, el controlador y el envoltorio de respuesta.

Inspecciona además las instrucciones del repositorio, los roles reales, relaciones alumno-apoderado, middleware de archivos, manejo de uploads estáticos, historial, migraciones y configuración del frontend. Traza los flujos hasta SQL y almacenamiento. No des por vigente ningún supuesto sin comprobarlo.

## 2. Objetivo funcional

Completar la sección de documentos para que el usuario autorizado pueda:

1. Organizar documentos usando categorías existentes y permitir que administración cree, renombre o archive categorías desde la aplicación cuando sea necesario.
2. Crear **formularios digitales** reutilizables sin subir un archivo obligatorio: definir campos, publicarlos, permitir que los usuarios autorizados los completen y guardar/envíar las respuestas.
3. Subir documentos como archivos y asociarlos a una categoría; conservar metadatos y sus permisos.
4. Consultar y gestionar todo con una experiencia ligera, sin cargar archivos completos ni previsualizaciones de todos los documentos al abrir la página.

La lista debe distinguir visualmente **Archivo** y **Formulario**. Un formulario es una plantilla estructurada con envíos persistidos, no una colección de documentos inventados ni un archivo vacío. No se exige exportación a PDF en esta fase. Si la generación de PDF no existe ya, no la agregues por defecto: guardar y consultar respuestas es el resultado esperado.

## 3. Diseño ligero y persistencia

### Categorías

- Sustituye la lista hardcodeada por categorías persistidas, reutilizables en filtros, formularios y cargas de archivos.
- Solo administración crea, renombra o archiva categorías. Evita duplicados por espacios/capitalización mediante validación del backend y una restricción apropiada cuando sea compatible.
- Conserva categorías actuales de `documentos.categoria`: inspecciona valores distintos y crea una migración de adopción que los preserve. No borres, renombres ni asignes una categoría automáticamente si la correspondencia no es inequívoca.
- Archivar una categoría no borra documentos ni respuestas. No debe aparecer como opción para nuevos registros, pero debe seguir mostrándose en elementos ya asociados.
- Incluye estado vacío y errores al cargar categorías; no ocultes fallas del servidor con la lista ficticia anterior.

### Formularios

- Implementa plantillas reutilizables administradas por roles autorizados (como mínimo, administrador; revisa el modelo de permisos antes de permitir autores adicionales).
- Cada plantilla debe tener título, descripción opcional, categoría, estado (borrador/publicada/archivada), creador y fechas de auditoría.
- Permite definir un conjunto acotado de campos: texto corto, texto largo, número, fecha, correo, selección de opciones y casilla. Un campo debe tener etiqueta, requerido/opcional y, cuando aplique, opciones o límites básicos.
- Valida el esquema de campos en backend al guardar la plantilla y valida todos los valores nuevamente en backend al enviar una respuesta. No confíes en el navegador.
- Las personas autorizadas pueden completar una plantilla publicada; guarda cada envío vinculado a plantilla y usuario y conserva fecha de envío. Si el sistema necesita formularios asociados a alumno, periodo o vencimiento, reutiliza relaciones existentes solo cuando su semántica sea clara; no derives vínculos a partir de IDs no validados.
- No permitas editar una plantilla publicada de manera que se altere retroactivamente el significado de respuestas ya enviadas. Usa borrador/versionado simple o bloquea cambios estructurales después del primer envío y exige una copia/versión nueva. Documenta el comportamiento.
- Formularios archivados dejan de admitir nuevos envíos, pero las respuestas históricas autorizadas siguen consultables.
- Mantén la definición de campos compacta (por ejemplo, JSON validado por backend en la plantilla) y las respuestas separadas de la plantilla. No almacenes archivos/base64 dentro de MySQL ni uses una tabla de documentos para guardar respuestas sin esquema.

### Archivos

- Reutiliza el almacenamiento de archivos existente si es adecuado; la base de datos conserva metadatos y referencia, no bytes/base64.
- Conserva o mejora el límite actual de tamaño de carga, expresándolo en interfaz y validándolo en servidor. No aumentes el límite sin una necesidad demostrada.
- Acepta únicamente los tipos ya soportados que sean necesarios. Revisa la validación conjunta de extensión y MIME; no confíes solo en `Content-Type` del cliente. Guarda con nombre interno generado, limita el nombre original y evita traversal, rutas controladas por el usuario y colisiones.
- No leas/transformes/previsualices todos los archivos para renderizar la lista. Usa metadatos paginados y solicita descarga o vista previa solo al abrir un documento individual.
- Agrega una acción visible para **ver** el archivo cargado sin obligar a descargarlo. La vista previa debe solicitar el archivo protegido solo cuando el usuario la abre y mostrar PDF e imágenes compatibles dentro de la aplicación. Para formatos que el navegador no pueda previsualizar (por ejemplo DOC/DOCX), explica la limitación y ofrece descargarlo para abrirlo. Conserva la acción de descarga separada.
- Si el almacenamiento local impide acceso seguro o despliegue consistente, informa la limitación y conserva la abstracción existente; no migres automáticamente a nube ni agregues servicios externos.
- Eliminar un documento debe validar permisos, sincronizar la eliminación de metadatos/historial según el modelo y borrar el archivo correcto sin permitir rutas arbitrarias. Limpia el archivo nuevo si falló la inserción luego de guardarlo; no dejes huérfanos.

## 4. Rendimiento y experiencia de usuario

- Mantén paginación del servidor (tamaño de página razonable, por ejemplo 20); búsqueda con debounce; filtros por categoría, modalidad y estado. El total y las páginas deben corresponder a los filtros.
- No solicites el contenido binario o todas las respuestas al cargar el listado. Evita una consulta por fila; usa consultas agrupadas/paginadas y límites.
- Carga el detalle, historial, archivo o respuestas solo al abrir ese documento/formulario. Muestra metadatos y tamaño legible, no contenido embebido masivo.
- Si se agrega vista previa de PDF/imagen, debe ser bajo demanda, aislada al detalle y nunca abrirse automáticamente para todos. No crees miniaturas duplicadas sin necesidad.
- Permite abrir la vista previa de un archivo desde su fila; cerrar la vista previa debe liberar los recursos temporales del navegador. La vista previa no debe saltarse autenticación ni autorización, y no debe exponer `/uploads` públicamente.
- Presenta estados explícitos de carga, error, vacío, guardado y envío. Evita botones que aparenten funcionar sin acción, doble envío y pérdida accidental de datos.
- Para formularios largos, muestra progreso/error por campo y confirma el envío. Evita guardar silenciosamente respuestas incompletas.
- Usa controles accesibles y responsivos siguiendo Tailwind/componentes locales; evita instalar bibliotecas nuevas si no son necesarias.

## 5. Roles, privacidad y seguridad

Revisa la matriz real de permisos y aplícala consistentemente en frontend y backend:

- **Administrador:** gestiona categorías y plantillas según las reglas anteriores, ve documentos autorizados y puede eliminarlos conforme al permiso actual.
- **Profesor:** puede crear/subir documentos solo dentro del alcance que permitan los permisos existentes; no debe poder asignarse otro profesor ni acceder a documentos privados ajenos manipulando IDs.
- **Alumno:** ve y completa únicamente los documentos/formularios que el sistema ya le permita por su identidad, matrícula o asignación.
- **Apoderado:** solo ve la información de los alumnos vinculados y las respuestas/documentos que la política existente autorice.

No abras datos personales o respuestas de formularios a todos los usuarios autenticados. Cada ruta de listado, detalle, descarga, modificación y envío debe verificar propietario, rol y relación. Los filtros enviados por cliente no son autorización.

Además:

- Valida IDs, categoría activa, estado de plantilla, pertenencia de alumno/autor y tamaño/tipo del archivo en servidor.
- Protege archivos frente a ejecución, traversal y acceso directo fuera del permiso del documento. Si la carpeta `/uploads` se sirve estáticamente sin control, sustituye el acceso de documentos protegidos por una ruta de descarga autorizada o documenta la política pública solo si ya era intencional.
- No devuelvas paths absolutos, nombres internos sensibles, datos de otros usuarios ni errores SQL.
- Mantén un historial útil para acciones existentes; registra creación/edición/envío/archivo/eliminación cuando corresponda, evitando guardar respuestas sensibles completas en logs.
- Usa transacciones al crear/modificar varias entidades relacionadas. En la eliminación de archivos, diseña el orden para no perder la referencia si el borrado físico falla; presenta explícitamente el error.

## 6. Esquema y migraciones

1. Antes de modificar tablas, inspecciona datos actuales, restricciones, tipos y migraciones aplicadas.
2. Diseña migraciones incrementales e idempotentes donde siga el patrón local. Preserva todos los documentos e historial; no recrees tablas ni resetees la base de datos.
3. Normaliza la categoría con el menor cambio seguro. Si se incorpora `categoria_id`, conserva inicialmente el texto histórico o migra solo mapeos validados; no asignes una categoría genérica por defecto a filas ambiguas.
4. Separa las entidades necesarias para categorías, plantillas/campos y envíos/respuestas. Usa índices para filtros/listados y claves foráneas con eliminación/archivo compatibles con la retención de datos.
5. Si el sistema ya tiene entidades o migraciones equivalentes, amplíalas en vez de crear duplicados.
6. Actualiza `database/schema.sql` solo para mantenerlo coherente con las migraciones y el estándar de la base. Documenta cómo se conservan documentos existentes.

## 7. Plan de implementación

### Fase A: diagnóstico

- Lee instrucciones del repo y `git status`.
- Revisa página, componentes, hooks de paginación/búsqueda, API, tipos, controladores, rutas, middleware de auth/upload, esquema, migraciones y permisos.
- Reproduce el comportamiento actual con lecturas y separa datos reales de UI simulada.
- Presenta una hipótesis local comprobable para categorías, respuestas digitales, almacenamiento y permisos antes de modificar código.

### Fase B: categorías y navegación del listado

- Agrega endpoints protegidos de lectura y administración CRUD/archivo para categorías según el patrón existente.
- Reemplaza la lista fija del cliente y añade filtro/modal de gestión solo para administración.
- Migra categorías históricas sin perder documentos.

### Fase C: formularios digitales

- Agrega el modelo, endpoints y validación de plantillas y envíos.
- Conecta creación/edición/publicación/archivo con formularios de campos limitados y validaciones de accesibilidad.
- Implementa vista/llenado/envío y consulta del estado/respuestas según permisos.
- Conserva la inmutabilidad semántica de formularios con envíos existentes.

### Fase D: cargas de archivos y ligereza

- Mejora el formulario de carga para asociar categoría y metadatos sin exponer opciones no autorizadas.
- Corrige verificación de tamaño/tipo/nombre, permisos de descarga y limpieza de archivos ante fallas.
- Agrega vista previa de PDF e imágenes bajo demanda desde cada archivo; mantiene la descarga disponible y ofrece un mensaje/alternativa de descarga para formatos sin vista previa del navegador.
- Conserva carga paginada y baja solo contenido al solicitar el detalle/vista previa/descarga. El listado nunca renderiza el contenido del archivo.

### Fase E: validación

- Ejecuta pruebas enfocadas, build/TypeScript de backend y frontend y verificaciones de integración disponibles.
- Prueba roles reales y accesos directos a rutas con IDs propios y ajenos.
- Usa base/datos aislados o mocks. Si necesitas tocar datos locales, registra el estado previo y revierte únicamente tus registros; nunca borres ni actualices documentos preexistentes.

## 8. Pruebas y criterios de aceptación

1. Categorías se cargan desde backend; un administrador crea/renombra/archiva una categoría. No se permiten nombres vacíos ni duplicados por diferencias triviales de espacios/capitalización.
2. Una categoría archivada deja de estar disponible en nuevas cargas/formularios y sigue visible en documentos históricos sin pérdida.
3. Las categorías existentes se conservan y cada documento previo mantiene su categoría representada.
4. Admin crea una plantilla con texto requerido, fecha, opción y casilla; se publica, se abre, se completa y su envío persiste con identidad/fecha.
5. El servidor rechaza plantilla inválida, campo requerido ausente, valor de tipo incorrecto, opción no declarada, IDs incoherentes y envíos a plantillas borrador/archivadas.
6. Una plantilla con envíos no cambia retroactivamente la estructura de respuestas; valida el flujo de borrador/nueva versión o el bloqueo elegido.
7. Profesor/alumno/apoderado solo consultan y envían lo autorizado. Intentos con IDs de otras personas se deniegan; no basta con ocultar botones.
8. Archivo válido dentro del límite se sube con metadatos/categoría y puede consultarse/descargarse por usuarios autorizados. PDF e imágenes se pueden previsualizar al abrirlos; DOC/DOCX ofrecen descarga con una explicación clara si no hay soporte de vista previa.
9. Archivo demasiado grande, tipo/extensión no permitidos, MIME no coincidente o nombre/ruta maliciosos se rechazan en servidor; no queda archivo huérfano.
10. Eliminar un documento no permite borrar paths arbitrarios y respeta permisos e historial.
11. El listado usa paginación y filtros del servidor y no descarga bytes/previsualizaciones de todos los elementos. Cambiar categoría/modalidad/estado/búsqueda actualiza el total y los resultados. La vista previa solo solicita un archivo por acción explícita y libera la URL temporal al cerrarse.
12. Incluye estados de carga, error y vacío; las fallas de categorías, documentos, plantillas y envíos se comunican sin fallbacks ficticios.
13. Verifica con consultas de conteo/hashes cuando aplique que los datos preexistentes no se alteraron. No afirmar que se validó rendimiento a escala sin medición real.
14. Ejecuta `npx tsc --noEmit` o el build disponible en ambos paquetes y las pruebas relevantes. Si servicios/BD no están disponibles, declara lo que no pudiste probar.

## 9. Entrega final

Resume en español:

- Archivos y migraciones cambiadas.
- Cómo crear/archivar categorías y cómo se preservaron las existentes.
- Cómo crear/publicar/completar formularios y dónde quedan las respuestas.
- Cómo subir/consultar archivos y qué formatos/límite se permiten.
- Cómo la página evita cargar archivos en masa y qué datos descarga en cada vista.
- Permisos implementados por rol y protección de descargas.
- Pruebas realmente ejecutadas y resultados.
- Aspectos pendientes o riesgos de almacenamiento local, solo si se confirmaron.

No declares completo un flujo o una prueba que no hayas verificado. No hagas commit/push y no dejes datos ni archivos de prueba.
