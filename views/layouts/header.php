<?php $user = currentUser(); ?>
<nav class="navbar navbar-expand-lg navbar-dark bg-primary fixed-top shadow-sm">
    <div class="container-fluid">
        <button class="btn btn-link text-white text-decoration-none fw-bold d-flex align-items-center" 
                onclick="toggleSidebar()">
            <i class="bi bi-mortarboard-fill fs-4 me-2"></i>
            <span class="d-none d-md-inline"><?= APP_NAME ?></span>
        </button>

        <div class="ms-auto d-flex align-items-center">
            <div class="dropdown">
                <button class="btn btn-link text-white text-decoration-none dropdown-toggle d-flex align-items-center" 
                        data-bs-toggle="dropdown">
                    <div class="bg-white bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center me-2" 
                         style="width: 36px; height: 36px;">
                        <i class="bi bi-person-fill"></i>
                    </div>
                    <span class="d-none d-md-inline">
                        <?= sanitize($user['username']) ?>
                        <small class="badge bg-light text-primary ms-1"><?= sanitize($user['rol_nombre']) ?></small>
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
                        <a class="dropdown-item" href="<?= BASE_URL ?>index.php?route=auth/logout">
                            <i class="bi bi-box-arrow-right me-2"></i>Cerrar Sesión
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</nav>
