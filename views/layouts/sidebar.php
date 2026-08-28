<?php
$user = currentUser();
$route = $_GET['route'] ?? 'dashboard';
$parts = explode('/', $route);
$currentMenu = $parts[0];
$isAlumno = $user['rol_id'] === ROLE_ALUMNO;
$isProfesor = $user['rol_id'] === ROLE_PROFESOR;
$isAdmin = $user['rol_id'] === ROLE_ADMIN;
?>
<nav id="sidebar" class="bg-dark text-white sidebar">
    <div class="sidebar-inner">
        <ul class="nav flex-column mt-3">

            <?php if ($isAlumno): ?>
            <!-- MENÚ DEL ALUMNO -->
            <li class="nav-item">
                <a class="nav-link <?= $currentMenu === 'alumno-panel' && empty($parts[1]) ? 'active' : '' ?>" 
                   href="<?= BASE_URL ?>index.php?route=alumno-panel/dashboard">
                    <i class="bi bi-speedometer2 me-2"></i>Mi Panel
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link <?= ($parts[1] ?? '') === 'cursos' ? 'active' : '' ?>" 
                   href="<?= BASE_URL ?>index.php?route=alumno-panel/cursos">
                    <i class="bi bi-book-fill me-2"></i>Mis Cursos
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link <?= ($parts[1] ?? '') === 'companeros' ? 'active' : '' ?>" 
                   href="<?= BASE_URL ?>index.php?route=alumno-panel/companeros">
                    <i class="bi bi-people-fill me-2"></i>Mis Compañeros
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link <?= ($parts[1] ?? '') === 'calificaciones' ? 'active' : '' ?>" 
                   href="<?= BASE_URL ?>index.php?route=alumno-panel/calificaciones">
                    <i class="bi bi-journal-text me-2"></i>Mis Calificaciones
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link <?= ($parts[1] ?? '') === 'asistencia' ? 'active' : '' ?>" 
                   href="<?= BASE_URL ?>index.php?route=alumno-panel/asistencia">
                    <i class="bi bi-calendar-check me-2"></i>Mi Asistencia
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link <?= ($parts[1] ?? '') === 'calendario' ? 'active' : '' ?>" 
                   href="<?= BASE_URL ?>index.php?route=alumno-panel/calendario">
                    <i class="bi bi-calendar3 me-2"></i>Calendario
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link <?= ($parts[1] ?? '') === 'mensajes' ? 'active' : '' ?>" 
                   href="<?= BASE_URL ?>index.php?route=alumno-panel/mensajes">
                    <i class="bi bi-envelope-fill me-2"></i>Mensajes
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link <?= ($parts[1] ?? '') === 'documentos' ? 'active' : '' ?>" 
                   href="<?= BASE_URL ?>index.php?route=alumno-panel/documentos">
                    <i class="bi bi-file-earmark-text-fill me-2"></i>Mis Documentos
                </a>
            </li>

            <?php else: ?>
            <!-- MENÚ ADMIN / PROFESOR -->
            <li class="nav-item">
                <a class="nav-link <?= $currentMenu === 'dashboard' ? 'active' : '' ?>" 
                   href="<?= BASE_URL ?>index.php?route=dashboard">
                    <i class="bi bi-speedometer2 me-2"></i>Dashboard
                </a>
            </li>

            <?php if ($isAdmin || $isProfesor): ?>
            <li class="nav-item">
                <a class="nav-link <?= $currentMenu === 'alumnos' ? 'active' : '' ?>" 
                   href="<?= BASE_URL ?>index.php?route=alumnos">
                    <i class="bi bi-people-fill me-2"></i>Alumnos
                </a>
            </li>
            <?php endif; ?>

            <?php if ($isAdmin): ?>
            <li class="nav-item">
                <a class="nav-link <?= $currentMenu === 'profesores' ? 'active' : '' ?>" 
                   href="<?= BASE_URL ?>index.php?route=profesores">
                    <i class="bi bi-person-workspace me-2"></i>Profesores
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link <?= $currentMenu === 'apoderados' ? 'active' : '' ?>" 
                   href="<?= BASE_URL ?>index.php?route=apoderados">
                    <i class="bi bi-person-hearts me-2"></i>Apoderados
                </a>
            </li>
            <?php endif; ?>

            <?php if ($isAdmin || $isProfesor): ?>
            <li class="nav-item">
                <a class="nav-link <?= $currentMenu === 'cursos' ? 'active' : '' ?>" 
                   href="<?= BASE_URL ?>index.php?route=cursos">
                    <i class="bi bi-book-fill me-2"></i>Cursos
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link <?= $currentMenu === 'calificaciones' ? 'active' : '' ?>" 
                   href="<?= BASE_URL ?>index.php?route=calificaciones">
                    <i class="bi bi-journal-text me-2"></i>Calificaciones
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link <?= $currentMenu === 'asistencias' ? 'active' : '' ?>" 
                   href="<?= BASE_URL ?>index.php?route=asistencias">
                    <i class="bi bi-calendar-check me-2"></i>Asistencias
                </a>
            </li>
            <?php endif; ?>

            <?php if ($isAdmin): ?>
            <li class="nav-item">
                <a class="nav-link <?= $currentMenu === 'horarios' ? 'active' : '' ?>" 
                   href="<?= BASE_URL ?>index.php?route=horarios">
                    <i class="bi bi-clock-fill me-2"></i>Horarios
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link <?= $currentMenu === 'matriculas' ? 'active' : '' ?>" 
                   href="<?= BASE_URL ?>index.php?route=matriculas">
                    <i class="bi bi-card-list me-2"></i>Matrículas
                </a>
            </li>
            <?php endif; ?>

            <li class="nav-item">
                <a class="nav-link <?= $currentMenu === 'documentos' ? 'active' : '' ?>" 
                   href="<?= BASE_URL ?>index.php?route=documentos">
                    <i class="bi bi-file-earmark-text-fill me-2"></i>Documentos
                </a>
            </li>

            <?php if ($isAdmin): ?>
            <li class="nav-item">
                <a class="nav-link <?= $currentMenu === 'alertas' ? 'active' : '' ?>" 
                   href="<?= BASE_URL ?>index.php?route=alertas">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>Alertas IA
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link <?= $currentMenu === 'usuarios' ? 'active' : '' ?>" 
                   href="<?= BASE_URL ?>index.php?route=usuarios">
                    <i class="bi bi-shield-lock-fill me-2"></i>Usuarios
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link <?= $currentMenu === 'periodos' ? 'active' : '' ?>" 
                   href="<?= BASE_URL ?>index.php?route=periodos">
                    <i class="bi bi-calendar3 me-2"></i>Periodos
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link <?= $currentMenu === 'reportes' ? 'active' : '' ?>" 
                   href="<?= BASE_URL ?>index.php?route=reportes">
                    <i class="bi bi-bar-chart-line-fill me-2"></i>Reportes
                </a>
            </li>
            <?php endif; ?>
            <?php endif; ?>
        </ul>
    </div>
</nav>
