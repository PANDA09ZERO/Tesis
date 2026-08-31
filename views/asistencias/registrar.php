<?php
/** @var mixed $actual */
/** @var mixed $al */
/** @var mixed $alumnos */
/** @var mixed $asistenciasMap */
/** @var mixed $e */
/** @var mixed $estados */
/** @var mixed $fecha */
/** @var mixed $horario */
/** @var mixed $horarioId */
/** @var mixed $i */
/** @var mixed $pageTitle */
?>

<?php $pageTitle = $pageTitle ?? 'Registrar Asistencia'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-pencil-square me-2"></i><?= $pageTitle ?></h4>
    <a href="<?= BASE_URL ?>index.php?route=asistencias" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Volver</a>
</div>

<!-- Info del horario -->
<div class="alert alert-info">
    <div class="row">
        <div class="col-md-3"><strong>Curso:</strong> <?= sanitize($horario['curso_nombre']) ?></div>
        <div class="col-md-3"><strong>Grado:</strong> <?= sanitize($horario['grado'] . ' - ' . $horario['seccion']) ?></div>
        <div class="col-md-3"><strong>Día:</strong> <?= sanitize($horario['dia']) ?></div>
        <div class="col-md-3"><strong>Horario:</strong> <?= substr($horario['hora_inicio'], 0, 5) . ' - ' . substr($horario['hora_fin'], 0, 5) ?></div>
    </div>
</div>

<!-- Selector de fecha -->
<div class="card mb-4">
    <div class="card-body">
        <form method="GET" class="row g-2 align-items-end">
            <input type="hidden" name="route" value="asistencias/registrar/<?= $horarioId ?>">
            <div class="col-md-3">
                <label class="form-label">Fecha</label>
                <input type="date" class="form-control" name="fecha" value="<?= $fecha ?>" max="<?= date('Y-m-d') ?>">
            </div>
            <div class="col-md-2">
                <button type="submit" class="btn btn-primary w-100"><i class="bi bi-search me-1"></i>Cargar</button>
            </div>
        </form>
    </div>
</div>

<?php if (!empty($alumnos)): ?>
<form method="POST" action="<?= BASE_URL ?>index.php?route=asistencias/guardar">
    <input type="hidden" name="csrf_token" value="<?= $this->generateCSRF() ?>">
    <input type="hidden" name="horario_id" value="<?= $horarioId ?>">
    <input type="hidden" name="fecha" value="<?= $fecha ?>">

    <div class="card">
        <div class="card-body p-0">
            <div class="table-responsive">
                <table class="table table-hover mb-0 align-middle">
                    <thead class="table-light">
                        <tr>
                            <th width="60">N°</th>
                            <th>Código</th>
                            <th>Alumno</th>
                            <th width="150">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php $i = 1; foreach ($alumnos as $al): ?>
                            <tr>
                                <td class="text-muted"><?= $i++ ?></td>
                                <td><code><?= sanitize($al['codigo']) ?></code></td>
                                <td><strong><?= sanitize($al['apellido_paterno'] . ' ' . $al['apellido_materno'] . ', ' . $al['nombre']) ?></strong></td>
                                <td>
                                    <select class="form-select form-select-sm" name="estados[<?= $al['id'] ?>]" required>
                                        <?php
                                        $estados = ['Presente', 'Ausente', 'Tardanza', 'Justificado'];
                                        $actual = $asistenciasMap[$al['id']] ?? 'Presente';
                                        foreach ($estados as $e):
                                        ?>
                                            <option value="<?= $e ?>" <?= $actual === $e ? 'selected' : '' ?>><?= $e ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
        <div class="card-footer d-flex justify-content-between align-items-center">
            <small class="text-muted">
                <?= count($alumnos) ?> alumno(s) — <?= formatDate($fecha) ?>
            </small>
            <button type="submit" class="btn btn-primary btn-lg">
                <i class="bi bi-save me-1"></i>Guardar Asistencia
            </button>
        </div>
    </div>
</form>
<?php else: ?>
<div class="card">
    <div class="card-body text-center py-5">
        <i class="bi bi-people fs-1 text-muted d-block mb-2"></i>
        <h5 class="text-muted">No hay alumnos en este horario</h5>
    </div>
</div>
<?php endif; ?>
