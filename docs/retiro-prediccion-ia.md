# Retiro de predicción con IA

El usuario confirmó que la predicción con IA no forma parte del alcance previsto del sistema. Se retiró el módulo completo el 14 de octubre de 2026.

## Cambios

- Frontend: se eliminó la pantalla de predicción, su ruta `/ia-prediccion`, el cliente `aiApi` y los tipos/iconos exclusivos del módulo. Los enlaces antiguos de frontend siguen el comportamiento general de rutas desconocidas y redirigen al panel.
- Backend: se eliminó el montaje y archivo del proxy `/api/ai`, incluidas predicción individual, análisis masivo y entrenamiento. No se sustituyeron por respuestas exitosas vacías: un administrador autenticado obtiene 404 en las rutas retiradas.
- Dependencias: se desinstaló Axios del backend, donde únicamente se utilizaba para ese proxy; `package-lock.json` quedó actualizado mediante npm. Axios del frontend se conserva porque lo utilizan las APIs del resto del sistema.
- Servicio: se retiró `ai-service` con sus archivos Flask, predictor y requisitos Python. También se retiraron los artefactos compilados del router de IA.
- Documentación: README ya no pide instalar/iniciar Python, anunciar predicción o utilizar endpoints de IA. El informe integral registra la decisión posterior y elimina la revisión de IA de sus pendientes.

## Alertas y datos existentes

Las rutas, pantallas y tablas de alertas académicas se conservan. Su consulta y atención de estados no dependen del servicio de IA. Las alertas históricas y sus indicadores no se eliminaron ni reclasificaron; ya no se generan nuevas alertas a través del predictor retirado. No se añadió un mecanismo de generación automática o manual como parte de este cambio.

No se modificó ninguna tabla o fila de la base real y no se necesita migración. Los reportes, notas, asistencia, matrículas, pagos y perspectivas de los cuatro roles conservan sus funciones.

## Archivos

| Archivos | Acción |
|---|---|
| `frontend/src/App.tsx`, `frontend/src/api/endpoints.ts` | Retirar ruta, import y cliente del predictor |
| `frontend/src/components/layout/Sidebar.tsx`, `frontend/src/types/index.ts` | Retirar icono/tipo exclusivos |
| `frontend/src/pages/alerts/IAPrediccionPage.tsx` | Eliminar pantalla |
| `backend/src/app.ts`, `backend/src/types/index.ts` | Retirar montaje/import y tipo exclusivo |
| `backend/src/routes/ai.routes.ts` | Eliminar proxy |
| `backend/package.json`, `backend/package-lock.json` | Retirar dependencia y añadir comando `test:sin-ia` |
| `ai-service/` | Retirar servicio y requisitos |
| `backend/dist/routes/ai.routes.*` | Eliminar artefactos antiguos; backend recompilado |
| `backend/tests/ai-removal.test.cjs` | Prueba HTTP de la aplicación completa con DB sintética controlada |
| `README.md`, `docs/profesores.md`, `docs/correccion-integral.md`, este documento | Actualizar alcance y validación |

## Validación ejecutada

Desde `backend`:

```powershell
npm.cmd uninstall axios --offline --ignore-scripts --no-audit --no-fund
npm.cmd run build
node tests/ai-removal.test.cjs
node tests/profesores.test.cjs
node tests/profesores.integration.test.cjs
node tests/estudiantes.test.cjs
node tests/estudiantes.integration.test.cjs
node tests/payments.test.cjs
node tests/payments.integration.test.cjs
node tests/integral.test.cjs
node tests/integral.integration.test.cjs
```

Desde `frontend`:

```powershell
npm.cmd run build
npm.cmd run test:session
```

La compilación frontend usó el ajuste local de `NODE_OPTIONS` documentado en [la revisión integral](correccion-integral.md), necesario en este entorno Windows. No se incorporó ese ajuste al código del proyecto.

Resultados:

- Backend y frontend compilan.
- **94 casos individuales aprobados:** 91 de regresión y 3 nuevos para el retiro del módulo. Node contabiliza 99 incluyendo los cinco contenedores de suites HTTP.
- La prueba nueva carga la aplicación completa y comprueba los cinco endpoints retirados con un token administrativo válido: todos responden 404. También comprueba salud 200 y consulta de alertas históricas 200.
- Las suites anteriores vuelven a comprobar aislamiento de roles, pagos, matrículas y persistencia en bases temporales sin copiar filas reales.
- Búsqueda final sin referencias activas al predictor en fuentes ni compilaciones del frontend/backend.
- `git diff --check` aprobado con la configuración habitual de finales de línea del proyecto.
- Permanece el aviso de Vite por un bundle principal mayor de 500 kB: aproximadamente 936 kB sin comprimir y 253 kB gzip.

No se desplegaron ni reiniciaron servicios principales. Si el backend estaba ejecutándose sin recarga automática, hay que reiniciarlo con su comando habitual para que utilice el router actualizado. El sistema ya no requiere un proceso Python en el puerto 5000.
