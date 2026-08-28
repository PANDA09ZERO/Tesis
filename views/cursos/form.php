<?php
$pageTitle = $pageTitle ?? ($curso ? 'Editar Curso' : 'Registrar Curso');
$isEdit = !empty($curso);
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-book me-2"></i><?= $pageTitle ?></h4>
    <a href="<?= BASE_URL ?>index.php?route=cursos" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Volver</a>
</div>

<form method="POST" action="<?= BASE_URL ?>index.php?route=<?= $isEdit ? 'cursos/update/' . $curso['id'] : 'cursos/store' ?>">
    <input type="hidden" name="csrf_token" value="<?= $this->generateCSRF() ?>">

    <div class="card mb-4">
        <div class="card-body">
            <div class="row g-3">
                <div class="col-md-3"><label class="form-label">Código *</label><input type="text" class="form-control" name="codigo" required value="<?= sanitize($curso['codigo'] ?? '') ?>"></div>
                <div class="col-md-4"><label class="form-label">Nombre *</label><input type="text" class="form-control" name="nombre" required value="<?= sanitize($curso['nombre'] ?? '') ?>"></div>
                <div class="col-md-3"><label class="form-label">Área</label><select class="form-select" name="area"><option value="">Seleccionar...</option><?php foreach (['Básico','Alternativo','Especializado'] as $a): ?><option value="<?= $a ?>" <?= ($curso['area'] ?? '') === $a ? 'selected' : '' ?>><?= $a ?></option><?php endforeach; ?></select></div>
                <div class="col-md-2"><label class="form-label">Horas/Sem</label><input type="number" class="form-control" name="horas_semanales" min="1" value="<?= $curso['horas_semanales'] ?? 1 ?>"></div>
                <div class="col-md-12"><label class="form-label">Descripción</label><textarea class="form-control" name="descripcion" rows="2"><?= sanitize($curso['descripcion'] ?? '') ?></textarea></div>
            </div>
        </div>
    </div>

    <div class="card mb-4">
        <div class="card-header fw-semibold"><i class="bi bi-mortarboard me-2"></i>Grados Aplicables</div>
        <div class="card-body">
            <div class="row">
                <?php
                $cursoGradoIds = [];
                if ($isEdit && isset($cursoGrados)) {
                    foreach ($cursoGrados as $cg) $cursoGradoIds[] = $cg['id'];
                }
                ?>
                <?php foreach ($grados as $g): ?>
                    <div class="col-md-3 col-6">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="grados[]" value="<?= $g['id'] ?>" id="grado<?= $g['id'] ?>" <?= in_array($g['id'], $cursoGradoIds) ? 'checked' : '' ?>>
                            <label class="form-check-label" for="grado<?= $g['id'] ?>"><?= sanitize($g['nombre']) ?></label>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
    </div>

    <div class="text-end">
        <a href="<?= BASE_URL ?>index.php?route=cursos" class="btn btn-secondary me-2">Cancelar</a>
        <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg me-1"></i><?= $isEdit ? 'Actualizar' : 'Registrar' ?></button>
    </div>
</form>
