<?php
/** @var mixed $aprobados */
/** @var mixed $c */
/** @var mixed $cal */
/** @var mixed $calificaciones */
/** @var mixed $cursoId */
/** @var mixed $cursoSeleccionado */
/** @var mixed $cursos */
/** @var mixed $desaprobados */
/** @var mixed $p */
/** @var mixed $pageTitle */
/** @var mixed $periodoId */
/** @var mixed $periodoSeleccionado */
/** @var mixed $periodos */
?>

<?php $pageTitle = $pageTitle ?? 'Calificaciones'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-journal-text me-2"></i>Gestión de Calificaciones</h4>
    <a href="<?= BASE_URL ?>index.php?route=calificaciones/registrar" class="btn btn-primary">
        <i class="bi bi-pencil-square me-1"></i>Registrar Notas
    </a>
</div>

<!-- Filtros -->
<div class="card mb-4">
    <div class="card-body">
        <form method="GET" class="row g-2 align-items-end">
            <input type="hidden" name="route" value="calificaciones">
            <div class="col-md-4">
                <label class="form-label">Curso</label>
                <select class="form-select" name="curso_id" required>
                    <option value="">Seleccionar curso...</option>
                    <?php foreach ($cursos as $c): ?>
                        <option value="<?= $c['id'] ?>" <?= $cursoId == $c['id'] ? 'selected' : '' ?>><?= sanitize($c['nombre']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-4">
                <label class="form-label">Periodo</label>
                <select class="form-select" name="periodo_id" required>
                    <?php foreach ($periodos as $p): ?>
                        <option value="<?= $p['id'] ?>" <?= $periodoId == $p['id'] ? 'selected' : '' ?>><?= sanitize($p['nombre']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2">
                <button type="submit" class="btn btn-primary w-100"><i class="bi bi-search me-1"></i>Consultar</button>
            </div>
        </form>
    </div>
</div>

<?php if ($cursoSeleccionado && $periodoSeleccionado): ?>
<!-- Resumen -->
<div class="row g-3 mb-4">
    <div class="col-md-3">
        <div class="card text-center p-3">
            <div class="text-muted small">Curso</div>
            <div class="fw-bold"><?= sanitize($cursoSeleccionado['nombre']) ?></div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card text-center p-3">
            <div class="text-muted small">Periodo</div>
            <div class="fw-bold"><?= sanitize($periodoSeleccionado['nombre']) ?></div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card text-center p-3">
            <div class="text-muted small">Total Alumnos</div>
            <div class="fw-bold text-primary"><?= count($calificaciones) ?></div>
        </div>
    </div>
    <div class="col-md-3">
        <?php
        $aprobados = 0;
        $desaprobados = 0;
        foreach ($calificaciones as $cal) {
            if ($cal['nota'] >= 11) $aprobados++;
            else $desaprobados++;
        }
        ?>
        <div class="card text-center p-3">
            <div class="text-muted small">Aprobados / Desaprobados</div>
            <div class="fw-bold">
                <span class="text-success"><?= $aprobados ?></span> / 
                <span class="text-danger"><?= $desaprobados ?></span>
            </div>
        </div>
    </div>
</div>

<!-- Tabla de calificaciones -->
<div class="card">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Alumno</th>
                        <th>Nota</th>
                        <th>Conducta</th>
                        <th>Estado</th>
                        <th>Observación</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($calificaciones)): ?>
                        <tr><td colspan="6" class="text-center text-muted py-4"><i class="bi bi-inbox fs-1 d-block mb-2"></i>No hay calificaciones registradas para este curso y periodo</td></tr>
                    <?php else: ?>
                        <?php foreach ($calificaciones as $cal): ?>
                            <tr>
                                <td><code><?= sanitize($cal['alumno_codigo']) ?></code></td>
                                <td><strong><?= sanitize($cal['alumno_nombre']) ?></strong></td>
                                <td>
                                    <span class="fs-5 fw-bold <?= $cal['nota'] >= 11 ? 'text-success' : 'text-danger' ?>">
                                        <?= number_format($cal['nota'], 1) ?>
                                    </span>
                                </td>
                                <td><?= $cal['conducta'] ? number_format($cal['conducta'], 1) : '-' ?></td>
                                <td>
                                    <span class="badge <?= $cal['nota'] >= 11 ? 'bg-success' : 'bg-danger' ?>">
                                        <?= $cal['nota'] >= 11 ? 'Aprobado' : 'Desaprobado' ?>
                                    </span>
                                </td>
                                <td><small class="text-muted"><?= sanitize($cal['observacion'] ?? '-') ?></small></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php else: ?>
<div class="card">
    <div class="card-body text-center py-5">
        <i class="bi bi-funnel fs-1 text-muted d-block mb-2"></i>
        <h5 class="text-muted">Seleccione un curso y periodo para ver las calificaciones</h5>
    </div>
</div>
<?php endif; ?>
