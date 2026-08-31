<?php
/** @var mixed $alumno */
/** @var mixed $pageTitle */
/** @var mixed $resumen */
?>

<?php $pageTitle = $pageTitle ?? 'Resumen de Asistencia'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-calendar-check me-2"></i><?= $pageTitle ?></h4>
    <a href="<?= BASE_URL ?>index.php?route=asistencias" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Volver</a>
</div>

<div class="card mb-4">
    <div class="card-body">
        <strong>Alumno:</strong> <?= sanitize($alumno['nombre_completo']) ?>
    </div>
</div>

<?php if ($resumen): ?>
<div class="row g-3 mb-4">
    <div class="col-md-3">
        <div class="card text-center p-3">
            <div class="text-muted small">Total Clases</div>
            <div class="fw-bold fs-3"><?= $resumen['total'] ?></div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card text-center p-3 border-success">
            <div class="text-muted small">Presentes</div>
            <div class="fw-bold fs-3 text-success"><?= $resumen['presentes'] ?></div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card text-center p-3 border-danger">
            <div class="text-muted small">Ausentes</div>
            <div class="fw-bold fs-3 text-danger"><?= $resumen['ausentes'] ?></div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card text-center p-3 border-warning">
            <div class="text-muted small">Tardanzas</div>
            <div class="fw-bold fs-3 text-warning"><?= $resumen['tardanzas'] ?></div>
        </div>
    </div>
</div>

<div class="card">
    <div class="card-header fw-semibold">Porcentaje de Inasistencias</div>
    <div class="card-body">
        <div class="progress" style="height: 30px;">
            <div class="progress-bar bg-danger" role="progressbar" 
                 style="width: <?= $resumen['pct_inasistencias'] ?>%"
                 aria-valuenow="<?= $resumen['pct_inasistencias'] ?>" aria-valuemin="0" aria-valuemax="100">
                <?= number_format($resumen['pct_inasistencias'], 1) ?>%
            </div>
            <div class="progress-bar bg-success" role="progressbar" 
                 style="width: <?= 100 - $resumen['pct_inasistencias'] ?>%"
                 aria-valuenow="<?= 100 - $resumen['pct_inasistencias'] ?>" aria-valuemin="0" aria-valuemax="100">
                <?= number_format(100 - $resumen['pct_inasistencias'], 1) ?>%
            </div>
        </div>
    </div>
</div>
<?php else: ?>
<div class="card">
    <div class="card-body text-center py-5">
        <h5 class="text-muted">No hay datos de asistencia disponibles</h5>
    </div>
</div>
<?php endif; ?>
