<?php
/** @var mixed $badge */
/** @var mixed $busqueda */
/** @var mixed $cat */
/** @var mixed $categoria */
/** @var mixed $categorias */
/** @var mixed $d */
/** @var mixed $documentos */
/** @var mixed $pageTitle */
/** @var mixed $proximos */
/** @var mixed $vencidos */
?>

<?php $pageTitle = $pageTitle ?? 'Gestión Documental'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-file-earmark-text-fill me-2"></i><?= $pageTitle ?></h4>
    <?php if (in_array($_SESSION['rol_id'], [ROLE_ADMIN, ROLE_PROFESOR])): ?>
        <a href="<?= BASE_URL ?>index.php?route=documentos/create" class="btn btn-primary">
            <i class="bi bi-upload me-1"></i>Subir Documento
        </a>
    <?php endif; ?>
</div>

<?php if (!empty($vencidos)): ?>
<div class="alert alert-danger">
    <i class="bi bi-exclamation-triangle-fill me-2"></i>
    <strong><?= count($vencidos) ?></strong> documento(s) vencido(s).
</div>
<?php endif; ?>

<?php if (!empty($proximos)): ?>
<div class="alert alert-warning">
    <i class="bi bi-clock-fill me-2"></i>
    <strong><?= count($proximos) ?></strong> documento(s) próximo(s) a vencer.
</div>
<?php endif; ?>

<!-- Filtros -->
<div class="card mb-4">
    <div class="card-body">
        <form method="GET" class="row g-2 align-items-end">
            <input type="hidden" name="route" value="documentos">
            <div class="col-md-5">
                <input type="text" class="form-control" name="q" placeholder="Buscar documentos..." value="<?= sanitize($busqueda ?? '') ?>">
            </div>
            <div class="col-md-3">
                <select class="form-select" name="categoria">
                    <option value="">Todas las categorías</option>
                    <?php foreach ($categorias as $cat): ?>
                        <option value="<?= sanitize($cat['categoria']) ?>" <?= ($categoria ?? '') === $cat['categoria'] ? 'selected' : '' ?>><?= sanitize($cat['categoria']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2">
                <button type="submit" class="btn btn-primary w-100"><i class="bi bi-search me-1"></i>Buscar</button>
            </div>
        </form>
    </div>
</div>

<!-- Tabla de documentos -->
<div class="card">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead>
                    <tr>
                        <th>Título</th>
                        <th>Categoría</th>
                        <th>Tipo</th>
                        <th>Asociado a</th>
                        <th>Subido por</th>
                        <th>Vencimiento</th>
                        <th>Estado</th>
                        <th width="120">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($documentos)): ?>
                        <tr><td colspan="8" class="text-center text-muted py-4"><i class="bi bi-inbox fs-1 d-block mb-2"></i>No hay documentos</td></tr>
                    <?php else: ?>
                        <?php foreach ($documentos as $d): ?>
                            <tr>
                                <td><strong><?= sanitize($d['titulo']) ?></strong><?php if ($d['descripcion']): ?><br><small class="text-muted"><?= sanitize(substr($d['descripcion'], 0, 60)) ?></small><?php endif; ?></td>
                                <td><span class="badge bg-secondary"><?= sanitize($d['categoria'] ?? 'Sin categoría') ?></span></td>
                                <td><small><?= $d['tipo'] ?></small></td>
                                <td><small><?= sanitize($d['persona_nombre'] ?? '-') ?></small></td>
                                <td><small><?= sanitize($d['subido_por']) ?></small></td>
                                <td><small><?= $d['fecha_vencimiento'] ? formatDate($d['fecha_vencimiento']) : '-' ?></small></td>
                                <td>
                                    <?php
                                    $badge = match($d['estado']) {
                                        'Vigente' => 'bg-success',
                                        'Vencido' => 'bg-danger',
                                        'Pendiente' => 'bg-warning text-dark',
                                        default => 'bg-secondary'
                                    };
                                    ?>
                                    <span class="badge <?= $badge ?>"><?= $d['estado'] ?></span>
                                </td>
                                <td>
                                    <div class="btn-group btn-group-sm">
                                        <?php if ($d['archivo']): ?>
                                            <a href="<?= BASE_URL ?>index.php?route=documentos/download/<?= $d['id'] ?>" class="btn btn-outline-success" title="Descargar"><i class="bi bi-download"></i></a>
                                        <?php endif; ?>
                                        <?php if ($_SESSION['rol_id'] === ROLE_ADMIN): ?>
                                            <form method="POST" action="<?= BASE_URL ?>index.php?route=documentos/delete/<?= $d['id'] ?>" class="d-inline" onsubmit="return confirm('¿Eliminar documento?')">
                                                <input type="hidden" name="csrf_token" value="<?= $this->generateCSRF() ?>">
                                                <button class="btn btn-outline-danger"><i class="bi bi-trash"></i></button>
                                            </form>
                                        <?php endif; ?>
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
