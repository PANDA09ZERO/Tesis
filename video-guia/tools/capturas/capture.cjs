// Usage: node capture.cjs shots.json
// Each shot: {name, role, path, vp:"desktop"|"mobile", steps:[{click|fill|wait|eval|hover|press, ...}], login:false, mock:{...}}
const { createRequire } = require('module');
const req = createRequire('C:/xampp/htdocs/Tesis/frontend/package.json');
const { chromium } = req('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.CAPTURE_BASE || 'http://localhost:5173';
const API = process.env.CAPTURE_API || 'http://localhost:3000/api';
const OUT = 'C:/xampp/htdocs/Tesis/video-guia/assets/screenshots/v2';
// Cuentas: generar-video.ps1 las pide en la consola y las pasa en CAPTURE_CREDS (no se guardan en archivos).
const CREDS_DEMO = {
  administrador: ['admin@escuela.edu', 'admin123'],
  profesor: ['profesor@escuela.edu', 'prof123'],
  alumno: ['alumno@escuela.edu', 'alu123'],
  apoderado: ['apoderado@escuela.edu', 'apo123'],
};
const CREDS = process.env.CAPTURE_CREDS ? JSON.parse(process.env.CAPTURE_CREDS) : CREDS_DEMO;
const VP = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
// anon-map.json (datos reales → ficticios) NO se versiona: se genera desde la base local y vive fuera del repo.
const MAP = process.env.ANON_MAP || path.join(__dirname, 'anon-map.json');
const { pairs, people } = fs.existsSync(MAP) ? JSON.parse(fs.readFileSync(MAP, 'utf8')) : { pairs: [], people: {} };
const STOP = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'san', 'santa']);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rules = pairs
  .filter(([a]) => a.includes(' ') || a.includes('@') || (a.length >= 4 && !STOP.has(a.toLowerCase())))
  .map(([a, b]) => [new RegExp('(^|[^\\p{L}\\p{N}@._-])' + esc(String(a)) + '(?=$|[^\\p{L}\\p{N}])', 'gu'), b]);
function walk(o) {
  if (Array.isArray(o)) return o.forEach(walk);
  if (!o || typeof o !== 'object') return;
  for (const key of Object.keys(o)) {
    const v = o[key];
    if (typeof v === 'string' && /email|correo/i.test(key) && people[v]) {
      const p = people[v];
      const pre = key.replace(/_?(email|correo)$/i, '');
      for (const f of ['nombre', 'apellido', 'dni']) {
        const k2 = pre ? pre + '_' + f : f;
        if (typeof o[k2] === 'string') o[k2] = p[f];
      }
    }
  }
  Object.values(o).forEach(walk);
}
function anon(text) {
  try { const j = JSON.parse(text); walk(j); text = JSON.stringify(j); } catch {}
  for (const [re, b] of rules) text = text.replace(re, (m, p) => p + b);
  return text;
}

const tokens = {};
async function token(role) {
  if (tokens[role]) return tokens[role];
  const [email, password] = CREDS[role];
  const r = await fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const j = await r.json().catch(() => ({}));
  if (!j.data?.token) throw new Error(`No se pudo iniciar sesión como ${role} (${email}): ${j.message || r.status}`);
  return (tokens[role] = j.data.token);
}

