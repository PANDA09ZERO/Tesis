<?php
require_once __DIR__ . '/Model.php';

class Usuario extends Model {
    protected $table = 'usuarios';

    public function findAllWithRol($where = '1', $params = []) {
        return $this->db->select(
            "SELECT u.*, r.nombre as rol_nombre
             FROM usuarios u 
             JOIN roles r ON u.rol_id = r.id
             WHERE {$where} 
             ORDER BY u.username",
            $params
        );
    }

    public function findByUsername($username) {
        return $this->db->selectOne(
            "SELECT u.*, r.nombre as rol_nombre 
             FROM usuarios u 
             JOIN roles r ON u.rol_id = r.id 
             WHERE u.username = ?",
            [$username]
        );
    }

    public function crear($username, $password, $email, $rolId) {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        return $this->db->insert('usuarios', [
            'username' => $username,
            'password' => $hash,
            'email' => $email,
            'rol_id' => $rolId,
            'estado' => 1,
        ]);
    }

    public function actualizarPassword($id, $newPassword) {
        $hash = password_hash($newPassword, PASSWORD_DEFAULT);
        return $this->db->update('usuarios', ['password' => $hash], 'id = ?', [$id]);
    }

    public function toggleEstado($id) {
        $user = $this->findById($id);
        if ($user) {
            $nuevoEstado = $user['estado'] ? 0 : 1;
            return $this->db->update('usuarios', ['estado' => $nuevoEstado], 'id = ?', [$id]);
        }
        return false;
    }

    public function getRoles() {
        return $this->db->select("SELECT * FROM roles ORDER BY nombre");
    }

    public function buscar($termino) {
        return $this->findAllWithRol(
            "(u.username LIKE ? OR u.email LIKE ?)",
            ["%$termino%", "%$termino%"]
        );
    }
}
