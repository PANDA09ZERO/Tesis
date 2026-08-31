<?php
/** @var mixed $a */
/** @var mixed $alertas */
/** @var mixed $alumno */
/** @var mixed $pageTitle */
?>

<?php $pageTitle = $pageTitle ?? 'Alertas del Alumno'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-person-exclamation me-2"></i><?= $pageTitle ?></h4>
    <a href="<?= BASE_URL ?>index.php?route=alertas" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Volver</a>
</div>

<div class="card mb-4">
    <div class="card-body">
        <strong>Alumno:</strong> <?= sanitize($alumno['nombre_completo']) ?>
    </div>
</div>

<div class="card">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead><tr><th>Fecha</th><th>Riesgo</th><th>% Riesgo</th><th>Promedio</th><th>Inasistencias</th><th>Desaprobados</th><th>Descripción</th><th>Estado</th></tr></thead>
                <tbody>
                    <?php if (empty($alertas)): ?>
                        <tr><td colspan="8" class="text-center text-muted py-4">No hay alertas para este alumno</td></tr>
                    <?php else: ?>
                        <?php foreach ($alertas as $a): ?>
                            <tr>
                                <td><?= formatDate($a['fecha_deteccion']) ?></td>
                                <td><span class="badge <?= match($a['tipo_riesgo']) { 'Alto'=>'bg-danger', 'Medio'=>'bg-warning text-dark', 'Bajo'=>'bg-success', default=>'bg-secondary' } ?>"><?= $a['tipo_riesgo'] ?></span></td>
                                <td><strong><?= $a['porcentaje_riesgo'] ?>%</strong></td>
                                <td><?= number_format($a['promedio_general'], 1) ?></td>
                                <td><?= number_format($a['inasistencias_pct'], 1) ?>%</td>
                                <td><?= $a['cursos_desaprobados'] ?></td>
                                <td><small><?= sanitize($a['descripcion']) ?></small></td>
                                <td><span class="badge <?= match($a['estado']) { 'Activa'=>'bg-danger', 'Atendida'=>'bg-warning text-dark', 'Cerrada'=>'bg-secondary', default=>'bg-secondary' } ?>"><?= $a['estado'] ?></span></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
