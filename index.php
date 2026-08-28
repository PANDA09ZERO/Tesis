<?php
ob_start();
session_start();
require_once __DIR__ . '/config/helpers.php';
require_once __DIR__ . '/config/database.php';

$route = $_GET['route'] ?? 'dashboard';
$method = $_SERVER['REQUEST_METHOD'];

$parts = explode('/', $route);
$raw = $parts[0] ?? 'dashboard';
$camel = str_replace('-', ' ', $raw);
$camel = ucwords($camel);
$camel = str_replace(' ', '', $camel);
$controllerName = $camel . 'Controller';
$action = $parts[1] ?? 'index';
$id = $parts[2] ?? null;

$controllerFile = __DIR__ . '/controller/' . $controllerName . '.php';

if (file_exists($controllerFile)) {
    require_once $controllerFile;
    $controller = new $controllerName();
    if (method_exists($controller, $action)) {
        if ($id !== null) {
            $controller->$action($id);
        } else {
            $controller->$action();
        }
    } else {
        http_response_code(404);
        echo "Acción no encontrada: {$action}";
    }
} else {
    http_response_code(404);
    echo "Controlador no encontrado: {$controllerName}";
}

ob_end_flush();
