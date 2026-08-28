<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'sistema_educativo');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

define('BASE_URL', 'http://localhost/tesis/');
define('ROOT_PATH', dirname(__DIR__) . '/');

define('APP_NAME', 'Sistema de Gestión Educativa');
define('APP_VERSION', '1.0.0');

define('SESSION_LIFETIME', 3600);

define('UPLOAD_PATH', ROOT_PATH . 'uploads/');
define('MAX_FILE_SIZE', 5 * 1024 * 1024);

define('ROLE_ADMIN', 1);
define('ROLE_PROFESOR', 2);
define('ROLE_ALUMNO', 3);
define('ROLE_APODERADO', 4);
