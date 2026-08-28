<?php $pageTitle = $pageTitle ?? 'Generar Alertas IA'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-cpu me-2"></i><?= $pageTitle ?></h4>
    <a href="<?= BASE_URL ?>index.php?route=alertas" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Volver</a>
</div>

<div class="card">
    <div class="card-body">
        <div class="alert alert-info">
            <i class="bi bi-info-circle me-2"></i>
            El sistema analizará las calificaciones, asistencia y desempeño de todos los alumnos matriculados en el periodo seleccionado para generar alertas de riesgo académico.
        </div>

        <form method="POST" action="<?= BASE_URL ?>index.php?route=alertas/generar">
            <input type="hidden" name="csrf_token" value="<?= $this->generateCSRF() ?>">

            <div class="row g-3 mb-4">
                <div class="col-md-6">
                    <label class="form-label">Periodo Académico *</label>
                    <select class="form-select" name="periodo_id" required>
                        <option value="">Seleccionar periodo...</option>
                        <?php foreach ($periodos as $p): ?>
                            <option value="<?= $p['id'] ?>"><?= sanitize($p['nombre']) ?> (<?= formatDate($p['fecha_inicio']) ?> - <?= formatDate($p['fecha_fin']) ?>)</option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>

            <div class="card bg-light mb-4">
                <div class="card-body">
                    <h6 class="card-title fw-bold"><i class="bi bi-gear me-2"></i>Variables del Modelo IA</h6>
                    <div class="row">
                        <div class="col-md-4">
                            <ul class="list-unstyled mb-0">
                                <li><i class="bi bi-check text-success me-2"></i>Promedio general</li>
                                <li><i class="bi bi-check text-success me-2"></i>Cursos desaprobados</li>
                            </ul>
                        </div>
                        <div class="col-md-4">
                            <ul class="list-unstyled mb-0">
                                <li><i class="bi bi-check text-success me-2"></i>% de inasistencias</li>
                                <li><i class="bi bi-check text-success me-2"></i>Número de tardanzas</li>
                            </ul>
                        </div>
                        <div class="col-md-4">
                            <ul class="list-unstyled mb-0">
                                <li><i class="bi bi-check text-success me-2"></i>Evolución del rendimiento</li>
                                <li><i class="bi bi-check text-success me-2"></i>Conducta</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <div class="text-center">
                <button type="submit" class="btn btn-primary btn-lg" onclick="return confirm('¿Ejecutar análisis de riesgo académico?')">
                    <i class="bi bi-cpu me-2"></i>Ejecutar Análisis IA
                </button>
            </div>
        </form>
    </div>
</div>
