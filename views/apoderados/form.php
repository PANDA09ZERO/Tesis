<?php
/** @var mixed $aa */
/** @var mixed $al */
/** @var mixed $alumnos */
/** @var mixed $apoderado */
/** @var mixed $apoderadoAlumnos */
/** @var mixed $isEdit */
/** @var mixed $p */
/** @var mixed $pageTitle */
?>

<?php
$pageTitle = $pageTitle ?? ($apoderado ? 'Editar Apoderado' : 'Registrar Apoderado');
$isEdit = !empty($apoderado);
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-person-plus-fill me-2"></i><?= $pageTitle ?></h4>
    <a href="<?= BASE_URL ?>index.php?route=apoderados" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Volver</a>
</div>

<form method="POST" action="<?= BASE_URL ?>index.php?route=<?= $isEdit ? 'apoderados/update/' . $apoderado['id'] : 'apoderados/store' ?>">
    <input type="hidden" name="csrf_token" value="<?= $this->generateCSRF() ?>">

    <div class="card mb-4">
        <div class="card-header fw-semibold"><i class="bi bi-person me-2"></i>Datos del Apoderado</div>
        <div class="card-body">
            <div class="row g-3">
                <div class="col-md-3"><label class="form-label">DNI *</label><input type="text" class="form-control" name="dni" required maxlength="8" value="<?= sanitize($apoderado['dni'] ?? '') ?>"></div>
                <div class="col-md-3"><label class="form-label">Nombre *</label><input type="text" class="form-control" name="nombre" required value="<?= sanitize($apoderado['nombre'] ?? '') ?>"></div>
                <div class="col-md-3"><label class="form-label">Apellido Paterno *</label><input type="text" class="form-control" name="apellido_paterno" required value="<?= sanitize($apoderado['apellido_paterno'] ?? '') ?>"></div>
                <div class="col-md-3"><label class="form-label">Apellido Materno</label><input type="text" class="form-control" name="apellido_materno" value="<?= sanitize($apoderado['apellido_materno'] ?? '') ?>"></div>
                <div class="col-md-3"><label class="form-label">Parentesco</label><select class="form-select" name="parentesco"><option value="">Seleccionar...</option><?php foreach (['Padre','Madre','Tutor','Abuelo','Otro'] as $p): ?><option value="<?= $p ?>" <?= ($apoderado['parentesco'] ?? '') === $p ? 'selected' : '' ?>><?= $p ?></option><?php endforeach; ?></select></div>
                <div class="col-md-3"><label class="form-label">Teléfono</label><input type="text" class="form-control" name="telefono" value="<?= sanitize($apoderado['telefono'] ?? '') ?>"></div>
                <div class="col-md-3"><label class="form-label"><i class="bi bi-shield-lock me-1"></i>Contraseña de Acceso <?= $isEdit ? '' : '*' ?></label><input type="password" class="form-control" name="password" <?= $isEdit ? 'placeholder="Dejar vacío para mantener"' : 'required' ?>><small class="text-muted">El usuario es su nombre y apellidos.</small></div>
                <div class="col-md-3"><label class="form-label">Ocupación</label><input type="text" class="form-control" name="ocupacion" value="<?= sanitize($apoderado['ocupacion'] ?? '') ?>"></div>
                <div class="col-md-12"><label class="form-label">Dirección</label><input type="text" class="form-control" name="direccion" value="<?= sanitize($apoderado['direccion'] ?? '') ?>"></div>
            </div>
        </div>
    </div>

    <?php if ($isEdit && isset($alumnos)): ?>
    <div class="card mb-4">
        <div class="card-header fw-semibold"><i class="bi bi-people me-2"></i>Alumnos Asociados</div>
        <div class="card-body">
            <select class="form-select" name="alumnos[]" multiple size="4">
                <?php foreach ($alumnos as $al): ?>
                    <option value="<?= $al['id'] ?>" <?php foreach ($apoderadoAlumnos as $aa) { if ($aa['alumno_id'] == $al['id']) echo 'selected'; } ?>>
                        <?= sanitize($al['apellido_paterno'] . ' ' . $al['nombre'] . ' - ' . $al['dni']) ?>
                    </option>
                <?php endforeach; ?>
            </select>
            <small class="text-muted">Mantenga Ctrl para seleccionar varios</small>
        </div>
    </div>
    <?php endif; ?>

    <div class="text-end">
        <a href="<?= BASE_URL ?>index.php?route=apoderados" class="btn btn-secondary me-2">Cancelar</a>
        <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg me-1"></i><?= $isEdit ? 'Actualizar' : 'Registrar' ?></button>
    </div>
</form>
