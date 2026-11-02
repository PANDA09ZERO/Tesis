const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

process.env.NODE_ENV = 'test';
process.env.INSTITUTIONAL_EMAIL_DOMAIN = 'cienciaseingenieria.test';

const { createInstitutionalCredentials, generateStudentCode } = require('../dist/utils/credentials');
const { institutionalEmailDomain } = require('../dist/config/environment');
const { accountError } = require('../dist/utils/accountValidation');

test('identificadores usan nombre y apellido normalizados con sufijo solo si hay duplicado', async () => {
  const taken = new Set(['ana.de@cienciaseingenieria.test']);
  const connection = { async query(_sql, [email]) { return [taken.has(email) ? [{ id: 1 }] : [], []]; } };
  const account = await createInstitutionalCredentials(connection, 'profesor', 'Ana María', 'De la Cruz');
  assert.equal(account.email, 'ana.de2@cienciaseingenieria.test');
  const simple = await createInstitutionalCredentials(connection, 'apoderado', 'Carlos', 'Mendoza');
  assert.equal(simple.email, 'carlos.mendoza@cienciaseingenieria.test');
  assert.equal(account.temporaryPassword.length, 24);
  assert.match(generateStudentCode(), /^ALU-[A-F0-9]{12}$/);
  assert.throws(() => institutionalEmailDomain({ INSTITUTIONAL_EMAIL_DOMAIN: '@invalid-domain' }), /dominio válido/);
  assert.equal(accountError({ nombre: 'Prueba', apellido: 'Sintética' }, true, true), null);
  assert.match(accountError({ nombre: 'Prueba', apellido: 'Sintética', email: 'externo@example.test' }, true, true), /se generan automáticamente/);
  assert.match(accountError({ nombre: 'Prueba', apellido: 'Sintética', password: 'birth-date' }, true, true), /se generan automáticamente/);
});

test('crear cuentas de cualquier rol devuelve una sola credencial temporal y registra el perfil correspondiente', async () => {
  const db = require('../dist/config/database').default;
  const oldGetConnection = db.getConnection;
  let insertedHash;
  let nextId = 100;
  let queries = [];
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async query(sql, params = []) {
      queries.push({ sql, params });
      if (sql.includes('INSERT INTO usuarios')) {
        insertedHash = params[1];
        if (sql.includes('SELECT id FROM usuarios WHERE email')) return [[], []];
        return [{ insertId: ++nextId, affectedRows: 1 }, []];
      }
      return [{ insertId: ++nextId, affectedRows: 1 }, []];
    }
  };
  db.getConnection = async () => connection;

  const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
  const input = roleId => ({ body: {
    nombre: 'Usuario', apellido: `Prueba${roleId}`, rol_id: String(roleId),
    fecha_nacimiento: '2000-01-01', direccion: 'Calle de prueba 123'
  }, params: {}, query: {} });

  try {
    const { createUser } = require('../dist/controllers/users.controller');
    for (const [roleId, profileTable] of [[1, null], [2, 'profesores'], [3, 'alumnos'], [4, 'apoderados']]) {
      queries = [];
      const res = response();
      await createUser(input(roleId), res);
      assert.equal(res.statusCode, 201);
      const credentials = res.body.data.credentials;
      assert.equal(credentials.email, `usuario.prueba${roleId}@cienciaseingenieria.test`);
      assert.equal(credentials.mustChangePassword, true);
      assert.equal(credentials.mailboxCreated, false);
      assert.equal(await bcrypt.compare(credentials.temporaryPassword, insertedHash), true);
      assert.ok(queries.some(({ sql }) => sql.includes('debe_cambiar_password')));
      assert.deepEqual(queries.find(({ sql }) => sql.includes('INSERT INTO usuarios')).params.slice(6, 7), ['Calle de prueba 123']);
      if (profileTable) assert.ok(queries.some(({ sql }) => sql.includes(`INSERT INTO ${profileTable}`)));
    }
  } finally {
    db.getConnection = oldGetConnection;
  }
});

