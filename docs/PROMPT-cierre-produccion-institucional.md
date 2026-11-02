# Prompt: cerrar los pendientes para producción institucional

Preparado el 21/10/2026 para `C:\xampp\htdocs\Tesis`.

## Instrucción para el agente

Actúa como responsable técnico de la preparación para producción de este sistema educativo. Inspecciona el estado real, corrige los pendientes verificables y deja una entrega comprobable para publicar con datos institucionales. Trabaja por capítulos, conserva los patrones existentes y distingue claramente entre preparación local, preproducción desplegada y producción autorizada. No marques una fase como completada solo porque redactaste instrucciones o pasaron pruebas locales.

El usuario tiene cuenta Vercel y está considerando hosting y dominio de pago; todavía no están confirmados el proveedor del backend/base de datos, presupuesto, dominio, capacidad ni políticas operativas. No supongas que Railway fue contratado. La compra de alojamiento no demuestra que el sistema esté listo para uso institucional.

### Alcance y forma de trabajar

- Completa primero las correcciones de código, configuración, pruebas y documentación que puedas realizar con la información disponible. Formula temprano las preguntas que realmente bloqueen decisiones externas y continúa con el trabajo independiente.
- Reutiliza las herramientas de instalación, migración, preflight, respaldo y recuperación existentes. No crees implementaciones paralelas para lo que ya existe.
- Conserva los cambios locales del usuario. No hagas reset, limpieza masiva, commits, force-push ni reescritura de historial por iniciativa propia.
- No imprimas secretos, hashes, tokens, archivos de entorno ni datos personales. Reporta resultados agregados y evidencia anonimizada.
- Usa bases temporales con datos ficticios para pruebas. Las comprobaciones iniciales sobre la instalación existente deben ser de solo lectura.
- No modifiques cuentas reales, apliques DDL sobre la base institucional ni traslades datos reales sin alcance y destino autorizados, respaldo protegido, recuperación comprobada y procedimiento de mantenimiento preparado. Primero deja el cambio concreto listo para revisión.
- No contrates servicios, publiques una instancia con datos reales ni alteres DNS sin autorización para la operación concreta. No solicites contraseñas por el chat: utiliza los mecanismos seguros del entorno/proveedor.
- No elimines módulos ni cambies reglas académicas o financieras como parte del despliegue. Corrige únicamente problemas demostrables dentro del alcance.

## Capítulo 1. Auditoría actual y línea base

Lee `docs/estado-produccion.md`, `docs/operacion-produccion.md`, `docs/plan-produccion-vercel.md`, `docs/apoderados.md`, las instrucciones del repositorio, scripts, CI, Docker y configuraciones reales. Confirma las rutas de los archivos: no copies rutas o supuestos de un informe antiguo sin verificarlos.

Inspecciona frontend React/Vite, backend Express/TypeScript, Node 24, MySQL, autenticación, autorización por rol, proxy, documentos privados y persistencia. Revisa el estado de Git sin exponer archivos sensibles.

Los bloqueos registrados el 15/10/2026 son antecedentes que debes comprobar nuevamente:

1. Posible falta de índice único de sueldo por profesor/mes/año.
2. Cuentas activas con credenciales heredadas y cuentas con correos de demostración.
3. Baseline del esquema pendiente.
4. Credenciales presentes en el historial de Git.
5. Despliegue HTTPS, persistencia tras redeploy, CI remoto y operación pendientes de ensayo real.

Ejecuta los comandos de diagnóstico existentes que sean seguros, incluyendo `db:check`, `production:check` y la vista previa de `migrate:production`, tras inspeccionar qué hacen. Un fallo de conexión o herramienta no significa que la comprobación haya pasado. Distingue bloqueo del entorno de defecto del producto.

**Entregable:** matriz con problema, evidencia actual, gravedad, corrección, dependencia externa y criterio de aceptación. Actualiza los conteos y fechas; no reutilices las cifras históricas como si fueran actuales.

## Capítulo 2. Integridad y migración de base de datos

