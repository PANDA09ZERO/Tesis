<?php $pageTitle = $pageTitle ?? 'Rendimiento Académico'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-graph-up me-2"></i><?= $pageTitle ?></h4>
    <a href="<?= BASE_URL ?>index.php?route=reportes" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Volver</a>
</div>

<div class="card mb-4">
    <div class="card-body">
        <form method="GET" class="row g-2 align-items-end">
            <input type="hidden" name="route" value="reportes/rendimiento">
            <div class="col-md-4">
                <label class="form-label">Periodo *</label>
                <select class="form-select" name="periodo_id" required>
                    <option value="">Seleccionar...</option>
                    <?php foreach ($periodos as $p): ?>
                        <option value="<?= $p['id'] ?>" <?= $periodoId == $p['id'] ? 'selected' : '' ?>><?= sanitize($p['nombre']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-4">
                <label class="form-label">Grado</label>
                <select class="form-select" name="grado_id">
                    <option value="">Todos</option>
                    <?php foreach ($grados as $g): ?>
                        <option value="<?= $g['id'] ?>" <?= $gradoId == $g['id'] ? 'selected' : '' ?>><?= sanitize($g['nombre']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2">
                <button type="submit" class="btn btn-primary w-100"><i class="bi bi-search me-1"></i>Consultar</button>
            </div>
        </form>
    </div>
</div>

<?php if (!empty($rendimiento)): ?>
<?php
$totalAlumnos = count($rendimiento);
$aprobados = count(array_filter($rendimiento, fn($r) => $r['desaprobados'] == 0));
$promedioGeneral = array_sum(array_column($rendimiento, 'promedio')) / $totalAlumnos;
?>
<div class="row g-3 mb-4">
    <div class="col-md-3">
        <div class="card text-center p-3">
            <div class="text-muted small">Total Alumnos</div>
            <div class="fw-bold fs-3 text-primary"><?= $totalAlumnos ?></div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card text-center p-3">
            <div class="text-muted small">Promedio General</div>
            <div class="fw-bold fs-3 <?= $promedioGeneral >= 11 ? 'text-success' : 'text-danger' ?>"><?= number_format($promedioGeneral, 1) ?></div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card text-center p-3">
            <div class="text-muted small">Aprobados</div>
            <div class="fw-bold fs-3 text-success"><?= $aprobados ?></div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card text-center p-3">
            <div class="text-muted small">Con Desaprobados</div>
            <div class="fw-bold fs-3 text-danger"><?= $totalAlumnos - $aprobados ?></div>
        </div>
    </div>
</div>

<div class="card">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead><tr><th>N°</th><th>Código</th><th>Alumno</th><th>Grado</th><th>Sección</th><th>Promedio</th><th>Cursos</th><th>Desaprobados</th><th>Estado</th></tr></thead>
                <tbody>
                    <?php foreach ($rendimiento as $i => $r): ?>
                        <tr>
                            <td><?= $i + 1 ?></td>
                            <td><code><?= sanitize($r['codigo']) ?></code></td>
                            <td><strong><?= sanitize($r['nombre_completo']) ?></strong></td>
                            <td><?= sanitize($r['grado']) ?></td>
                            <td><?= sanitize($r['seccion']) ?></td>
                            <td><strong class="<?= $r['promedio'] >= 11 ? 'text-success' : 'text-danger' ?>"><?= number_format($r['promedio'], 1) ?></strong></td>
                            <td><?= $r['total_cursos'] ?></td>
                            <td><?= $r['desaprobados'] ?></td>
                            <td><span class="badge <?= $r['desaprobados'] == 0 ? 'bg-success' : 'bg-danger' ?>"><?= $r['desaprobados'] == 0 ? 'Aprobado' : 'Con deudas' ?></span></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php elseif ($periodoId): ?>
<div class="card"><div class="card-body text-center py-5"><h5 class="text-muted">No hay datos de calificaciones para este periodo</h5></div></div>
<?php endif; ?>
