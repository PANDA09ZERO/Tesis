<?php
class Model {
    protected $db;
    protected $table;
    protected $primaryKey = 'id';

    public function __construct() {
        $this->db = Database::getInstance();
    }

    public function findAll($where = '1', $params = [], $order = 'created_at DESC') {
        return $this->db->select("SELECT * FROM {$this->table} WHERE {$where} ORDER BY {$order}", $params);
    }

    public function findById($id) {
        return $this->db->selectOne("SELECT * FROM {$this->table} WHERE {$this->primaryKey} = ?", [$id]);
    }

    public function create($data) {
        return $this->db->insert($this->table, $data);
    }

    public function update($id, $data) {
        return $this->db->update($this->table, $data, "{$this->primaryKey} = ?", [$id]);
    }

    public function delete($id) {
        return $this->db->delete($this->table, "{$this->primaryKey} = ?", [$id]);
    }

    public function count($where = '1', $params = []) {
        return $this->db->count($this->table, $where, $params);
    }

    public function search($columns, $term) {
        $conditions = [];
        $params = [];
        foreach ($columns as $col) {
            $conditions[] = "{$col} LIKE ?";
            $params[] = "%{$term}%";
        }
        $where = implode(' OR ', $conditions);
        return $this->findAll($where, $params);
    }
}
