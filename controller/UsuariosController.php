<?php
require_once __DIR__ . '/Controller.php';
require_once __DIR__ . '/../model/Usuario.php';

class UsuariosController extends Controller {
    private $usuarioModel;

    public function __construct() {
        parent::__construct();
        $this->usuarioModel = new Usuario();
    }

    public function index() {
        requireRole([ROLE_ADMIN]);
        $busqueda = $this->getGet('q');
        $usuarios = $busqueda
            ? $this->usuarioModel->buscar($busqueda)
            : $this->usuarioModel->findAllWithRol();

        $this->view('usuarios/index', [
            'pageTitle' => 'Gestión de Usuarios',
            'usuarios' => $usuarios,
            'busqueda' => $busqueda,
        ]);
    }

    public function create() {
        requireRole([ROLE_ADMIN]);
        $this->view('usuarios/form', [
            'pageTitle' => 'Crear Usuario',
            'usuario' => null,
            'roles' => $this->usuarioModel->getRoles(),
        ]);
    }

    public function store() {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $username = trim($this->getPost('username'));
            $password = $this->getPost('password');
            $email = trim($this->getPost('email'));
            $rolId = $this->getPost('rol_id');

            $existing = $this->usuarioModel->findByUsername($username);
            if ($existing) {
                $this->setFlash('error', 'El nombre de usuario ya existe');
                redirect('index.php?route=usuarios/create');
                return;
            }

            $id = $this->usuarioModel->crear($username, $password, $email, $rolId);
            logActividad('Usuario creado', 'usuarios', $id, $username);
            $this->setFlash('success', 'Usuario creado correctamente');
            redirect('index.php?route=usuarios');
        }
        redirect('index.php?route=usuarios/create');
    }

    public function edit($id) {
        requireRole([ROLE_ADMIN]);
        $usuario = $this->usuarioModel->findById($id);
        if (!$usuario) { redirect('index.php?route=usuarios'); return; }

        $this->view('usuarios/form', [
            'pageTitle' => 'Editar Usuario',
            'usuario' => $usuario,
            'roles' => $this->usuarioModel->getRoles(),
        ]);
    }

    public function update($id) {
        requireRole([ROLE_ADMIN]);
        if ($this->isPost()) {
            $this->validateCSRF();
            $data = [
                'email' => trim($this->getPost('email')),
                'rol_id' => $this->getPost('rol_id'),
                'estado' => $this->getPost('estado') ? 1 : 0,
            ];
            $this->usuarioModel->update($id, $data);

            $newPassword = $this->getPost('new_password');
            if (!empty($newPassword)) {
                $this->usuarioModel->actualizarPassword($id, $newPassword);
            }

            logActividad('Usuario actualizado', 'usuarios', $id);
            $this->setFlash('success', 'Usuario actualizado correctamente');
            redirect('index.php?route=usuarios');
        }
        redirect("index.php?route=usuarios/edit/{$id}");
    }

    public function toggle($id) {
        requireRole([ROLE_ADMIN]);
        $this->usuarioModel->toggleEstado($id);
        logActividad('Estado de usuario cambiado', 'usuarios', $id);
        $this->setFlash('success', 'Estado del usuario actualizado');
        redirect('index.php?route=usuarios');
    }
}
