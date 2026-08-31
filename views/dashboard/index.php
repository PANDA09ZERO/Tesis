<?php
/** @var mixed $act */
/** @var mixed $alerta */
/** @var mixed $alertasActivas */
/** @var mixed $alertasRecientes */
/** @var mixed $alumno */
/** @var mixed $alumnosRecientes */
/** @var mixed $pageTitle */
/** @var mixed $totalAlumnos */
/** @var mixed $totalCursos */
/** @var mixed $totalProfesores */
/** @var mixed $ultimasActividades */
?>

<?php
$pageTitle = $pageTitle ?? 'Dashboard';
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h4 class="mb-1 fw-bold">Dashboard</h4>
        <small class="text-muted">Bienvenido, <?= sanitize(currentUser()['username']) ?></small>
    </div>
    <span class="text-muted">
        <i class="bi bi-calendar3 me-1"></i><?= date('d/m/Y') ?>
    </span>
</div>

<!-- Estadísticas -->
<div class="row g-3 mb-4">
    <div class="col-xl-3 col-md-6">
        <div class="stat-card" style="background: linear-gradient(135deg, #1a237e, #3949ab);">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <div class="stat-label">Total Alumnos</div>
                    <div class="stat-value"><?= $totalAlumnos ?></div>
                </div>
                <i class="bi bi-people-fill stat-icon"></i>
            </div>
        </div>
    </div>
    <div class="col-xl-3 col-md-6">
        <div class="stat-card" style="background: linear-gradient(135deg, #00695c, #26a69a);">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <div class="stat-label">Total Profesores</div>
                    <div class="stat-value"><?= $totalProfesores ?></div>
                </div>
                <i class="bi bi-person-workspace stat-icon"></i>
            </div>
        </div>
    </div>
    <div class="col-xl-3 col-md-6">
        <div class="stat-card" style="background: linear-gradient(135deg, #e65100, #fb8c00);">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <div class="stat-label">Total Cursos</div>
                    <div class="stat-value"><?= $totalCursos ?></div>
                </div>
                <i class="bi bi-book-fill stat-icon"></i>
            </div>
        </div>
    </div>
    <div class="col-xl-3 col-md-6">
        <div class="stat-card" style="background: linear-gradient(135deg, #b71c1c, #ef5350);">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <div class="stat-label">Alertas Activas</div>
                    <div class="stat-value"><?= $alertasActivas ?></div>
                </div>
                <i class="bi bi-exclamation-triangle-fill stat-icon"></i>
            </div>
        </div>
    </div>
</div>

<div class="row g-4">
    <!-- Alumnos recientes -->
    <div class="col-xl-8">
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span><i class="bi bi-people me-2"></i>Alumnos Recientes</span>
                <a href="<?= BASE_URL ?>index.php?route=alumnos" class="btn btn-sm btn-outline-primary">Ver todos</a>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Nombre</th>
                                <th>Grado</th>
                                <th>Sección</th>
                                <th>DNI</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($alumnosRecientes)): ?>
                                <tr>
                                    <td colspan="5" class="text-center text-muted py-4">
                                        <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                                        No hay alumnos registrados aún
                                    </td>
                                </tr>
                            <?php else: ?>
                                <?php foreach ($alumnosRecientes as $alumno): ?>
                                    <tr>
                                        <td><code><?= sanitize($alumno['codigo'] ?? 'N/A') ?></code></td>
                                        <td>
                                            <strong><?= sanitize($alumno['apellido_paterno'] . ' ' . $alumno['apellido_materno'] . ', ' . $alumno['nombre']) ?></strong>
                                        </td>
                                        <td><?= sanitize($alumno['grado'] ?? '-') ?></td>
                                        <td><?= sanitize($alumno['seccion'] ?? '-') ?></td>
                                        <td><?= sanitize($alumno['dni']) ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Alertas académicas -->
    <div class="col-xl-4">
        <div class="card">
            <div class="card-header">
                <i class="bi bi-exclamation-triangle me-2"></i>Alertas Académicas
            </div>
            <div class="card-body">
                <?php if (empty($alertasRecientes)): ?>
                    <div class="text-center text-muted py-4">
                        <i class="bi bi-shield-check fs-1 d-block mb-2"></i>
                        <small>No hay alertas activas</small>
                    </div>
                <?php else: ?>
                    <?php foreach ($alertasRecientes as $alerta): ?>
                        <div class="d-flex align-items-start mb-3 p-2 rounded" style="background: #fff3cd;">
                            <span class="badge badge-riesgo-<?= strtolower($alerta['tipo_riesgo']) ?> me-2 mt-1">
                                <?= $alerta['tipo_riesgo'] ?>
                            </span>
                            <div>
                                <strong class="d-block" style="font-size: 0.85rem;">
                                    <?= sanitize($alerta['apellido_paterno'] . ' ' . $alerta['nombre']) ?>
                                </strong>
                                <small class="text-muted">
                                    Promedio: <?= $alerta['promedio_general'] ?? 'N/A' ?> | 
                                    Riesgo: <?= $alerta['porcentaje_riesgo'] ?? 'N/A' ?>%
                                </small>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>

        <!-- Actividad reciente -->
        <div class="card mt-4">
            <div class="card-header">
                <i class="bi bi-clock-history me-2"></i>Actividad Reciente
            </div>
            <div class="card-body">
                <?php if (empty($ultimasActividades)): ?>
                    <div class="text-center text-muted py-3">
                        <small>Sin actividad registrada</small>
                    </div>
                <?php else: ?>
                    <?php foreach (array_slice($ultimasActividades, 0, 5) as $act): ?>
                        <div class="d-flex align-items-start mb-2">
                            <i class="bi bi-dot text-primary fs-4 me-2"></i>
                            <div>
                                <small class="d-block"><?= sanitize($act['accion']) ?></small>
                                <small class="text-muted">
                                    <?= sanitize($act['username'] ?? 'Sistema') ?> · 
                                    <?= tiempoRelativo($act['created_at']) ?>
                                </small>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>
