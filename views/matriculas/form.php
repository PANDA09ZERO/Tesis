<?php
/** @var mixed $a */
/** @var mixed $alumnos */
/** @var mixed $g */
/** @var mixed $grados */
/** @var mixed $p */
/** @var mixed $pageTitle */
/** @var mixed $periodoActual */
/** @var mixed $periodos */
/** @var mixed $s */
/** @var mixed $secciones */
?>

<?php $pageTitle = $pageTitle ?? 'Nueva Matrícula'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-card-list me-2"></i><?= $pageTitle ?></h4>
    <a href="<?= BASE_URL ?>index.php?route=matriculas" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Volver</a>
</div>

<form method="POST" action="<?= BASE_URL ?>index.php?route=matriculas/store">
    <input type="hidden" name="csrf_token" value="<?= $this->generateCSRF() ?>">

    <div class="card mb-4">
        <div class="card-header fw-semibold"><i class="bi bi-person me-2"></i>Datos de Matrícula</div>
        <div class="card-body">
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label">Alumno *</label>
                    <select class="form-select" name="alumno_id" required>
                        <option value="">Seleccionar alumno...</option>
                        <?php foreach ($alumnos as $a): ?>
                            <option value="<?= $a['id'] ?>"><?= sanitize($a['apellido_paterno'] . ' ' . $a['apellido_materno'] . ', ' . $a['nombre'] . ' - ' . $a['dni']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Periodo *</label>
                    <select class="form-select" name="periodo_id" required>
                        <option value="">Seleccionar periodo...</option>
                        <?php foreach ($periodos as $p): ?>
                            <option value="<?= $p['id'] ?>" <?= ($periodoActual && $periodoActual['id'] == $p['id']) ? 'selected' : '' ?>><?= sanitize($p['nombre']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Grado *</label>
                    <select class="form-select" name="grado_id" required>
                        <option value="">Seleccionar grado...</option>
                        <?php foreach ($grados as $g): ?>
                            <option value="<?= $g['id'] ?>"><?= sanitize($g['nivel'] . ' - ' . $g['nombre']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Sección *</label>
                    <select class="form-select" name="seccion_id" required>
                        <option value="">Seleccionar sección...</option>
                        <?php foreach ($secciones as $s): ?>
                            <option value="<?= $s['id'] ?>"><?= sanitize($s['nombre']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>
        </div>
    </div>

    <div class="text-end">
        <a href="<?= BASE_URL ?>index.php?route=matriculas" class="btn btn-secondary me-2">Cancelar</a>
        <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg me-1"></i>Registrar Matrícula</button>
    </div>
</form>
