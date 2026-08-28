<?php
require_once __DIR__ . '/Model.php';

class Periodo extends Model {
    protected $table = 'periodos_academicos';

    public function getActual() {
        return $this->db->selectOne(
            "SELECT * FROM periodos_academicos WHERE estado = 1 AND CURDATE() BETWEEN fecha_inicio AND fecha_fin LIMIT 1"
        );
    }

    public function getAll() {
        return $this->findAll('1', [], 'fecha_inicio DESC');
    }
}
