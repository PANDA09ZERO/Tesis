<?php
/** @var mixed $a */
/** @var mixed $apoderados */
/** @var mixed $busqueda */
/** @var mixed $pageTitle */
?>

<?php $pageTitle = $pageTitle ?? 'Apoderados'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-person-hearts me-2"></i>Gestión de Apoderados</h4>
    <a href="<?= BASE_URL ?>index.php?route=apoderados/create" class="btn btn-primary"><i class="bi bi-plus-lg me-1"></i>Nuevo Apoderado</a>
</div>

<div class="card mb-4">
    <div class="card-body">
        <form method="GET" class="row g-2">
            <input type="hidden" name="route" value="apoderados">
            <div class="col-md-10"><input type="text" class="form-control" name="q" placeholder="Buscar por nombre o DNI..." value="<?= sanitize($busqueda ?? '') ?>"></div>
            <div class="col-md-2"><button type="submit" class="btn btn-outline-primary w-100"><i class="bi bi-search me-1"></i>Buscar</button></div>
        </form>
    </div>
</div>

<div class="card">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead><tr><th>DNI</th><th>Nombre Completo</th><th>Parentesco</th><th>Teléfono</th><th>Email</th><th width="120">Acciones</th></tr></thead>
                <tbody>
                    <?php if (empty($apoderados)): ?>
                        <tr><td colspan="6" class="text-center text-muted py-4"><i class="bi bi-inbox fs-1 d-block mb-2"></i>No se encontraron apoderados</td></tr>
                    <?php else: ?>
                        <?php foreach ($apoderados as $a): ?>
                            <tr>
                                <td><?= sanitize($a['dni']) ?></td>
                                <td><strong><?= sanitize($a['nombre_completo']) ?></strong></td>
                                <td><span class="badge bg-secondary"><?= sanitize($a['parentesco'] ?? '-') ?></span></td>
                                <td><?= sanitize($a['telefono'] ?? '-') ?></td>
                                <td><?= sanitize($a['email'] ?? '-') ?></td>
                                <td>
                                    <div class="btn-group btn-group-sm">
                                        <a href="<?= BASE_URL ?>index.php?route=apoderados/edit/<?= $a['id'] ?>" class="btn btn-outline-warning"><i class="bi bi-pencil"></i></a>
                                        <form method="POST" action="<?= BASE_URL ?>index.php?route=apoderados/delete/<?= $a['id'] ?>" class="d-inline" onsubmit="return confirm('¿Eliminar?')">
                                            <input type="hidden" name="csrf_token" value="<?= $this->generateCSRF() ?>">
                                            <button class="btn btn-outline-danger"><i class="bi bi-trash"></i></button>
                                        </form>
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
