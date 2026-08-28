<?php $pageTitle = $pageTitle ?? 'Calificaciones del Alumno'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-journal-text me-2"></i><?= $pageTitle ?></h4>
    <a href="<?= BASE_URL ?>index.php?route=calificaciones" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Volver</a>
</div>

<!-- Datos del alumno -->
<div class="card mb-4">
    <div class="card-body">
        <div class="row">
            <div class="col-md-4">
                <strong>Alumno:</strong> <?= sanitize($alumno['nombre_completo']) ?>
            </div>
            <div class="col-md-3">
                <strong>Grado:</strong> <?= sanitize($alumno['grado'] ?? 'N/A') ?>
            </div>
            <div class="col-md-3">
                <strong>Sección:</strong> <?= sanitize($alumno['seccion'] ?? 'N/A') ?>
            </div>
            <div class="col-md-2">
                <form method="GET" class="d-flex gap-1">
                    <input type="hidden" name="route" value="calificaciones/alumno/<?= $alumno['id'] ?>">
                    <select class="form-select form-select-sm" name="periodo_id" onchange="this.form.submit()">
                        <option value="">Todos los periodos</option>
                        <?php foreach ($periodos as $p): ?>
                            <option value="<?= $p['id'] ?>" <?= $periodoId == $p['id'] ? 'selected' : '' ?>><?= sanitize($p['nombre']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </form>
            </div>
        </div>
    </div>
</div>

<?php if ($promedio): ?>
<div class="row g-3 mb-4">
    <div class="col-md-3">
        <div class="card text-center p-3">
            <div class="text-muted small">Promedio General</div>
            <div class="fw-bold fs-3 <?= $promedio['promedio'] >= 11 ? 'text-success' : 'text-danger' ?>">
                <?= number_format($promedio['promedio'], 1) ?>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card text-center p-3">
            <div class="text-muted small">Cursos Evaluados</div>
            <div class="fw-bold fs-3 text-primary"><?= $promedio['total_cursos'] ?></div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card text-center p-3">
            <div class="text-muted small">Aprobados</div>
            <div class="fw-bold fs-3 text-success"><?= $promedio['total_cursos'] - $promedio['desaprobados'] ?></div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card text-center p-3">
            <div class="text-muted small">Desaprobados</div>
            <div class="fw-bold fs-3 text-danger"><?= $promedio['desaprobados'] ?></div>
        </div>
    </div>
</div>
<?php endif; ?>

<div class="card">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead>
                    <tr>
                        <th>Periodo</th>
                        <th>Curso</th>
                        <th>Nota</th>
                        <th>Conducta</th>
                        <th>Estado</th>
                        <th>Observación</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($calificaciones)): ?>
                        <tr><td colspan="6" class="text-center text-muted py-4">No hay calificaciones registradas</td></tr>
                    <?php else: ?>
                        <?php foreach ($calificaciones as $cal): ?>
                            <tr>
                                <td><span class="badge bg-secondary"><?= sanitize($cal['periodo_nombre']) ?></span></td>
                                <td><strong><?= sanitize($cal['curso_nombre']) ?></strong></td>
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
