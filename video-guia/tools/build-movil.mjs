// Versión VERTICAL (1080×1920, para celular) y SIN subtítulos de la guía de uso.
// Genera index.html, compositions/m*.html y la pista de voz a partir de
// narracion.json (texto), assets/voz/duraciones.json (tiempos reales de la voz),
// assets/screenshots/v2/boxes.json (posición de cada elemento) y tools/spec-movil.mjs.
// Uso: node tools/build-movil.mjs   (desde video-guia/)
// El generador horizontal anterior (tools/build.mjs + tools/spec.mjs) no se modifica.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { scenes } from './spec-movil.mjs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const rd = p => JSON.parse(fs.readFileSync(ROOT + p, 'utf8'));
const lines = Object.fromEntries(rd('narracion.json').map(l => [l.id, l]));
const dur = rd('assets/voz/duraciones.json');
const boxes = rd('assets/screenshots/v2/boxes.json');
const words = fs.existsSync(ROOT + 'assets/voz/palabras.json') ? rd('assets/voz/palabras.json') : {};
const avisos = [];
const aviso = m => { if (!avisos.includes(m)) avisos.push(m); };

// ---- lienzo ----
const W = 1080, H = 1920;

// ---- ritmo ----
const LEAD = 1.1, GAP = 1.6, TAIL = 1.5, CARD_HOLD = 1.2, INTRO_PRE = 1.4, OUTRO_TAIL = 3.0;
const r2 = n => Math.round(n * 100) / 100;

// ---- geometría (px del video) ----
// Computadora: captura 1440×900 escalada al ancho del video.
const DESK = { cw: 1440, ch: 900, s: 0.725, bar: 46 };
DESK.vw = DESK.cw * DESK.s; DESK.vh = DESK.ch * DESK.s; DESK.vx = (W - DESK.vw) / 2; DESK.vy = 520;
// Celular: captura 390×844 dentro de un teléfono.
const MOB = { cw: 390, ch: 844, s: 1.36 };
MOB.vw = MOB.cw * MOB.s; MOB.vh = MOB.ch * MOB.s; MOB.vx = (W - MOB.vw) / 2; MOB.vy = 500;
const HEAD_X = 64, HEAD_W = W - 128;

// ---- tiempos ----
const plan = []; let t = 0;
for (const sc of scenes) {
  const S = { ...sc, start: t, lines: [] };
  let cur = sc.kind === 'intro' ? INTRO_PRE : sc.card ? 0.8 : LEAD;
  sc.lines.forEach(ln => {
    const d = dur[ln.id];
    if (d === undefined) throw new Error(`Falta la voz de ${ln.id}: ejecuta tools/voz_edge.py`);
    S.lines.push({ ...ln, text: lines[ln.id].text, start: r2(cur), dur: d });
    cur += d + GAP + (ln.card ? CARD_HOLD : 0);
  });
  const last = S.lines.at(-1);
  S.dur = r2(last.start + last.dur + (sc.kind === 'outro' ? OUTRO_TAIL : TAIL));
  for (let i = 0; i < S.lines.length; i++) S.lines[i].end = i + 1 < S.lines.length ? S.lines[i + 1].start : S.dur;
  plan.push(S); t = r2(t + S.dur);
}
const TOTAL = t;

function wordAt(L, i) {
  const ws = words[L.id]; const toks = L.text.split(/\s+/).filter(Boolean);
  if (!ws || ws.length !== toks.length) return (i / L.text.length) * L.dur;
  const k = L.text.slice(0, i).split(/\s+/).filter(Boolean).length - (/\S$/.test(L.text.slice(0, i)) ? 1 : 0);
  return ws[Math.max(0, Math.min(ws.length - 1, k))].start;
}
function when(L, kw) {
  const i = L.text.toLowerCase().indexOf(kw.toLowerCase());
  if (i < 0) { aviso(`"${kw}" no aparece en ${L.id}; se usa el inicio de la frase`); return L.start + 0.6; }
  return L.start + wordAt(L, i);
}

