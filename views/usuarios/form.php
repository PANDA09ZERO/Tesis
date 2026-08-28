<?php
$pageTitle = $pageTitle ?? ($usuario ? 'Editar Usuario' : 'Crear Usuario');
$isEdit = !empty($usuario);
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-person-plus-fill me-2"></i><?= $pageTitle ?></h4>
    <a href="<?= BASE_URL ?>index.php?route=usuarios" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Volver</a>
</div>

<form method="POST" action="<?= BASE_URL ?>index.php?route=<?= $isEdit ? 'usuarios/update/' . $usuario['id'] : 'usuarios/store' ?>">
    <input type="hidden" name="csrf_token" value="<?= $this->generateCSRF() ?>">

    <div class="card mb-4">
        <div class="card-body">
            <div class="row g-3">
                <?php if (!$isEdit): ?>
                <div class="col-md-4">
                    <label class="form-label">Nombre de Usuario *</label>
                    <input type="text" class="form-control" name="username" required value="<?= sanitize($usuario['username'] ?? '') ?>">
                </div>
                <?php else: ?>
                <div class="col-md-4">
                    <label class="form-label">Usuario</label>
                    <input type="text" class="form-control" value="<?= sanitize($usuario['username']) ?>" disabled>
                </div>
                <?php endif; ?>
                <div class="col-md-4">
                    <label class="form-label"><?= $isEdit ? 'Nueva Contraseña (dejar vacío para mantener)' : 'Contraseña *' ?></label>
                    <input type="password" class="form-control" name="<?= $isEdit ? 'new_password' : 'password' ?>" <?= $isEdit ? '' : 'required' ?>>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Email *</label>
                    <input type="email" class="form-control" name="email" required value="<?= sanitize($usuario['email'] ?? '') ?>">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Rol *</label>
                    <select class="form-select" name="rol_id" required>
                        <option value="">Seleccionar...</option>
                        <?php foreach ($roles as $r): ?>
                            <option value="<?= $r['id'] ?>" <?= ($usuario['rol_id'] ?? '') == $r['id'] ? 'selected' : '' ?>><?= sanitize($r['nombre']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <?php if ($isEdit): ?>
                <div class="col-md-4">
                    <label class="form-label">Estado</label>
                    <select class="form-select" name="estado">
                        <option value="1" <?= $usuario['estado'] ? 'selected' : '' ?>>Activo</option>
                        <option value="0" <?= !$usuario['estado'] ? 'selected' : '' ?>>Inactivo</option>
                    </select>
                </div>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <div class="text-end">
        <a href="<?= BASE_URL ?>index.php?route=usuarios" class="btn btn-secondary me-2">Cancelar</a>
        <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg me-1"></i><?= $isEdit ? 'Actualizar' : 'Crear' ?></button>
    </div>
</form>
