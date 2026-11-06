# Prompt: video guía del sistema con HyperFrames

Trabaja en la carpeta `video-guia/` (proyecto HyperFrames ya creado). Antes de escribir cualquier composición, invoca el skill `/hyperframes` y sigue su contrato; usa `/hyperframes-cli` para check, snapshot y render, y `/media-use` si agregas voz en off o música.

## Objetivo
Crear un video tutorial en español (Perú) que enseñe, paso a paso, cómo ingresar al sistema de gestión académica "Ciencias e Ingeniería" y qué puede hacer cada tipo de usuario. Reemplaza el `index.html` actual (es una versión anterior con 5 escenas genéricas); conserva `meta.json` y `hyperframes.json`.

- Público: personal administrativo, docentes, estudiantes y padres de familia sin experiencia técnica.
- Formato: 1920×1080, 30 fps, MP4. Duración objetivo: 5 a 7 minutos en total.
- Tono: claro, cercano y directo. Frases cortas, verbos de acción ("Pulsa", "Elige", "Escribe"). Nada de jerga técnica.

## Material visual: capturas reales y actuales
Las capturas de `video-guia/assets/screenshots/` y `docs/capturas/` son ANTERIORES al rediseño de la interfaz. No las uses.
1. Con el backend (`backend`, `npm run dev`) y el frontend (`frontend`, `npm run dev`) en marcha, toma capturas nuevas con Playwright desde `http://localhost:5173`, en escritorio (1440×900) y móvil (390×844), tema claro.
2. Usa cuentas de prueba del entorno local de cada rol (superadministrador, administrador, profesor, alumno y apoderado). Pídeme las credenciales si no las encuentras; no crees ni modifiques cuentas reales ni reinstales la base.
3. Guarda las capturas en `video-guia/assets/screenshots/v2/` con nombres descriptivos (`admin-usuarios-desktop.png`, `profesor-notas-mobile.png`…).
4. Privacidad: los datos visibles deben ser de prueba. Si aparece un DNI, teléfono, correo o contraseña reales, difumínalos con el tratamiento canónico de `/media-use` (no con filtros CSS improvisados). Las contraseñas temporales del modal de credenciales siempre van difuminadas.

## Identidad visual (coherente con la interfaz rediseñada)
- Tipografía: Atkinson Hyperlegible Next (Google Fonts), una sola familia; títulos 700, texto 400–600.
- Colores: tinta `#23408E` (principal), granate `#8C2F2B` (acento único, para señalar el elemento que se explica), neutros fríos `#F4F6F9` fondo, `#E1E5EC` líneas, `#1A1F29` texto.
- Escudo institucional: `frontend/public/assets/logo.png` (cópialo a `video-guia/assets/`).
- Superficies planas, sin degradados ni sombras pesadas. Sin etiquetas en MAYÚSCULAS espaciadas.
- Para señalar algo en pantalla: un recuadro o subrayado granate que aparece sobre el elemento y un cursor/toque animado que va hacia él. Un solo foco a la vez.
- Movimiento sobrio: zoom suave hacia la zona que se explica y transiciones cortas entre escenas. Nada de animaciones decorativas en cada elemento.

## Estructura del video (una sub-composición por capítulo en `compositions/`)

### 1. Apertura (≈10 s)
Escudo + "Ciencias e Ingeniería · Guía de uso". Una línea: "Notas, asistencia y horarios del año escolar en un solo lugar."

### 2. Cómo ingresar (≈60 s) — común a todos
1. Abrir el sistema en el navegador (computadora o celular) en `/login`.
2. Escribir el usuario institucional con formato `nombre.apellido@cienciaseingenieria.edu` y la contraseña.
3. Botón "Mostrar contraseña" (ícono de ojo) para revisar lo escrito.
4. Primer ingreso: la contraseña temporal entregada por administración obliga a crear una nueva (mínimo 12 caracteres); al cambiarla se cierran las demás sesiones.
5. Si aparece "Credenciales inválidas", revisar usuario y contraseña; si el sistema está suspendido, esperar a que administración lo reactive.

### 3. Conocer la pantalla (≈40 s) — común
- Escritorio: menú lateral (la marca granate indica la sección actual), cabecera con tema claro/oscuro, perfil, calendario y el selector de periodo ("Año escolar 2026 · Vigente/Histórico", botón "Cambiar").
- Celular: barra inferior (Inicio, Módulos, Horarios, Notas/Reportes, Perfil) y la sección "Módulos" con todos los accesos.
- En listas del celular, cada registro es una tarjeta: "Toca para ver detalles".
- Mi perfil: datos personales y cambio de contraseña.