// ---- cajas: si una captura no tiene la posición de un elemento, se omite ese foco ----
function boxOf(img, ref) {
  if (Array.isArray(ref)) {
    const bs = ref.map(r => boxOf(img, r)).filter(b => b && b !== 'urlbar');
    if (!bs.length) return null;
    const x = Math.min(...bs.map(q => q.x)), y = Math.min(...bs.map(q => q.y));
    return { x, y, w: Math.max(...bs.map(q => q.x + q.w)) - x, h: Math.max(...bs.map(q => q.y + q.h)) - y };
  }
  if (typeof ref === 'object') return ref;
  if (ref === 'urlbar') return 'urlbar';
  const b = boxes[img]?.boxes?.[ref];
  if (!b) { aviso(`sin posición: ${img}.${ref} (se omite el resaltado)`); return null; }
  return b;
}
function camFor(G, b) {
  const pad = G === MOB ? 10 : 16;
  const bw = b.w + pad * 2, bh = b.h + pad * 2, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  // en vertical la captura de computadora se ve pequeña: se acerca más
  const zmax = G === MOB ? 1.8 : 2.6;
  let z = Math.min(0.62 * G.cw / bw, 0.62 * G.ch / bh, zmax);
  z = Math.max(G === MOB ? 1 : 1.25, z);
  let tx = G.cw / 2 - cx * z, ty = G.ch / 2 - cy * z;
  tx = Math.min(0, Math.max(G.cw - G.cw * z, tx));
  ty = Math.min(0, Math.max(G.ch - G.ch * z, ty));
  return { z: r2(z), x: r2(tx), y: r2(ty), sx: r2(G.vx + (cx * z + tx) * G.s), sy: r2(G.vy + (cy * z + ty) * G.s) };
}

