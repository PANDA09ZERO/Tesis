<?php
/** @var mixed $alumno */
/** @var mixed $alumnos */
/** @var mixed $busqueda */
/** @var mixed $pageTitle */
?>

<?php $pageTitle = $pageTitle ?? 'Alumnos'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-people-fill me-2"></i>Gestión de Alumnos</h4>
    <a href="<?= BASE_URL ?>index.php?route=alumnos/create" class="btn btn-primary">
        <i class="bi bi-plus-lg me-1"></i>Nuevo Alumno
    </a>
</div>

<div class="card mb-4">
    <div class="card-body">
        <form method="GET" class="row g-2">
            <input type="hidden" name="route" value="alumnos">
            <div class="col-md-10">
                <input type="text" class="form-control" name="q" placeholder="Buscar por nombre, DNI o código..." value="<?= sanitize($busqueda ?? '') ?>">
            </div>
            <div class="col-md-2">
                <button type="submit" class="btn btn-outline-primary w-100">
                    <i class="bi bi-search me-1"></i>Buscar
                </button>
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
                        <th>Grado</th>
                        <th>Sección</th>
                        <th>Sexo</th>
                        <th>Estado</th>
                        <th width="150">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($alumnos)): ?>
                        <tr>
                            <td colspan="8" class="text-center text-muted py-4">
                                <i class="bi bi-inbox fs-1 d-block mb-2"></i>No se encontraron alumnos
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($alumnos as $alumno): ?>
                            <tr>
                                <td><code><?= sanitize($alumno['codigo'] ?? 'N/A') ?></code></td>
                                <td>
                                    <a href="<?= BASE_URL ?>index.php?route=alumnos/profile/<?= $alumno['id'] ?>" class="text-decoration-none fw-semibold">
                                        <?= sanitize($alumno['apellido_paterno'] . ' ' . $alumno['apellido_materno'] . ', ' . $alumno['nombre']) ?>
                                    </a>
                                </td>
                                <td><?= sanitize($alumno['dni']) ?></td>
                                <td><span class="badge bg-secondary"><?= sanitize($alumno['grado'] ?? '-') ?></span></td>
                                <td><?= sanitize($alumno['seccion'] ?? '-') ?></td>
                                <td><?= $alumno['sexo'] === 'M' ? 'Masculino' : 'Femenino' ?></td>
                                <td>
                                    <span class="badge <?= $alumno['estado'] ? 'bg-success' : 'bg-danger' ?>">
                                        <?= $alumno['estado'] ? 'Activo' : 'Inactivo' ?>
                                    </span>
                                </td>
                                <td>
                                    <div class="btn-group btn-group-sm">
                                        <a href="<?= BASE_URL ?>index.php?route=alumnos/profile/<?= $alumno['id'] ?>" class="btn btn-outline-info" title="Ver">
                                            <i class="bi bi-eye"></i>
                                        </a>
                                        <a href="<?= BASE_URL ?>index.php?route=alumnos/edit/<?= $alumno['id'] ?>" class="btn btn-outline-warning" title="Editar">
                                            <i class="bi bi-pencil"></i>
                                        </a>
                                        <form method="POST" action="<?= BASE_URL ?>index.php?route=alumnos/delete/<?= $alumno['id'] ?>" class="d-inline" onsubmit="return confirm('¿Está seguro de eliminar este alumno?')">
                                            <input type="hidden" name="csrf_token" value="<?= $this->generateCSRF() ?>">
                                            <button type="submit" class="btn btn-outline-danger" title="Eliminar">
                                                <i class="bi bi-trash"></i>
                                            </button>
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
