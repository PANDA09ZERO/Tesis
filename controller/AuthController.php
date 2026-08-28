<?php
require_once __DIR__ . '/Controller.php';
require_once __DIR__ . '/../model/Model.php';

class AuthController extends Controller {

    public function login() {
        if (isLoggedIn()) {
            redirect('index.php?route=dashboard');
        }

        $error = null;

        if ($this->isPost()) {
            $username = trim($this->getPost('username'));
            $password = $this->getPost('password');

            if (empty($username) || empty($password)) {
                $error = 'Ingrese usuario y contraseña';
            } else {
                $user = $this->db->selectOne(
                    "SELECT u.*, r.nombre as rol_nombre 
                     FROM usuarios u 
                     JOIN roles r ON u.rol_id = r.id 
                     WHERE u.username = ? AND u.estado = 1",
                    [$username]
                );

                if ($user && password_verify($password, $user['password'])) {
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['username'] = $user['username'];
                    $_SESSION['email'] = $user['email'];
                    $_SESSION['rol_id'] = $user['rol_id'];
                    $_SESSION['rol_nombre'] = $user['rol_nombre'];

                    $this->db->update('usuarios', [
                        'ultimo_acceso' => date('Y-m-d H:i:s')
                    ], 'id = ?', [$user['id']]);

                    logActividad('Inicio de sesión', 'usuarios', $user['id']);

                    redirect('index.php?route=dashboard');
                } else {
                    $error = 'Usuario o contraseña incorrectos';
                }
            }
        }

        $this->viewStandalone('auth/login', ['error' => $error]);
    }

    public function logout() {
        logActividad('Cierre de sesión', 'usuarios', $_SESSION['user_id'] ?? null);
        session_destroy();
        redirect('index.php?route=auth/login');
    }
}