### 4. Funciones por tipo de usuario
Abre cada rol con una tarjeta de título ("Si eres profesor…") y un resumen de 3 ideas. Muestra solo lo que ese rol ve en su menú.

**Administrador (≈90 s)**
- Usuarios: crear cuenta; el sistema genera el usuario institucional y una contraseña temporal para entregarla de forma segura.
- Institución: Alumnos, Profesores y Apoderados (en Apoderados se ven los "Alumnos a cargo" y se vinculan con el botón "Alumnos").
- Académico: Periodos, Estructura académica (grados por periodo, cursos por grado y docentes asignados), Cursos y Horarios.
- Matrículas, Pagos (mensualidades, matrícula y sueldos), Documentos y formularios, Alertas, Reportes, Calendario y notificaciones masivas.

**Superadministrador (≈40 s)** — todo lo del administrador, más "Control del sistema":
- Estado del sistema: suspender y reactivar (siempre confirmando la contraseña actual).
- Respaldos privados: crear (con el sistema suspendido), descargar y recuperar en un destino aislado.
- Auditoría: quién hizo qué operación y con qué resultado.

**Profesor (≈70 s)** — solo ve sus cursos y alumnos asignados:
- Mis cursos, Mis alumnos y Mis horarios.
- Calificaciones: crear una evaluación y registrar notas (0 a 20).
- Asistencia: marcar presente, tardanza, ausente o justificado por fecha.
- Un periodo histórico es solo de consulta: no se puede editar.
- Alertas de sus alumnos, apoderados de sus alumnos, calendario y notificaciones.

**Alumno (≈50 s)** — solo consulta lo propio:
- Mi panel, Mis cursos, Mis calificaciones, Mi asistencia, Mis horarios, Calendario, Mis pagos, Mis alertas y Mis notificaciones.
- Puede responder formularios y descargar sus documentos.

**Apoderado / padre de familia (≈40 s)** — solo lectura de sus hijos:
- "Estudiantes a mi cargo": elegir al estudiante y ver su resumen, notas, asistencia y horario.
- Ver documentos y enviar formularios; cambiar su contraseña desde Mi perfil.

### 5. Buenas prácticas y cierre (≈20 s)
- No compartir la contraseña; cerrar sesión en equipos compartidos ("Cerrar sesión" en el menú).
- Ante dudas o datos incorrectos, contactar a la administración.
- Cierre con escudo y "Listo para usar el sistema".

## Narración y subtítulos
- Escribe primero el guion completo (por escena, con tiempos) en `video-guia/guion.md` y muéstramelo antes de animar.
- Voz en off en español latino neutro con `/media-use` (TTS); música instrumental suave y baja, sin pisar la voz.
- Subtítulos sincronizados siempre visibles (muchos lo verán sin audio), máximo 2 líneas, alto contraste.
- Cada paso en pantalla debe coincidir con lo que dice la voz en ese momento.

## Reglas técnicas
- Una sub-composición por capítulo (`compositions/01-apertura.html`, `02-ingreso.html`…) referenciadas desde `index.html` con `data-composition-src`.
- Solo lógica determinista (sin `Date.now()`, `Math.random()` ni red). Cada elemento temporizado con `data-start`, duración y `class="clip"`; un timeline raíz pausado registrado en `window.__timelines`.
- Textos en pantalla legibles: mínimo 32 px en 1080p para subtítulos y 28 px para rótulos.
- Tras cada capítulo: `npm run check` sin errores y `npx hyperframes snapshot --at ...` en los momentos clave. Revisa las imágenes antes de seguir.

## Entregables
1. `video-guia/guion.md` (aprobado antes de animar).
2. Composiciones en `video-guia/index.html` y `video-guia/compositions/`.
3. Capturas nuevas en `video-guia/assets/screenshots/v2/`.
4. Render final con `npm run render` → MP4.
5. Opcional: versiones cortas por rol (un MP4 por rol de 1–2 min) reutilizando las mismas composiciones, para enviar a cada público.

## Criterios de aceptación
- Todo lo que se muestra existe en el menú real de ese rol (`frontend/src/components/layout/navigation.ts`); no inventes funciones.
- Las capturas corresponden a la interfaz actual (rediseñada) y no exponen datos personales reales.
- `npm run check` pasa sin errores; la duración total está entre 5 y 7 minutos.
- Un usuario nuevo puede ingresar y encontrar su función principal solo viendo el video.
