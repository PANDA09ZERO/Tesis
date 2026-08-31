<?php
/** @var mixed $error */
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - <?= APP_NAME ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #01579b 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-card {
            width: 100%;
            max-width: 420px;
            border: none;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .login-header {
            background: linear-gradient(135deg, #1a237e, #0d47a1);
            color: white;
            padding: 2rem;
            border-radius: 16px 16px 0 0;
            text-align: center;
        }
        .login-header i {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        .form-control:focus {
            border-color: #0d47a1;
            box-shadow: 0 0 0 0.2rem rgba(13, 71, 161, 0.25);
        }
        .btn-login {
            background: linear-gradient(135deg, #1a237e, #0d47a1);
            border: none;
            padding: 12px;
            font-weight: 600;
            letter-spacing: 0.5px;
        }
        .btn-login:hover {
            background: linear-gradient(135deg, #0d47a1, #01579b);
        }
    </style>
</head>
<body>
    <div class="card login-card">
        <div class="login-header">
            <i class="bi bi-mortarboard-fill"></i>
            <h4 class="mb-0"><?= APP_NAME ?></h4>
            <small class="opacity-75">Inicie sesión para continuar</small>
        </div>
        <div class="card-body p-4">
            <?php if ($error): ?>
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    <?= sanitize($error) ?>
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            <?php endif; ?>

            <form method="POST" action="<?= BASE_URL ?>index.php?route=auth/login">
                <div class="mb-3">
                    <label for="username" class="form-label fw-semibold">
                        <i class="bi bi-person-fill me-1"></i>Usuario
                    </label>
                    <input type="text" class="form-control form-control-lg" id="username" name="username" 
                           placeholder="Ingrese su usuario" required autofocus
                           value="<?= sanitize($_POST['username'] ?? '') ?>">
                </div>
                <div class="mb-4">
                    <label for="password" class="form-label fw-semibold">
                        <i class="bi bi-lock-fill me-1"></i>Contraseña
                    </label>
                    <div class="input-group">
                        <input type="password" class="form-control form-control-lg" id="password" name="password" 
                               placeholder="Ingrese su contraseña" required>
                        <button class="btn btn-outline-secondary" type="button" onclick="togglePassword()">
                            <i class="bi bi-eye-fill" id="toggleIcon"></i>
                        </button>
                    </div>
                </div>
                <button type="submit" class="btn btn-login btn-lg w-100 text-white">
                    <i class="bi bi-box-arrow-in-right me-2"></i>Iniciar Sesión
                </button>
            </form>
        </div>
        <div class="card-footer text-center text-muted py-3" style="border-radius: 0 0 16px 16px;">
            <small>&copy; <?= date('Y') ?> - Sistema de Gestión Educativa</small>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        function togglePassword() {
            const input = document.getElementById('password');
            const icon = document.getElementById('toggleIcon');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('bi-eye-fill', 'bi-eye-slash-fill');
            } else {
                input.type = 'password';
                icon.classList.replace('bi-eye-slash-fill', 'bi-eye-fill');
            }
        }
    </script>
</body>
</html>
