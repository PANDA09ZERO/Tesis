# PROMPT — Adaptar todo el sistema educativo a teléfonos y pantallas responsivas

> Copia este prompt en una sesión nueva del agente en modo Act para implementar y validar la experiencia móvil en el sistema existente.

## 0. Contexto y objetivo

Trabaja en el **Sistema Inteligente de Gestión Educativa** de `C:\xampp\htdocs\Tesis`.

- Frontend: React 18, TypeScript, Vite, Tailwind CSS 3 y React Router.
- Backend: Node.js, Express, TypeScript y MySQL. La adaptación solicitada es principalmente de interfaz; conserva los servicios actuales.
- Roles: administrador, profesor, alumno y apoderado.
- El frontend tiene componentes compartidos en `frontend/src/components`, páginas en `frontend/src/pages` y estilos globales en `frontend/src/index.css`.

Adapta **todo el sistema autenticado y sus páginas públicas** para que pueda usarse cómodamente desde un teléfono, además de tabletas y escritorio. No rediseñes ni elimines funcionalidades: cada pantalla, acción, permiso, dato, filtro y flujo que existe hoy debe continuar disponible y funcionar en los tres tamaños de pantalla. La versión móvil no debe ser una página reducida ni una maqueta.

No hagas commit ni push. Revisa el estado del repositorio antes de modificarlo y conserva cambios preexistentes. No sobrescribas ni reviertas trabajo ajeno.

## 1. Diagnóstico antes de modificar

Inspecciona el proyecto y confirma el estado actual antes de implementar:

- Lee instrucciones de repositorio, `git status`, `frontend/package.json`, configuración Tailwind/PostCSS y estilos globales.
- Recorre el shell de la aplicación y la navegación: `App.tsx`, `AppLayout`, `Sidebar`, `Header`, encabezados de contenido, paneles laterales, menús y componentes compartidos.
- Descubre todas las rutas/páginas reales, componentes reutilizados, roles que las ven y controles interactivos. No des por completa la cobertura usando solo una lista fija de módulos: verifica el router y los menús por rol.
- Revisa páginas de listas/tablas, detalle, calendario y horarios, cursos, asistencia, calificaciones, formularios, documentos y vista previa, alertas, reportes/gráficas, administración, acceso/login y cualquier pantalla adicional presente.
- Busca desbordamientos horizontales, anchos mínimos rígidos, `fixed`/`absolute`, alturas ligadas a viewport, tablas anchas, modales grandes y controles que dependan solo de hover o mouse.
- Aprovecha los patrones, componentes y breakpoints del proyecto. El shell actual contiene navegación lateral fija, y `DataTable` permite desplazamiento horizontal: comprueba si estos patrones ofrecen una experiencia realmente utilizable con una mano y pantallas estrechas.

Presenta una hipótesis breve basada en el código que explique los principales problemas de uso móvil y la estrategia para corregirlos. Después continúa con la implementación; no te detengas en un informe o propuesta.

## 2. Alcance completo

Revisa y adapta:

1. **Navegación y estructura:** acceso a todas las secciones visibles para cada rol, encabezado, perfil y cierre de sesión.
2. **Todas las páginas y flujos:** lista, detalle, creación, edición, confirmación, búsqueda, filtros, paginación, formularios, pestañas, calendarios, tareas y acciones administrativas.
3. **Componentes globales:** tablas y sus acciones/paginación, tarjetas, badges, estados de carga/error/vacío, modales, diálogos de confirmación, paneles laterales, notificaciones y componentes compartidos.
4. **Visualizaciones y contenido ancho:** reportes, gráficas, calendarios, horarios y vistas que dependan de columnas.
5. **Inicio de sesión y pantallas de acceso**, respetando exactamente autenticación y permisos actuales.

No ocultes contenido o acciones para conseguir que una vista quepa. Si una tabla no resulta práctica en móvil, conviértela en tarjetas o filas desplegables conservando todas las columnas y acciones accesibles; una tabla con desplazamiento horizontal puede mantenerse cuando sea la interacción correcta, pero debe indicarse de manera visible y no recortar controles esenciales.

## 3. Requisitos de diseño responsivo

