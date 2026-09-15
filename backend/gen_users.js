const bcrypt = require('bcryptjs');

const users = [
  { email: 'admin@escuela.edu', password: 'admin123', nombre: 'Carlos', apellido: 'Mendoza', dni: '12345678', rol_id: 1 },
  { email: 'profesor@escuela.edu', password: 'prof123', nombre: 'Maria', apellido: 'Garcia', dni: '23456789', rol_id: 2 },
  { email: 'alumno@escuela.edu', password: 'alu123', nombre: 'Juan', apellido: 'Perez', dni: '34567890', rol_id: 3 },
  { email: 'apoderado@escuela.edu', password: 'apo123', nombre: 'Rosa', apellido: 'Perez', dni: '45678901', rol_id: 4 }
];

async function generate() {
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    console.log(`INSERT INTO usuarios (email, password_hash, nombre, apellido, dni, rol_id) VALUES ('${u.email}', '${hash}', '${u.nombre}', '${u.apellido}', '${u.dni}', ${u.rol_id});`);
  }
}

generate();
