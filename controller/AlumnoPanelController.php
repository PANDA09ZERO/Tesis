<?php
require_once __DIR__ . '/Controller.php';
require_once __DIR__ . '/../model/Alumno.php';
require_once __DIR__ . '/../model/Calificacion.php';
require_once __DIR__ . '/../model/Asistencia.php';
require_once __DIR__ . '/../model/Periodo.php';
require_once __DIR__ . '/../model/Documento.php';

class AlumnoPanelController extends Controller {
    private $alumnoModel;
    private $calModel;
    private $asistenciaModel;
    private $periodoModel;
    private $docModel;

    public function __construct() {
        parent::__construct();
        $this->alumnoModel = new Alumno();
        $this->calModel = new Calificacion();
        $this->asistenciaModel = new Asistencia();
        $this->periodoModel = new Periodo();
        $this->docModel = new Documento();
    }

    private function getAlumnoActual() {
        return $this->db->selectOne(
            "SELECT a.*, m.grado_id, m.seccion_id, m.periodo_id,
                    g.nombre as grado, s.nombre as seccion
             FROM alumnos a
             LEFT JOIN matriculas m ON a.id = m.alumno_id AND m.estado = 'Activa'
             LEFT JOIN grados g ON m.grado_id = g.id
             LEFT JOIN secciones s ON m.seccion_id = s.id
             WHERE a.usuario_id = ?",
            [$_SESSION['user_id']]
        );
    }

    public function dashboard() {
        requireRole([ROLE_ALUMNO]);
        $alumno = $this->getAlumnoActual();
        if (!$alumno) { $this->view('alumno_panel/sin_matricula', ['pageTitle' => 'Mi Panel']); return; }

        $periodoId = $alumno['periodo_id'];
        $promedio = $this->calModel->getPromedioAlumno($alumno['id'], $periodoId);
        $asistencia = $this->asistenciaModel->getResumenAlumno($alumno['id'], $periodoId);
        $calRecientes = $this->db->select(
            "SELECT c.*, cur.nombre as curso_nombre FROM calificaciones c
             JOIN cursos cur ON c.curso_id = cur.id
             WHERE c.alumno_id = ? AND c.periodo_id = ?
             ORDER BY c.created_at DESC LIMIT 5",
            [$alumno['id'], $periodoId]
        );
        $alertas = $this->db->select(
            "SELECT * FROM alertas_academicas WHERE alumno_id = ? AND estado = 'Activa' ORDER BY created_at DESC LIMIT 3",
            [$alumno['id']]
        );
        $docsPendientes = $this->db->count('documentos',
            "alumno_id = ? AND (estado = 'Pendiente' OR (fecha_vencimiento IS NOT NULL AND fecha_vencimiento < CURDATE()))",
            [$alumno['id']]
        );
        $mensajesNoLeidos = $this->db->count('mensajes', "receptor_id = ? AND leido = 0", [$_SESSION['user_id']]);

        $this->view('alumno_panel/dashboard', [
            'pageTitle' => 'Mi Panel',
            'alumno' => $alumno,
            'promedio' => $promedio,
            'asistencia' => $asistencia,
            'calRecientes' => $calRecientes,
            'alertas' => $alertas,
            'docsPendientes' => $docsPendientes,
            'mensajesNoLeidos' => $mensajesNoLeidos,
        ]);
    }

