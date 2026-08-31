<?php
/** @var mixed $alumno */
/** @var mixed $ap */
/** @var mixed $apoderados */
/** @var mixed $asi */
/** @var mixed $asistencias */
/** @var mixed $badgeClass */
/** @var mixed $cal */
/** @var mixed $calificaciones */
/** @var mixed $doc */
/** @var mixed $documentos */
/** @var mixed $pageTitle */
?>

<?php $pageTitle = $pageTitle ?? 'Expediente del Alumno'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0">
        <i class="bi bi-person-lines-fill me-2"></i><?= $pageTitle ?>
    </h4>
    <div>
        <a href="<?= BASE_URL ?>index.php?route=alumnos/edit/<?= $alumno['id'] ?>" class="btn btn-warning me-2">
            <i class="bi bi-pencil me-1"></i>Editar
        </a>
        <a href="<?= BASE_URL ?>index.php?route=alumnos" class="btn btn-outline-secondary">
            <i class="bi bi-arrow-left me-1"></i>Volver
        </a>
    </div>
</div>

<div class="row g-4">
    <!-- Datos del alumno -->
    <div class="col-md-4">
        <div class="card">
            <div class="card-header fw-semibold"><i class="bi bi-person me-2"></i>Datos Personales</div>
            <div class="card-body">
                <table class="table table-sm mb-0">
                    <tr><td class="fw-semibold">Código</td><td><?= sanitize($alumno['codigo'] ?? 'N/A') ?></td></tr>
                    <tr><td class="fw-semibold">DNI</td><td><?= sanitize($alumno['dni']) ?></td></tr>
                    <tr><td class="fw-semibold">Nombre</td><td><?= sanitize($alumno['nombre_completo']) ?></td></tr>
                    <tr><td class="fw-semibold">Nacimiento</td><td><?= formatDate($alumno['fecha_nacimiento']) ?></td></tr>
                    <tr><td class="fw-semibold">Sexo</td><td><?= $alumno['sexo'] === 'M' ? 'Masculino' : 'Femenino' ?></td></tr>
                    <tr><td class="fw-semibold">Grado</td><td><?= sanitize($alumno['grado'] ?? 'No matriculado') ?></td></tr>
                    <tr><td class="fw-semibold">Sección</td><td><?= sanitize($alumno['seccion'] ?? '-') ?></td></tr>
                </table>
            </div>
        </div>

        <!-- Apoderados -->
        <div class="card mt-4">
            <div class="card-header fw-semibold"><i class="bi bi-person-hearts me-2"></i>Apoderados</div>
            <div class="card-body">
                <?php if (empty($apoderados)): ?>
                    <p class="text-muted mb-0">Sin apoderados registrados</p>
                <?php else: ?>
                    <?php foreach ($apoderados as $ap): ?>
                        <div class="mb-2">
                            <strong><?= sanitize($ap['nombre_completo']) ?></strong>
                            <br><small class="text-muted"><?= sanitize($ap['parentesco'] ?? '') ?> · <?= sanitize($ap['telefono'] ?? '') ?></small>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>

        <!-- Documentos -->
        <div class="card mt-4">
            <div class="card-header fw-semibold"><i class="bi bi-file-earmark me-2"></i>Documentos</div>
            <div class="card-body">
                <?php if (empty($documentos)): ?>
                    <p class="text-muted mb-0">Sin documentos</p>
                <?php else: ?>
                    <?php foreach ($documentos as $doc): ?>
                        <div class="d-flex align-items-center mb-2">
                            <i class="bi bi-file-earmark-text text-primary me-2"></i>
                            <div>
                                <small class="fw-semibold"><?= sanitize($doc['titulo']) ?></small><br>
                                <small class="text-muted"><?= formatDate($doc['created_at']) ?></small>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- Calificaciones y Asistencia -->
    <div class="col-md-8">
        <div class="card mb-4">
            <div class="card-header fw-semibold"><i class="bi bi-journal-text me-2"></i>Calificaciones</div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead>
                            <tr>
                                <th>Periodo</th>
                                <th>Curso</th>
                                <th>Nota</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($calificaciones)): ?>
                                <tr><td colspan="4" class="text-center text-muted py-3">Sin calificaciones registradas</td></tr>
                            <?php else: ?>
                                <?php foreach ($calificaciones as $cal): ?>
                                    <tr>
                                        <td><?= sanitize($cal['periodo_nombre']) ?></td>
                                        <td><?= sanitize($cal['curso_nombre']) ?></td>
                                        <td><strong><?= number_format($cal['nota'], 1) ?></strong></td>
                                        <td>
                                            <span class="badge <?= $cal['nota'] >= 11 ? 'bg-success' : 'bg-danger' ?>">
                                                <?= $cal['nota'] >= 11 ? 'Aprobado' : 'Desaprobado' ?>
                                            </span>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header fw-semibold"><i class="bi bi-calendar-check me-2"></i>Asistencias Recientes</div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Curso</th>
                                <th>Día</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($asistencias)): ?>
                                <tr><td colspan="4" class="text-center text-muted py-3">Sin registros de asistencia</td></tr>
                            <?php else: ?>
                                <?php foreach (array_slice($asistencias, 0, 20) as $asi): ?>
                                    <tr>
                                        <td><?= formatDate($asi['fecha']) ?></td>
                                        <td><?= sanitize($asi['curso_nombre']) ?></td>
                                        <td><?= sanitize($asi['dia']) ?></td>
                                        <td>
                                            <?php
                                            $badgeClass = match($asi['estado']) {
                                                'Presente' => 'bg-success',
                                                'Ausente' => 'bg-danger',
                                                'Tardanza' => 'bg-warning text-dark',
                                                'Justificado' => 'bg-info',
                                                default => 'bg-secondary'
                                            };
                                            ?>
                                            <span class="badge <?= $badgeClass ?>"><?= $asi['estado'] ?></span>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>
