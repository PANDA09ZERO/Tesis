# Guion · Guía de uso "Ciencias e Ingeniería"

- Formato: 1920×1080 · 30 fps · MP4
- Duración final montada: **5:27** (326,6 s). Los tiempos de las tablas son del guion aprobado; los tiempos reales de cada frase están en `tools/plan.json`.
- Voz: Edge-TTS, voz peruana `es-PE-CamilaNeural`, velocidad −6 % (`tools/voz_edge.py`). Texto exacto de cada frase en `narracion.json`; tiempos por palabra en `assets/voz/palabras.json`.
- Alcance: administrador, profesor, alumno y apoderado. **Sin superadministrador** (no se muestra "Control del sistema" ni la pestaña "Sistema" de la barra inferior).
- Fuente de verdad del menú: `frontend/src/components/layout/navigation.ts`

Convención: **Voz** = narración y subtítulo · **Pantalla** = lo que se ve · **Foco** = el elemento que se marca en granate · **Captura** = archivo en `assets/screenshots/v2/`.

---

## 01 · Apertura · 0:00–0:10 (10 s)

| Tiempo | Voz | Pantalla |
|---|---|---|
| 0:00–0:04 | — (música entra suave) | Fondo `#F4F6F9`. Aparece el escudo, centrado. |
| 0:04–0:10 | "Bienvenido a Ciencias e Ingeniería. Notas, asistencia y horarios del año escolar, en un solo lugar." | Debajo del escudo: "Ciencias e Ingeniería · Guía de uso". Línea secundaria: "Notas, asistencia y horarios del año escolar en un solo lugar." |

---

## 02 · Cómo ingresar · 0:10–1:10 (60 s) — común a todos

| Tiempo | Voz | Pantalla · Foco | Captura |
|---|---|---|---|
| 0:10–0:20 | "Para empezar, abre el navegador en tu computadora o en tu celular y entra a la página de ingreso del sistema." | Login en escritorio; luego el mismo login en celular a la derecha. Foco: barra de direcciones con `/login`. | `login-desktop.png`, `login-mobile.png` |
| 0:20–0:32 | "Escribe tu usuario institucional. Tiene la forma nombre punto apellido, arroba cienciaseingenieria punto edu. Luego escribe tu contraseña." | Zoom al formulario. El cursor va al campo usuario; se escribe un usuario de prueba. Foco: campo usuario, después campo contraseña. | `login-desktop.png` |
| 0:32–0:40 | "Si quieres revisar lo que escribiste, pulsa el ícono del ojo: Mostrar contraseña." | Foco: botón del ojo. La contraseña de prueba se muestra **difuminada**. | `login-mostrar-desktop.png` |
| 0:40–0:56 | "La primera vez entrarás con una contraseña temporal que te entrega la administración. El sistema te pedirá crear una nueva, de al menos doce caracteres. Al cambiarla, se cierran tus otras sesiones abiertas." | Pantalla de cambio obligatorio de contraseña. Foco: texto "Usa al menos 12 caracteres". Campos difuminados. | `cambio-clave-desktop.png` |
| 0:56–1:10 | "Si ves el mensaje Credenciales inválidas, revisa tu usuario y tu contraseña." | Mensaje "Credenciales inválidas" en el login. Foco: el mensaje. | `login-error-desktop.png` |

---

## 03 · Conocer la pantalla · 1:10–1:50 (40 s) — común

| Tiempo | Voz | Pantalla · Foco | Captura |
|---|---|---|---|
| 1:10–1:22 | "En la computadora, el menú está a la izquierda. La marca granate te indica en qué sección estás." | Panel de administrador. Foco: menú lateral, luego la marca de la sección actual. | `admin-dashboard-desktop.png` |
| 1:22–1:32 | "Arriba tienes el tema claro u oscuro, tu perfil, el calendario y el año escolar. Vigente es el año en curso; Histórico es un año anterior. Pulsa Cambiar para elegir otro." | Zoom a la cabecera. Foco: interruptor de tema → perfil → selector de periodo con "Vigente". | `admin-dashboard-desktop.png` |
| 1:32–1:44 | "En el celular, usa la barra de abajo: Inicio, Módulos, Horarios, Notas y Perfil. En Módulos están todos los accesos. En las listas, cada registro es una tarjeta: tócala para ver los detalles." | Celular: barra inferior → pantalla Módulos → lista con tarjetas. Foco: "Módulos", luego "Toca para ver detalles". | `profesor-inicio-mobile.png`, `profesor-modulos-mobile.png`, `admin-alumnos-mobile.png` |
| 1:44–1:50 | "En Mi perfil ves tus datos y puedes cambiar tu contraseña." | Página Mi perfil. Foco: sección de cambio de contraseña. | `perfil-desktop.png` |

