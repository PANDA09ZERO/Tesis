<?php $pageTitle = $pageTitle ?? 'Horarios'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-clock-fill me-2"></i>Gestión de Horarios</h4>
    <div>
        <a href="<?= BASE_URL ?>index.php?route=horarios/grilla" class="btn btn-outline-primary me-2">
            <i class="bi bi-grid me-1"></i>Ver Grilla
        </a>
        <a href="<?= BASE_URL ?>index.php?route=horarios/create" class="btn btn-primary">
            <i class="bi bi-plus-lg me-1"></i>Nuevo Horario
        </a>
    </div>
</div>

<!-- Filtros -->
<div class="card mb-4">
    <div class="card-body">
        <form method="GET" class="row g-2 align-items-end">
            <input type="hidden" name="route" value="horarios">
            <div class="col-md-4">
                <label class="form-label">Periodo</label>
                <select class="form-select" name="periodo_id">
                    <option value="">Todos los periodos</option>
                    <?php foreach ($periodos as $p): ?>
                        <option value="<?= $p['id'] ?>" <?= $periodoId == $p['id'] ? 'selected' : '' ?>><?= sanitize($p['nombre']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2">
                <button type="submit" class="btn btn-primary w-100"><i class="bi bi-funnel me-1"></i>Filtrar</button>
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
                        <th>Día</th>
                        <th>Curso</th>
                        <th>Profesor</th>
                        <th>Grado-Sección</th>
                        <th>Horario</th>
                        <th>Aula</th>
                        <th width="120">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($horarios)): ?>
                        <tr><td colspan="7" class="text-center text-muted py-4"><i class="bi bi-inbox fs-1 d-block mb-2"></i>No hay horarios</td></tr>
                    <?php else: ?>
                        <?php foreach ($horarios as $h): ?>
                            <tr>
                                <td><span class="badge bg-primary"><?= sanitize($h['dia']) ?></span></td>
                                <td><strong><?= sanitize($h['curso_nombre']) ?></strong></td>
                                <td><?= sanitize($h['profesor_nombre']) ?></td>
                                <td><?= sanitize($h['grado'] . ' - ' . $h['seccion']) ?></td>
                                <td><?= substr($h['hora_inicio'], 0, 5) . ' - ' . substr($h['hora_fin'], 0, 5) ?></td>
                                <td><?= sanitize($h['aula'] ?? '-') ?></td>
                                <td>
                                    <div class="btn-group btn-group-sm">
                                        <a href="<?= BASE_URL ?>index.php?route=horarios/edit/<?= $h['id'] ?>" class="btn btn-outline-warning"><i class="bi bi-pencil"></i></a>
                                        <form method="POST" action="<?= BASE_URL ?>index.php?route=horarios/delete/<?= $h['id'] ?>" class="d-inline" onsubmit="return confirm('¿Eliminar?')">
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
