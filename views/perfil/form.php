<?php
/** @var mixed $pageTitle */
/** @var mixed $user */
?>

<?php
$user = currentUser();
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0">
        <i class="bi bi-person-circle me-2"></i><?= $pageTitle ?>
    </h4>
</div>

<div class="row g-4">
    <div class="col-md-5">
        <div class="card mb-4">
            <div class="card-header fw-semibold"><i class="bi bi-info-circle me-2"></i>Mi Cuenta</div>
            <div class="card-body">
                <table class="table table-sm mb-0">
                    <tr>
                        <th class="text-muted">Usuario</th>
                        <td><?= sanitize($user['username']) ?></td>
                    </tr>
                    <tr>
                        <th class="text-muted">Rol</th>
                        <td><?= sanitize($user['rol_nombre']) ?></td>
                    </tr>
                    <tr>
                        <th class="text-muted">Correo</th>
                        <td><?= sanitize($user['email']) ?></td>
                    </tr>
                </table>
            </div>
        </div>
    </div>

    <div class="col-md-7">
        <div class="card mb-4">
            <div class="card-header fw-semibold"><i class="bi bi-key me-2"></i>Cambiar Contraseña</div>
            <div class="card-body">
                <form method="POST" action="<?= BASE_URL ?>index.php?route=perfil/update">
                    <input type="hidden" name="csrf_token" value="<?= $this->generateCSRF() ?>">
                    <div class="mb-3">
                        <label class="form-label">Contraseña Actual *</label>
                        <input type="password" class="form-control" name="password_actual" required autocomplete="current-password">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Nueva Contraseña *</label>
                        <input type="password" class="form-control" name="password" required minlength="6" autocomplete="new-password">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Confirmar Nueva Contraseña *</label>
                        <input type="password" class="form-control" name="password_confirm" required minlength="6" autocomplete="new-password">
                    </div>
                    <button type="submit" class="btn btn-primary">
                        <i class="bi bi-check-lg me-1"></i>Actualizar Contraseña
                    </button>
                </form>
            </div>
        </div>
    </div>
</div>