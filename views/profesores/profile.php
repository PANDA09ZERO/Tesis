<?php
/** @var mixed $ca */
/** @var mixed $cursosAsignados */
/** @var mixed $h */
/** @var mixed $horarios */
/** @var mixed $pageTitle */
/** @var mixed $profesor */
?>

<?php $pageTitle = $pageTitle ?? 'Perfil del Profesor'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-person-workspace me-2"></i><?= $pageTitle ?></h4>
    <a href="<?= BASE_URL ?>index.php?route=profesores" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Volver</a>
</div>

<div class="row g-4">
    <div class="col-md-4">
        <div class="card">
            <div class="card-header fw-semibold"><i class="bi bi-person me-2"></i>Datos Personales</div>
            <div class="card-body">
                <table class="table table-sm mb-0">
                    <tr><td class="fw-semibold">Código</td><td><?= sanitize($profesor['codigo'] ?? 'N/A') ?></td></tr>
                    <tr><td class="fw-semibold">DNI</td><td><?= sanitize($profesor['dni']) ?></td></tr>
                    <tr><td class="fw-semibold">Nombre</td><td><?= sanitize($profesor['nombre_completo']) ?></td></tr>
                    <tr><td class="fw-semibold">Nacimiento</td><td><?= formatDate($profesor['fecha_nacimiento']) ?></td></tr>
                    <tr><td class="fw-semibold">Especialidad</td><td><?= sanitize($profesor['especialidad'] ?? '-') ?></td></tr>
                    <tr><td class="fw-semibold">Teléfono</td><td><?= sanitize($profesor['telefono'] ?? '-') ?></td></tr>
                    <tr><td class="fw-semibold">Email</td><td><?= sanitize($profesor['email'] ?? '-') ?></td></tr>
                </table>
            </div>
        </div>
    </div>
    <div class="col-md-8">
        <div class="card mb-4">
            <div class="card-header fw-semibold"><i class="bi bi-book me-2"></i>Cursos Asignados</div>
            <div class="card-body p-0">
                <table class="table table-hover mb-0">
                    <thead><tr><th>Curso</th><th>Grado</th><th>Sección</th></tr></thead>
                    <tbody>
                        <?php if (empty($cursosAsignados)): ?>
                            <tr><td colspan="3" class="text-center text-muted py-3">Sin cursos asignados</td></tr>
                        <?php else: ?>
                            <?php foreach ($cursosAsignados as $ca): ?>
                                <tr>
                                    <td><strong><?= sanitize($ca['curso_nombre']) ?></strong></td>
                                    <td><?= sanitize($ca['grado']) ?></td>
                                    <td><?= sanitize($ca['seccion']) ?></td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="card">
            <div class="card-header fw-semibold"><i class="bi bi-clock me-2"></i>Horarios</div>
            <div class="card-body p-0">
                <table class="table table-hover mb-0">
                    <thead><tr><th>Día</th><th>Curso</th><th>Grado-Sección</th><th>Horario</th></tr></thead>
                    <tbody>
                        <?php if (empty($horarios)): ?>
                            <tr><td colspan="4" class="text-center text-muted py-3">Sin horarios</td></tr>
                        <?php else: ?>
                            <?php foreach ($horarios as $h): ?>
                                <tr>
                                    <td><?= sanitize($h['dia']) ?></td>
                                    <td><?= sanitize($h['curso_nombre']) ?></td>
                                    <td><?= sanitize($h['grado'] . ' - ' . $h['seccion']) ?></td>
                                    <td><?= substr($h['hora_inicio'], 0, 5) . ' - ' . substr($h['hora_fin'], 0, 5) ?></td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