---

## 04 · Funciones por tipo de usuario

### 04a · Administrador · 1:50–3:20 (90 s)

| Tiempo | Voz | Pantalla · Foco | Captura |
|---|---|---|---|
| 1:50–1:58 | "Si eres administrador, gestionas las cuentas, la institución y el año académico." | Tarjeta de título: "Si eres administrador…" + 3 ideas: Cuentas y personas · Organización académica · Matrículas, pagos y reportes. | — |
| 1:58–2:16 | "En Usuarios, pulsa para crear una cuenta. El sistema genera el usuario institucional y una contraseña temporal. Entrégala de forma segura, en persona o por un canal privado." | Usuarios → formulario de nueva cuenta → modal de credenciales. Foco: botón de crear; luego el usuario generado. **Contraseña temporal siempre difuminada.** | `admin-usuarios-desktop.png`, `admin-credenciales-desktop.png` |
| 2:16–2:34 | "En Institución están Alumnos, Profesores y Apoderados. En Apoderados ves los alumnos a cargo de cada uno, y con el botón Alumnos los vinculas." | Menú Institución desplegado → Apoderados. Foco: columna "Alumnos a cargo", luego botón "Alumnos". | `admin-apoderados-desktop.png` |
| 2:34–2:56 | "En Académico organizas el año: Periodos, Estructura académica, donde defines los grados de cada periodo, los cursos de cada grado y sus docentes, además de Cursos y Horarios." | Menú Académico → Estructura académica → Horarios. Foco: grado, curso y docente asignado. | `admin-estructura-desktop.png`, `admin-horarios-desktop.png` |
| 2:56–3:20 | "Además, registras Matrículas y Pagos: mensualidades, matrícula y sueldos. También manejas Documentos y formularios, revisas Alertas y Reportes, y publicas eventos en el Calendario." | Recorrido rápido, un foco por vez: Matrículas → Pagos → Documentos → Alertas → Reportes → Calendario. | `admin-matriculas-desktop.png`, `admin-pagos-desktop.png`, `admin-documentos-desktop.png`, `admin-reportes-desktop.png` |

### 04b · Profesor · 3:20–4:30 (70 s)

| Tiempo | Voz | Pantalla · Foco | Captura |
|---|---|---|---|
| 3:20–3:28 | "Si eres profesor, solo ves tus cursos y tus alumnos asignados." | Tarjeta: "Si eres profesor…" + 3 ideas: Tus cursos y horarios · Notas y asistencia · Seguimiento de tus alumnos. | — |
| 3:28–3:38 | "En el menú encuentras Mis cursos, Mis alumnos y Mis horarios." | Menú del profesor. Foco: los tres accesos, uno tras otro. | `profesor-cursos-desktop.png` |
| 3:38–3:54 | "En Calificaciones, elige un curso, crea una evaluación y registra las notas de cada alumno, de cero a veinte." | Libro de calificaciones. Foco: botón de nueva evaluación → celda de nota. | `profesor-notas-desktop.png`, `profesor-notas-mobile.png` |
| 3:54–4:08 | "En Asistencia, elige la fecha y marca a cada alumno: presente, tardanza, ausente o justificado." | Asistencia del curso. Foco: selector de fecha → opciones de estado. | `profesor-asistencia-desktop.png` |
| 4:08–4:18 | "Si el año elegido es Histórico, solo puedes consultar: no se puede editar." | Selector de periodo con "Histórico". Foco: la etiqueta. | `profesor-historico-desktop.png` |
| 4:18–4:30 | "También ves las alertas de tus alumnos, los apoderados de tus alumnos, el calendario y tus notificaciones." | Alertas → Apoderados → Mis notificaciones. | `profesor-alertas-desktop.png` |

### 04c · Alumno · 4:30–5:10 (40 s)