- Compara esquema instalado, esquema versionado y migraciones. Comprueba tipos, claves foráneas e índices críticos; el chequeo de columnas por sí solo no demuestra equivalencia completa.
- Revisa la unicidad de matrícula por alumno/periodo, mensualidad por alumno/periodo/mes/año según el contrato existente y sueldo por profesor/mes/año.
- Detecta duplicados antes de proponer índices. No borres, fusiones ni elijas importes históricos automáticamente.
- Reutiliza la migración puntual existente y verifica que preserve los índices necesarios para claves foráneas. No ejecutes migraciones destructivas al arrancar la aplicación.
- Ensaya instalación limpia y actualización sobre una copia aislada y protegida. Utiliza datos sintéticos siempre que alcancen para la prueba; cualquier copia de datos reales requiere autorización y protección equivalentes a producción.
- Registra baseline y checksum solo después de revisar la compatibilidad y completar la migración autorizada. No alteres el checksum para ocultar divergencias.
- Documenta el orden, mantenimiento, verificación posterior y recuperación ante fallo. Considera los commits implícitos del DDL de MySQL; un rollback de la aplicación no revierte necesariamente el esquema.

**Aceptación:** instalación limpia y actualización ensayadas; no se pierden datos; duplicados rechazados también en concurrencia; diagnóstico y preflight informan el estado real del destino.

## Capítulo 3. Cuentas, secretos y permisos

Actualización del 21/10/2026: conservar la superadministración implementada y revisar `docs/superadministracion.md`. La supercuenta queda fuera de Usuarios, conserva auditoría y permite suspensión reversible, respaldos y recuperación aislada. El alta nominal autorizada está preparada e inactiva hasta que el propietario defina su contraseña por consola. Verificar permisos, volumen operativo y coordinación de copias en el alojamiento; no crear otra cuenta ni reactivar la existente por inferencia.

- Verifica que producción rechace contraseñas heredadas y que las altas/cambios usen bcrypt conforme al código existente.
- Prepara un procedimiento para identificar al propietario de cada cuenta heredada y restablecer su acceso o desactivarla mediante una decisión autorizada. No conviertas contraseñas inseguras automáticamente ni desactives personas por el aspecto de su correo.
- Revisa las cuentas demo antes de la importación y prepara el bootstrap de un administrador institucional sin credenciales predeterminadas.
- Identifica las clases de secretos que estuvieron en Git y prepara la rotación y actualización coordinada de sus consumidores. No publiques valores ni consideres suficiente borrar `.env` del último commit.
- Separa secretos de desarrollo, preproducción y producción. El frontend solo recibe configuración pública; nunca credenciales MySQL ni el secreto JWT.
- Mantén JWT fuerte, seeds bloqueados en producción, revocación de todas las sesiones al cambiar contraseña y autorización real en backend.
- Prueba accesos cruzados: profesor fuera de sus asignaciones, estudiante ajeno, apoderado sin vínculo y rutas administrativas/financieras desde otros roles.
- Revisa dependencias con herramientas actuales y corrige problemas confirmados sin actualizaciones incompatibles a ciegas. No uses un `audit` sin hallazgos como certificado de seguridad total.

**Aceptación:** cuentas institucionales revisadas, credenciales expuestas rotadas cuando se autorice, secretos fuera de artefactos públicos y pruebas de permisos aprobadas.

## Capítulo 4. Hosting, dominio y red

Determina el alojamiento a partir de las necesidades del proyecto: proceso Node.js compatible, MySQL, almacenamiento privado persistente, HTTPS, red segura, respaldos y recursos suficientes. Un hosting exclusivamente PHP no satisface el backend actual.

Puedes conservar Vercel para el frontend y alojar API/MySQL en otro servicio compatible. Antes de recomendar planes o costos, consulta documentación oficial actual. No migres MySQL a PostgreSQL/Supabase ni reescribas la arquitectura sin una decisión explícita que justifique ese alcance.

Prepara o ajusta lo siguiente según el proveedor elegido:

