<?php $pageTitle = $pageTitle ?? 'Mis Compañeros'; ?>

<div class="mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-people me-2"></i><?= $pageTitle ?></h4>
    <small class="text-muted"><?= sanitize($alumno['grado'] ?? '') ?> - <?= sanitize($alumno['seccion'] ?? '') ?> | <?= count($companeros) ?> compañero(s)</small>
</div>

<div class="row g-3">
    <?php if (empty($companeros)): ?>
        <div class="col-12"><div class="card"><div class="card-body text-center py-5"><i class="bi bi-people fs-1 text-muted d-block mb-2"></i><h5 class="text-muted">No hay compañeros registrados</h5></div></div></div>
    <?php else: ?>
        <?php foreach ($companeros as $c): ?>
            <div class="col-md-4 col-lg-3">
                <div class="card text-center border-0 shadow-sm h-100">
                    <div class="card-body">
                        <div class="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-2" style="width:50px;height:50px;font-size:1.2rem">
                            <?= strtoupper(substr($c['nombre'], 0, 1)) ?>
                        </div>
                        <h6 class="card-title fw-bold mb-0"><?= sanitize($c['nombre_completo']) ?></h6>
                        <small class="text-muted"><?= sanitize($c['codigo'] ?? '') ?></small>
                    </div>
                </div>
            </div>
        <?php endforeach; ?>
    <?php endif; ?>
</div>
