<?php $pageTitle = $pageTitle ?? 'Mis Calificaciones'; ?>

<div class="mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-journal-text me-2"></i><?= $pageTitle ?></h4>
</div>

<!-- Filtro por periodo -->
<div class="card mb-4">
    <div class="card-body">
        <form method="GET" class="row g-2 align-items-end">
            <input type="hidden" name="route" value="alumno-panel/calificaciones">
            <div class="col-md-4">
                <label class="form-label">Periodo</label>
                <select class="form-select" name="periodo_id" onchange="this.form.submit()">
                    <?php foreach ($periodos as $p): ?>
                        <option value="<?= $p['id'] ?>" <?= $periodoId == $p['id'] ? 'selected' : '' ?>><?= sanitize($p['nombre']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
        </form>
    </div>
</div>

<?php if ($promedio): ?>
<div class="row g-3 mb-4">
    <div class="col-md-4">
        <div class="card text-center p-3 border-0 shadow-sm">
            <div class="text-muted small">Promedio General</div>
            <div class="fw-bold fs-2 <?= $promedio['promedio'] >= 11 ? 'text-success' : 'text-danger' ?>"><?= number_format($promedio['promedio'], 1) ?></div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card text-center p-3 border-0 shadow-sm">
            <div class="text-muted small">Cursos Aprobados</div>
            <div class="fw-bold fs-2 text-success"><?= $promedio['total_cursos'] - $promedio['desaprobados'] ?></div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card text-center p-3 border-0 shadow-sm">
            <div class="text-muted small">Cursos Desaprobados</div>
            <div class="fw-bold fs-2 text-danger"><?= $promedio['desaprobados'] ?></div>
        </div>
    </div>
</div>
<?php endif; ?>

<div class="card">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead><tr><th>Curso</th><th>Nota</th><th>Conducta</th><th>Estado</th></tr></thead>
                <tbody>
                    <?php if (empty($calificaciones)): ?>
                        <tr><td colspan="4" class="text-center text-muted py-4">Sin calificaciones para este periodo</td></tr>
                    <?php else: ?>
                        <?php foreach ($calificaciones as $c): ?>
                            <tr>
                                <td><strong><?= sanitize($c['curso_nombre']) ?></strong></td>
                                <td><span class="fs-5 fw-bold <?= $c['nota'] >= 11 ? 'text-success' : 'text-danger' ?>"><?= number_format($c['nota'], 1) ?></span></td>
                                <td><?= $c['conducta'] ? number_format($c['conducta'], 1) : '-' ?></td>
                                <td><span class="badge <?= $c['nota'] >= 11 ? 'bg-success' : 'bg-danger' ?>"><?= $c['nota'] >= 11 ? 'Aprobado' : 'Desaprobado' ?></span></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