- Entornos separados, variables documentadas sin secretos, builds reproducibles y arranque de producción sin servidor de desarrollo.
- Dominio del frontend, dominio de API, HTTPS válido y URL pública correcta en el cliente.
- CORS con orígenes exactos. No uses comodines ni reflejes cualquier origen para corregir errores móviles.
- Proxy confiable conforme a la topología real. No confíes ciegamente en todas las cabeceras reenviadas; comprueba IP y limitación de intentos.
- Usuario MySQL limitado y conectividad privada cuando esté disponible; TLS verificable cuando corresponda. No desactives la verificación del certificado para solucionar una conexión.
- Readiness/liveness, timeouts, límites de solicitudes, reinicio y apagado controlado.
- Volumen privado persistente del módulo general de documentos, permisos de archivos y recuperación después de reiniciar o redeplegar. Retirar Documentos del apoderado no elimina la necesidad de proteger el almacenamiento utilizado por los demás roles.
- Ensayo del límite real de archivos, actualmente configurado en 10 MB por defecto, atravesando toda la cadena pública. Ajusta coherentemente proxy y aplicación si la política autorizada cambia.
- Revisión de logs para evitar información personal, SQL o credenciales.

**Aceptación:** preproducción con datos ficticios accesible desde red externa y móvil, rutas directas funcionales, TLS/CORS/proxy correctos, API protegida y persistencia demostrada tras redeploy. Si no existe alojamiento autorizado, entrega los archivos y pasos listos y deja este criterio pendiente.

## Capítulo 5. Respaldo y recuperación

Reutiliza `backup:create` y `backup:restore`. Comprueba compatibilidad de clientes MySQL, consistencia entre SQL y archivos, referencias, conteos y manifiestos.

- Los respaldos contienen datos sensibles: exige destino restringido y cifrado apropiado. No los coloques en Git, uploads ni directorios públicos.
- La herramienta actual no cifra por sí sola: verifica la protección del destino o implementa una integración mínima si está dentro del alcance autorizado; no describas un respaldo plano como cifrado.
- Prepara un corte de escrituras real. Una bandera `--maintenance-confirmed` declara una acción del operador; no garantiza que la API esté detenida.
- Restaura solo en otra base y directorio vacíos. Verifica recuperación funcional de pagos, relaciones, notas, permisos y archivos, además de checksums.
- Distingue integridad de autenticidad del manifiesto y protege ambas copias y accesos.
- Define con el propietario frecuencia, retención, copia externa, responsable, RPO (pérdida máxima de datos aceptable) y RTO (tiempo máximo de recuperación aceptable). Puedes presentar propuestas, pero no adoptarlas silenciosamente como política.
- No programes purgas, borrados de matrículas ni eliminación de auditoría mientras esas reglas institucionales sigan sin definir.

**Aceptación:** restauración comprobada con tiempos medidos y destino protegido; calendario y responsable aprobados antes de operar con datos reales. No basta con generar un archivo de respaldo.

## Capítulo 6. Pruebas de negocio, rendimiento y CI

Actualiza pruebas relevantes para cada corrección y ejecuta las suites existentes. Mantén estas reglas ya autorizadas:

- Matrícula y mensualidades separadas; ninguna cuenta como pago de la otra. Pago fallido no se presenta como exitoso.
- Sueldo: profesor, mes/año y monto; se registra directamente como pagado y no exige curso.
- Grado, periodo y cursos del alumno provienen de la matrícula.
- Como máximo un periodo académico activo. Profesores con consulta en periodos históricos y operaciones limitadas a sus asignaciones.
- Cambio de contraseña revoca todas las sesiones.
- Dashboard del profesor con sus alumnos asignados.
- Apoderado con estudiantes vinculados, parentesco, resumen, cursos/horarios, calificaciones y asistencia por periodo. **Documentos se retiró de esta perspectiva:** no reintroducir pestaña, descargas, pendientes ni contadores en los resúmenes familiares. No eliminar el módulo general de otros roles.
- No reintroducir predicción con IA.

Ejecuta desde cada carpeta, tras confirmar sus scripts:

```bash
# backend
npm run build
npm run test:all
npm run test:production
npm run test:familia
npm run db:check
npm run production:check

# frontend
npm run build
npm run test:session
npm run test:e2e
```

Evita repetir suites si `test:all` ya incluye las mismas y no hay cambios nuevos que lo justifiquen. Registra comandos realmente ejecutados, resultados, entorno y fallos. Diferencia pruebas con bases temporales de chequeos de solo lectura en el destino.

