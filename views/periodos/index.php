<?php $pageTitle = $pageTitle ?? 'Periodos Académicos'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-calendar3 me-2"></i>Periodos Académicos</h4>
    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#periodoModal" onclick="resetForm()">
        <i class="bi bi-plus-lg me-1"></i>Nuevo Periodo
    </button>
</div>

<div class="card">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead><tr><th>Nombre</th><th>Fecha Inicio</th><th>Fecha Fin</th><th>Estado</th><th width="120">Acciones</th></tr></thead>
                <tbody>
                    <?php if (empty($periodos)): ?>
                        <tr><td colspan="5" class="text-center text-muted py-4"><i class="bi bi-inbox fs-1 d-block mb-2"></i>No hay periodos</td></tr>
                    <?php else: ?>
                        <?php foreach ($periodos as $p): ?>
                            <tr>
                                <td><strong><?= sanitize($p['nombre']) ?></strong></td>
                                <td><?= formatDate($p['fecha_inicio']) ?></td>
                                <td><?= formatDate($p['fecha_fin']) ?></td>
                                <td><span class="badge <?= $p['estado'] ? 'bg-success' : 'bg-secondary' ?>"><?= $p['estado'] ? 'Activo' : 'Inactivo' ?></span></td>
                                <td>
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-warning" data-bs-toggle="modal" data-bs-target="#periodoModal" onclick="editPeriodo(<?= $p['id'] ?>, '<?= sanitize($p['nombre']) ?>', '<?= $p['fecha_inicio'] ?>', '<?= $p['fecha_fin'] ?>', <?= $p['estado'] ?>)"><i class="bi bi-pencil"></i></button>
                                        <form method="POST" action="<?= BASE_URL ?>index.php?route=periodos/delete/<?= $p['id'] ?>" class="d-inline" onsubmit="return confirm('¿Eliminar?')">
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

<!-- Modal Periodo -->
<div class="modal fade" id="periodoModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <form id="periodoForm" method="POST">
                <input type="hidden" name="csrf_token" value="<?= $this->generateCSRF() ?>">
                <input type="hidden" name="route" value="periodos/store" id="periodoRoute">
                <div class="modal-header">
                    <h5 class="modal-title" id="periodoModalLabel">Nuevo Periodo</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">Nombre *</label>
                        <input type="text" class="form-control" name="nombre" id="periodoNombre" required>
                    </div>
                    <div class="row">
                        <div class="col-6 mb-3">
                            <label class="form-label">Fecha Inicio *</label>
                            <input type="date" class="form-control" name="fecha_inicio" id="periodoInicio" required>
                        </div>
                        <div class="col-6 mb-3">
                            <label class="form-label">Fecha Fin *</label>
                            <input type="date" class="form-control" name="fecha_fin" id="periodoFin" required>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Estado</label>
                        <select class="form-select" name="estado" id="periodoEstado">
                            <option value="1">Activo</option>
                            <option value="0">Inactivo</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg me-1"></i>Guardar</button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
function resetForm() {
    document.getElementById('periodoForm').reset();
    document.getElementById('periodoForm').action = '<?= BASE_URL ?>index.php?route=periodos/store';
    document.getElementById('periodoModalLabel').textContent = 'Nuevo Periodo';
}
function editPeriodo(id, nombre, inicio, fin, estado) {
    document.getElementById('periodoForm').action = '<?= BASE_URL ?>index.php?route=periodos/update/' + id;
    document.getElementById('periodoNombre').value = nombre;
    document.getElementById('periodoInicio').value = inicio;
    document.getElementById('periodoFin').value = fin;
    document.getElementById('periodoEstado').value = estado;
    document.getElementById('periodoModalLabel').textContent = 'Editar Periodo';
}
</script>
