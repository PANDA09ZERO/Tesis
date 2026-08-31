<?php
/** @var mixed $a */
/** @var mixed $alertas */
/** @var mixed $alumno */
/** @var mixed $asistencia */
/** @var mixed $c */
/** @var mixed $calRecientes */
/** @var mixed $docsPendientes */
/** @var mixed $mensajesNoLeidos */
/** @var mixed $pageTitle */
/** @var mixed $promedio */
?>

<?php $pageTitle = $pageTitle ?? 'Mi Panel'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h4 class="fw-bold mb-0">Hola, <?= sanitize($alumno['nombre']) ?> 👋</h4>
        <small class="text-muted"><?= sanitize($alumno['grado'] ?? '') ?> - <?= sanitize($alumno['seccion'] ?? '') ?> | <?= date('d/m/Y') ?></small>
    </div>
</div>

<!-- Tarjetas resumen -->
<div class="row g-3 mb-4">
    <div class="col-md-3">
        <div class="card border-0 shadow-sm">
            <div class="card-body text-center">
                <i class="bi bi-journal-text text-primary fs-2"></i>
                <div class="fw-bold fs-3 mt-2"><?= $promedio['promedio'] ? number_format($promedio['promedio'], 1) : '-' ?></div>
                <div class="text-muted small">Mi Promedio</div>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card border-0 shadow-sm">
            <div class="card-body text-center">
                <i class="bi bi-calendar-check text-success fs-2"></i>
                <div class="fw-bold fs-3 mt-2"><?= $asistencia['presentes'] ?? 0 ?></div>
                <div class="text-muted small">Clases Asistidas</div>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card border-0 shadow-sm">
            <div class="card-body text-center">
                <i class="bi bi-calendar-x text-danger fs-2"></i>
                <div class="fw-bold fs-3 mt-2"><?= $asistencia['ausentes'] ?? 0 ?></div>
                <div class="text-muted small">Inasistencias</div>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card border-0 shadow-sm">
            <div class="card-body text-center">
                <i class="bi bi-envelope-fill text-warning fs-2"></i>
                <div class="fw-bold fs-3 mt-2"><?= $mensajesNoLeidos ?></div>
                <div class="text-muted small">Mensajes Nuevos</div>
            </div>
        </div>
    </div>
</div>

<div class="row g-4">
    <!-- Calificaciones recientes -->
    <div class="col-md-8">
        <div class="card">
            <div class="card-header fw-semibold d-flex justify-content-between">
                <span><i class="bi bi-journal-text me-2"></i>Mis Calificaciones Recientes</span>
                <a href="<?= BASE_URL ?>index.php?route=alumno-panel/calificaciones" class="text-decoration-none small">Ver todas</a>
            </div>
            <div class="card-body p-0">
                <table class="table table-hover mb-0">
                    <thead><tr><th>Curso</th><th>Nota</th><th>Estado</th></tr></thead>
                    <tbody>
                        <?php if (empty($calRecientes)): ?>
                            <tr><td colspan="3" class="text-center text-muted py-3">Sin calificaciones aún</td></tr>
                        <?php else: ?>
                            <?php foreach ($calRecientes as $c): ?>
                                <tr>
                                    <td><?= sanitize($c['curso_nombre']) ?></td>
                                    <td><strong class="<?= $c['nota'] >= 11 ? 'text-success' : 'text-danger' ?>"><?= number_format($c['nota'], 1) ?></strong></td>
                                    <td><span class="badge <?= $c['nota'] >= 11 ? 'bg-success' : 'bg-danger' ?>"><?= $c['nota'] >= 11 ? 'Aprobado' : 'Desaprobado' ?></span></td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Alertas y documentos -->
    <div class="col-md-4">
        <?php if (!empty($alertas)): ?>
            <div class="card border-warning mb-4">
                <div class="card-header bg-warning text-dark fw-semibold"><i class="bi bi-exclamation-triangle me-2"></i>Alertas Académicas</div>
                <div class="card-body">
                    <?php foreach ($alertas as $a): ?>
                        <div class="mb-2 p-2 rounded" style="background:#fff3cd">
                            <span class="badge <?= match($a['tipo_riesgo']) { 'Alto'=>'bg-danger', 'Medio'=>'bg-warning text-dark', default=>'bg-success' } ?>"><?= $a['tipo_riesgo'] ?></span>
                            <small class="d-block mt-1"><?= sanitize(substr($a['descripcion'], 0, 80)) ?>...</small>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        <?php endif; ?>

        <div class="card">
            <div class="card-header fw-semibold"><i class="bi bi-file-text me-2"></i>Documentos</div>
            <div class="card-body">
                <?php if ($docsPendientes > 0): ?>
                    <div class="alert alert-warning py-2 mb-0">
                        <i class="bi bi-clock me-1"></i><?= $docsPendientes ?> documento(s) pendiente(s)
                    </div>
                <?php else: ?>
                    <p class="text-muted mb-0"><i class="bi bi-check-circle text-success me-1"></i>Sin documentos pendientes</p>
                <?php endif; ?>
                <a href="<?= BASE_URL ?>index.php?route=alumno-panel/documentos" class="btn btn-sm btn-outline-primary mt-2 w-100">Ver documentos</a>
            </div>
        </div>
    </div>
</div>
