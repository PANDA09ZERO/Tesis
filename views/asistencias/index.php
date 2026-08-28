<?php $pageTitle = $pageTitle ?? 'Asistencias'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-calendar-check me-2"></i>Gestión de Asistencias</h4>
</div>

<div class="card">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead>
                    <tr>
                        <th>Día</th>
                        <th>Curso</th>
                        <th>Grado-Sección</th>
                        <th>Horario</th>
                        <?php if ($_SESSION['rol_id'] === ROLE_ADMIN): ?>
                            <th>Profesor</th>
                        <?php endif; ?>
                        <th width="120">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($horarios)): ?>
                        <tr><td colspan="6" class="text-center text-muted py-4"><i class="bi bi-inbox fs-1 d-block mb-2"></i>No hay horarios registrados</td></tr>
                    <?php else: ?>
                        <?php foreach ($horarios as $h): ?>
                            <tr>
                                <td><span class="badge bg-primary"><?= sanitize($h['dia']) ?></span></td>
                                <td><strong><?= sanitize($h['curso_nombre']) ?></strong></td>
                                <td><?= sanitize($h['grado'] . ' - ' . $h['seccion']) ?></td>
                                <td><small class="text-muted"><?= substr($h['hora_inicio'], 0, 5) . ' - ' . substr($h['hora_fin'], 0, 5) ?></small></td>
                                <?php if ($_SESSION['rol_id'] === ROLE_ADMIN): ?>
                                    <td><?= sanitize($h['profesor_nombre'] ?? '-') ?></td>
                                <?php endif; ?>
                                <td>
                                    <a href="<?= BASE_URL ?>index.php?route=asistencias/registrar/<?= $h['id'] ?>" class="btn btn-sm btn-outline-primary">
                                        <i class="bi bi-pencil-square me-1"></i>Registrar
                                    </a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
