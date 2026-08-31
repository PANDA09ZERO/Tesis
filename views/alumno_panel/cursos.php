<?php
/** @var mixed $alumno */
/** @var mixed $c */
/** @var mixed $cid */
/** @var mixed $circ */
/** @var mixed $cursos */
/** @var mixed $offset */
/** @var mixed $pageTitle */
/** @var mixed $pct */
/** @var mixed $prom */
/** @var mixed $promedios */
/** @var mixed $ultima */
/** @var mixed $ultimasCal */
?>

<?php $pageTitle = $pageTitle ?? 'Mis Cursos'; ?>
<style>
    .course-card {
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        background: #fff;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        height: 100%;
    }
    .course-card .accent-bar {
        height: 4px;
        background: #00BCD4;
    }
    .course-card .card-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 16px 8px 16px;
    }
    .course-card .card-head .info .code {
        font-size: 11px;
        color: #9e9e9e;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 2px;
    }
    .course-card .card-head .info .title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin: 0;
        line-height: 1.3;
    }
    .course-card .card-head .indicators {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
        margin-left: 12px;
    }
    .progress-ring {
        width: 36px;
        height: 36px;
        position: relative;
    }
    .progress-ring svg {
        transform: rotate(-90deg);
    }
    .progress-ring .track {
        fill: none;
        stroke: #e0e0e0;
        stroke-width: 3;
    }
    .progress-ring .fill {
        fill: none;
        stroke: #00BCD4;
        stroke-width: 3;
        stroke-linecap: round;
        transition: stroke-dashoffset 0.4s ease;
    }
    .progress-ring .pct {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        font-weight: 600;
        color: #666;
    }
    .grade-badge {
        font-size: 11px;
        font-weight: 600;
        padding: 2px 10px;
        border-radius: 20px;
        border: 1px solid #e0e0e0;
        color: #999;
        background: #fafafa;
        white-space: nowrap;
    }
    .grade-badge.has-grade {
        color: #00897B;
        border-color: #00897B;
        background: #e0f2f1;
    }
    .course-card .empty-state {
        background: repeating-linear-gradient(
            135deg,
            #fafafa,
            #fafafa 10px,
            #f5f5f5 10px,
            #f5f5f5 20px
        );
        padding: 24px 16px;
        text-align: center;
        flex: 1;
    }
    .course-card .empty-state p {
        font-size: 13px;
        color: #9e9e9e;
        margin: 0;
    }
    .course-card .schedule-row {
        padding: 10px 16px;
        border-top: 1px solid #f0f0f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: #757575;
    }
    .course-card .schedule-row i {
        margin-right: 4px;
    }
</style>

<div class="mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-book me-2"></i><?= $pageTitle ?></h4>
    <small class="text-muted"><?= sanitize($alumno['grado'] ?? '') ?> - <?= sanitize($alumno['seccion'] ?? '') ?></small>
</div>

<?php if (empty($cursos)): ?>
<div class="card"><div class="card-body text-center py-5"><i class="bi bi-inbox fs-1 text-muted d-block mb-2"></i><h5 class="text-muted">No tienes cursos asignados</h5></div></div>
<?php else: ?>
<div class="row g-3">
    <?php foreach ($cursos as $c):
        $cid = $c['id'];
        $prom = $promedios[$cid] ?? null;
        $ultima = $ultimasCal[$cid] ?? null;
        $pct = $prom !== null ? min(100, round($prom * 10)) : 0;
        $circ = 2 * M_PI * 14;
        $offset = $circ - ($circ * $pct / 100);
    ?>
    <div class="col-md-6 col-lg-4">
        <div class="course-card">
            <div class="accent-bar"></div>
            <div class="card-head">
                <div class="info">
                    <div class="code"><?= sanitize($c['codigo'] ?? 'NRC-' . $cid) ?></div>
                    <p class="title"><?= sanitize($c['nombre']) ?></p>
                </div>
                <div class="indicators">
                    <div class="progress-ring">
                        <svg width="36" height="36" viewBox="0 0 36 36">
                            <circle class="track" cx="18" cy="18" r="14"/>
                            <circle class="fill" cx="18" cy="18" r="14"
                                stroke-dasharray="<?= $circ ?>"
                                stroke-dashoffset="<?= $offset ?>"/>
                        </svg>
                        <div class="pct"><?= $prom !== null ? $pct . '%' : '--' ?></div>
                    </div>
                    <span class="grade-badge <?= $ultima !== null ? 'has-grade' : '' ?>">
                        <?= $ultima !== null ? number_format($ultima, 1) : '--' ?>
                    </span>
                </div>
            </div>
            <div class="empty-state">
                <p>Su trabajo calificado recientemente aparecerá aquí</p>
            </div>
            <div class="schedule-row">
                <span><i class="bi bi-calendar3"></i><?= sanitize($c['dia']) ?></span>
                <span><i class="bi bi-clock"></i><?= substr($c['hora_inicio'], 0, 5) ?> - <?= substr($c['hora_fin'], 0, 5) ?></span>
                <span><i class="bi bi-geo-alt"></i><?= sanitize($c['aula'] ?? '-') ?></span>
            </div>
        </div>
    </div>
    <?php endforeach; ?>
</div>
<?php endif; ?>