(async () => {
  let shots = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  // 1) inicia sesión UNA vez por rol; si una cuenta falla se detiene todo (evita el bloqueo por intentos)
  const roles = [...new Set(shots.filter(s => s.role && s.login !== false).map(s => s.role))];
  const malos = [];
  for (const r of roles) { try { await token(r); console.log('sesión ok:', r); } catch (e) { malos.push(e.message); } }
  if (malos.length) { malos.forEach(m => console.error('CUENTA', m)); console.error('Revisa esas cuentas y vuelve a ejecutar. No se tomó ninguna captura.'); process.exit(1); }
  // 2) oferta del profesor para las pantallas de notas y asistencia
  // la base de demostración deja anotado el curso de la profesora (tools/demo/demo-ids.json)
  const idsDemo = path.join(__dirname, '../demo/demo-ids.json');
  let oferta = process.env.OFERTA_ID || (process.env.DB_NAME === 'gestion_video_demo' && fs.existsSync(idsDemo) ? JSON.parse(fs.readFileSync(idsDemo, 'utf8')).oferta : null);
  if (!oferta && roles.includes('profesor')) {
    const r = await fetch(API + '/configuracion-academica/ofertas', { headers: { Authorization: 'Bearer ' + tokens.profesor } }).then(x => x.json()).catch(() => ({}));
    const lista = Array.isArray(r.data) ? r.data : [];
    oferta = (lista.find(o => Number(o.alumnos ?? o.total_alumnos ?? o.matriculados ?? 1) > 0) || lista[0])?.id;
    console.log(oferta ? `oferta del profesor: ${oferta}` : 'aviso: el profesor no tiene ofertas asignadas; las pantallas de notas y asistencia saldrán vacías');
  }
  shots = JSON.parse(JSON.stringify(shots).split('{oferta}').join(String(oferta || 0)));
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  if (only) shots = shots.filter(s => only.includes(s.name));
  const fallos = [];
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const s of shots) { try {
    const vp = s.vp || 'desktop';
    const ctx = await browser.newContext({ viewport: VP[vp], deviceScaleFactor: vp === 'mobile' ? 3 : 1.5, isMobile: vp === 'mobile', hasTouch: vp === 'mobile', colorScheme: 'light', locale: 'es-PE' });
    const page = await ctx.newPage();
    const errores = [];
    page.on('pageerror', e => errores.push(String(e.message).split('\n')[0]));
    page.on('console', m => { if (m.type() === 'error') errores.push(m.text().slice(0, 160)); });
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      const m = (s.mock || []).find(x => url.includes(x.url) && !(x.except && url.includes(x.except)) && (!x.method || x.method === route.request().method()));
      if (m) {
        if (m.patchProfile) {
          const resp = await route.fetch(); const j = await resp.json(); Object.assign(j.data, m.patchProfile);
          return route.fulfill({ response: resp, body: anon(JSON.stringify(j)) });
        }
        return route.fulfill({ status: m.status || 200, contentType: 'application/json', body: JSON.stringify(m.body) });
      }
      try {
        const resp = await route.fetch();
        const ct = resp.headers()['content-type'] || '';
        if (!ct.includes('json')) return route.fulfill({ response: resp });
        return route.fulfill({ response: resp, body: anon(await resp.text()) });
      } catch { return route.abort(); }
    });
    const init = { theme: 'light', ls: s.ls || {} };
    if (s.role && s.login !== false) init.token = await token(s.role);
    await page.addInitScript(v => { try { if (sessionStorage.getItem('__init')) return; sessionStorage.setItem('__init', '1'); localStorage.setItem('theme', v.theme); if (v.token) localStorage.setItem('token', v.token); for (const [k, x] of Object.entries(v.ls)) localStorage.setItem(k, x); } catch {} }, init);
    await page.goto(BASE + (s.path || '/'), { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    for (const st of s.steps || []) { try {
      if (st.click) await page.locator(st.click).first().click({ timeout: 8000 });
      if (st.fill) await page.locator(st.fill).first().fill(st.value);
      if (st.press) await page.keyboard.press(st.press);
      if (st.select) await page.locator(st.select).first().selectOption(st.label ? { label: st.label } : st.value);
      if (st.eval) await page.evaluate(st.eval);
      if (st.goto) await page.goto(BASE + st.goto, { waitUntil: 'networkidle' });
      if (st.scroll) await page.mouse.wheel(0, st.scroll);
      await page.waitForTimeout(st.wait || 500);
    } catch (e) { console.warn('  aviso', s.name, 'paso', JSON.stringify(st).slice(0, 80), '→', String(e.message).split('\n')[0]); await page.waitForTimeout(st.wait || 800).catch(() => {}); } }
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(400);
    const file = path.join(OUT, s.name + '.png');
    await page.screenshot({ path: file, fullPage: !!s.full });
    // record boxes for elements the video needs to point at
    if (s.boxes) {
      const boxes = {};
      for (const [k, sel] of Object.entries(s.boxes)) {
        const b = await page.locator(sel).first().boundingBox().catch(() => null);
        boxes[k] = b && { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
      }
      const bf = path.join(OUT, 'boxes.json');
      const all = fs.existsSync(bf) ? JSON.parse(fs.readFileSync(bf, 'utf8')) : {};
      all[s.name] = { vp: VP[vp], boxes };
      fs.writeFileSync(bf, JSON.stringify(all, null, 1));
    }
    if (s.boxes) { const sin = Object.entries(JSON.parse(fs.readFileSync(path.join(OUT, 'boxes.json'), 'utf8'))[s.name].boxes).filter(([, b]) => !b).map(([k]) => k); if (sin.length) console.warn('  aviso', s.name, 'sin posición para:', sin.join(', ')); }
    if (errores.length) console.warn('  errores de la página', s.name + ':', [...new Set(errores)].slice(0, 3).join(' | '));
    console.log('ok', s.name, page.url().replace(BASE, ''));
    await ctx.close();
  } catch (e) { fallos.push(s.name); console.error('FALLO', s.name, '→', String(e.message).split('\n')[0]); } }
  await browser.close();
  if (fallos.length) { console.error('Capturas que fallaron:', fallos.join(', ')); process.exitCode = 2; }
})().catch(e => { console.error(e); process.exit(1); });
