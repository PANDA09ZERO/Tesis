<?php
/** @var mixed $d */
/** @var mixed $documentos */
/** @var mixed $pageTitle */
?>

<?php $pageTitle = $pageTitle ?? 'Mis Documentos'; ?>

<div class="mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-file-earmark-text me-2"></i><?= $pageTitle ?></h4>
</div>

<div class="card">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead><tr><th>Título</th><th>Categoría</th><th>Tipo</th><th>Fecha</th><th>Estado</th><th>Acción</th></tr></thead>
                <tbody>
                    <?php if (empty($documentos)): ?>
                        <tr><td colspan="6" class="text-center text-muted py-4"><i class="bi bi-inbox fs-1 d-block mb-2"></i>No tienes documentos</td></tr>
                    <?php else: ?>
                        <?php foreach ($documentos as $d): ?>
                            <tr>
                                <td><strong><?= sanitize($d['titulo']) ?></strong></td>
                                <td><span class="badge bg-secondary"><?= sanitize($d['categoria'] ?? '-') ?></span></td>
                                <td><?= $d['tipo'] ?></td>
                                <td><small><?= formatDate($d['created_at']) ?></small></td>
                                <td><span class="badge <?= match($d['estado']) { 'Vigente'=>'bg-success', 'Vencido'=>'bg-danger', 'Pendiente'=>'bg-warning text-dark', default=>'bg-secondary' } ?>"><?= $d['estado'] ?></span></td>
                                <td>
                                    <?php if ($d['archivo']): ?>
                                        <a href="<?= BASE_URL ?>index.php?route=documentos/download/<?= $d['id'] ?>" class="btn btn-sm btn-outline-success"><i class="bi bi-download"></i></a>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
