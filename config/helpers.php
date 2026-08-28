<?php
require_once __DIR__ . '/config.php';

function redirect($url) {
    $fullUrl = defined('BASE_URL') ? BASE_URL . $url : $url;
    if (!headers_sent()) {
        header("Location: " . $fullUrl);
        exit;
    } else {
        echo "<script>window.location.href='" . $fullUrl . "';</script>";
        exit;
    }
}

function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function requireLogin() {
    if (!isLoggedIn()) {
        redirect('index.php?route=auth/login');
    }
}

function requireRole($roles) {
    requireLogin();
    if (!is_array($roles)) {
        $roles = [$roles];
    }
    if (!in_array($_SESSION['rol_id'], $roles)) {
        redirect('index.php?route=dashboard');
    }
}

function currentUser() {
    return [
        'id' => $_SESSION['user_id'] ?? null,
        'username' => $_SESSION['username'] ?? null,
        'email' => $_SESSION['email'] ?? null,
        'rol_id' => $_SESSION['rol_id'] ?? null,
        'rol_nombre' => $_SESSION['rol_nombre'] ?? null,
    ];
}

function sanitize($data) {
    return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
}

function flash($key, $message = null) {
    if ($message !== null) {
        $_SESSION['flash'][$key] = $message;
    } else {
        $msg = $_SESSION['flash'][$key] ?? null;
        unset($_SESSION['flash'][$key]);
        return $msg;
    }
}

function formatDate($date) {
    if (!$date) return '';
    return date('d/m/Y', strtotime($date));
}

function formatDateTime($datetime) {
    if (!$datetime) return '';
    return date('d/m/Y H:i', strtotime($datetime));
}

function tiempoRelativo($datetime) {
    $now = new DateTime();
    $past = new DateTime($datetime);
    $diff = $now->diff($past);
    if ($diff->y > 0) return $diff->y . ' año(s)';
    if ($diff->m > 0) return $diff->m . ' mes(es)';
    if ($diff->d > 0) return $diff->d . ' día(s)';
    if ($diff->h > 0) return $diff->h . ' hora(s)';
    if ($diff->i > 0) return $diff->i . ' minuto(s)';
    return 'Ahora';
}

function logActividad($accion, $tabla = null, $registro_id = null, $detalles = null) {
    $db = Database::getInstance();
    $db->insert('registro_actividades', [
        'usuario_id' => $_SESSION['user_id'] ?? null,
        'accion' => $accion,
        'tabla' => $tabla,
        'registro_id' => $registro_id,
        'detalles' => $detalles,
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
    ]);
}