Valida el pipeline remoto y la imagen Docker en un entorno disponible; si no puedes ejecutarlos, repórtalos como pendientes. Revisa interfaz en escritorio y móvil, navegación directa, recarga y errores de servidor. Una simulación de viewport no sustituye una comprobación en dispositivo/red reales.

Solicita cantidades esperadas de usuarios y concurrencia de hora punta. Ensaya carga sobre preproducción sintética con lecturas y escrituras representativas; mide p95, errores, CPU, memoria y conexiones. No extrapoles las pruebas locales existentes como garantía de capacidad institucional. Confirma los objetivos antes de declarar aceptada la carga.

El limitador de login actual es por proceso: verifica el despliegue previsto. Si habrá varias instancias, resuelve la coordinación con el mecanismo apropiado antes de escalar; no agregues infraestructura innecesaria si se acuerda una sola instancia.

Evalúa la advertencia de tamaño del paquete frontend y aplica división de código solo si está justificada y verificada. No conviertas por sí sola esa advertencia en bloqueo de seguridad ni amplíes esta fase a un rediseño.

**Aceptación:** pruebas relevantes y compilaciones aprobadas; CI verificado o pendiente explícito; carga evaluada contra objetivos acordados y límites operativos documentados.

## Capítulo 7. Operación y apertura gradual

Prepara monitorización de disponibilidad, errores, capacidad y respaldos. Evita registrar datos sensibles. Define responsable, canal de incidencias, revisión de alertas y presupuesto; no envíes comunicaciones externas sin autorización.

Entrega un procedimiento ordenado de publicación y reversión: respaldo verificado, mantenimiento cuando corresponda, migración revisada, despliegue compatible, readiness, comprobaciones por rol y apertura gradual. La reversión debe preservar escrituras válidas; no propongas restaurar una copia antigua sobre producción como paso automático.

Empieza con un grupo reducido cuando estén cerrados los criterios, recoge incidencias y amplía después de verificar estabilidad. No realices pagos ficticios ni operaciones destructivas para probar producción con datos reales.

**Aceptación:** responsables y políticas definidos, recuperación/reversión ensayadas, pruebas públicas aprobadas y autorización final del despliegue concreto antes de abrir datos reales.

## Capítulo 8. Entrega final y decisión de salida

Actualiza directamente `docs/estado-produccion.md` y `docs/operacion-produccion.md`; ajusta el plan existente si cambia la arquitectura. Mantén este archivo como instrucción de trabajo y evita crear informes duplicados con estados contradictorios.

Entrega:

1. Archivos modificados y problema que resuelve cada grupo.
2. Evidencia de las correcciones y comandos ejecutados, con resultados y limitaciones.
3. Estado de cada capítulo: completado y verificado, preparado sin ejecutar, bloqueado por una dependencia concreta o no aplicable con motivo.
4. Pendientes externos precisos y decisiones institucionales por confirmar; sin reglas inventadas.
5. Dictamen separado: listo para preproducción / listo para producción / todavía bloqueado, con evidencia que lo sustente.

No declares el sistema listo para uso institucional mientras persistan bloqueos de integridad, cuentas/secretos, HTTPS/permisos, persistencia, recuperación o responsabilidad operativa. Comprar hosting y dominio y obtener builds exitosos no sustituye estos criterios.

### Preguntas necesarias, solo si siguen sin respuesta

- ¿Qué proveedor, plan, región, presupuesto y dominio se eligieron? ¿Quién controla las cuentas y el DNS?
- ¿Cuántos usuarios totales y simultáneos se esperan en hora punta?
- ¿Se migrará la base actual o se empezará con una base institucional limpia? ¿Qué datos son ficticios y quién autoriza su tratamiento?
- ¿Quién puede revisar/restablecer cuentas y rotar credenciales institucionales?
- ¿Quién operará el sistema y qué frecuencia/retención, RPO/RTO y reglas de conservación acepta la institución?

Agrupa las preguntas críticas y continúa las correcciones locales que no dependan de sus respuestas. No supongas que la falta de respuesta equivale a aprobación.
