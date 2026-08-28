<?php $pageTitle = $pageTitle ?? 'Subir Documento'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-upload me-2"></i><?= $pageTitle ?></h4>
    <a href="<?= BASE_URL ?>index.php?route=documentos" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Volver</a>
</div>

<form method="POST" action="<?= BASE_URL ?>index.php?route=documentos/store" enctype="multipart/form-data">
    <input type="hidden" name="csrf_token" value="<?= $this->generateCSRF() ?>">

    <div class="card mb-4">
        <div class="card-header fw-semibold"><i class="bi bi-file-earmark me-2"></i>Información del Documento</div>
        <div class="card-body">
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label">Título *</label>
                    <input type="text" class="form-control" name="titulo" required value="<?= sanitize($documento['titulo'] ?? '') ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Categoría *</label>
                    <input type="text" class="form-control" name="categoria" list="categorias" required placeholder="Ej: DNI, Certificado...">
                    <datalist id="categorias">
                        <?php foreach ($categorias as $cat): ?>
                            <option value="<?= sanitize($cat['categoria']) ?>">
                        <?php endforeach; ?>
                    </datalist>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Fecha de Vencimiento</label>
                    <input type="date" class="form-control" name="fecha_vencimiento">
                </div>
                <div class="col-md-12">
                    <label class="form-label">Descripción</label>
                    <textarea class="form-control" name="descripcion" rows="2"><?= sanitize($documento['descripcion'] ?? '') ?></textarea>
                </div>
                <div class="col-md-12">
                    <label class="form-label">Archivo *</label>
                    <input type="file" class="form-control" name="archivo" accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx">
                    <small class="text-muted">PDF, imágenes, Word, Excel. Máximo 5MB.</small>
                </div>
            </div>
        </div>
    </div>

    <div class="card mb-4">
        <div class="card-header fw-semibold"><i class="bi bi-person me-2"></i>Asociar a (opcional)</div>
        <div class="card-body">
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label">Alumno</label>
                    <select class="form-select" name="alumno_id">
                        <option value="">Sin asociar</option>
                        <?php foreach ($alumnos as $a): ?>
                            <option value="<?= $a['id'] ?>"><?= sanitize($a['apellido_paterno'] . ' ' . $a['nombre'] . ' - ' . $a['codigo']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Profesor</label>
                    <select class="form-select" name="profesor_id">
                        <option value="">Sin asociar</option>
                        <?php foreach ($profesores as $p): ?>
                            <option value="<?= $p['id'] ?>"><?= sanitize($p['apellido_paterno'] . ' ' . $p['nombre'] . ' - ' . $p['codigo']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>
        </div>
    </div>

    <div class="text-end">
        <a href="<?= BASE_URL ?>index.php?route=documentos" class="btn btn-secondary me-2">Cancelar</a>
        <button type="submit" class="btn btn-primary"><i class="bi bi-upload me-1"></i>Subir Documento</button>
    </div>
</form>
