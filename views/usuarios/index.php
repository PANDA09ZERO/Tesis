<?php
/** @var mixed $busqueda */
/** @var mixed $pageTitle */
/** @var mixed $u */
/** @var mixed $usuarios */
?>

<?php $pageTitle = $pageTitle ?? 'Usuarios'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <img src="<?= BASE_URL ?>views/img/logo-colegio.jpeg" alt="Logo del Colegio" class="img-fluid" style="max-height: 50px;">
    <h4 class="fw-bold mb-0"><i class="bi bi-shield-lock-fill me-2"></i>Gestión de Usuarios</h4>
    <a href="<?= BASE_URL ?>index.php?route=usuarios/create" class="btn btn-primary"><i class="bi bi-plus-lg me-1"></i>Nuevo Usuario</a>
</div>

<div class="card mb-4">
    <div class="card-body">
        <form method="GET" class="row g-2">
            <input type="hidden" name="route" value="usuarios">
            <div class="col-md-10"><input type="text" class="form-control" name="q" placeholder="Buscar por usuario o email..." value="<?= sanitize($busqueda ?? '') ?>"></div>
            <div class="col-md-2"><button type="submit" class="btn btn-outline-primary w-100"><i class="bi bi-search me-1"></i>Buscar</button></div>
        </form>
    </div>
</div>

<div class="card">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Último Acceso</th><th>Estado</th><th width="150">Acciones</th></tr></thead>
                <tbody>
                    <?php if (empty($usuarios)): ?>
                        <tr><td colspan="6" class="text-center text-muted py-4"><i class="bi bi-inbox fs-1 d-block mb-2"></i>No hay usuarios</td></tr>
                    <?php else: ?>
                        <?php foreach ($usuarios as $u): ?>
                            <tr>
                                <td><strong><?= sanitize($u['username']) ?></strong></td>
                                <td><?= sanitize($u['email']) ?></td>
                                <td><span class="badge bg-primary"><?= sanitize($u['rol_nombre']) ?></span></td>
                                <td><small class="text-muted"><?= $u['ultimo_acceso'] ? formatDateTime($u['ultimo_acceso']) : 'Nunca' ?></small></td>
                                <td><span class="badge <?= $u['estado'] ? 'bg-success' : 'bg-danger' ?>"><?= $u['estado'] ? 'Activo' : 'Inactivo' ?></span></td>
                                <td>
                                    <div class="btn-group btn-group-sm">
                                        <a href="<?= BASE_URL ?>index.php?route=usuarios/edit/<?= $u['id'] ?>" class="btn btn-outline-warning"><i class="bi bi-pencil"></i></a>
                                        <a href="<?= BASE_URL ?>index.php?route=usuarios/toggle/<?= $u['id'] ?>" class="btn btn-outline-<?= $u['estado'] ? 'secondary' : 'success' ?>" title="<?= $u['estado'] ? 'Desactivar' : 'Activar' ?>">
                                            <i class="bi bi-<?= $u['estado'] ? 'pause' : 'play' ?>"></i>
                                        </a>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