- Diseña primero para móvil y escala progresivamente a tablet y escritorio usando los breakpoints configurados en el repositorio; no introduzcas breakpoints contradictorios sin necesidad.
- Usa el ancho disponible: elimina desplazamientos horizontales de página, anchos mínimos que rompan el viewport y padding excesivo. El desplazamiento horizontal solo puede aparecer dentro de un componente ancho cuando sea deliberado y utilizable.
- Mantén jerarquía visual, identidad, colores y patrones actuales. Los cambios deben sentirse como la misma aplicación, no como un producto distinto.
- En móvil, reorganiza encabezados, herramientas, acciones, métricas y filtros en una o varias filas legibles; permite que botones y campos ocupen el ancho adecuado, y evita que controles importantes queden fuera de pantalla.
- Usa tamaños cómodos para interacción táctil: objetivo mínimo aproximado de 44 × 44 CSS px para controles primarios, separación suficiente y texto legible sin zoom. No dependas de `hover`; conserva estados `focus-visible`, teclado y accesibilidad.
- Convierte la navegación lateral en un menú móvil claro (por ejemplo, drawer activado por un botón accesible), con overlay y botón de cierre. Debe abrirse/cerrarse con teclado, cerrar al navegar, mantener visible la sección activa y no tapar el contenido sin posibilidad de salir. Conserva la navegación de escritorio.
- Maneja áreas seguras y orientación de pantalla cuando sea relevante. Evita bloquear gestos o fijar el cuerpo de forma que impida desplazarse por formularios y contenido.
- Haz modales y diálogos adaptables al ancho y alto del viewport, con contenido desplazable dentro, cabecera/acciones utilizables y cierre accesible. En móvil pueden ocupar casi toda la pantalla si mejora la interacción.
- Formularios: apila campos, etiquetas y acciones cuando no haya espacio; conserva orden de tabulación, mensajes de validación, valores, estados de envío y prevención de doble envío.
- Tablas/listados: conserva acciones por registro, encabezados/identificación, búsqueda, filtros, recuento y paginación. Las acciones no deben desaparecer ni quedar inaccesibles en touch.
- Calendarios y horarios: conserva toda la información y operaciones existentes. En pantallas estrechas presenta una vista legible (p. ej., agenda/lista o tarjetas por día) si la cuadrícula semanal no cabe, sin cambiar reglas de fechas, permisos o persistencia.
- Gráficas y dashboards: escala o adapta el diseño y leyendas para mostrar valores y controles sin recortes. No sustituyas datos por imágenes ni por contenido ficticio.
- Documentos: conserva búsqueda, categorías, subida, descarga y vista previa protegida. La previsualización de PDF/imágenes debe adaptarse a la pantalla y seguir siendo bajo demanda; nunca cargues todos los archivos por hacer responsive la página.
- Textos largos, tablas de detalle, etiquetas, nombres, acciones y números deben envolver o truncarse con una forma accesible de consultar el valor completo; evita superposiciones.
- Mantén los estados de carga, error y vacío y el feedback existente. No uses datos simulados ni escondas errores.
- No agregues dependencias si CSS/Tailwind y los componentes existentes resuelven la adaptación.

## 4. Invariantes funcionales y de seguridad

- No cambies contratos API, consultas, esquema, reglas académicas, permisos, autenticación, alcance de usuarios, validaciones de negocio ni cálculos para modificar solo la presentación.
- No elimines, deshabilites ni ocultes permanentemente una función por falta de espacio; encuentra una interacción móvil equivalente y visible.
- La navegación por rol debe seguir ofreciendo el mismo alcance que antes. Ocultar una ruta en la interfaz no sustituye autorización del backend.
- No publiques directamente archivos protegidos, datos de alumnos, documentos ni información personal para solucionar problemas de vista móvil.
- Conserva paginación y cargas bajo demanda; evita traer más datos o archivos al cliente para renderizar una presentación adaptativa.
- Respeta preferencias de movimiento reducido cuando introduzcas animaciones. Evita transiciones obligatorias o efectos que dificulten la accesibilidad.

## 5. Estrategia de implementación

### Fase A — Inventario y medición

