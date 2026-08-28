<?php $pageTitle = $pageTitle ?? 'Grilla de Horarios'; ?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-grid me-2"></i><?= $pageTitle ?></h4>
    <a href="<?= BASE_URL ?>index.php?route=horarios" class="btn btn-outline-secondary"><i class="bi bi-arrow-left me-1"></i>Volver</a>
</div>

<!-- Filtros -->
<div class="card mb-4">
    <div class="card-body">
        <form method="GET" class="row g-2 align-items-end">
            <input type="hidden" name="route" value="horarios/grilla">
            <div class="col-md-4">
                <label class="form-label">Periodo</label>
                <select class="form-select" name="periodo_id">
                    <option value="">Todos</option>
                    <?php foreach ($periodos as $p): ?>
                        <option value="<?= $p['id'] ?>" <?= $periodoId == $p['id'] ? 'selected' : '' ?>><?= sanitize($p['nombre']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2"><button type="submit" class="btn btn-primary w-100"><i class="bi bi-funnel me-1"></i>Filtrar</button></div>
        </form>
    </div>
</div>

<div class="card">
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-bordered mb-0 text-center">
                <thead class="table-dark">
                    <tr>
                        <th>Hora</th>
                        <?php foreach (['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'] as $d): ?>
                            <th><?= $d ?></th>
                        <?php endforeach; ?>
                    </tr>
                </thead>
                <tbody>
                    <?php
                    $horas = [];
                    foreach ($grilla as $dia => $items) {
                        foreach ($items as $item) {
                            $h = substr($item['hora_inicio'], 0, 5);
                            if (!in_array($h, $horas)) $horas[] = $h;
                        }
                    }
                    sort($horas);
                    if (empty($horas)) $horas = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'];
                    ?>
                    <?php foreach ($horas as $hora): ?>
                        <tr>
                            <td class="fw-semibold bg-light"><?= $hora ?></td>
                            <?php foreach (['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'] as $dia): ?>
                                <td>
                                    <?php
                                    $encontrado = false;
                                    if (isset($grilla[$dia])) {
                                        foreach ($grilla[$dia] as $item) {
                                            if (substr($item['hora_inicio'], 0, 5) === $hora) {
                                                echo '<div class="p-1">';
                                                echo '<strong class="text-primary">' . sanitize($item['curso_nombre']) . '</strong><br>';
                                                echo '<small class="text-muted">' . sanitize($item['grado'] . '-' . $item['seccion']) . '</small><br>';
                                                echo '<small>' . sanitize($item['profesor_nombre']) . '</small>';
                                                echo '</div>';
                                                $encontrado = true;
                                            }
                                        }
                                    }
                                    if (!$encontrado) echo '<span class="text-muted">-</span>';
                                    ?>
                                </td>
                            <?php endforeach; ?>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
