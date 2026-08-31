<?php
/** @var mixed $al */
/** @var mixed $alumnos */
/** @var mixed $c */
/** @var mixed $cursoId */
/** @var mixed $cursoSeleccionado */
/** @var mixed $cursos */
/** @var mixed $i */
/** @var mixed $p */
/** @var mixed $pageTitle */
/** @var mixed $periodoId */
/** @var mixed $periodoSeleccionado */
/** @var mixed $periodos */
?>

<?php $pageTitle = $pageTitle ?? 'Registrar Calificaciones'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-pencil-square me-2"></i><?= $pageTitle ?></h4>
    <a href="<?= BASE_URL ?>index.php?route=calificaciones" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Volver</a>
</div>

<!-- Filtros -->
<div class="card mb-4">
    <div class="card-body">
        <form method="GET" class="row g-2 align-items-end">
            <input type="hidden" name="route" value="calificaciones/registrar">
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
                <button type="submit" class="btn btn-primary w-100"><i class="bi bi-search me-1"></i>Cargar</button>
            </div>
        </form>
    </div>
</div>

<?php if (!empty($alumnos) && $cursoSeleccionado && $periodoSeleccionado): ?>
<div class="alert alert-info">
    <i class="bi bi-info-circle me-2"></i>
    <strong><?= sanitize($cursoSeleccionado['nombre']) ?></strong> — <?= sanitize($periodoSeleccionado['nombre']) ?> — <?= count($alumnos) ?> alumno(s)
</div>

<form method="POST" action="<?= BASE_URL ?>index.php?route=calificaciones/guardar">
    <input type="hidden" name="csrf_token" value="<?= $this->generateCSRF() ?>">
    <input type="hidden" name="curso_id" value="<?= $cursoId ?>">
    <input type="hidden" name="periodo_id" value="<?= $periodoId ?>">

    <div class="card">
        <div class="card-body p-0">
            <div class="table-responsive">
                <table class="table table-hover mb-0 align-middle">
                    <thead class="table-light">
                        <tr>
                            <th width="60">N°</th>
                            <th>Código</th>
                            <th>Alumno</th>
                            <th width="120">Nota (0-20)</th>
                            <th width="120">Conducta (0-20)</th>
                            <th width="200">Observación</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php $i = 1; foreach ($alumnos as $al): ?>
                            <tr>
                                <td class="text-muted"><?= $i++ ?></td>
                                <td><code><?= sanitize($al['codigo']) ?></code></td>
                                <td><strong><?= sanitize($al['apellido_paterno'] . ' ' . $al['apellido_materno'] . ', ' . $al['nombre']) ?></strong></td>
                                <td>
                                    <input type="number" class="form-control form-control-sm" 
                                           name="notas[<?= $al['id'] ?>]" min="0" max="20" step="0.5"
                                           value="<?= $al['nota_actual'] ?? '' ?>" placeholder="0-20">
                                </td>
                                <td>
                                    <input type="number" class="form-control form-control-sm" 
                                           name="conductas[<?= $al['id'] ?>]" min="0" max="20" step="0.5"
                                           value="<?= $al['conducta_actual'] ?? '' ?>" placeholder="0-20">
                                </td>
                                <td>
                                    <input type="text" class="form-control form-control-sm" 
                                           name="observaciones[<?= $al['id'] ?>]"
                                           value="" placeholder="Observación...">
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
        <div class="card-footer text-end">
            <button type="submit" class="btn btn-primary btn-lg">
                <i class="bi bi-save me-1"></i>Guardar Calificaciones
            </button>
        </div>
    </div>
</form>
<?php elseif ($cursoId && $periodoId): ?>
<div class="card">
    <div class="card-body text-center py-5">
        <i class="bi bi-people fs-1 text-muted d-block mb-2"></i>
        <h5 class="text-muted">No hay alumnos matriculados para este curso y periodo</h5>
    </div>
</div>
<?php endif; ?>