- Mapea todas las rutas, páginas y componentes compartidos; anota roles, variantes de pantalla y acciones principales.
- Identifica causas raíz reutilizadas (shell, layout, tabla, modal, controles globales) antes de aplicar correcciones página por página.
- Ejecuta o abre la aplicación y reproduce problemas en tamaños de teléfono. Registra qué tareas esenciales comprobarás para cada rol.
- Si existe un servidor local y herramientas de navegador disponibles, toma una referencia inicial para varios viewports.

### Fase B — Shell y componentes compartidos

- Corrige primero layout, navegación, encabezados, espaciado global, tablas/listas, modales y controles reutilizados.
- Haz estas correcciones compatibles con escritorio; no rompas las pantallas grandes para resolver móviles.
- Evita crear variantes duplicadas de componentes si se puede resolver de forma limpia con estilos o props compatibles con las llamadas existentes.

### Fase C — Cobertura de páginas

- Recorre todas las rutas descubiertas y aplica los ajustes específicos necesarios después de resolver los patrones compartidos.
- Verifica que las páginas más densas (calendario, tablas administrativas, reportes, detalle de curso, documentos y formularios) mantengan visibles sus datos y acciones.
- Prueba los flujos con roles reales o fixtures de prueba existentes. No alteres usuarios/datos de producción ni inventes permisos.

### Fase D — Validación e iteración

- Usa navegador, capturas o pruebas E2E ya disponibles para inspeccionar los viewports y flujos prioritarios.
- Corrige iterativamente desbordamientos, contenido tapado, controles diminutos, modales imposibles de cerrar y acciones sin alternativa táctil.
- Ejecuta build y validaciones disponibles. No instales nuevas herramientas/dependencias salvo necesidad demostrada.

## 6. Criterios de aceptación

1. Todas las rutas reales de la aplicación, públicas y autenticadas, fueron inspeccionadas; todas las funciones actuales siguen presentes.
2. La navegación móvil permite llegar a todas las opciones autorizadas del rol, indica la ruta activa, puede abrirse/cerrarse con teclado y touch, y no impide usar la página.
3. A 320, 360/375, 390/414 CSS px no aparece desplazamiento horizontal de toda la página ni se corta información o control esencial. Los componentes anchos tienen un patrón de navegación/intención evidente.
4. A anchos de tableta (por ejemplo 768 px y 1024 px) el diseño aprovecha el espacio y no conserva innecesariamente la composición comprimida de teléfono.
5. A escritorio (por ejemplo 1280/1440 px) se conserva la distribución y el comportamiento existentes salvo mejoras visuales compatibles.
6. Listas, tablas adaptadas, paginación, búsqueda, filtros y acciones por fila siguen operativos en touch y teclado.
7. Formularios, calendarios, horarios, modales, diálogos, reportes, documentos y vistas previas siguen funcionando en modo móvil y conservan sus permisos.
8. El cambio de tamaño u orientación no pierde estado del usuario, altera información guardada ni rompe navegación.
9. Los controles interactivos tienen nombre/etiqueta accesible, foco visible, objetivo táctil suficiente y no requieren hover para revelar su única acción.
10. No se añadió descarga anticipada de documentos, carga innecesaria de datos, datos ficticios, permisos nuevos ni dependencias innecesarias.
11. Ejecuta `npm run build` en `frontend`. Ejecuta las pruebas pertinentes disponibles y pruebas E2E/browser para rutas y viewports si el proyecto ya proporciona ese entorno.
12. Si no puedes probar alguna ruta, rol o viewport, indícalo con precisión; no afirmes cobertura total que no verificaste.

## 7. Entrega

Al finalizar, resume en español:

- Qué componentes compartidos y páginas se adaptaron y cómo se cubrieron todas las rutas.
- Cómo cambia la navegación y la interacción en móvil frente a tablet/escritorio.
- Qué patrones se eligieron para tablas, calendarios, gráficas, modales y formularios.
- Builds, pruebas, tamaños de pantalla y flujos que realmente verificaste.
- Limitaciones pendientes o pantallas/roles que no pudieron validarse.
- Aclara que no modificaste permisos ni lógica de negocio, si fue así.
