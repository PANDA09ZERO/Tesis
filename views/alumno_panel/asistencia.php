<?php $pageTitle = $pageTitle ?? 'Mi Asistencia'; ?>

<div class="mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-calendar-check me-2"></i><?= $pageTitle ?></h4>
</div>

<?php if ($resumen && $resumen['total'] > 0): ?>
<div class="row g-3 mb-4">
    <div class="col-md-3">
        <div class="card text-center p-3 border-0 shadow-sm">
            <div class="text-muted small">Total Clases</div>
            <div class="fw-bold fs-2"><?= $resumen['total'] ?></div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card text-center p-3 border-0 shadow-sm border-start border-4 border-success">
            <div class="text-muted small">Presentes</div>
            <div class="fw-bold fs-2 text-success"><?= $resumen['presentes'] ?></div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card text-center p-3 border-0 shadow-sm border-start border-4 border-danger">
            <div class="text-muted small">Ausentes</div>
            <div class="fw-bold fs-2 text-danger"><?= $resumen['ausentes'] ?></div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card text-center p-3 border-0 shadow-sm border-start border-4 border-warning">
            <div class="text-muted small">Tardanzas</div>
            <div class="fw-bold fs-2 text-warning"><?= $resumen['tardanzas'] ?></div>
        </div>
    </div>
</div>

<div class="card mb-4">
    <div class="card-header fw-semibold">Mi Porcentaje de Asistencia</div>
    <div class="card-body">
        <?php $pctAsistencia = 100 - ($resumen['pct_inasistencias'] ?? 0); ?>
        <div class="progress" style="height:30px">
            <div class="progress-bar <?= $pctAsistencia >= 90 ? 'bg-success' : ($pctAsistencia >= 75 ? 'bg-warning' : 'bg-danger') ?>" style="width:<?= $pctAsistencia ?>%"><?= number_format($pctAsistencia, 1) ?>%</div>
        </div>
        <small class="text-muted mt-1 d-block"><?= $pctAsistencia >= 90 ? '✓ Excelente asistencia' : ($pctAsistencia >= 75 ? '⚠ Asistencia regular' : '✗ Asistencia deficiente') ?></small>
    </div>
</div>
<?php endif; ?>

<div class="card">
    <div class="card-header fw-semibold">Detalle de Asistencias</div>
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead><tr><th>Fecha</th><th>Curso</th><th>Día</th><th>Estado</th></tr></thead>
                <tbody>
                    <?php if (empty($registros)): ?>
                        <tr><td colspan="4" class="text-center text-muted py-4">Sin registros de asistencia</td></tr>
                    <?php else: ?>
                        <?php foreach (array_slice($registros, 0, 30) as $r): ?>
                            <tr>
                                <td><?= formatDate($r['fecha']) ?></td>
                                <td><?= sanitize($r['curso_nombre']) ?></td>
                                <td><?= sanitize($r['dia']) ?></td>
                                <td><span class="badge <?= match($r['estado']) { 'Presente'=>'bg-success', 'Ausente'=>'bg-danger', 'Tardanza'=>'bg-warning text-dark', 'Justificado'=>'bg-info', default=>'bg-secondary' } ?>"><?= $r['estado'] ?></span></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
