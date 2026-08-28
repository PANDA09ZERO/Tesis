<?php
$pageTitle = $pageTitle ?? ($profesor ? 'Editar Profesor' : 'Registrar Profesor');
$isEdit = !empty($profesor);
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-person-plus-fill me-2"></i><?= $pageTitle ?></h4>
    <a href="<?= BASE_URL ?>index.php?route=profesores" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Volver</a>
</div>

<form method="POST" action="<?= BASE_URL ?>index.php?route=<?= $isEdit ? 'profesores/update/' . $profesor['id'] : 'profesores/store' ?>">
    <input type="hidden" name="csrf_token" value="<?= $this->generateCSRF() ?>">

    <div class="card mb-4">
        <div class="card-header fw-semibold"><i class="bi bi-person me-2"></i>Datos Personales</div>
        <div class="card-body">
            <div class="row g-3">
                <div class="col-md-3">
                    <label class="form-label">Código *</label>
                    <input type="text" class="form-control" name="codigo" required value="<?= sanitize($profesor['codigo'] ?? '') ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label">DNI *</label>
                    <input type="text" class="form-control" name="dni" required maxlength="8" value="<?= sanitize($profesor['dni'] ?? '') ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Nombre *</label>
                    <input type="text" class="form-control" name="nombre" required value="<?= sanitize($profesor['nombre'] ?? '') ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Apellido Paterno *</label>
                    <input type="text" class="form-control" name="apellido_paterno" required value="<?= sanitize($profesor['apellido_paterno'] ?? '') ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Apellido Materno</label>
                    <input type="text" class="form-control" name="apellido_materno" value="<?= sanitize($profesor['apellido_materno'] ?? '') ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Fecha Nacimiento</label>
                    <input type="date" class="form-control" name="fecha_nacimiento" value="<?= $profesor['fecha_nacimiento'] ?? '' ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Sexo</label>
                    <select class="form-select" name="sexo">
                        <option value="">Seleccionar...</option>
                        <option value="M" <?= ($profesor['sexo'] ?? '') === 'M' ? 'selected' : '' ?>>Masculino</option>
                        <option value="F" <?= ($profesor['sexo'] ?? '') === 'F' ? 'selected' : '' ?>>Femenino</option>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Teléfono</label>
                    <input type="text" class="form-control" name="telefono" value="<?= sanitize($profesor['telefono'] ?? '') ?>">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-control" name="email" value="<?= sanitize($profesor['email'] ?? '') ?>">
                </div>
                <div class="col-md-8">
                    <label class="form-label">Dirección</label>
                    <input type="text" class="form-control" name="direccion" value="<?= sanitize($profesor['direccion'] ?? '') ?>">
                </div>
            </div>
        </div>
    </div>

    <div class="card mb-4">
        <div class="card-header fw-semibold"><i class="bi bi-briefcase me-2"></i>Datos Laborales</div>
        <div class="card-body">
            <div class="row g-3">
                <div class="col-md-4">
                    <label class="form-label">Especialidad</label>
                    <input type="text" class="form-control" name="especialidad" value="<?= sanitize($profesor['especialidad'] ?? '') ?>">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Fecha de Contratación</label>
                    <input type="date" class="form-control" name="fecha_contratacion" value="<?= $profesor['fecha_contratacion'] ?? '' ?>">
                </div>
            </div>
        </div>
    </div>

    <div class="text-end">
        <a href="<?= BASE_URL ?>index.php?route=profesores" class="btn btn-secondary me-2">Cancelar</a>
        <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg me-1"></i><?= $isEdit ? 'Actualizar' : 'Registrar' ?></button>
    </div>
</form>
