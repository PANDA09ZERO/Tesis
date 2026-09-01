<?php
require_once __DIR__ . '/../model/Usuario.php';

class Controller {
    protected $db;
    protected $usuarioModel;

    public function __construct() {
        $this->db = Database::getInstance();
        $this->usuarioModel = new Usuario();
    }

    protected function view($viewPath, $data = []) {
        extract($data);
        $viewFile = __DIR__ . '/../views/' . $viewPath . '.php';
        if (file_exists($viewFile)) {
            ob_start();
            require $viewFile;
            $content = ob_get_clean();
            require __DIR__ . '/../views/layouts/main.php';
        } else {
            echo "Vista no encontrada: {$viewPath}";
        }
    }

    protected function viewStandalone($viewPath, $data = []) {
        extract($data);
        $viewFile = __DIR__ . '/../views/' . $viewPath . '.php';
        if (file_exists($viewFile)) {
            require $viewFile;
        } else {
            echo "Vista no encontrada: {$viewPath}";
        }
    }

    protected function viewPartial($viewPath, $data = []) {
        extract($data);
        $viewFile = __DIR__ . '/../views/' . $viewPath . '.php';
        if (file_exists($viewFile)) {
            require $viewFile;
        }
    }

    protected function json($data, $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }

    protected function getPost($key = null, $default = null) {
        if ($key === null) return $_POST;
        return $_POST[$key] ?? $default;
    }

    protected function getGet($key = null, $default = null) {
        if ($key === null) return $_GET;
        return $_GET[$key] ?? $default;
    }

    protected function isPost() {
        return $_SERVER['REQUEST_METHOD'] === 'POST';
    }

    protected function validateCSRF() {
        if ($this->isPost()) {
            $token = $this->getPost('csrf_token');
            if (!isset($_SESSION['csrf_token']) || $token !== $_SESSION['csrf_token']) {
                die('Token CSRF inválido');
            }
        }
    }

    protected function generateCSRF() {
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }

    protected function setFlash($type, $message) {
        $_SESSION['flash'][$type] = $message;
    }

    protected function gestionarCredencialAcceso($tabla, $id, $rolId, $nombre, $apellidoPaterno, $apellidoMaterno = '') {
        $password = $this->getPost('password');
        if (!$this->isPost() || $password === '' || $password === null) {
            return;
        }
        $persona = $this->db->selectOne("SELECT usuario_id FROM {$tabla} WHERE id = ?", [$id]);
        if (!$persona) return;

        if (!empty($persona['usuario_id'])) {
            $this->usuarioModel->actualizarPassword($persona['usuario_id'], $password);
            return;
        }

        $username = generarUsernamePersona($nombre, $apellidoPaterno, $apellidoMaterno);
        $email = $username . '@cienciaseingenieria.com';
        $usuarioId = $this->usuarioModel->crear($username, $password, $email, $rolId);
        $this->db->update($tabla, ['usuario_id' => $usuarioId], 'id = ?', [$id]);
    }
}
