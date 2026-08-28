<?php $pageTitle = $pageTitle ?? 'Reporte de Alertas IA'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-exclamation-triangle me-2"></i><?= $pageTitle ?></h4>
    <a href="<?= BASE_URL ?>index.php?route=reportes" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Volver</a>
</div>

<!-- Resumen por tipo de riesgo -->
<?php if (!empty($estadisticas)): ?>
<div class="row g-3 mb-4">
    <?php foreach ($estadisticas as $e): ?>
        <div class="col-md-4">
            <div class="card border-<?= match($e['tipo_riesgo']) { 'Alto'=>'danger', 'Medio'=>'warning', 'Bajo'=>'success', default=>'secondary'}?>">
                <div class="card-body text-center">
                    <h6 class="text-muted">Riesgo <?= $e['tipo_riesgo'] ?></h6>
                    <div class="fs-1 fw-bold"><?= $e['total'] ?></div>
                    <small class="text-muted">Prom. Riesgo: <?= number_format($e['promedio_riesgo'], 0) ?>% | Prom. Notas: <?= number_format($e['promedio_notas'], 1) ?></small>
                </div>
            </div>
        </div>
    <?php endforeach; ?>
</div>
<?php endif; ?>

<!-- Top alumnos en riesgo alto -->
<div class="card">
    <div class="card-header fw-semibold"><i class="bi bi-exclamation-octagon me-2 text-danger"></i>Top Alumnos en Riesgo Alto</div>
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead><tr><th>Alumno</th><th>Grado</th><th>% Riesgo</th><th>Promedio</th><th>Inasist.</th><th>Desaprob.</th><th>Indicadores</th></tr></thead>
                <tbody>
                    <?php if (empty($topRiesgo)): ?>
                        <tr><td colspan="7" class="text-center text-muted py-4"><i class="bi bi-shield-check fs-1 d-block mb-2"></i>No hay alumnos en riesgo alto</td></tr>
                    <?php else: ?>
                        <?php foreach ($topRiesgo as $t): ?>
                            <tr>
                                <td><strong><?= sanitize($t['alumno_nombre']) ?></strong></td>
                                <td><?= sanitize(($t['grado'] ?? '-') . ' - ' . ($t['seccion'] ?? '-')) ?></td>
                                <td><span class="badge bg-danger"><?= $t['porcentaje_riesgo'] ?>%</span></td>
                                <td class="text-danger fw-bold"><?= number_format($t['promedio_general'], 1) ?></td>
                                <td><?= number_format($t['inasistencias_pct'], 1) ?>%</td>
                                <td><?= $t['cursos_desaprobados'] ?></td>
                                <td><small class="text-muted"><?= sanitize($t['descripcion']) ?></small></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