const FONT = `@font-face{font-family:'Atkinson Hyperlegible Next';src:url('assets/fonts/AtkinsonHyperlegibleNext-latin.woff2') format('woff2');font-weight:200 800;font-style:normal;}`;
const BASE_CSS = `
${FONT}
#root{position:absolute;inset:0;font-family:'Atkinson Hyperlegible Next',sans-serif;color:#1A1F29;}
#root .bg{position:absolute;inset:0;background:#F4F6F9;}
#root .stage{position:absolute;inset:0;}
#root .panel{position:absolute;left:${HEAD_X}px;top:96px;width:${HEAD_W}px;}
#root .chap{font-size:36px;font-weight:700;color:#23408E;line-height:1.2;}
#root .chap-rule{width:64px;height:5px;background:#8C2F2B;border-radius:3px;margin-top:16px;}
#root .step{position:absolute;left:${HEAD_X}px;top:208px;width:${HEAD_W}px;}
#root .step .n{font-size:32px;font-weight:600;color:#5B6475;}
#root .step .t{margin-top:10px;font-size:62px;font-weight:700;line-height:1.12;color:#1A1F29;}
#root .next{position:absolute;left:${HEAD_X}px;top:${DESK.vy + DESK.vh + 76}px;width:${HEAD_W}px;}
#root .next .h{font-size:28px;font-weight:600;color:#5B6475;letter-spacing:.02em;text-transform:uppercase;}
#root .next .i{margin-top:18px;display:flex;align-items:center;gap:20px;font-size:38px;font-weight:600;color:#1A1F29;}
#root .next .i b{flex:none;display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:50%;border:3px solid #C9CFDA;color:#5B6475;font-size:26px;font-weight:700;}
#root .prog{position:absolute;left:${HEAD_X}px;top:1812px;width:${HEAD_W}px;height:10px;border-radius:5px;background:#E1E5EC;overflow:hidden;}
#root .prog i{position:absolute;left:0;top:0;bottom:0;background:#23408E;border-radius:5px;}
#root .shot{position:absolute;inset:0;}
#root .frame{position:absolute;left:${DESK.vx - 1}px;top:${DESK.vy - DESK.bar - 1}px;width:${DESK.vw + 2}px;height:${DESK.vh + DESK.bar + 2}px;background:#fff;border:1px solid #E1E5EC;border-radius:16px;overflow:hidden;}
#root .bar{position:absolute;left:0;top:0;right:0;height:${DESK.bar}px;background:#fff;border-bottom:1px solid #E1E5EC;display:flex;align-items:center;gap:9px;padding:0 18px;}
#root .dot{width:12px;height:12px;border-radius:50%;background:#E1E5EC;}
#root .url{margin-left:14px;height:30px;padding:0 16px;border-radius:15px;background:#F4F6F9;line-height:30px;color:#5B6475;}
#root .url span{display:inline-block;font-size:20px;}
#root .screen{position:absolute;left:0;top:${DESK.bar}px;width:${DESK.cw}px;height:${DESK.ch}px;transform:scale(${DESK.s});transform-origin:0 0;overflow:hidden;}
#root .phone{position:absolute;left:${MOB.vx - 12}px;top:${MOB.vy - 12}px;width:${MOB.vw + 24}px;height:${MOB.vh + 24}px;background:#1A1F29;border-radius:56px;}
#root .phone .screen{left:12px;top:12px;width:${MOB.cw}px;height:${MOB.ch}px;transform:scale(${MOB.s});border-radius:34px;}
#root .cam{position:absolute;left:0;top:0;width:100%;height:100%;transform-origin:0 0;}
#root .cam img.shotimg{position:absolute;left:0;top:0;width:100%;height:100%;}
#root .hl{position:absolute;border-style:solid;border-color:#8C2F2B;opacity:0;}
#root .privacy{position:absolute;object-fit:cover;}
#root .cursor{position:absolute;left:0;top:0;width:44px;height:44px;opacity:0;}
#root .touch{position:absolute;left:0;top:0;width:72px;height:72px;margin:-36px 0 0 -36px;border-radius:50%;border:5px solid #8C2F2B;background:rgba(140,47,43,.14);opacity:0;}
#root .card{position:absolute;left:0;top:0;width:${W}px;height:${H}px;}
#root .card .kicker{position:absolute;left:${HEAD_X + 16}px;top:560px;font-size:38px;font-weight:600;color:#8C2F2B;}
#root .card h1{position:absolute;left:${HEAD_X + 16}px;top:624px;width:${HEAD_W - 32}px;font-size:96px;font-weight:700;color:#23408E;line-height:1.05;}
#root .card .idea{position:absolute;left:${HEAD_X + 16}px;width:${HEAD_W - 32}px;font-size:46px;font-weight:600;color:#1A1F29;display:flex;align-items:center;gap:28px;line-height:1.15;}
#root .card .idea b{flex:none;display:inline-flex;align-items:center;justify-content:center;width:72px;height:72px;border-radius:50%;border:4px solid #23408E;color:#23408E;font-size:34px;font-weight:700;}
`;

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
const CURSOR_SVG = `<svg viewBox="0 0 24 24" width="44" height="44"><path d="M4 2 L4 20 L9 15.5 L12.5 22 L15.5 20.6 L12.2 14.2 L18.5 14.2 Z" fill="#1A1F29" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

function buildScene(S, file) {
  const id = S.id; const html = []; const js = [];
  const tw = [];
  const T = (sel, from, to, at) => tw.push({ sel, from, to, at: r2(at) });
  const emit = () => {
    const first = {};
    for (const x of tw) if (!(x.sel in first) || x.at < first[x.sel].at) first[x.sel] = x;
    for (const x of tw) {
      const to = first[x.sel] === x ? x.to : { ...x.to, immediateRender: false };
      js.push(`tl.fromTo(${JSON.stringify(x.sel)}, ${JSON.stringify(x.from)}, ${JSON.stringify(to)}, ${x.at});`);
    }
  };
  let n = 0; const uid = p => `${id}-${p}${++n}`;

  html.push(`<div class="bg"></div>`);
  html.push(`<div id="${id}-stage" class="stage">`);

  if (S.kind === 'intro') {
    const L = S.lines[0];
    html.push(`<div id="${id}-hero" class="clip" data-start="0" data-duration="${S.dur}" style="position:absolute;inset:0">
  <img id="${id}-logo" src="assets/logo.png" alt="" style="position:absolute;left:${(W - 320) / 2}px;top:500px;width:320px;height:320px;object-fit:contain">
  <div id="${id}-title" style="position:absolute;left:${HEAD_X}px;width:${HEAD_W}px;top:900px;text-align:center;font-size:80px;font-weight:700;color:#23408E;line-height:1.08">Ciencias e Ingeniería</div>
  <div id="${id}-sub" style="position:absolute;left:${HEAD_X}px;width:${HEAD_W}px;top:1000px;text-align:center;font-size:52px;font-weight:600;color:#5B6475">Guía de uso</div>
  <div id="${id}-rule" style="position:absolute;left:${(W - 64) / 2}px;top:1100px;width:64px;height:5px;border-radius:3px;background:#8C2F2B"></div>
  <div id="${id}-tag" style="position:absolute;left:${HEAD_X + 40}px;width:${HEAD_W - 80}px;top:1140px;text-align:center;font-size:44px;font-weight:400;color:#1A1F29;line-height:1.3">Notas, asistencia y horarios del año escolar en un solo lugar.</div>
