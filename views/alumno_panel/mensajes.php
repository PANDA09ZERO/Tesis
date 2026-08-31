<?php
/** @var mixed $d */
/** @var mixed $docentes */
/** @var mixed $enviados */
/** @var mixed $m */
/** @var mixed $noLeidos */
/** @var mixed $pageTitle */
/** @var mixed $recibidos */
?>

<?php $pageTitle = $pageTitle ?? 'Mis Mensajes'; ?>

<div class="mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-envelope me-2"></i><?= $pageTitle ?>
        <?php if ($noLeidos > 0): ?><span class="badge bg-danger ms-2"><?= $noLeidos ?></span><?php endif; ?>
    </h4>
</div>

<div class="row g-4">
    <!-- Enviar mensaje -->
    <div class="col-md-4">
        <div class="card">
            <div class="card-header fw-semibold"><i class="bi bi-pencil me-2"></i>Enviar Mensaje</div>
            <div class="card-body">
                <form method="POST">
                    <input type="hidden" name="csrf_token" value="<?= $this->generateCSRF() ?>">
                    <input type="hidden" name="accion" value="enviar">
                    <div class="mb-3">
                        <label class="form-label">Para:</label>
                        <select class="form-select" name="receptor_id" required>
                            <option value="">Seleccionar docente...</option>
                            <?php foreach ($docentes as $d): ?>
                                <option value="<?= $d['id'] ?>"><?= sanitize(($d['apellido_paterno'] ?? '') . ' ' . ($d['nombre'] ?? $d['username'])) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Asunto:</label>
                        <input type="text" class="form-control" name="asunto" required placeholder="Asunto del mensaje">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Mensaje:</label>
                        <textarea class="form-control" name="mensaje" rows="4" required placeholder="Escribe tu mensaje..."></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary w-100"><i class="bi bi-send me-1"></i>Enviar</button>
                </form>
            </div>
        </div>
    </div>

    <!-- Bandeja -->
    <div class="col-md-8">
        <ul class="nav nav-tabs mb-3">
            <li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#recibidos">Recibidos <span class="badge bg-primary"><?= count($recibidos) ?></span></a></li>
            <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#enviados">Enviados</a></li>
        </ul>

        <div class="tab-content">
            <div class="tab-pane fade show active" id="recibidos">
                <?php if (empty($recibidos)): ?>
                    <p class="text-center text-muted py-4">No tienes mensajes recibidos</p>
                <?php else: ?>
                    <?php foreach ($recibidos as $m): ?>
                        <div class="card mb-2 <?= !$m['leido'] ? 'border-primary' : '' ?>">
                            <div class="card-body py-2 px-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <strong class="<?= !$m['leido'] ? 'text-primary' : '' ?>"><?= sanitize($m['emisor_nombre']) ?></strong>
                                        <span class="mx-2">·</span>
                                        <span class="fw-semibold"><?= sanitize($m['asunto']) ?></span>
                                        <?php if (!$m['leido']): ?><span class="badge bg-primary ms-1">Nuevo</span><?php endif; ?>
                                        <p class="mb-0 text-muted small mt-1"><?= sanitize(substr($m['mensaje'], 0, 100)) ?>...</p>
                                    </div>
                                    <small class="text-muted text-nowrap"><?= tiempoRelativo($m['created_at']) ?></small>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
            <div class="tab-pane fade" id="enviados">
                <?php if (empty($enviados)): ?>
                    <p class="text-center text-muted py-4">No has enviado mensajes</p>
                <?php else: ?>
                    <?php foreach ($enviados as $m): ?>
                        <div class="card mb-2">
                            <div class="card-body py-2 px-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <small class="text-muted">Para:</small> <strong><?= sanitize($m['receptor_nombre']) ?></strong>
                                        <span class="mx-2">·</span>
                                        <span class="fw-semibold"><?= sanitize($m['asunto']) ?></span>
                                        <p class="mb-0 text-muted small mt-1"><?= sanitize(substr($m['mensaje'], 0, 100)) ?>...</p>
                                    </div>
                                    <small class="text-muted text-nowrap"><?= tiempoRelativo($m['created_at']) ?></small>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>
