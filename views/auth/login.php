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
    <link href="<?= BASE_URL ?>assets/css/login.css" rel="stylesheet">
</head>
<body>
    <div class="login-container">
        <!-- Lado Izquierdo - Información -->
        <div class="login-sidebar">
            <div class="logo-section">
                <img src="<?= BASE_URL ?>views/img/logo-colegio.jpeg" alt="Logo del Colegio" class="logo-img">
                <h3><?= APP_NAME ?></h3>
                <div class="tagline">Disciplina y Exigencia Académica</div>
                <div class="divider"></div>
                <p class="description">
                    Accede al portal para gestionar calificaciones, asistencia y comunicados de la institución.
                </p>
            </div>
        </div>

        <!-- Lado Derecho - Formulario -->
        <div class="login-body">
            <div class="login-header">
                <span class="portal-label">Portal Académico</span>
                <h1>Bienvenido de nuevo</h1>
                <p>Ingresa tus credenciales para acceder a la plataforma de la institución.</p>
            </div>

            <?php if ($error): ?>
                <div class="alert alert-danger">
                    <span>⚠️</span>
                    <span><?= sanitize($error) ?></span>
                    <button type="button" class="alert-close" onclick="this.parentElement.style.display='none';">&times;</button>
                </div>
            <?php endif; ?>

            <form method="POST" action="<?= BASE_URL ?>index.php?route=auth/login">
                <div class="form-group">
                    <label for="username">Usuario o correo</label>
                    <input type="text" id="username" name="username" 
                           placeholder="tu.usuario@colegio.edu" required autofocus
                           value="<?= sanitize($_POST['username'] ?? '') ?>">
                </div>

                <div class="form-group">
                    <label for="password">Contraseña</label>
                    <div class="password-group">
                        <input type="password" id="password" name="password" 
                               placeholder="••••••••" required>
                        <button type="button" onclick="togglePassword()" title="Mostrar/Ocultar contraseña">
                            👁️
                        </button>
                    </div>
                </div>

                <div class="form-check">
                    <input type="checkbox" id="remember" name="remember" value="1">
                    <label for="remember">Mantener sesión iniciada</label>
                </div>

                <button type="submit" class="btn-login">
                    ➜ Iniciar Sesión
                </button>
            </form>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        function togglePassword() {
            const input = document.getElementById('password');
            input.type = input.type === 'password' ? 'text' : 'password';
        }
    </script>
</body>
</html>


