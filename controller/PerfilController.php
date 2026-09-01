<?php
require_once __DIR__ . '/Controller.php';

class PerfilController extends Controller {
    public function index() {
        requireLogin();
        $this->view('perfil/form', [
            'pageTitle' => 'Mi Perfil',
        ]);
    }

    public function update() {
        requireLogin();
        if ($this->isPost()) {
            $this->validateCSRF();
            $user = currentUser();
            $actual = (string) $this->getPost('password_actual');
            $nueva = (string) $this->getPost('password');
            $confirm = (string) $this->getPost('password_confirm');

            $row = $this->db->selectOne("SELECT password FROM usuarios WHERE id = ?", [$user['id']]);
            if (!$row || !password_verify($actual, $row['password'])) {
                $this->setFlash('error', 'La contraseña actual no es correcta.');
                redirect('index.php?route=perfil');
                return;
            }
            if ($nueva === '' || $nueva !== $confirm) {
                $this->setFlash('error', 'La nueva contraseña no coincide con su confirmación.');
                redirect('index.php?route=perfil');
                return;
            }
            if (strlen($nueva) < 6) {
                $this->setFlash('error', 'La nueva contraseña debe tener al menos 6 caracteres.');
                redirect('index.php?route=perfil');
                return;
            }

            $this->usuarioModel->actualizarPassword($user['id'], $nueva);
            logActividad('Contraseña cambiada desde perfil', 'usuarios', $user['id']);
            $this->setFlash('success', 'Contraseña actualizada correctamente.');
            redirect('index.php?route=perfil');
        }
        redirect('index.php?route=perfil');
    }
}