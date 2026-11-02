# Vigencia de periodos académicos

Corrección del 23/10/2026.

## Reglas

- La fecha institucional se calcula en America/Lima, independientemente de la zona del servidor o navegador.
- Inicio y fin son inclusivos: un periodo puede permanecer activo hasta el final de su último día.
- Al recibir la primera petición autenticada de cada día de Lima, la API desactiva los periodos con fecha final anterior a hoy. También se sincronizan al consultar la lista de periodos. Las llamadas concurrentes de un mismo proceso comparten la sincronización; un error permite reintentar y responde 503, sin simular un éxito.
- No se necesita un cron externo. Si el servidor está apagado o no recibe tráfico, la bandera persistida se corrige en el siguiente acceso. Las consultas y permisos docentes comprueban además la vigencia real por fechas, por lo que una bandera antigua no habilita escritura fuera del periodo.
- Crear o actualizar un periodo como activo exige que hoy esté dentro de sus fechas. Un periodo pasado o futuro puede guardarse inactivo. La comprobación existe en frontend y backend.
- Se mantiene como máximo un periodo activo mediante el bloqueo transaccional existente. Activar el siguiente sigue siendo una acción administrativa; no se inventan periodos, fechas, asignaciones ni matrículas.
- El profesor tiene solo consulta en periodos inactivos o fuera de vigencia. Se protegen notas, asistencia y evaluaciones, incluidas las rutas antiguas. Los permisos administrativos existentes sobre historial se conservan.
- La desactivación no cambia las fechas ni elimina matrículas, notas, asistencia, pagos o asignaciones.

## Instalación local

Se confirmó que `2026-I` tenía fechas 01/03/2026–15/07/2026 y continuaba activo el 23/10/2026. Se ejecutó la misma operación de expiración sobre la base local: **un periodo desactivado**. Se verificó que el número de matrículas, notas y asistencias permaneció igual. La consulta posterior mostró `2026-I` y `2025-II` inactivos. No se creó ni activó un periodo nuevo.

El backend debe reiniciarse si se ejecuta con `npm start`, para cargar el código compilado; recargar también el navegador. La bandera vencida de la instalación local ya fue corregida.

## Archivos

- `backend/src/utils/periodoVigencia.ts`: fecha institucional, predicado SQL, expiración idempotente, sincronización por día y middleware.
- `backend/src/app.ts`: sincronización en peticiones autenticadas, después de las guardas de acceso y operaciones.
- `backend/src/controllers/periodos.controller.ts`: sincronización de consulta y bloqueo de activación fuera de fechas.
- `backend/src/utils/ofertaAcademica.ts`, `backend/src/utils/profesorAlcance.ts`: defensa de acceso y escritura por fechas.
- `backend/src/controllers/configuracion.controller.ts`, `backend/src/controllers/profesorPersonal.controller.ts`: estado vigente real de las ofertas y del panel docente.
- `frontend/src/pages/academics/PeriodosPage.tsx`: validación de activación, explicación del cierre y fechas sin desplazamiento por zona horaria.
- Pruebas de vigencia, profesores, integración general y pagos; ejecutor de suite y CI. El fixture reducido de pagos ahora incluye la fecha final requerida para un periodo vigente.
- `frontend/tests/e2e/periodos.spec.ts`: creación histórica inactiva, bloqueo visual y rechazo directo de activación; conservación del periodo vigente.

## Verificación

```powershell
# backend
npm run build
node --test tests/periodo-vigencia.test.cjs tests/profesores.test.cjs tests/profesores.integration.test.cjs
node tests/integral.integration.test.cjs
npm run test:all
# frontend
npm run build
npm run test:e2e -- periodos.spec.ts calificaciones.spec.ts
npm run test:e2e
# raíz
git diff --check
```

Las pruebas cubren medianoche de Lima, límites inclusivos, errores y reintentos, concurrencia, activación inválida sin desactivar el vigente y rechazo docente con bandera obsoleta. Usan bases temporales y datos sintéticos. La única escritura institucional fue desactivar el periodo realmente vencido, solicitada por el usuario.

### Resultado

Compilaciones de backend y frontend correctas. Suite completa del backend correcta. Las 34 pruebas de navegador pasaron en escritorio y móvil; las 10 pruebas específicas de periodos/calificaciones también pasaron. `git diff --check` sin errores, con avisos existentes de finales de línea. Permanece el aviso de Vite por tamaño del bundle.
