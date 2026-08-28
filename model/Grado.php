<?php
require_once __DIR__ . '/Model.php';

class Grado extends Model {
    protected $table = 'grados';

    public function findAllOrdered() {
        return $this->findAll('1', [], 'nivel ASC, nombre ASC');
    }

    public function getSecciones($gradoId) {
        return $this->db->select(
            "SELECT s.*, 
                    (SELECT COUNT(*) FROM matriculas m WHERE m.seccion_id = s.id AND m.estado = 'Activa') as total_alumnos
             FROM secciones s 
             WHERE s.grado_id = ?
             ORDER BY s.nombre",
            [$gradoId]
        );
    }
}
