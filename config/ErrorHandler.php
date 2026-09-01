<?php
require_once __DIR__ . '/database.php';

class AppException extends Exception {}

class ErrorHandler {
    public static function registrar() {
        error_reporting(E_ALL);
        set_error_handler([self::class, 'manejarErrorPhp']);
        set_exception_handler([self::class, 'manejarExcepcion']);
    }

    public static function manejarExcepcion($e) {
        self::escribirLog($e);
        $mensaje = self::mensajeAmigable($e);
        self::responder($mensaje);
        exit;
    }

    public static function manejarErrorPhp($severity, $message, $file, $line) {
        if (!(error_reporting() & $severity)) {
            return false;
        }
        $e = new ErrorException($message, 0, $severity, $file, $line);
        throw $e;
    }

    private static function mensajeAmigable($e) {
        if ($e instanceof PDOException) {
            $code = (string) $e->getCode();
            $info = self::infoIntegridad($e->getMessage());
            if ($info) {
                if ($info['campo'] === 'registro' && $info['valor'] === '') {
                    return 'No se pudo eliminar: el registro está relacionado con otros datos.';
                }
                return "No se pudo guardar: el {$info['campo']} '{$info['valor']}' ya está registrado.";
            }
            if ($code === 'HY000') {
                return 'La base de datos no está disponible en este momento. Inténtelo más tarde.';
            }
            if ($code === '23000' || $code === '23505' || $code === '1062') {
                return 'No se pudo completar: los datos ya existen o violan una regla de integridad.';
            }
            return 'Ocurrió un error al guardar los datos.';
        }
        if ($e instanceof AppException) {
            return $e->getMessage();
        }
        return 'Ocurrió un error inesperado. Por favor inténtelo de nuevo.';
    }

    private static function infoIntegridad($mensaje) {
        if (preg_match('/Duplicate entry \'([^\']+)\' for key \'([^\']+)\'/', $mensaje, $m)) {
            return ['campo' => self::nombreCampo($m[2]), 'valor' => $m[1]];
        }
        if (preg_match('/Cannot delete or update a parent row: a foreign key constraint fails/', $mensaje)) {
            return ['campo' => 'registro', 'valor' => ''];
        }
        return null;
    }

    private static function nombreCampo($key) {
        $nombres = [
            'DNI' => 'DNI', 'dni' => 'DNI', 'username' => 'usuario',
            'email' => 'correo', 'codigo' => 'código', 'nombre' => 'nombre',
            'PRIMARY' => 'registro',
        ];
        return $nombres[$key] ?? $key;
    }

    private static function escribirLog($e) {
        $linea = date('Y-m-d H:i:s') . " | " . $e->getMessage() . " | " . $e->getFile() . ":" . $e->getLine() . "\n";
        $archivo = ROOT_PATH . 'logs/errores.log';
        $dir = dirname($archivo);
        if (!is_dir($dir)) {
            @mkdir($dir, 0777, true);
        }
        @file_put_contents($archivo, $linea, FILE_APPEND);
    }

    private static function responder($mensaje) {
        if (session_status() === PHP_SESSION_ACTIVE) {
            $_SESSION['flash']['error'] = $mensaje;
        }
        $ruta = isset($_GET['route']) && isLoggedIn()
            ? self::rutaOrigen()
            : 'index.php?route=auth/login';
        redirect($ruta);
    }

    private static function rutaOrigen() {
        $route = $_GET['route'] ?? 'dashboard';
        $partes = explode('/', $route);
        $modulo = $partes[0] ?? 'dashboard';
        $accionesEscritura = ['store', 'update', 'delete', 'toggle', 'destroy'];
        if (in_array($partes[1] ?? null, $accionesEscritura)) {
            // Redirige a la página índice del módulo
            return 'index.php?route=' . $modulo;
        }
        return 'index.php?route=perfil';
    }
}