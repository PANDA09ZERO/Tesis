<?php $pageTitle = $pageTitle ?? 'Reporte de Asistencia'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-calendar-check me-2"></i><?= $pageTitle ?></h4>
    <a href="<?= BASE_URL ?>index.php?route=reportes" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Volver</a>
</div>

<div class="card mb-4">
    <div class="card-body">
        <form method="GET" class="row g-2 align-items-end">
            <input type="hidden" name="route" value="reportes/asistencia">
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

<?php if (!empty($resumenAsistencia)): ?>
<?php
$totalAlumnos = count($resumenAsistencia);
$alerta = count(array_filter($resumenAsistencia, fn($r) => ($r['pct_inasistencias'] ?? 0) > 20));
?>
<div class="row g-3 mb-4">
    <div class="col-md-3">
        <div class="card text-center p-3"><div class="text-muted small">Total Alumnos</div><div class="fw-bold fs-3 text-primary"><?= $totalAlumnos ?></div></div>
    </div>
    <div class="col-md-3">
        <div class="card text-center p-3"><div class="text-muted small">Asistencia > 95%</div><div class="fw-bold fs-3 text-success"><?= count(array_filter($resumenAsistencia, fn($r) => ($r['pct_inasistencias'] ?? 0) < 5)) ?></div></div>
    </div>
    <div class="col-md-3">
        <div class="card text-center p-3"><div class="text-muted small">Inasistencia > 20%</div><div class="fw-bold fs-3 text-danger"><?= $alerta ?></div></div>
    </div>
    <div class="col-md-3">
        <?php $promAsistencia = array_sum(array_column($resumenAsistencia, 'pct_inasistencias')) / $totalAlumnos; ?>
        <div class="card text-center p-3"><div class="text-muted small">Prom. Inasistencia</div><div class="fw-bold fs-3 text-warning"><?= number_format($promAsistencia, 1) ?>%</div></div>
    </div>
</div>

<div class="card">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead><tr><th>N°</th><th>Código</th><th>Alumno</th><th>Grado</th><th>Total</th><th>Presentes</th><th>Ausentes</th><th>Tardanzas</th><th>% Inasist.</th><th>Estado</th></tr></thead>
                <tbody>
                    <?php foreach ($resumenAsistencia as $i => $r): ?>
                        <tr>
                            <td><?= $i + 1 ?></td>
                            <td><code><?= sanitize($r['codigo']) ?></code></td>
                            <td><strong><?= sanitize($r['nombre_completo']) ?></strong></td>
                            <td><?= sanitize($r['grado'] . ' - ' . $r['seccion']) ?></td>
                            <td><?= $r['total_clases'] ?></td>
                            <td><?= $r['presentes'] ?></td>
                            <td class="<?= $r['ausentes'] > 0 ? 'text-danger fw-bold' : '' ?>"><?= $r['ausentes'] ?></td>
                            <td class="<?= $r['tardanzas'] > 0 ? 'text-warning fw-bold' : '' ?>"><?= $r['tardanzas'] ?></td>
                            <td>
                                <div class="progress" style="height:20px;min-width:80px">
                                    <div class="progress-bar <?= ($r['pct_inasistencias'] ?? 0) > 20 ? 'bg-danger' : (($r['pct_inasistencias'] ?? 0) > 10 ? 'bg-warning' : 'bg-success') ?>" style="width:<?= $r['pct_inasistencias'] ?? 0 ?>%"><?= number_format($r['pct_inasistencias'] ?? 0, 1) ?>%</div>
                                </div>
                            </td>
                            <td><span class="badge <?= ($r['pct_inasistencias'] ?? 0) > 20 ? 'bg-danger' : (($r['pct_inasistencias'] ?? 0) > 10 ? 'bg-warning text-dark' : 'bg-success') ?>"><?= ($r['pct_inasistencias'] ?? 0) > 20 ? 'Crítico' : (($r['pct_inasistencias'] ?? 0) > 10 ? 'Alerta' : 'Normal') ?></span></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php elseif ($periodoId): ?>
<div class="card"><div class="card-body text-center py-5"><h5 class="text-muted">No hay datos de asistencia</h5></div></div>
<?php endif; ?>
