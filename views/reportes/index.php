<?php $pageTitle = $pageTitle ?? 'Reportes'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-bar-chart-line-fill me-2"></i><?= $pageTitle ?></h4>
</div>

<div class="row g-4">
    <div class="col-md-4">
        <a href="<?= BASE_URL ?>index.php?route=reportes/rendimiento" class="text-decoration-none">
            <div class="card h-100 border-0 shadow-sm">
                <div class="card-body text-center py-5">
                    <i class="bi bi-graph-up text-primary" style="font-size:3rem"></i>
                    <h5 class="mt-3 fw-bold">Rendimiento Académico</h5>
                    <p class="text-muted">Promedio general por alumno, grado y sección</p>
                </div>
            </div>
        </a>
    </div>
    <div class="col-md-4">
        <a href="<?= BASE_URL ?>index.php?route=reportes/asistencia" class="text-decoration-none">
            <div class="card h-100 border-0 shadow-sm">
                <div class="card-body text-center py-5">
                    <i class="bi bi-calendar-check text-success" style="font-size:3rem"></i>
                    <h5 class="mt-3 fw-bold">Reporte de Asistencia</h5>
                    <p class="text-muted">Porcentaje de asistencia por alumno</p>
                </div>
            </div>
        </a>
    </div>
    <div class="col-md-4">
        <a href="<?= BASE_URL ?>index.php?route=reportes/cursos" class="text-decoration-none">
            <div class="card h-100 border-0 shadow-sm">
                <div class="card-body text-center py-5">
                    <i class="bi bi-book text-warning" style="font-size:3rem"></i>
                    <h5 class="mt-3 fw-bold">Rendimiento por Curso</h5>
                    <p class="text-muted">Estadísticas de calificaciones por asignatura</p>
                </div>
            </div>
        </a>
    </div>
    <div class="col-md-4">
        <a href="<?= BASE_URL ?>index.php?route=reportes/alertas_reporte" class="text-decoration-none">
            <div class="card h-100 border-0 shadow-sm">
                <div class="card-body text-center py-5">
                    <i class="bi bi-exclamation-triangle text-danger" style="font-size:3rem"></i>
                    <h5 class="mt-3 fw-bold">Reporte de Alertas IA</h5>
                    <p class="text-muted">Distribución de riesgos y alumnos en riesgo</p>
                </div>
            </div>
        </a>
    </div>
</div>
