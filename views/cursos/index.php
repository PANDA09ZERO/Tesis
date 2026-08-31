<?php
/** @var mixed $c */
/** @var mixed $cursos */
/** @var mixed $pageTitle */
?>

<?php $pageTitle = $pageTitle ?? 'Cursos'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-book-fill me-2"></i>Gestión de Cursos</h4>
    <a href="<?= BASE_URL ?>index.php?route=cursos/create" class="btn btn-primary"><i class="bi bi-plus-lg me-1"></i>Nuevo Curso</a>
</div>

<div class="card">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead><tr><th>Código</th><th>Nombre</th><th>Área</th><th>Horas/Sem</th><th>Estado</th><th width="120">Acciones</th></tr></thead>
                <tbody>
                    <?php if (empty($cursos)): ?>
                        <tr><td colspan="6" class="text-center text-muted py-4"><i class="bi bi-inbox fs-1 d-block mb-2"></i>No hay cursos</td></tr>
                    <?php else: ?>
                        <?php foreach ($cursos as $c): ?>
                            <tr>
                                <td><code><?= sanitize($c['codigo']) ?></code></td>
                                <td><strong><?= sanitize($c['nombre']) ?></strong></td>
                                <td><span class="badge bg-secondary"><?= sanitize($c['area'] ?? '-') ?></span></td>
                                <td><?= $c['horas_semanales'] ?></td>
                                <td><span class="badge <?= $c['estado'] ? 'bg-success' : 'bg-danger' ?>"><?= $c['estado'] ? 'Activo' : 'Inactivo' ?></span></td>
                                <td>
                                    <div class="btn-group btn-group-sm">
                                        <a href="<?= BASE_URL ?>index.php?route=cursos/edit/<?= $c['id'] ?>" class="btn btn-outline-warning"><i class="bi bi-pencil"></i></a>
                                        <form method="POST" action="<?= BASE_URL ?>index.php?route=cursos/delete/<?= $c['id'] ?>" class="d-inline" onsubmit="return confirm('¿Eliminar este curso?')">
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