</div>`);
    T(`#${id}-logo`, { opacity: 1, scale: 0.94 }, { opacity: 1, scale: 1, duration: 1.1, ease: 'power3.out' }, 0);
    T(`#${id}-title`, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.8);
    T(`#${id}-sub`, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 1.0);
    T(`#${id}-rule`, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'power2.out' }, 1.2);
    T(`#${id}-tag`, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, when(L, 'Notas') - 0.2);
    T(`#${id}-logo`, { scale: 1 }, { scale: 1.04, duration: S.dur - 1.2, ease: 'none' }, 1.1);
  } else {
    const stepLines = S.lines.filter(l => l.shots);
    const firstShot = stepLines[0];
    if (firstShot) {
      const ps = r2(firstShot.start - 0.5);
      const lastShot = stepLines.at(-1);
      const pe = lastShot.end === S.dur ? S.dur : r2(lastShot.end + 0.4);
      html.push(`<div id="${id}-panel" class="panel clip" data-start="${ps}" data-duration="${r2(pe - ps)}"><div class="chap">${esc(S.label)}</div><div class="chap-rule"></div></div>`);
      T(`#${id}-panel`, { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }, ps + 0.05);
      if (pe < S.dur) T(`#${id}-panel`, { opacity: 1 }, { opacity: 0, duration: 0.4 }, r2(pe - 0.4));
    }
    let stepNo = 0; const totalSteps = stepLines.length;
    S.lines.forEach((L, li) => {
      if (L.card) {
        const c = S.card; const ce = L.end;
        html.push(`<div id="${id}-card" class="card clip" data-start="0" data-duration="${r2(ce)}">
  <div id="${id}-card-in" style="position:absolute;inset:0;transform-origin:${HEAD_X}px 800px">
  <div class="kicker">${esc(S.label)}</div>
  <h1 id="${id}-card-h">${esc(c.title)}</h1>
${c.ideas.map((x, k) => `  <div id="${id}-idea${k}" class="idea" style="top:${930 + k * 150}px"><b>${k + 1}</b><span>${esc(x)}</span></div>`).join('\n')}
  </div>
</div>`);
        T(`#${id}-card-in`, { scale: 1 }, { scale: 1.03, duration: r2(ce - 0.4), ease: 'none' }, 0);
        T(`#${id}-card .kicker`, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.15);
        T(`#${id}-card-h`, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.25);
        c.ideas.forEach((_, k) => T(`#${id}-idea${k}`, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.55, ease: 'power3.out' }, L.start + 0.6 + k * Math.max(0.8, (L.dur - 0.6) / 3)));
        T(`#${id}-card-in`, { opacity: 1 }, { opacity: 0, duration: 0.4 }, ce - 0.4);
        return;
      }
      if (L.note) {
        html.push(`<div id="${id}-note" class="clip" data-start="${r2(L.start - 0.5)}" data-duration="${r2(L.end - L.start + 0.5)}" style="position:absolute;inset:0">
  <div id="${id}-note-a" style="position:absolute;left:${HEAD_X + 16}px;width:${HEAD_W - 32}px;top:720px;font-size:46px;font-weight:600;color:#8C2F2B">¿Dudas o algún dato incorrecto?</div>
  <div id="${id}-note-b" style="position:absolute;left:${HEAD_X + 16}px;width:${HEAD_W - 32}px;top:800px;font-size:92px;font-weight:700;color:#23408E;line-height:1.08">Comunícate con la administración.</div>
</div>`);
        T(`#${id}-note-a`, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, L.start - 0.4);
        T(`#${id}-note-b`, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, when(L, 'comunícate') - 0.3);
        T(`#${id}-note-b`, { scale: 1 }, { scale: 1.02, duration: r2(L.end - L.start), ease: 'none' }, L.start);
        return;
      }
      if (L.end === true || L.id === 'c3') {
        html.push(`<div id="${id}-end" class="clip" data-start="${r2(L.start - 0.6)}" data-duration="${r2(S.dur - L.start + 0.6)}" style="position:absolute;inset:0">
  <img id="${id}-end-logo" src="assets/logo.png" alt="" style="position:absolute;left:${(W - 260) / 2}px;top:560px;width:260px;height:260px;object-fit:contain">
  <div id="${id}-end-t" style="position:absolute;left:${HEAD_X}px;width:${HEAD_W}px;top:880px;text-align:center;font-size:80px;font-weight:700;color:#23408E;line-height:1.08">Listo para usar el sistema</div>
  <div id="${id}-end-s" style="position:absolute;left:${HEAD_X}px;width:${HEAD_W}px;top:1090px;text-align:center;font-size:36px;font-weight:400;color:#5B6475">Ciencias e Ingeniería · Gestión académica</div>
</div>`);
        T(`#${id}-end-logo`, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' }, L.start - 0.5);
        T(`#${id}-end-t`, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, L.start - 0.1);
        T(`#${id}-end-s`, { opacity: 0 }, { opacity: 1, duration: 0.6 }, L.start + 0.5);
        return;
      }

      // ---- frase con capturas ----
      stepNo++;
      const sStart = r2(L.start - 0.35), sEnd = L.end;
      const stepId = `${id}-step${stepNo}`;
      const allDesk = L.shots.every(sh => !sh.img.endsWith('-mobile'));
      const proximos = stepLines.slice(stepNo, stepNo + 3);
      html.push(`<div id="${stepId}" class="step clip" data-start="${sStart}" data-duration="${r2(sEnd - sStart)}"><div class="n">Paso ${stepNo} de ${totalSteps}</div><div class="t">${esc(L.step)}</div></div>`);
      T(`#${stepId} .n`, { opacity: 0 }, { opacity: 1, duration: 0.4 }, sStart + 0.05);
      T(`#${stepId} .t`, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, sStart + 0.1);
      // barra de progreso del capítulo
      const pid = `${id}-prog${stepNo}`;
      html.push(`<div id="${pid}" class="prog clip" data-start="${sStart}" data-duration="${r2(sEnd - sStart)}"><i id="${pid}-i" style="width:${r2(((stepNo - 1) / totalSteps) * 100)}%"></i></div>`);
      T(`#${pid}-i`, { width: `${r2(((stepNo - 1) / totalSteps) * 100)}%` }, { width: `${r2((stepNo / totalSteps) * 100)}%`, duration: 0.6, ease: 'power2.out' }, sStart + 0.2);
      // lo que viene después (solo cuando la captura es de computadora y deja espacio abajo)
      if (allDesk && proximos.length) {
        const nid = `${id}-next${stepNo}`;
        html.push(`<div id="${nid}" class="next clip" data-start="${sStart}" data-duration="${r2(sEnd - sStart)}"><div class="h">A continuación</div>${proximos.map((p, k) => `<div class="i"><b>${stepNo + k + 1}</b><span>${esc(p.step)}</span></div>`).join('')}</div>`);
        T(`#${nid}`, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, sStart + 0.4);
      }

      const shotStarts = L.shots.map((sh, k) => k === 0 ? (li === S.lines.findIndex(x => x.shots) ? r2(L.start - 0.5) : sStart) : r2(when(L, sh.at) - 0.3));
      L.shots.forEach((sh, k) => {
        const mobile = sh.img.endsWith('-mobile');
        const G = mobile ? MOB : DESK;
        const st = shotStarts[k];
        const en = k + 1 < L.shots.length ? r2(shotStarts[k + 1] + 0.4) : r2(Math.min(S.dur, sEnd + 0.4));
        const sid = uid('shot');
        const parts = [];
        parts.push(`<div id="${sid}" class="shot clip" data-start="${st}" data-duration="${r2(en - st)}">`);
        parts.push(`  <div id="${sid}-in" style="position:absolute;inset:0">`);
        if (mobile) parts.push(`    <div class="phone"><div class="screen">`);
        else parts.push(`    <div class="frame"><div class="bar"><i class="dot"></i><i class="dot"></i><i class="dot"></i><div id="${sid}-url" class="url" data-layout-ignore><span>${esc(sh.url || '/')}</span></div></div><div class="screen">`);
        parts.push(`      <div id="${sid}-cam" class="cam"><img class="shotimg" src="assets/screenshots/v2/${sh.img}.png" alt="">`);
        (sh.privacy || []).forEach((p, pi) => {
          const b = boxOf(sh.img, p.ref);
          if (!b) { aviso(`¡${sh.img}: no se pudo ubicar el dato privado "${p.ref}"! Revisa la captura antes de publicar.`); return; }
          parts.push(`        <img id="${sid}-priv${pi}" class="privacy" src="assets/privacidad/${p.src}" alt="" style="left:${b.x}px;top:${b.y}px;width:${b.w - (p.trimRight || 0)}px;height:${b.h}px">`);
        });
        const foci = sh.focus.map(([kw, ref]) => ({ kw, b: boxOf(sh.img, ref) })).filter(f => f.b);
        const camStates = [];
        foci.forEach((f, fi) => {
          if (f.b === 'urlbar') { camStates.push(null); return; }
          const c = camFor(G, f.b); camStates.push(c);
          const bw = r2(5 / (G.s * c.z)), pad = mobile ? 6 : 8;
          parts.push(`        <div id="${sid}-hl${fi}" class="hl" style="left:${r2(f.b.x - pad)}px;top:${r2(f.b.y - pad)}px;width:${r2(f.b.w + pad * 2)}px;height:${r2(f.b.h + pad * 2)}px;border-width:${bw}px;border-radius:${r2(12 / (G.s * c.z))}px"></div>`);
        });
        parts.push(`      </div>`);
        parts.push(`    </div></div>`);
        parts.push(mobile ? `    <div id="${sid}-cur" class="touch"></div>` : `    <div id="${sid}-cur" class="cursor">${CURSOR_SVG}</div>`);
        parts.push(`  </div>`);
        parts.push(`</div>`);
        html.push(parts.join('\n'));

        T(`#${sid}-in`, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out' }, st);
        let prev = { z: 1, x: 0, y: 0 }; let prevT = st; let curPos = null;
        foci.forEach((f, fi) => {
          let at = Math.max(prevT + (fi ? 1.0 : 0.4), when(L, f.kw) - 0.35);
          if (k + 1 < L.shots.length) at = Math.min(at, shotStarts[k + 1] - 0.9);
          const hlOutPrev = fi > 0 && camStates[fi - 1] ? `#${sid}-hl${fi - 1}` : null;
          if (hlOutPrev) T(hlOutPrev, { opacity: 1 }, { opacity: 0, duration: 0.25 }, at);
          if (f.b === 'urlbar') {
            T(`#${sid}-url`, { backgroundColor: '#F4F6F9', boxShadow: '0 0 0 0px #8C2F2B' }, { backgroundColor: '#FFFFFF', boxShadow: '0 0 0 4px #8C2F2B', duration: 0.35 }, at + 0.2);
            T(`#${sid}-url`, { boxShadow: '0 0 0 4px #8C2F2B' }, { boxShadow: '0 0 0 0px #8C2F2B', duration: 0.3 }, at + 2.2);
            prevT = at; return;
          }
          const c = camStates[fi];
          T(`#${sid}-cam`, { scale: prev.z, x: prev.x, y: prev.y }, { scale: c.z, x: c.x, y: c.y, duration: 0.8, ease: 'power2.inOut' }, at);
          T(`#${sid}-hl${fi}`, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }, at + 0.7);
          const tx = mobile ? c.sx : c.sx - 4, ty = mobile ? c.sy : c.sy - 2;
          if (!curPos) {
            const sx0 = mobile ? MOB.vx + MOB.vw * 0.7 : DESK.vx + DESK.vw * 0.78, sy0 = mobile ? MOB.vy + MOB.vh * 0.62 : DESK.vy + DESK.vh * 0.8;
            T(`#${sid}-cur`, { opacity: 0, x: sx0, y: sy0 }, { opacity: 1, duration: 0.25 }, at);
            curPos = { x: sx0, y: sy0 };
          }
          T(`#${sid}-cur`, { x: curPos.x, y: curPos.y }, { x: tx, y: ty, duration: 0.8, ease: 'power2.inOut' }, at);
          if (mobile) T(`#${sid}-cur`, { scale: 1 }, { scale: 0.8, duration: 0.15, yoyo: true, repeat: 1, ease: 'power1.inOut' }, at + 0.82);
          curPos = { x: tx, y: ty };
          prev = c; prevT = at;
        });
        const d0 = r2(prevT + (foci.length ? 0.85 : 0.3)), d1 = r2(en - 0.4);
        if (d1 - d0 > 1.2) {
          const z2 = r2(prev.z * 1.035), dz = z2 - prev.z;
          T(`#${sid}-cam`, { scale: prev.z, x: prev.x, y: prev.y }, { scale: z2, x: r2(prev.x - G.cw / 2 * dz), y: r2(prev.y - G.ch / 2 * dz), duration: r2(d1 - d0), ease: 'none' }, d0);
        }
        T(`#${sid}-in`, { opacity: 1 }, { opacity: 0, duration: 0.4, ease: 'power1.in' }, r2(en - 0.4));
      });
    });
  }
  html.push(`</div>`);
  if (S.kind !== 'intro') T(`#${id}-stage`, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power1.out' }, 0);
  T(`#${id}-stage`, { opacity: 1 }, { opacity: 0, duration: 0.45, ease: 'power1.in' }, r2(S.dur - 0.45));
  emit();

  fs.writeFileSync(ROOT + 'compositions/' + file, `<template>
<style>${BASE_CSS}</style>
<div id="root" data-composition-id="${id}" data-width="${W}" data-height="${H}" data-duration="${S.dur}">
${html.join('\n')}
</div>
<script>
const tl = gsap.timeline({ paused: true });
${js.join('\n')}
window.__timelines = window.__timelines || {};
window.__timelines["${id}"] = tl;
</script>
</template>
`);
}

