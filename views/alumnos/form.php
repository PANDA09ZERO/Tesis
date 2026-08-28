<?php
$pageTitle = $pageTitle ?? ($alumno ? 'Editar Alumno' : 'Registrar Alumno');
$isEdit = !empty($alumno);
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0">
        <i class="bi bi-person-plus-fill me-2"></i><?= $pageTitle ?>
    </h4>
    <a href="<?= BASE_URL ?>index.php?route=alumnos" class="btn btn-outline-secondary">
        <i class="bi bi-arrow-left me-1"></i>Volver
    </a>
</div>

<form method="POST" action="<?= BASE_URL ?>index.php?route=<?= $isEdit ? 'alumnos/update/' . $alumno['id'] : 'alumnos/store' ?>">
    <input type="hidden" name="csrf_token" value="<?= $this->generateCSRF() ?>">

    <div class="card mb-4">
        <div class="card-header fw-semibold"><i class="bi bi-person me-2"></i>Datos Personales</div>
        <div class="card-body">
            <div class="row g-3">
                <div class="col-md-3">
                    <label class="form-label">Código *</label>
                    <input type="text" class="form-control" name="codigo" required value="<?= sanitize($alumno['codigo'] ?? '') ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label">DNI *</label>
                    <input type="text" class="form-control" name="dni" required maxlength="8" value="<?= sanitize($alumno['dni'] ?? '') ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Nombre *</label>
                    <input type="text" class="form-control" name="nombre" required value="<?= sanitize($alumno['nombre'] ?? '') ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Apellido Paterno *</label>
                    <input type="text" class="form-control" name="apellido_paterno" required value="<?= sanitize($alumno['apellido_paterno'] ?? '') ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Apellido Materno</label>
                    <input type="text" class="form-control" name="apellido_materno" value="<?= sanitize($alumno['apellido_materno'] ?? '') ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Fecha Nacimiento</label>
                    <input type="date" class="form-control" name="fecha_nacimiento" value="<?= $alumno['fecha_nacimiento'] ?? '' ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Sexo *</label>
                    <select class="form-select" name="sexo" required>
                        <option value="">Seleccionar...</option>
                        <option value="M" <?= ($alumno['sexo'] ?? '') === 'M' ? 'selected' : '' ?>>Masculino</option>
                        <option value="F" <?= ($alumno['sexo'] ?? '') === 'F' ? 'selected' : '' ?>>Femenino</option>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Teléfono</label>
                    <input type="text" class="form-control" name="telefono" value="<?= sanitize($alumno['telefono'] ?? '') ?>">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-control" name="email" value="<?= sanitize($alumno['email'] ?? '') ?>">
                </div>
                <div class="col-md-8">
                    <label class="form-label">Dirección</label>
                    <input type="text" class="form-control" name="direccion" value="<?= sanitize($alumno['direccion'] ?? '') ?>">
                </div>
            </div>
        </div>
    </div>

    <?php if (!$isEdit): ?>
    <div class="card mb-4">
        <div class="card-header fw-semibold"><i class="bi bi-mortarboard me-2"></i>Matrícula Inicial</div>
        <div class="card-body">
            <div class="row g-3">
                <div class="col-md-4">
                    <label class="form-label">Grado</label>
                    <select class="form-select" name="grado_id">
                        <option value="">Seleccionar...</option>
                        <?php foreach ($grados as $g): ?>
                            <option value="<?= $g['id'] ?>"><?= sanitize($g['nivel'] . ' - ' . $g['nombre']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Sección</label>
                    <select class="form-select" name="seccion_id">
                        <option value="">Seleccionar...</option>
                        <?php foreach ($secciones as $s): ?>
                            <option value="<?= $s['id'] ?>"><?= sanitize($s['nombre']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>
        </div>
    </div>

    <div class="card mb-4">
        <div class="card-header fw-semibold"><i class="bi bi-person-hearts me-2"></i>Apoderados</div>
        <div class="card-body">
            <select class="form-select" name="apoderados[]" multiple size="4">
                <?php foreach ($apoderados as $ap): ?>
                    <option value="<?= $ap['id'] ?>"><?= sanitize($ap['apellido_paterno'] . ' ' . $ap['nombre'] . ' - ' . $ap['parentesco']) ?></option>
                <?php endforeach; ?>
            </select>
            <small class="text-muted">Mantenga Ctrl para seleccionar varios</small>
        </div>
    </div>
    <?php endif; ?>

    <div class="text-end">
        <a href="<?= BASE_URL ?>index.php?route=alumnos" class="btn btn-secondary me-2">Cancelar</a>
        <button type="submit" class="btn btn-primary">
            <i class="bi bi-check-lg me-1"></i><?= $isEdit ? 'Actualizar' : 'Registrar' ?>
        </button>
    </div>
</form>