    public function cursos() {
        requireRole([ROLE_ALUMNO]);
        $alumno = $this->getAlumnoActual();
        if (!$alumno) { redirect('index.php?route=alumno-panel/dashboard'); return; }

        $periodoId = $alumno['periodo_id'];
        $cursos = $this->db->select(
            "SELECT c.*, h.dia, h.hora_inicio, h.hora_fin, h.aula,
                    CONCAT(p.apellido_paterno, ' ', p.nombre) as profesor_nombre
             FROM horarios h
             JOIN cursos c ON h.curso_id = c.id
             JOIN profesores p ON h.profesor_id = p.id
             WHERE h.grado_id = ? AND h.seccion_id = ? AND h.periodo_id = ?
             ORDER BY FIELD(h.dia, 'Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'), h.hora_inicio",
            [$alumno['grado_id'], $alumno['seccion_id'], $periodoId]
        );

        $cursoIds = array_column($cursos, 'id');
        $ultimasCal = [];
        $promedios = [];
        if ($cursoIds) {
            $placeholders = implode(',', array_fill(0, count($cursoIds), '?'));
            $calRows = $this->db->select(
                "SELECT c1.curso_id, c1.nota
                 FROM calificaciones c1
                 INNER JOIN (
                     SELECT curso_id, MAX(id) as max_id
                     FROM calificaciones
                     WHERE alumno_id = ? AND periodo_id = ? AND curso_id IN ($placeholders)
                     GROUP BY curso_id
                 ) c2 ON c1.id = c2.max_id",
                array_merge([$alumno['id'], $periodoId], $cursoIds)
            );
            foreach ($calRows as $row) {
                $ultimasCal[$row['curso_id']] = $row['nota'];
            }
            $promRows = $this->db->select(
                "SELECT curso_id, ROUND(AVG(nota), 1) as promedio
                 FROM calificaciones
                 WHERE alumno_id = ? AND periodo_id = ? AND curso_id IN ($placeholders)
                 GROUP BY curso_id",
                array_merge([$alumno['id'], $periodoId], $cursoIds)
            );
            foreach ($promRows as $row) {
                $promedios[$row['curso_id']] = $row['promedio'];
            }
        }

        $this->view('alumno_panel/cursos', [
            'pageTitle' => 'Mis Cursos',
            'alumno' => $alumno,
            'cursos' => $cursos,
            'ultimasCal' => $ultimasCal,
            'promedios' => $promedios,
        ]);
    }

    public function companeros() {
        requireRole([ROLE_ALUMNO]);
        $alumno = $this->getAlumnoActual();
        if (!$alumno) { redirect('index.php?route=alumno-panel/dashboard'); return; }

        $companeros = $this->db->select(
            "SELECT a.id, a.codigo, a.nombre, a.apellido_paterno, a.apellido_materno,
                    CONCAT(a.apellido_paterno, ' ', a.apellido_materno, ', ', a.nombre) as nombre_completo
             FROM alumnos a
             JOIN matriculas m ON a.id = m.alumno_id AND m.estado = 'Activa'
             WHERE m.grado_id = ? AND m.seccion_id = ? AND m.periodo_id = ? AND a.id != ?
             ORDER BY a.apellido_paterno, a.apellido_materno, a.nombre",
            [$alumno['grado_id'], $alumno['seccion_id'], $alumno['periodo_id'], $alumno['id']]
        );

        $this->view('alumno_panel/companeros', [
            'pageTitle' => 'Mis Compañeros',
            'alumno' => $alumno,
            'companeros' => $companeros,
        ]);
    }

    public function calendario() {
        requireRole([ROLE_ALUMNO]);
        $alumno = $this->getAlumnoActual();

        $eventos = $this->db->select(
            "SELECT * FROM eventos_calendario 
             WHERE (fecha_inicio >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) 
                    OR fecha_fin >= CURDATE())
             ORDER BY fecha_inicio"
        );

