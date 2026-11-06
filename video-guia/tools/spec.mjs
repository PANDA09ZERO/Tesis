// Guion visual: qué captura se ve y qué se señala en cada frase de la narración.
// focus: [palabra clave del texto, caja de boxes.json | caja literal {x,y,w,h} en px CSS de la captura]
// La palabra clave fija el momento: el foco aparece cuando la voz la nombra.

export const scenes = [
  {
    id: 'apertura', label: 'Apertura', kind: 'intro',
    lines: [{ id: 'a1' }],
  },
  {
    id: 'ingreso', label: '1 · Cómo ingresar',
    lines: [
      { id: 'i1', step: 'Abre la página de ingreso', shots: [
        { img: 'login-desktop', url: '/login', focus: [['abre', 'urlbar'], ['página', 'form']] },
      ] },
      { id: 'i2', step: 'Escribe tu usuario y contraseña', shots: [
        { img: 'login-lleno-desktop', url: '/login', focus: [['usuario', 'email'], ['contraseña', 'password']] },
      ] },
      { id: 'i3', step: 'Revisa con el ícono del ojo', shots: [
        { img: 'login-mostrar-desktop', url: '/login', privacy: [{ src: 'login-clave.png', box: { x: 962, y: 501, w: 334, h: 40 } }],
          focus: [['ojo', 'eye']] },
      ] },
      { id: 'i4', step: 'Primer ingreso: crea tu contraseña', shots: [
        { img: 'cambio-clave-desktop', url: '/dashboard', focus: [['temporal', 'form'], ['doce', 'hint']] },
      ] },
      { id: 'i5', step: '“Credenciales inválidas”', shots: [
        { img: 'login-error-desktop', url: '/login', focus: [['Credenciales', 'toast'], ['revisa', 'email']] },
      ] },
    ],
  },
  {
    id: 'pantalla', label: '2 · Conocer la pantalla',
    lines: [
      { id: 'p1', step: 'Menú lateral', shots: [
        { img: 'admin-dashboard-desktop', url: '/dashboard', focus: [['menú', 'sidebar'], ['marca', 'active']] },
      ] },
      { id: 'p2', step: 'Cabecera y año escolar', shots: [
        { img: 'admin-dashboard-desktop', url: '/dashboard', focus: [['tema', 'theme'], ['perfil', 'perfil'], ['calendario', 'calendario'], ['año', 'periodo']] },
      ] },
      { id: 'p3', step: 'En el celular: barra inferior', shots: [
        { img: 'profesor-inicio-mobile', focus: [['barra', 'nav']] },
        { img: 'profesor-modulos-mobile', at: 'Módulos están', focus: [['accesos', { x: 8, y: 390, w: 374, h: 150 }]] },
      ] },
      { id: 'p4', step: 'Listas: toca la tarjeta', shots: [
        { img: 'admin-alumnos-mobile', focus: [['tarjeta', 'hint']] },
      ] },
      { id: 'p5', step: 'Mi perfil', shots: [
        { img: 'perfil-desktop', url: '/perfil', focus: [['datos', 'datos'], ['contraseña', { x: 1066, y: 312, w: 336, h: 440 }]] },
      ] },
    ],
  },
  {
    id: 'admin', label: '3 · Administrador', card: {
      title: 'Si eres administrador…',
      ideas: ['Creas las cuentas de usuario', 'Organizas la institución y el año académico', 'Registras matrículas, pagos y reportes'],
    },
    lines: [
      { id: 'ad0', card: true },
      { id: 'ad1', step: 'Usuarios: crea una cuenta', shots: [
        { img: 'admin-usuarios-desktop', url: '/admin/usuarios', focus: [['Usuarios', 'menu'], ['Nuevo', 'nuevo']] },
        { img: 'admin-usuario-nuevo-desktop', url: '/admin/usuarios', at: 'genera', focus: [['genera', 'aviso']] },
      ] },
      { id: 'ad2', step: 'Entrega la clave temporal', shots: [
        { img: 'admin-credenciales-desktop', url: '/admin/usuarios', privacy: [{ src: 'credenciales-clave.png', box: { x: 491, y: 495, w: 458, h: 40 } }],
          focus: [['Entrégala', 'clave']] },
      ] },
      { id: 'ad3', step: 'Institución: apoderados', shots: [
        { img: 'admin-apoderado-detalle-desktop', url: '/admin/apoderados', focus: [['Institución', 'grupo'], ['alumnos a cargo', 'acargo'], ['botón', 'btnAlumnos']] },
      ] },
      { id: 'ad4', step: 'Académico: estructura del año', shots: [
        { img: 'admin-estructura-desktop', url: '/admin/configuracion-academica', focus: [['Académico', 'grupo'], ['grados', 'grado'], ['docentes', 'docente']] },
        { img: 'admin-horarios-desktop', url: '/horarios', at: 'Cursos y Horarios', focus: [] },
      ] },
      { id: 'ad5', step: 'Matrículas y pagos', shots: [
        { img: 'admin-matriculas-desktop', url: '/admin/matriculas', focus: [['Matrículas', 'menu']] },
        { img: 'admin-pagos-desktop', url: '/admin/pagos', at: 'Pagos', focus: [['Pagos', 'menu'], ['mensualidades', { x: 335, y: 205, w: 445, h: 56 }]] },
      ] },
      { id: 'ad6', step: 'Documentos, alertas y reportes', shots: [
        { img: 'admin-documentos-desktop', url: '/documentos', focus: [['Documentos', 'menu']] },
        { img: 'admin-reportes-desktop', url: '/reportes', at: 'Alertas', focus: [['Alertas', ['alertas', 'menu']]] },
        { img: 'admin-calendario-desktop', url: '/calendario', at: 'eventos', focus: [['Calendario', 'nuevo']] },
      ] },
    ],
  },
  {
    id: 'profesor', label: '4 · Profesor', card: {
      title: 'Si eres profesor…',
      ideas: ['Ves solo tus cursos y alumnos', 'Registras notas y asistencia', 'Haces seguimiento con alertas'],
    },
    lines: [
      { id: 'pr0', card: true },
      { id: 'pr1', step: 'Tus cursos, alumnos y horarios', shots: [
        { img: 'profesor-dashboard-desktop', url: '/dashboard', focus: [['Mis cursos', 'cursos'], ['Mis alumnos', 'alumnos'], ['Mis horarios', 'horarios']] },
      ] },
      { id: 'pr2', step: 'Crea una evaluación', shots: [
        { img: 'profesor-evaluacion-nueva-desktop', url: '/calificaciones', focus: [['evaluación', 'dialog']] },
      ] },
      { id: 'pr3', step: 'Registra notas de 0 a 20', shots: [
        { img: 'profesor-notas-desktop', url: '/calificaciones', focus: [['nota', { x: 812, y: 566, w: 130, h: 230 }], ['Guardar', 'guardar']] },
      ] },
      { id: 'pr4', step: 'Marca la asistencia', shots: [
        { img: 'profesor-asistencia-desktop', url: '/asistencias', focus: [['fecha', 'fecha'], ['presente', { x: 606, y: 456, w: 176, h: 310 }]] },
      ] },
      { id: 'pr5', step: 'Histórico: solo consulta', shots: [
        { img: 'profesor-historico-desktop', url: '/calificaciones', focus: [['Histórico', 'periodo'], ['consultar', 'badge']] },
      ] },
      { id: 'pr6', step: 'Alertas y avisos', shots: [
        { img: 'profesor-alertas-desktop', url: '/alertas', focus: [['alertas', 'menu']] },
        { img: 'profesor-apoderados-desktop', url: '/profesor/apoderados', at: 'apoderados', focus: [['apoderados', 'menu']] },
        { img: 'profesor-notificaciones-desktop', url: '/profesor/notificaciones', at: 'notificaciones', focus: [['notificaciones', 'menu']] },
      ] },
    ],
  },
  {
    id: 'alumno', label: '5 · Alumno', card: {
      title: 'Si eres alumno…',
      ideas: ['Consultas tus notas', 'Revisas tu asistencia y horario', 'Ves tus pagos y avisos'],
    },
    lines: [
      { id: 'al0', card: true },
      { id: 'al1', step: 'Tus notas y asistencia', shots: [
        { img: 'alumno-panel-mobile', focus: [['Mi panel', 'nav']] },
        { img: 'alumno-notas-mobile', at: 'Mis calificaciones', focus: [['calificaciones', 'titulo']] },
      ] },
      { id: 'al2', step: 'Pagos y avisos', shots: [
        { img: 'alumno-pagos-desktop', url: '/estudiante/pagos', focus: [['Calendario', 'calendario'], ['Mis pagos', 'menu'], ['Mis alertas', 'alertas'], ['Mis notificaciones', 'notif']] },
      ] },
    ],
  },
  {
    id: 'apoderado', label: '6 · Apoderado', card: {
      title: 'Si eres apoderado…',
      ideas: ['Eliges a tu hijo o hija', 'Revisas sus notas y asistencia', 'Solo consulta: no se edita nada'],
    },
    lines: [
      { id: 'ap0', card: true },
      { id: 'ap1', step: 'Elige al estudiante', shots: [
        { img: 'apoderado-estudiantes-mobile', focus: [['estudiante', 'card']] },
      ] },
      { id: 'ap2', step: 'Resumen, notas y asistencia', shots: [
        { img: 'apoderado-resumen-mobile', focus: [['Resumen', 'tabs']] },
        { img: 'apoderado-detalle-mobile', at: 'Calificaciones', focus: [['Calificaciones', 'tabs']] },
      ] },
      { id: 'ap3', step: 'Cambia tu contraseña', shots: [
        { img: 'apoderado-seguridad-mobile', focus: [['Seguridad', 'tab'], ['contraseña', 'card']] },
      ] },
    ],
  },
  {
    id: 'cierre', label: 'Buenas prácticas', kind: 'outro',
    lines: [
      { id: 'c1', step: 'Cierra sesión al terminar', shots: [
        { img: 'admin-dashboard-desktop', url: '/dashboard', focus: [['Cerrar sesión', 'logout']] },
      ] },
      { id: 'c2', note: true },
      { id: 'c3', end: true },
    ],
  },
];
