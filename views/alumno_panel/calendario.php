<?php
/** @var mixed $e */
/** @var mixed $eventos */
/** @var mixed $pageTitle */
?>

<?php $pageTitle = $pageTitle ?? 'Calendario'; ?>

<div class="mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-calendar3 me-2"></i><?= $pageTitle ?></h4>
</div>

<div class="card">
    <div class="card-body">
        <div id="calendario"></div>
    </div>
</div>

<link href="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/index.global.min.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/index.global.min.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendario');
    const eventos = [
        <?php foreach ($eventos as $e): ?>
        {
            title: <?= json_encode($e['titulo']) ?>,
            start: '<?= $e['fecha_inicio'] ?>',
            end: <?= $e['fecha_fin'] ? "'" . $e['fecha_fin'] . "'" : 'null' ?>,
            color: '<?= $e['color'] ?? '#0d6efd' ?>',
            description: <?= json_encode($e['descripcion'] ?? '') ?>
        },
        <?php endforeach; ?>
    ];

    new FullCalendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'es',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
        events: eventos,
        eventClick: function(info) {
            alert(info.event.title + '\n\n' + (info.event.extendedProps.description || ''));
        },
        height: 650,
        buttonText: { today: 'Hoy', month: 'Mes', week: 'Semana' }
    });
});
</script>
