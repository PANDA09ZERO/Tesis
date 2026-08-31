<?php
/** @var mixed $a */
/** @var mixed $alertas */
/** @var mixed $badgeEstado */
/** @var mixed $badgeRiesgo */
/** @var mixed $c */
/** @var mixed $colores */
/** @var mixed $contMap */
/** @var mixed $contadores */
/** @var mixed $estado */
/** @var mixed $iconos */
/** @var mixed $pageTitle */
/** @var mixed $riesgo */
?>

<?php $pageTitle = $pageTitle ?? 'Alertas Académicas IA'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-exclamation-triangle-fill me-2"></i><?= $pageTitle ?></h4>
    <a href="<?= BASE_URL ?>index.php?route=alertas/generar" class="btn btn-primary">
        <i class="bi bi-cpu me-1"></i>Ejecutar Predicción IA
    </a>
</div>

<!-- Contadores -->
<div class="row g-3 mb-4">
    <?php
    $colores = ['Alto' => 'bg-danger', 'Medio' => 'bg-warning text-dark', 'Bajo' => 'bg-success'];
    $iconos = ['Alto' => 'bi-exclamation-octagon', 'Medio' => 'bi-exclamation-triangle', 'Bajo' => 'bi-info-circle'];
    $contMap = [];
    foreach ($contadores as $c) $contMap[$c['tipo_riesgo']] = $c['total'];
    ?>
    <?php foreach (['Alto', 'Medio', 'Bajo'] as $riesgo): ?>
        <div class="col-md-4">
            <div class="card <?= $colores[$riesgo] ?> text-white">
                <div class="card-body d-flex justify-content-between align-items-center">
                    <div>
                        <div class="small opacity-75">Riesgo <?= $riesgo ?></div>
                        <div class="fs-2 fw-bold"><?= $contMap[$riesgo] ?? 0 ?></div>
                    </div>
                    <i class="bi <?= $iconos[$riesgo] ?> fs-1 opacity-50"></i>
                </div>
            </div>
        </div>
    <?php endforeach; ?>
</div>

<!-- Filtros -->
<div class="card mb-4">
    <div class="card-body">
        <form method="GET" class="row g-2 align-items-end">
            <input type="hidden" name="route" value="alertas">
            <div class="col-md-3">
                <select class="form-select" name="riesgo">
                    <option value="">Todos los riesgos</option>
                    <option value="Alto" <?= ($riesgo ?? '') === 'Alto' ? 'selected' : '' ?>>Alto</option>
                    <option value="Medio" <?= ($riesgo ?? '') === 'Medio' ? 'selected' : '' ?>>Medio</option>
                    <option value="Bajo" <?= ($riesgo ?? '') === 'Bajo' ? 'selected' : '' ?>>Bajo</option>
                </select>
            </div>
            <div class="col-md-3">
                <select class="form-select" name="estado">
                    <option value="">Todos los estados</option>
                    <option value="Activa" <?= ($estado ?? '') === 'Activa' ? 'selected' : '' ?>>Activa</option>
                    <option value="Atendida" <?= ($estado ?? '') === 'Atendida' ? 'selected' : '' ?>>Atendida</option>
                    <option value="Cerrada" <?= ($estado ?? '') === 'Cerrada' ? 'selected' : '' ?>>Cerrada</option>
                </select>
            </div>
            <div class="col-md-2">
                <button type="submit" class="btn btn-primary w-100"><i class="bi bi-funnel me-1"></i>Filtrar</button>
            </div>
        </form>
    </div>
</div>

<!-- Lista de alertas -->
<div class="card">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead>
                    <tr>
                        <th>Riesgo</th>
                        <th>Alumno</th>
                        <th>Grado-Sección</th>
                        <th>Promedio</th>
                        <th>Inasistencias</th>
                        <th>Desaprobados</th>
                        <th>Indicadores</th>
                        <th>Estado</th>
                        <th width="120">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($alertas)): ?>
                        <tr><td colspan="9" class="text-center text-muted py-4"><i class="bi bi-shield-check fs-1 d-block mb-2"></i>No hay alertas</td></tr>
                    <?php else: ?>
                        <?php foreach ($alertas as $a): ?>
                            <tr>
                                <td>
                                    <?php
                                    $badgeRiesgo = match($a['tipo_riesgo']) {
                                        'Alto' => 'bg-danger',
                                        'Medio' => 'bg-warning text-dark',
                                        'Bajo' => 'bg-success',
                                        default => 'bg-secondary'
                                    };
                                    ?>
                                    <span class="badge <?= $badgeRiesgo ?>"><?= $a['tipo_riesgo'] ?></span>
                                </td>
                                <td>
                                    <a href="<?= BASE_URL ?>index.php?route=alertas/alumno/<?= $a['alumno_id'] ?>" class="text-decoration-none fw-semibold">
                                        <?= sanitize($a['alumno_nombre']) ?>
                                    </a>
                                </td>
                                <td><?= sanitize(($a['grado'] ?? '-') . ' - ' . ($a['seccion'] ?? '-')) ?></td>
                                <td><strong class="<?= ($a['promedio_general'] ?? 0) < 11 ? 'text-danger' : 'text-success' ?>"><?= number_format($a['promedio_general'] ?? 0, 1) ?></strong></td>
                                <td><?= number_format($a['inasistencias_pct'] ?? 0, 1) ?>%</td>
                                <td><?= $a['cursos_desaprobados'] ?? 0 ?></td>
                                <td><small class="text-muted"><?= sanitize(substr($a['descripcion'] ?? '', 0, 80)) ?>...</small></td>
                                <td>
                                    <?php
                                    $badgeEstado = match($a['estado']) {
                                        'Activa' => 'bg-danger',
                                        'Atendida' => 'bg-warning text-dark',
                                        'Cerrada' => 'bg-secondary',
                                        default => 'bg-secondary'
                                    };
                                    ?>
                                    <span class="badge <?= $badgeEstado ?>"><?= $a['estado'] ?></span>
                                </td>
                                <td>
                                    <?php if ($a['estado'] === 'Activa'): ?>
                                        <div class="btn-group btn-group-sm">
                                            <form method="POST" action="<?= BASE_URL ?>index.php?route=alertas/atender/<?= $a['id'] ?>" class="d-inline">
                                                <input type="hidden" name="csrf_token" value="<?= $this->generateCSRF() ?>">
                                                <button class="btn btn-outline-warning btn-sm" title="Marcar Atendida"><i class="bi bi-check-lg"></i></button>
                                            </form>
                                            <form method="POST" action="<?= BASE_URL ?>index.php?route=alertas/cerrar/<?= $a['id'] ?>" class="d-inline">
                                                <input type="hidden" name="csrf_token" value="<?= $this->generateCSRF() ?>">
                                                <button class="btn btn-outline-secondary btn-sm" title="Cerrar"><i class="bi bi-x-lg"></i></button>
                                            </form>
                                        </div>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
