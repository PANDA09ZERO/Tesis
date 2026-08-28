<?php $pageTitle = $pageTitle ?? 'Rendimiento por Curso'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-book me-2"></i><?= $pageTitle ?></h4>
    <a href="<?= BASE_URL ?>index.php?route=reportes" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Volver</a>
</div>

<div class="card mb-4">
    <div class="card-body">
        <form method="GET" class="row g-2 align-items-end">
            <input type="hidden" name="route" value="reportes/cursos">
            <div class="col-md-4">
                <label class="form-label">Periodo *</label>
                <select class="form-select" name="periodo_id" required>
                    <option value="">Seleccionar...</option>
                    <?php foreach ($periodos as $p): ?>
                        <option value="<?= $p['id'] ?>" <?= $periodoId == $p['id'] ? 'selected' : '' ?>><?= sanitize($p['nombre']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2"><button type="submit" class="btn btn-primary w-100"><i class="bi bi-search me-1"></i>Consultar</button></div>
        </form>
    </div>
</div>

<?php if (!empty($estadisticas)): ?>
<div class="card">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead><tr><th>Curso</th><th>Alumnos</th><th>Promedio</th><th>Nota Mín</th><th>Nota Máx</th><th>Desaprobados</th><th>% Desaprob.</th></tr></thead>
                <tbody>
                    <?php foreach ($estadisticas as $e): ?>
                        <tr>
                            <td><strong><?= sanitize($e['nombre']) ?></strong> <small class="text-muted">(<?= sanitize($e['codigo']) ?>)</small></td>
                            <td><?= $e['total_alumnos'] ?></td>
                            <td><strong class="<?= ($e['promedio_curso'] ?? 0) >= 11 ? 'text-success' : 'text-danger' ?>"><?= number_format($e['promedio_curso'] ?? 0, 1) ?></strong></td>
                            <td><?= $e['nota_minima'] !== null ? number_format($e['nota_minima'], 1) : '-' ?></td>
                            <td><?= $e['nota_maxima'] !== null ? number_format($e['nota_maxima'], 1) : '-' ?></td>
                            <td class="text-danger fw-bold"><?= $e['desaprobados'] ?></td>
                            <td>
                                <div class="progress" style="height:20px;min-width:80px">
                                    <div class="progress-bar <?= ($e['pct_desaprobados'] ?? 0) > 30 ? 'bg-danger' : (($e['pct_desaprobados'] ?? 0) > 15 ? 'bg-warning' : 'bg-success') ?>" style="width:<?= $e['pct_desaprobados'] ?? 0 ?>%"><?= number_format($e['pct_desaprobados'] ?? 0, 1) ?>%</div>
                                </div>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php elseif ($periodoId): ?>
<div class="card"><div class="card-body text-center py-5"><h5 class="text-muted">No hay calificaciones registradas</h5></div></div>
<?php endif; ?>