// ---- voz: una sola pista con cada frase en su momento ----
function buildVoice() {
  const items = []; for (const S of plan) for (const L of S.lines) items.push({ id: L.id, at: S.start + L.start });
  // filtro en línea (ffmpeg 7+ ya no acepta -filter_complex_script); con 56 frases cabe en la línea de Windows
  const f = items.map((it, i) => `[${i}]adelay=${Math.round(it.at * 1000)}:all=1[a${i}]`).join(';') +
    ';' + items.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${items.length}:normalize=0:dropout_transition=0,apad=whole_dur=${TOTAL}[out]`;
  const args = ['-v', 'error', '-y'];
  items.forEach(it => args.push('-i', ROOT + `assets/voz/${it.id}.wav`));
  args.push('-filter_complex', f, '-map', '[out]', '-ar', '48000', '-ac', '2', '-t', String(TOTAL), ROOT + 'assets/voz/narracion.wav');
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
}

const FILES = { apertura: 'm01-apertura.html', ingreso: 'm02-ingreso.html', pantalla: 'm03-pantalla.html', admin: 'm04-administrador.html', profesor: 'm05-profesor.html', alumno: 'm06-alumno.html', apoderado: 'm07-apoderado.html', cierre: 'm08-cierre.html' };
fs.mkdirSync(ROOT + 'compositions', { recursive: true });
for (const S of plan) buildScene(S, FILES[S.id]);
// difuminado canónico (/media-use) de los recortes con contraseñas
for (const f of Object.values(FILES)) {
  if (!fs.readFileSync(ROOT + 'compositions/' + f, 'utf8').includes('class="privacy"')) continue;
  try {
    execFileSync(`npx --yes hyperframes@0.9.9 media-treatment --project . --file compositions/${f} --selector "img.privacy" --grading "{\\"effects\\":{\\"blur\\":1}}" --apply`, { cwd: ROOT, stdio: 'ignore', shell: true });
  } catch { aviso(`no se pudo aplicar el difuminado en ${f}: revisa que npx funcione`); }
}
if (!process.argv.includes('--no-audio')) buildVoice();

const hosts = plan.map(S => `      <div id="${S.id}" data-composition-id="${S.id}" data-composition-src="compositions/${FILES[S.id]}" data-start="${S.start}" data-duration="${S.dur}" data-track-index="1" data-track-kind="graphics" data-width="${W}" data-height="${H}"></div>`).join('\n');
fs.writeFileSync(ROOT + 'index.html', `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>Ciencias e Ingeniería · Guía de uso (celular)</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #F4F6F9; }
      #main { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; }
      #main-bg { position: absolute; inset: 0; background: #F4F6F9; }
    </style>
  </head>
  <body>
    <div id="main" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="${W}" data-height="${H}">
      <div id="main-bg"></div>
${hosts}
      <audio id="voz" class="clip" src="assets/voz/narracion.wav" data-start="0" data-duration="${TOTAL}" data-track-index="3" data-volume="1"></audio>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`);
fs.writeFileSync(ROOT + 'tools/plan-movil.json', JSON.stringify(plan.map(S => ({ id: S.id, start: S.start, dur: S.dur, lines: S.lines.map(l => ({ id: l.id, start: r2(S.start + l.start), dur: l.dur })) })), null, 1));
console.log('total', TOTAL, 's =', Math.floor(TOTAL / 60) + ':' + String(Math.round(TOTAL % 60)).padStart(2, '0'));
for (const S of plan) console.log(S.id.padEnd(10), S.start, '+', S.dur);
if (avisos.length) { console.log('\nAvisos:'); avisos.forEach(a => console.log(' -', a)); }
