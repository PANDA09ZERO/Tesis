// Guion visual v3 (vertical, para celular). Cada frase de narracion.json → capturas y focos.
// focus: [palabra clave del texto, caja de boxes.json | caja literal {x,y,w,h}]. El foco aparece cuando la voz dice la palabra.
// privacy: recorte difuminado sobre una caja de boxes.json (ref).

export const scenes = [
  { id: 'apertura', label: 'Apertura', kind: 'intro', lines: [{ id: 'a1' }] },
  {
    id: 'ingreso', label: 'Cómo ingresar',
    lines: [
      { id: 'i1', step: 'Abre la página de ingreso', shots: [
        { img: 'login-desktop', url: '/login', focus: [['abre', 'urlbar'], ['página', 'form']] },
        { img: 'login-mobile', at: 'celular', focus: [] },
      ] },
      { id: 'i2', step: 'Escribe tu usuario y contraseña', shots: [
        { img: 'login-lleno-desktop', url: '/login', focus: [['usuario', 'email'], ['contraseña', 'password']] },
      ] },
      { id: 'i3', step: 'Revisa con el ícono del ojo', shots: [
        { img: 'login-mostrar-desktop', url: '/login', privacy: [{ src: 'login-clave.png', ref: 'password', trimRight: 48 }], focus: [['ojo', 'eye']] },
      ] },
      { id: 'i4', step: 'Primer ingreso: crea tu contraseña', shots: [
        { img: 'cambio-clave-desktop', url: '/dashboard', focus: [['temporal', 'form'], ['doce', 'hint']] },
      ] },
      { id: 'i5', step: '“Credenciales inválidas”', shots: [
        { img: 'login-error-desktop', url: '/login', focus: [['Credenciales', 'toast'], ['revisa', 'email']] },
      ] },
      { id: 'i6', step: 'Instala la app en tu celular', shots: [
        { img: 'login-instalar-mobile', focus: [['Instalar app', 'instalar']] },
      ] },
    ],
  },
  {
    id: 'pantalla', label: 'Conocer la pantalla',
    lines: [
      { id: 'p1', step: 'Menú lateral', shots: [{ img: 'admin-dashboard-desktop', url: '/dashboard', focus: [['menú', 'sidebar'], ['marca', 'active']] }] },
      { id: 'p2', step: 'Cabecera y año escolar', shots: [{ img: 'admin-dashboard-desktop', url: '/dashboard', focus: [['tema', 'theme'], ['perfil', 'perfil'], ['calendario', 'calendario'], ['año', 'periodo']] }] },
      { id: 'p3', step: 'En el celular: barra inferior', shots: [
        { img: 'profesor-inicio-mobile', focus: [['barra', 'nav']] },
        { img: 'profesor-modulos-mobile', at: 'Módulos están', focus: [] },
      ] },
      { id: 'p4', step: 'Listas: toca la tarjeta', shots: [{ img: 'admin-alumnos-mobile', focus: [['tarjeta', 'card']] }] },
      { id: 'p5', step: 'Mi perfil', shots: [{ img: 'perfil-desktop', url: '/perfil', focus: [['datos', 'datos'], ['contraseña', 'clave']] }] },
    ],
  },
  {
    id: 'admin', label: 'Administrador', card: {
      title: 'Si eres administrador…',
      ideas: ['Preparas el año escolar', 'Registras a las personas', 'Haces seguimiento'],
    },
    lines: [
      { id: 'ad0', card: true },
      { id: 'ad1', step: 'Tu Dashboard', shots: [{ img: 'admin-dashboard-desktop', url: '/dashboard', focus: [['alertas', 'alertasCard'], ['rendimiento', 'rendimiento'], ['actividad', 'actividad']] }] },
      { id: 'ad2', step: 'Crea el año escolar', shots: [{ img: 'admin-periodos-desktop', url: '/periodos', focus: [['Periodos', 'menu'], ['nombre', 'dialog'], ['Periodo activo', 'activo']] }] },
      { id: 'ad3', step: 'Arma la estructura del año', shots: [{ img: 'admin-estructura-desktop', url: '/admin/configuracion-academica', focus: [['grados', 'grado'], ['cursos de cada', 'cursos'], ['profesor', 'docente']] }] },
      { id: 'ad4', step: 'Copia un año anterior', shots: [
        { img: 'admin-estructura-desktop', url: '/admin/configuracion-academica', focus: [['Clonar', 'clonar']] },
        { img: 'admin-estructura-clonar-desktop', url: '/admin/configuracion-academica', at: 'no tendrás', focus: [['cero', 'dialog']] },
      ] },
      { id: 'ad5', step: 'Catálogo de cursos', shots: [
        { img: 'admin-cursos-desktop', url: '/cursos', focus: [['Cursos', 'menu'], ['catálogo', 'tab']] },
        { img: 'admin-curso-nuevo-desktop', url: '/cursos', at: 'creas', focus: [['curso nuevo', 'dialog']] },
        { img: 'admin-cursos-desktop', url: '/cursos', at: 'Gestionar', focus: [['Gestionar', 'gestionar']] },
      ] },
      { id: 'ad6', step: 'Horarios', shots: [{ img: 'admin-horario-nuevo-desktop', url: '/horarios', focus: [['Nuevo horario', 'dialog'], ['oferta', 'oferta']] }] },
      { id: 'ad7', step: 'Crea las cuentas', shots: [
        { img: 'admin-usuarios-desktop', url: '/admin/usuarios', focus: [['Usuarios', 'menu']] },
        { img: 'admin-usuario-nuevo-desktop', url: '/admin/usuarios', at: 'rol', focus: [['rol', 'rol'], ['genera', 'aviso']] },
      ] },
      { id: 'ad8', step: 'Entrega la clave temporal', shots: [
        { img: 'admin-credenciales-desktop', url: '/admin/usuarios', privacy: [{ src: 'credenciales-clave.png', ref: 'clave' }], focus: [['privado', 'clave']] },
      ] },
      { id: 'ad9', step: 'Alumnos y su ficha', shots: [
        { img: 'admin-alumnos-desktop', url: '/alumnos', focus: [['Alumnos', 'menu'], ['buscarlos', 'buscar']] },
        { img: 'admin-alumno-ficha-desktop', url: '/alumnos', at: 'ficha', focus: [['incidencias', 'incidencias']] },
      ] },
      { id: 'ad10', step: 'Profesores', shots: [{ img: 'admin-profesores-desktop', url: '/profesores', focus: [['Profesores', 'menu']] }] },
      { id: 'ad11', step: 'Apoderados', shots: [{ img: 'admin-apoderado-detalle-desktop', url: '/admin/apoderados', focus: [['alumnos a cargo', 'acargo'], ['botón', 'btnAlumnos']] }] },
      { id: 'ad12', step: 'Matrículas', shots: [{ img: 'admin-matricula-nueva-desktop', url: '/admin/matriculas', focus: [['alumno', 'dialog'], ['Inscribir', 'auto']] }] },
      { id: 'ad13', step: 'Pagos', shots: [
        { img: 'admin-pagos-desktop', url: '/admin/pagos', focus: [['separado', 'tabs'], ['Nuevo concepto', 'nuevo']] },
        { img: 'admin-pago-nuevo-desktop', url: '/admin/pagos', at: 'Nuevo concepto', focus: [['el mes', 'dialog']] },
        { img: 'admin-pagos-desktop', url: '/admin/pagos', at: 'filtros', focus: [] },
      ] },
      { id: 'ad14', step: 'Notas y asistencia', shots: [
        { img: 'admin-calificaciones-desktop', url: '/calificaciones', focus: [['Calificaciones', 'menu']] },
        { img: 'admin-asistencia-desktop', url: '/asistencias', at: 'revisas', focus: [['corregirlo', 'menu']] },
      ] },
      { id: 'ad15', step: 'Documentos y formularios', shots: [{ img: 'admin-documentos-desktop', url: '/documentos', focus: [['Documentos', 'menu']] }] },
      { id: 'ad16', step: 'Calendario', shots: [
        { img: 'admin-calendario-desktop', url: '/calendario', focus: [['Calendario', 'nuevo']] },
        { img: 'admin-calendario-nuevo-desktop', url: '/calendario', at: 'feriados', focus: [['fecha', 'dialog']] },
      ] },
      { id: 'ad17', step: 'Alertas automáticas', shots: [{ img: 'admin-alertas-desktop', url: '/alertas', focus: [['seis horas', 'info'], ['Revisar ahora', 'revisar'], ['atendida', 'atender']] }] },
      { id: 'ad18', step: 'Incidencias de conducta', shots: [
        { img: 'admin-incidencias-desktop', url: '/incidencias', focus: [['Incidencias', 'menu']] },
        { img: 'admin-incidencia-nueva-desktop', url: '/incidencias', at: 'derivado', focus: [['tipo', 'tipo'], ['gravedad', 'gravedad']] },
        { img: 'admin-incidencias-desktop', url: '/incidencias', at: 'En seguimiento', focus: [['En seguimiento', 'seguimiento'], ['cierras', 'cerrar']] },
      ] },
      { id: 'ad19', step: 'Reportes', shots: [{ img: 'admin-reportes-desktop', url: '/reportes', focus: [['Reportes', 'menu']] }] },
      { id: 'ad20', step: 'Avisos masivos', shots: [{ img: 'admin-notificaciones-desktop', url: '/admin/notificaciones', focus: [['Notificaciones', 'menu'], ['roles', 'dialog']] }] },
    ],
  },
  {
    id: 'profesor', label: 'Profesor', card: {
      title: 'Si eres profesor…',
      ideas: ['Ves solo tus cursos y alumnos', 'Registras notas y asistencia', 'Haces seguimiento'],
    },
    lines: [
      { id: 'pr0', card: true },
      { id: 'pr1', step: 'Tu panel', shots: [{ img: 'profesor-dashboard-desktop', url: '/dashboard', focus: [['cursos y grupos', 'cursosCard'], ['evaluaciones', 'evals'], ['avisos', 'avisos']] }] },
      { id: 'pr2', step: 'Mis cursos', shots: [{ img: 'profesor-curso-detalle-desktop', url: '/cursos/oferta/45', focus: [['Mis cursos', 'menu'], ['lista de alumnos', 'alumnos'], ['accesos', 'acciones']] }] },
      { id: 'pr3', step: 'Mis alumnos', shots: [{ img: 'profesor-alumnos-desktop', url: '/alumnos', focus: [['Mis alumnos', 'menu']] }] },
      { id: 'pr4', step: 'Crea una evaluación', shots: [{ img: 'profesor-evaluacion-nueva-desktop', url: '/calificaciones', focus: [['Crea una evaluación', 'dialog'], ['nombre', 'nombre']] }] },
      { id: 'pr5', step: 'Registra las notas', shots: [{ img: 'profesor-notas-desktop', url: '/calificaciones', focus: [['Guardar', 'guardar'], ['promedio', 'promedio']] }] },
      { id: 'pr6', step: 'Toma la asistencia', shots: [{ img: 'profesor-asistencia-desktop', url: '/asistencias', focus: [['fecha', 'fecha'], ['Todos presentes', 'todos'], ['ausente', 'estados'], ['guarda', 'guardar']] }] },
      { id: 'pr7', step: 'Historial de asistencia', shots: [{ img: 'profesor-asistencia-historial-desktop', url: '/asistencias', focus: [['Desde', 'desde'], ['historial', 'historial']] }] },
      { id: 'pr8', step: 'Año histórico: solo consulta', shots: [{ img: 'profesor-historico-desktop', url: '/calificaciones', focus: [['Histórico', 'periodo'], ['consulta', 'badge']] }] },
      { id: 'pr9', step: 'Horarios y calendario', shots: [{ img: 'profesor-horarios-desktop', url: '/horarios', focus: [['Mis horarios', 'menu']] }] },
      { id: 'pr10', step: 'Alertas de tus alumnos', shots: [{ img: 'profesor-alertas-desktop', url: '/alertas', focus: [['motivo', 'chips'], ['atendida', 'atender']] }] },
      { id: 'pr11', step: 'Registra una incidencia', shots: [{ img: 'profesor-incidencia-nueva-desktop', url: '/incidencias', focus: [['Registrar incidencia', 'dialog'], ['elige el tipo', 'tipo']] }] },
      { id: 'pr12', step: 'Apoderados y avisos', shots: [
        { img: 'profesor-apoderados-desktop', url: '/profesor/apoderados', focus: [['Apoderados', 'menu']] },
        { img: 'profesor-notificaciones-desktop', url: '/profesor/notificaciones', at: 'Mis notificaciones', focus: [['avisos', 'menu']] },
      ] },
    ],
  },
  {
    id: 'alumno', label: 'Alumno', card: { title: 'Si eres alumno…', ideas: ['Consultas tus notas', 'Revisas tu asistencia y horario', 'Ves tus pagos y avisos'] },
    lines: [
      { id: 'al0', card: true },
      { id: 'al1', step: 'Tus notas y asistencia', shots: [
        { img: 'alumno-panel-mobile', focus: [['Mi panel', 'nav']] },
        { img: 'alumno-notas-mobile', at: 'Mis calificaciones', focus: [['calificaciones', 'titulo']] },
      ] },
      { id: 'al2', step: 'Pagos y avisos', shots: [{ img: 'alumno-pagos-desktop', url: '/estudiante/pagos', focus: [['Calendario', 'calendario'], ['Mis pagos', 'menu'], ['Mis alertas', 'alertas'], ['Mis notificaciones', 'notif']] }] },
    ],
  },
  {
    id: 'apoderado', label: 'Apoderado', card: { title: 'Si eres apoderado…', ideas: ['Eliges a tu hijo o hija', 'Revisas notas, asistencia y conducta', 'Solo consulta: no se edita nada'] },
    lines: [
      { id: 'ap0', card: true },
      { id: 'ap1', step: 'Elige al estudiante', shots: [{ img: 'apoderado-estudiantes-mobile', focus: [['estudiante', 'card']] }] },
      { id: 'ap2', step: 'Notas, asistencia y conducta', shots: [
        { img: 'apoderado-resumen-mobile', focus: [['Resumen', 'tabs']] },
        { img: 'apoderado-detalle-mobile', at: 'Calificaciones', focus: [] },
        { img: 'apoderado-conducta-mobile', at: 'Conducta', focus: [['Conducta', 'seccion']] },
      ] },
      { id: 'ap3', step: 'Cambia tu contraseña', shots: [{ img: 'apoderado-seguridad-mobile', focus: [['Seguridad', 'tab'], ['contraseña', 'card']] }] },
    ],
  },
  {
    id: 'cierre', label: 'Buenas prácticas', kind: 'outro',
    lines: [
      { id: 'c1', step: 'Cierra sesión al terminar', shots: [{ img: 'admin-dashboard-desktop', url: '/dashboard', focus: [['Cerrar sesión', 'logout']] }] },
      { id: 'c2', note: true },
      { id: 'c3', end: true },
    ],
  },
];
