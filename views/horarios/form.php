<?php
$pageTitle = $pageTitle ?? ($horario ? 'Editar Horario' : 'Nuevo Horario');
$isEdit = !empty($horario);
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-clock me-2"></i><?= $pageTitle ?></h4>
    <a href="<?= BASE_URL ?>index.php?route=horarios" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Volver</a>
</div>

<form method="POST" action="<?= BASE_URL ?>index.php?route=<?= $isEdit ? 'horarios/update/' . $horario['id'] : 'horarios/store' ?>">
    <input type="hidden" name="csrf_token" value="<?= $this->generateCSRF() ?>">

    <div class="card mb-4">
        <div class="card-body">
            <div class="row g-3">
                <div class="col-md-4">
                    <label class="form-label">Curso *</label>
                    <select class="form-select" name="curso_id" required>
                        <option value="">Seleccionar...</option>
                        <?php foreach ($cursos as $c): ?>
                            <option value="<?= $c['id'] ?>" <?= ($horario['curso_id'] ?? '') == $c['id'] ? 'selected' : '' ?>><?= sanitize($c['nombre']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Profesor *</label>
                    <select class="form-select" name="profesor_id" required>
                        <option value="">Seleccionar...</option>
                        <?php foreach ($profesores as $p): ?>
                            <option value="<?= $p['id'] ?>" <?= ($horario['profesor_id'] ?? '') == $p['id'] ? 'selected' : '' ?>><?= sanitize($p['nombre_completo']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Periodo *</label>
                    <select class="form-select" name="periodo_id" required>
                        <option value="">Seleccionar...</option>
                        <?php foreach ($periodos as $p): ?>
                            <option value="<?= $p['id'] ?>" <?= ($horario['periodo_id'] ?? '') == $p['id'] ? 'selected' : '' ?>><?= sanitize($p['nombre']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Grado *</label>
                    <select class="form-select" name="grado_id" required>
                        <option value="">Seleccionar...</option>
                        <?php foreach ($grados as $g): ?>
                            <option value="<?= $g['id'] ?>" <?= ($horario['grado_id'] ?? '') == $g['id'] ? 'selected' : '' ?>><?= sanitize($g['nombre']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Sección *</label>
                    <select class="form-select" name="seccion_id" required>
                        <option value="">Seleccionar...</option>
                        <?php foreach ($secciones as $s): ?>
                            <option value="<?= $s['id'] ?>" <?= ($horario['seccion_id'] ?? '') == $s['id'] ? 'selected' : '' ?>><?= sanitize($s['nombre']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Día *</label>
                    <select class="form-select" name="dia" required>
                        <option value="">Seleccionar...</option>
                        <?php foreach (['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'] as $d): ?>
                            <option value="<?= $d ?>" <?= ($horario['dia'] ?? '') === $d ? 'selected' : '' ?>><?= $d ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Aula</label>
                    <input type="text" class="form-control" name="aula" value="<?= sanitize($horario['aula'] ?? '') ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Hora Inicio *</label>
                    <input type="time" class="form-control" name="hora_inicio" required value="<?= substr($horario['hora_inicio'] ?? '', 0, 5) ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Hora Fin *</label>
                    <input type="time" class="form-control" name="hora_fin" required value="<?= substr($horario['hora_fin'] ?? '', 0, 5) ?>">
                </div>
            </div>
        </div>
    </div>

    <div class="text-end">
        <a href="<?= BASE_URL ?>index.php?route=horarios" class="btn btn-secondary me-2">Cancelar</a>
        <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg me-1"></i><?= $isEdit ? 'Actualizar' : 'Registrar' ?></button>
    </div>
</form>
