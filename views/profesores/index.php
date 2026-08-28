<?php $pageTitle = $pageTitle ?? 'Profesores'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-person-workspace me-2"></i>Gestión de Profesores</h4>
    <a href="<?= BASE_URL ?>index.php?route=profesores/create" class="btn btn-primary">
        <i class="bi bi-plus-lg me-1"></i>Nuevo Profesor
    </a>
</div>

<div class="card mb-4">
    <div class="card-body">
        <form method="GET" class="row g-2">
            <input type="hidden" name="route" value="profesores">
            <div class="col-md-10">
                <input type="text" class="form-control" name="q" placeholder="Buscar por nombre, DNI o código..." value="<?= sanitize($busqueda ?? '') ?>">
            </div>
            <div class="col-md-2">
                <button type="submit" class="btn btn-outline-primary w-100"><i class="bi bi-search me-1"></i>Buscar</button>
            </div>
        </form>
    </div>
</div>

<div class="card">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Nombre Completo</th>
                        <th>DNI</th>
                        <th>Especialidad</th>
                        <th>Teléfono</th>
                        <th>Estado</th>
                        <th width="150">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($profesores)): ?>
                        <tr><td colspan="7" class="text-center text-muted py-4"><i class="bi bi-inbox fs-1 d-block mb-2"></i>No se encontraron profesores</td></tr>
                    <?php else: ?>
                        <?php foreach ($profesores as $p): ?>
                            <tr>
                                <td><code><?= sanitize($p['codigo'] ?? 'N/A') ?></code></td>
                                <td>
                                    <a href="<?= BASE_URL ?>index.php?route=profesores/profile/<?= $p['id'] ?>" class="text-decoration-none fw-semibold">
                                        <?= sanitize($p['nombre_completo']) ?>
                                    </a>
                                </td>
                                <td><?= sanitize($p['dni']) ?></td>
                                <td><?= sanitize($p['especialidad'] ?? '-') ?></td>
                                <td><?= sanitize($p['telefono'] ?? '-') ?></td>
                                <td><span class="badge <?= $p['estado'] ? 'bg-success' : 'bg-danger' ?>"><?= $p['estado'] ? 'Activo' : 'Inactivo' ?></span></td>
                                <td>
                                    <div class="btn-group btn-group-sm">
                                        <a href="<?= BASE_URL ?>index.php?route=profesores/profile/<?= $p['id'] ?>" class="btn btn-outline-info"><i class="bi bi-eye"></i></a>
                                        <a href="<?= BASE_URL ?>index.php?route=profesores/edit/<?= $p['id'] ?>" class="btn btn-outline-warning"><i class="bi bi-pencil"></i></a>
                                        <form method="POST" action="<?= BASE_URL ?>index.php?route=profesores/delete/<?= $p['id'] ?>" class="d-inline" onsubmit="return confirm('¿Eliminar este profesor?')">
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