        $this->view('alumno_panel/calendario', [
            'pageTitle' => 'Calendario',
            'alumno' => $alumno,
            'eventos' => $eventos,
        ]);
    }

    public function calificaciones() {
        requireRole([ROLE_ALUMNO]);
        $alumno = $this->getAlumnoActual();
        if (!$alumno) { redirect('index.php?route=alumno-panel/dashboard'); return; }

        $periodoId = $this->getGet('periodo_id') ?: $alumno['periodo_id'];
        $periodos = $this->periodoModel->getAll();
        $calificaciones = $this->alumnoModel->getCalificaciones($alumno['id'], $periodoId);
        $promedio = $this->calModel->getPromedioAlumno($alumno['id'], $periodoId);

        $this->view('alumno_panel/calificaciones', [
            'pageTitle' => 'Mis Calificaciones',
            'alumno' => $alumno,
            'calificaciones' => $calificaciones,
            'promedio' => $promedio,
            'periodos' => $periodos,
            'periodoId' => $periodoId,
        ]);
    }

    public function asistencia() {
        requireRole([ROLE_ALUMNO]);
        $alumno = $this->getAlumnoActual();
        if (!$alumno) { redirect('index.php?route=alumno-panel/dashboard'); return; }

        $resumen = $this->asistenciaModel->getResumenAlumno($alumno['id'], $alumno['periodo_id']);
        $registros = $this->db->select(
            "SELECT a.*, h.dia, cur.nombre as curso_nombre, h.hora_inicio
             FROM asistencias a
             JOIN horarios h ON a.horario_id = h.id
             JOIN cursos cur ON h.curso_id = cur.id
             WHERE a.alumno_id = ? AND h.periodo_id = ?
             ORDER BY a.fecha DESC, h.hora_inicio",
            [$alumno['id'], $alumno['periodo_id']]
        );

        $this->view('alumno_panel/asistencia', [
            'pageTitle' => 'Mi Asistencia',
            'alumno' => $alumno,
            'resumen' => $resumen,
            'registros' => $registros,
        ]);
    }

    public function documentos() {
        requireRole([ROLE_ALUMNO]);
        $alumno = $this->getAlumnoActual();
        $documentos = $this->db->select(
            "SELECT d.* FROM documentos d WHERE d.alumno_id = ? ORDER BY d.created_at DESC",
            [$alumno['id']]
        );

        $this->view('alumno_panel/documentos', [
            'pageTitle' => 'Mis Documentos',
            'alumno' => $alumno,
            'documentos' => $documentos,
        ]);
    }

    public function mensajes() {
        requireRole([ROLE_ALUMNO]);
        $usuarioId = $_SESSION['user_id'];

        if ($this->isPost() && $this->getPost('accion') === 'enviar') {
            $this->validateCSRF();
            $receptorId = $this->getPost('receptor_id');
            $asunto = trim($this->getPost('asunto'));
            $mensaje = trim($this->getPost('mensaje'));

            if ($receptorId && $asunto && $mensaje) {
                $this->db->insert('mensajes', [
                    'emisor_id' => $usuarioId,
                    'receptor_id' => $receptorId,
                    'asunto' => $asunto,
                    'mensaje' => $mensaje,
                ]);
                $this->setFlash('success', 'Mensaje enviado');
            }
            redirect('index.php?route=alumno-panel/mensajes');
        }

        $recibidos = $this->db->select(
            "SELECT m.*, CONCAT(u.username) as emisor_nombre
             FROM mensajes m JOIN usuarios u ON m.emisor_id = u.id
             WHERE m.receptor_id = ? ORDER BY m.created_at DESC",
            [$usuarioId]
        );
        $enviados = $this->db->select(
            "SELECT m.*, CONCAT(u.username) as receptor_nombre
             FROM mensajes m JOIN usuarios u ON m.receptor_id = u.id
             WHERE m.emisor_id = ? ORDER BY m.created_at DESC",
            [$usuarioId]
        );
        $noLeidos = $this->db->count('mensajes', "receptor_id = ? AND leido = 0", [$usuarioId]);

        $docentes = $this->db->select(
            "SELECT u.id, u.username, p.nombre, p.apellido_paterno
             FROM usuarios u JOIN roles r ON u.rol_id = r.id
             LEFT JOIN profesores p ON p.usuario_id = u.id
             WHERE r.nombre = 'Profesor' AND u.estado = 1"
        );

        $this->view('alumno_panel/mensajes', [
            'pageTitle' => 'Mis Mensajes',
            'alumno' => $this->getAlumnoActual(),
            'recibidos' => $recibidos,
            'enviados' => $enviados,
            'noLeidos' => $noLeidos,
            'docentes' => $docentes,
        ]);
    }

    public function verMensaje($id) {
        requireRole([ROLE_ALUMNO]);
        $msg = $this->db->selectOne(
            "SELECT m.*, 
                    CONCAT(e.username) as emisor_nombre,
                    CONCAT(r.username) as receptor_nombre
             FROM mensajes m
             JOIN usuarios e ON m.emisor_id = e.id
             JOIN usuarios r ON m.receptor_id = r.id
             WHERE m.id = ? AND (m.emisor_id = ? OR m.receptor_id = ?)",
            [$id, $_SESSION['user_id'], $_SESSION['user_id']]
        );

        if ($msg && $msg['receptor_id'] == $_SESSION['user_id'] && !$msg['leido']) {
            $this->db->update('mensajes', ['leido' => 1], 'id = ?', [$id]);
        }

        $this->json($msg ?: ['error' => 'Mensaje no encontrado']);
    }
}
