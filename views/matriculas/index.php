<?php $pageTitle = $pageTitle ?? 'Matrículas'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-card-list me-2"></i>Gestión de Matrículas</h4>
    <a href="<?= BASE_URL ?>index.php?route=matriculas/create" class="btn btn-primary">
        <i class="bi bi-plus-lg me-1"></i>Nueva Matrícula
    </a>
</div>

<!-- Filtros -->
<div class="card mb-4">
    <div class="card-body">
        <form method="GET" class="row g-2 align-items-end">
            <input type="hidden" name="route" value="matriculas">
            <div class="col-md-3">
                <label class="form-label">Periodo</label>
                <select class="form-select" name="periodo_id">
                    <option value="">Todos</option>
                    <?php foreach ($periodos as $p): ?>
                        <option value="<?= $p['id'] ?>" <?= $periodoId == $p['id'] ? 'selected' : '' ?>><?= sanitize($p['nombre']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label">Grado</label>
                <select class="form-select" name="grado_id">
                    <option value="">Todos</option>
                    <?php foreach ($grados as $g): ?>
                        <option value="<?= $g['id'] ?>" <?= $gradoId == $g['id'] ? 'selected' : '' ?>><?= sanitize($g['nombre']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2">
                <button type="submit" class="btn btn-primary w-100"><i class="bi bi-funnel me-1"></i>Filtrar</button>
            </div>
        </form>
    </div>
</div>

<!-- Resumen -->
<div class="row g-3 mb-4">
    <div class="col-md-3">
        <div class="card text-center p-3">
            <div class="text-muted small">Total Matriculados</div>
            <div class="fw-bold fs-3 text-primary"><?= count($matriculas) ?></div>
        </div>
    </div>
    <?php
    $varones = 0; $mujeres = 0;
    // Contar por secciones si hay datos
    $porSeccion = [];
    foreach ($matriculas as $m) {
        $key = $m['grado'] . ' - ' . $m['seccion'];
        $porSeccion[$key] = ($porSeccion[$key] ?? 0) + 1;
    }
    ?>
    <div class="col-md-3">
        <div class="card text-center p-3">
            <div class="text-muted small">Con Secciones</div>
            <div class="fw-bold fs-3 text-success"><?= count($porSeccion) ?></div>
        </div>
    </div>
</div>

<div class="card">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Alumno</th>
                        <th>Grado</th>
                        <th>Sección</th>
                        <th>Periodo</th>
                        <th>Fecha Matrícula</th>
                        <th>Estado</th>
                        <th width="120">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($matriculas)): ?>
                        <tr><td colspan="8" class="text-center text-muted py-4"><i class="bi bi-inbox fs-1 d-block mb-2"></i>No hay matrículas</td></tr>
                    <?php else: ?>
                        <?php foreach ($matriculas as $m): ?>
                            <tr>
                                <td><code><?= sanitize($m['codigo']) ?></code></td>
                                <td><strong><?= sanitize($m['nombre_completo']) ?></strong></td>
                                <td><span class="badge bg-secondary"><?= sanitize($m['grado']) ?></span></td>
                                <td><?= sanitize($m['seccion']) ?></td>
                                <td><small><?= sanitize($m['periodo_nombre']) ?></small></td>
                                <td><small><?= formatDate($m['fecha_matricula']) ?></small></td>
                                <td><span class="badge bg-success"><?= $m['estado'] ?></span></td>
                                <td>
                                    <form method="POST" action="<?= BASE_URL ?>index.php?route=matriculas/retirar/<?= $m['id'] ?>" class="d-inline" onsubmit="return confirm('¿Retirar este alumno?')">
                                        <input type="hidden" name="csrf_token" value="<?= $this->generateCSRF() ?>">
                                        <button class="btn btn-sm btn-outline-danger" title="Retirar"><i class="bi bi-person-dash"></i></button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
