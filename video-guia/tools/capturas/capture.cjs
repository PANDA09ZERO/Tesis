// Usage: node capture.cjs shots.json
// Each shot: {name, role, path, vp:"desktop"|"mobile", steps:[{click|fill|wait|eval|hover|press, ...}], login:false, mock:{...}}
const { createRequire } = require('module');
const req = createRequire('C:/xampp/htdocs/Tesis/frontend/package.json');
const { chromium } = req('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:5173';
const OUT = 'C:/xampp/htdocs/Tesis/video-guia/assets/screenshots/v2';
const CREDS = {
  administrador: ['admin@escuela.edu', 'admin123'],
  profesor: ['profesor@escuela.edu', 'prof123'],
  alumno: ['alumno@escuela.edu', 'alu123'],
  apoderado: ['apoderado@escuela.edu', 'apo123'],
};
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
  const r = await fetch('http://localhost:3000/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  const j = await r.json();
  return (tokens[role] = j.data.token);
}

(async () => {
  const shots = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const s of shots) {
    const vp = s.vp || 'desktop';
    const ctx = await browser.newContext({ viewport: VP[vp], deviceScaleFactor: vp === 'mobile' ? 3 : 1.5, isMobile: vp === 'mobile', hasTouch: vp === 'mobile', colorScheme: 'light', locale: 'es-PE' });
    const page = await ctx.newPage();
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
    for (const st of s.steps || []) {
      if (st.click) await page.locator(st.click).first().click({ timeout: 8000 });
      if (st.fill) await page.locator(st.fill).first().fill(st.value);
      if (st.press) await page.keyboard.press(st.press);
      if (st.select) await page.locator(st.select).first().selectOption(st.label ? { label: st.label } : st.value);
      if (st.eval) await page.evaluate(st.eval);
      if (st.goto) await page.goto(BASE + st.goto, { waitUntil: 'networkidle' });
      if (st.scroll) await page.mouse.wheel(0, st.scroll);
      await page.waitForTimeout(st.wait || 500);
    }
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
    console.log('ok', s.name, page.url().replace(BASE, ''));
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
