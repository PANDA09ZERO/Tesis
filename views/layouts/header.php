<?php
/** @var mixed $user */
?>

<?php $user = currentUser(); ?>
<nav class="navbar navbar-expand-lg navbar-dark fixed-top shadow-sm" style="background: linear-gradient(135deg, #6b3d3d 0%, #4a2424 100%); padding: 0.5rem 0;">
    <div class="container-fluid" style="padding: 0 1rem;">
        <button class="btn btn-link text-white text-decoration-none fw-bold d-flex flex-column align-items-center p-0" 
                onclick="toggleSidebar()" style="gap: 3px;">
            <img src="<?= BASE_URL ?>views/img/logo-colegio.jpeg" alt="Logo" style="max-height: 32px; width: auto;">
            <span class="d-none d-md-inline" style="font-size: 0.75rem; letter-spacing: 0.3px; line-height: 1.2;"><?= APP_NAME ?></span>
        </button>

        <div class="ms-auto d-flex align-items-center">
            <div class="dropdown">
                <button class="btn btn-link text-white text-decoration-none dropdown-toggle d-flex align-items-center p-0" 
                        data-bs-toggle="dropdown" style="gap: 0.5rem;">
                    <div class="bg-white bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center" 
                         style="width: 32px; height: 32px; font-size: 0.9rem;">
                        <i class="bi bi-person-fill"></i>
                    </div>
                    <span class="d-none d-md-inline" style="font-size: 0.85rem;">
                        <?= sanitize($user['username']) ?>
                        <small class="badge bg-light text-primary ms-1" style="font-size: 0.7rem;"><?= sanitize($user['rol_nombre']) ?></small>
                    </span>
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li>
                        <span class="dropdown-item-text">
                            <small class="text-muted"><?= sanitize($user['email']) ?></small>
                        </span>
                    </li>
                    <li><hr class="dropdown-divider"></li>
                    <li>
                        <a class="dropdown-item" href="<?= BASE_URL ?>index.php?route=perfil">
                            <i class="bi bi-person-circle me-2"></i>Mi Perfil
                        </a>
                    </li>
                    <li>
                        <a class="dropdown-item" href="<?= BASE_URL ?>index.php?route=auth/logout">
                            <i class="bi bi-box-arrow-right me-2"></i>Cerrar Sesión
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</nav>