| Tiempo | Voz | Pantalla · Foco | Captura |
|---|---|---|---|
| 4:30–4:38 | "Si eres alumno, consultas tu propia información." | Tarjeta: "Si eres alumno…" + 3 ideas: Tus notas · Tu asistencia y horario · Tus pagos y avisos. | — |
| 4:38–4:56 | "Desde Mi panel entras a Mis cursos, Mis calificaciones, Mi asistencia y Mis horarios." | Mi panel en celular → Mis calificaciones. Foco: barra inferior "Notas". | `alumno-panel-mobile.png`, `alumno-notas-mobile.png` |
| 4:56–5:10 | "También tienes el Calendario, Mis pagos, Mis alertas y Mis notificaciones." | Mis pagos → Mis notificaciones. | `alumno-pagos-desktop.png` |

### 04d · Apoderado o padre de familia · 5:10–5:50 (40 s)

| Tiempo | Voz | Pantalla · Foco | Captura |
|---|---|---|---|
| 5:10–5:18 | "Si eres padre de familia o apoderado, consultas la información de tus hijos." | Tarjeta: "Si eres apoderado…" + 3 ideas: Elige a tu hijo · Revisa notas y asistencia · Solo consulta. | — |
| 5:18–5:40 | "Entra a Estudiantes a mi cargo y elige al estudiante. Verás su Resumen, Cursos y horarios, Calificaciones y Asistencia." | Lista → detalle del estudiante. Foco: cada pestaña por turno. | `apoderado-estudiantes-mobile.png`, `apoderado-detalle-mobile.png` |
| 5:40–5:50 | "Desde Mi perfil puedes cambiar tu contraseña." | Mi perfil del apoderado. Foco: cambio de contraseña. | `apoderado-perfil-mobile.png` |

---

## 05 · Buenas prácticas y cierre · 5:50–6:20 (30 s)

| Tiempo | Voz | Pantalla · Foco |
|---|---|---|
| 5:50–6:00 | "No compartas tu contraseña. Si usas una computadora compartida, pulsa Cerrar sesión al terminar." | Menú lateral. Foco: "Cerrar Sesión". |
| 6:00–6:10 | "Si tienes dudas o ves un dato incorrecto, comunícate con la administración." | Texto en pantalla con ícono simple. |
| 6:10–6:20 | "Listo. Ya puedes usar el sistema." | Escudo + "Listo para usar el sistema". Música baja y termina. |

---

## Ajustes respecto al prompt original

Lo comprobé contra el menú real (`navigation.ts`) y las rutas (`App.tsx`) para no mostrar cosas que no existen:

1. **Superadministrador eliminado**, como pediste: sin escena, sin "Control del sistema" y sin la pestaña "Sistema" del celular.
2. **Alumno y apoderado: quité "responder formularios y descargar documentos".** Ninguno de los dos tiene ese acceso en su menú ni en sus páginas; Documentos es solo del administrador.
3. **Administrador: quité "notificaciones masivas".** La ruta `/admin/notificaciones` existe, pero no aparece en el menú ni en Módulos, así que un usuario no podría encontrarla.
4. Apoderado: las pestañas reales son Resumen, Cursos y horarios, Calificaciones y Asistencia.
5. El tiempo que liberó el superadministrador se repartió en el cierre (+10 s). Duración final: 6:20.

## Cambios hechos durante el montaje

1. La narración (Edge-TTS, voz peruana) dura 3:56 y el video, con pausas entre pasos, 5:27. Subtítulos y recuadros se sincronizan con el tiempo de cada palabra.
2. Apoderado: el cambio de contraseña está en Mi perfil → pestaña **Seguridad**, y así lo dice la narración.
3. Profesor: la evaluación "Práctica 1" y las notas que se ven son de demostración. Se simularon en el navegador al capturar y no se guardaron en la base de datos. Lo mismo vale para el modal de credenciales y el cambio de contraseña obligatorio.
4. Privacidad: los nombres, correos y DNI de cuentas que no son de prueba se reemplazaron por datos ficticios durante la captura. Las dos contraseñas visibles (campo "mostrar contraseña" y contraseña temporal) van difuminadas con `media-treatment`.
5. Sin música de fondo: la música de catálogo requiere sesión en HeyGen.
6. Se quitó el paso del aviso "Servicio suspendido temporalmente" (pedido tras revisar el borrador).