test('el registro alternativo crea el perfil de apoderado dentro de la misma transacción', async () => {
  const db = require('../dist/config/database').default;
  const oldGetConnection = db.getConnection;
  const statements = [];
  let committed = false;
  const connection = {
    async beginTransaction() {},
    async commit() { committed = true; },
    async rollback() {},
    release() {},
    async query(sql) {
      statements.push(sql);
      return [{ insertId: 501, affectedRows: 1 }, []];
    }
  };
  db.getConnection = async () => connection;
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  try {
    const { register } = require('../dist/controllers/auth.controller');
    await register({ body: { nombre: 'Apoderado', apellido: 'Prueba' } }, res);
    assert.equal(res.statusCode, 201);
    assert.equal(committed, true);
    assert.ok(statements.some(sql => sql.includes('INSERT INTO usuarios')));
    assert.ok(statements.some(sql => sql.includes('INSERT INTO apoderados')));
    assert.equal(res.body.data.credentials.mustChangePassword, true);
  } finally {
    db.getConnection = oldGetConnection;
  }
});

test('el usuario solo puede actualizar su fecha de nacimiento y género', async () => {
  const db = require('../dist/config/database').default;
  const oldQuery = db.query;
  const calls = [];
  db.query = async (...args) => { calls.push(args); return [{ affectedRows: 1 }, []]; };
  const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
  try {
    const { updatePersonalProfile } = require('../dist/controllers/auth.controller');
    const res = response();
    await updatePersonalProfile({ user: { userId: 25, rol: 'alumno' }, body: { fecha_nacimiento: '2000-02-29', genero: 'F' } }, res);
    assert.equal(res.statusCode, 200);
    assert.match(calls[0][0], /SET fecha_nacimiento = \?, genero = \? WHERE id = \?$/);
    assert.deepEqual(calls[0][1], ['2000-02-29', 'F', 25]);

    const invalid = response();
    await updatePersonalProfile({ user: { userId: 25, rol: 'alumno' }, body: { nombre: 'Otro usuario' } }, invalid);
    assert.equal(invalid.statusCode, 400);
    assert.equal(calls.length, 1);

    const invalidDate = response();
    await updatePersonalProfile({ user: { userId: 25, rol: 'alumno' }, body: { fecha_nacimiento: '2001-02-29' } }, invalidDate);
    assert.equal(invalidDate.statusCode, 400);
    assert.equal(calls.length, 1);

    const superadmin = response();
    await updatePersonalProfile({ user: { userId: 31, rol: 'superadministrador' }, body: { genero: 'M' } }, superadmin);
    assert.equal(superadmin.statusCode, 403);
    assert.equal(calls.length, 1);
  } finally {
    db.query = oldQuery;
  }
});

test('la autenticación obliga a cambiar la clave y limita una cuenta temporal a perfil/cambio', async () => {
  const db = require('../dist/config/database').default;
  const oldQuery = db.query;
  const secret = 'credentials-test-only-secret';
  process.env.JWT_SECRET = secret;
  const passwordHash = await bcrypt.hash('Temporary-Password', 4);
  const { credentialVersion } = require('../dist/utils/session');
  const jwt = require('jsonwebtoken');
  const { authenticate } = require('../dist/middleware/auth');
  let query;
  db.query = async (...args) => { query = args; return [[{ id: 8, email: 'alu-test@cienciaseingenieria.test', activo: 1, password_hash: passwordHash, debe_cambiar_password: 1, rol: 'alumno' }], []]; };
  const token = jwt.sign({
    userId: 8,
    email: 'alu-test@cienciaseingenieria.test',
    rol: 'alumno',
    credentialVersion: credentialVersion(passwordHash, secret)
  }, secret);

  async function check(path, method = 'GET') {
    const req = { originalUrl: path, method, headers: { authorization: `Bearer ${token}` } };
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    let continued = false;
    await authenticate(req, res, () => { continued = true; });
    return { req, res, continued };
  }

  try {
    const blocked = await check('/api/alumnos');
    assert.equal(blocked.res.statusCode, 403);
    assert.equal(blocked.continued, false);
    const profile = await check('/api/auth/profile');
    assert.equal(profile.continued, true);
    const change = await check('/api/auth/change-password', 'PUT');
    assert.equal(change.continued, true);
    assert.equal(query[0].includes('debe_cambiar_password'), true);
  } finally {
    db.query = oldQuery;
  }
});
