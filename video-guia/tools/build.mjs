// Genera index.html, compositions/*.html y la pista de voz a partir de
// narracion.json (texto), assets/voz/duraciones.json (tiempos reales de la voz),
// assets/screenshots/v2/boxes.json (posición de cada elemento) y tools/spec.mjs.
// Uso: node tools/build.mjs   (desde video-guia/)
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { scenes } from './spec.mjs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const rd = p => JSON.parse(fs.readFileSync(ROOT + p, 'utf8'));
const lines = Object.fromEntries(rd('narracion.json').map(l => [l.id, l]));
const dur = rd('assets/voz/duraciones.json');
const boxes = rd('assets/screenshots/v2/boxes.json');
// tiempos por palabra de la voz (Edge-TTS); si faltan, se reparte por caracteres
const words = fs.existsSync(ROOT + 'assets/voz/palabras.json') ? rd('assets/voz/palabras.json') : {};

// ---- ritmo ----
const LEAD = 1.3, GAP = 2.2, TAIL = 1.8, CARD_HOLD = 1.6, INTRO_PRE = 1.6, OUTRO_TAIL = 3.2;
const r2 = n => Math.round(n * 100) / 100;

// ---- geometría (px del video) ----
const DESK = { cw: 1440, ch: 900, s: 0.8, vx: 112, vy: 124, bar: 40 }; // pantalla 1152×720
DESK.vw = DESK.cw * DESK.s; DESK.vh = DESK.ch * DESK.s;
const MOB = { cw: 390, ch: 844, s: 0.88 };
MOB.vw = MOB.cw * MOB.s; MOB.vh = MOB.ch * MOB.s; MOB.vx = DESK.vx + (DESK.vw - MOB.vw) / 2; MOB.vy = 76;
const PANEL_X = 1320, PANEL_W = 408;

// ---- tiempos ----
const plan = []; let t = 0;
for (const sc of scenes) {
  const S = { ...sc, start: t, lines: [] };
  let cur = sc.kind === 'intro' ? INTRO_PRE : sc.card ? 0.9 : LEAD;
  sc.lines.forEach((ln, i) => {
    const d = dur[ln.id];
    const L = { ...ln, text: lines[ln.id].text, start: r2(cur), dur: d };
    S.lines.push(L);
    cur += d + GAP + (ln.card ? CARD_HOLD : 0);
  });
  const last = S.lines.at(-1);
  S.dur = r2(last.start + last.dur + (sc.kind === 'outro' ? OUTRO_TAIL : TAIL));
  for (let i = 0; i < S.lines.length; i++) S.lines[i].end = i + 1 < S.lines.length ? S.lines[i + 1].start : S.dur;
  plan.push(S); t = r2(t + S.dur);
}
const TOTAL = t;

// momento (s, relativo a la escena) en que la voz dice `kw` dentro de la frase
// segundos (relativos a la frase) en que empieza la palabra que está en la posición `i` del texto
function wordAt(L, i) {
  const ws = words[L.id]; const toks = L.text.split(/\s+/).filter(Boolean);
  if (!ws || ws.length !== toks.length) return (i / L.text.length) * L.dur;
  const k = L.text.slice(0, i).split(/\s+/).filter(Boolean).length - (/\S$/.test(L.text.slice(0, i)) ? 1 : 0);
  return ws[Math.max(0, Math.min(ws.length - 1, k))].start;
}
function wordEnd(L, i) {
  const ws = words[L.id]; const toks = L.text.split(/\s+/).filter(Boolean);
  if (!ws || ws.length !== toks.length) return (i / L.text.length) * L.dur;
  const k = L.text.slice(0, i).split(/\s+/).filter(Boolean).length - 1;
  return ws[Math.max(0, Math.min(ws.length - 1, k))].end;
}
function when(L, kw) {
  const i = L.text.toLowerCase().indexOf(kw.toLowerCase());
  if (i < 0) throw new Error(`"${kw}" no aparece en ${L.id}: ${L.text}`);
  return L.start + wordAt(L, i);
}

// ---- utilidades de cámara ----
function boxOf(img, ref) {
  if (Array.isArray(ref)) {
    const bs = ref.map(r => boxOf(img, r));
    const x = Math.min(...bs.map(q => q.x)), y = Math.min(...bs.map(q => q.y));
    return { x, y, w: Math.max(...bs.map(q => q.x + q.w)) - x, h: Math.max(...bs.map(q => q.y + q.h)) - y };
  }
  if (typeof ref === 'object') return ref;
  if (ref === 'urlbar') return 'urlbar';
  const b = boxes[img]?.boxes?.[ref];
  if (!b) throw new Error(`caja ${img}.${ref} no existe`);
  return b;
}
function camFor(G, b) {
  const pad = G === MOB ? 10 : 16;
  const bw = b.w + pad * 2, bh = b.h + pad * 2, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const zmax = G === MOB ? 2.0 : 2.1;
  let z = Math.min(0.6 * G.cw / bw, 0.6 * G.ch / bh, zmax);
  z = Math.max(1, z);
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
#root .panel{position:absolute;left:${PANEL_X}px;top:124px;width:${PANEL_W}px;}
#root .chap{font-size:30px;font-weight:700;color:#23408E;line-height:1.2;}
#root .chap-rule{width:56px;height:4px;background:#8C2F2B;border-radius:2px;margin-top:18px;}
#root .step{position:absolute;left:${PANEL_X}px;top:250px;width:${PANEL_W}px;}
#root .step .n{font-size:28px;font-weight:600;color:#5B6475;}
#root .step .t{margin-top:10px;font-size:44px;font-weight:700;line-height:1.15;color:#1A1F29;}
#root .shot{position:absolute;inset:0;}
#root .frame{position:absolute;left:${DESK.vx - 1}px;top:${DESK.vy - DESK.bar - 1}px;width:${DESK.vw + 2}px;height:${DESK.vh + DESK.bar + 2}px;background:#fff;border:1px solid #E1E5EC;border-radius:14px;overflow:hidden;}
#root .bar{position:absolute;left:0;top:0;right:0;height:${DESK.bar}px;background:#fff;border-bottom:1px solid #E1E5EC;display:flex;align-items:center;gap:8px;padding:0 16px;}
#root .dot{width:11px;height:11px;border-radius:50%;background:#E1E5EC;}
#root .url{margin-left:14px;height:26px;padding:0 14px;border-radius:13px;background:#F4F6F9;font-size:28px;line-height:26px;color:#5B6475;transform-origin:left center;}
#root .url span{display:inline-block;font-size:17px;}
#root .screen{position:absolute;left:0;top:${DESK.bar}px;width:${DESK.cw}px;height:${DESK.ch}px;transform:scale(${DESK.s});transform-origin:0 0;overflow:hidden;}
#root .phone{position:absolute;left:${MOB.vx - 10}px;top:${MOB.vy - 10}px;width:${MOB.vw + 20}px;height:${MOB.vh + 20}px;background:#1A1F29;border-radius:40px;}
#root .phone .screen{left:10px;top:10px;width:${MOB.cw}px;height:${MOB.ch}px;transform:scale(${MOB.s});border-radius:38px;}
#root .cam{position:absolute;left:0;top:0;width:100%;height:100%;transform-origin:0 0;}
#root .cam img.shotimg{position:absolute;left:0;top:0;width:100%;height:100%;}
#root .hl{position:absolute;border-style:solid;border-color:#8C2F2B;opacity:0;}
#root .privacy{position:absolute;}
#root .cursor{position:absolute;left:0;top:0;width:34px;height:34px;opacity:0;}
#root .touch{position:absolute;left:0;top:0;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;border:4px solid #8C2F2B;background:rgba(140,47,43,.14);opacity:0;}
#root .card{position:absolute;left:0;top:0;width:1920px;height:1080px;}
#root .card .kicker{position:absolute;left:192px;top:236px;font-size:30px;font-weight:600;color:#8C2F2B;}
#root .card h1{position:absolute;left:192px;top:290px;font-size:96px;font-weight:700;color:#23408E;line-height:1.05;}
#root .card .idea{position:absolute;left:192px;font-size:44px;font-weight:600;color:#1A1F29;display:flex;align-items:center;gap:28px;}
#root .card .idea b{display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;border:3px solid #23408E;color:#23408E;font-size:32px;font-weight:700;}
`;

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
const CURSOR_SVG = `<svg viewBox="0 0 24 24" width="34" height="34"><path d="M4 2 L4 20 L9 15.5 L12.5 22 L15.5 20.6 L12.2 14.2 L18.5 14.2 Z" fill="#1A1F29" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

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
  const SET = (sel, v, at) => js.push(`tl.set(${JSON.stringify(sel)}, ${JSON.stringify(v)}, ${r2(at)});`);
  let n = 0; const uid = p => `${id}-${p}${++n}`;

  // fondo y apertura/cierre de la escena
  html.push(`<div class="bg"></div>`);
  html.push(`<div id="${id}-stage" class="stage">`);

  if (S.kind === 'intro') {
    const L = S.lines[0];
    html.push(`<div id="${id}-hero" class="clip" data-start="0" data-duration="${S.dur}" style="position:absolute;inset:0">
  <img id="${id}-logo" src="assets/logo.png" alt="" style="position:absolute;left:840px;top:250px;width:240px;height:240px;object-fit:contain">
  <div id="${id}-title" style="position:absolute;left:0;right:0;top:540px;text-align:center;font-size:72px;font-weight:700;color:#23408E">Ciencias e Ingeniería · Guía de uso</div>
  <div id="${id}-rule" style="position:absolute;left:932px;top:650px;width:56px;height:4px;border-radius:2px;background:#8C2F2B"></div>
  <div id="${id}-tag" style="position:absolute;left:0;right:0;top:684px;text-align:center;font-size:40px;font-weight:400;color:#1A1F29">Notas, asistencia y horarios del año escolar en un solo lugar.</div>
</div>`);
    T(`#${id}-logo`, { opacity: 1, scale: 0.94 }, { opacity: 1, scale: 1, duration: 1.1, ease: 'power3.out' }, 0);
    T(`#${id}-title`, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.9);
    T(`#${id}-rule`, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'power2.out' }, 1.3);
    T(`#${id}-tag`, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, when(L, 'Notas') - 0.2);
    T(`#${id}-logo`, { scale: 1 }, { scale: 1.04, duration: S.dur - 1.2, ease: 'none' }, 1.1);
  } else {
    // panel de capítulo (no en tarjetas)
    const firstShot = S.lines.find(l => l.shots);
    if (firstShot) {
      const ps = r2(firstShot.start - 0.5);
      const lastShot = [...S.lines].reverse().find(l => l.shots);
      const pe = lastShot.end === S.dur ? S.dur : r2(lastShot.end + 0.4);
      html.push(`<div id="${id}-panel" class="panel clip" data-start="${ps}" data-duration="${r2(pe - ps)}"><div class="chap">${esc(S.label)}</div><div class="chap-rule"></div></div>`);
      T(`#${id}-panel`, { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }, ps + 0.05);
      if (pe < S.dur) T(`#${id}-panel`, { opacity: 1 }, { opacity: 0, duration: 0.4 }, r2(pe - 0.4));
    }
    let stepNo = 0;
    S.lines.forEach((L, li) => {
      if (L.card) {
        const c = S.card; const cs = 0, ce = L.end;
        html.push(`<div id="${id}-card" class="card clip" data-start="${cs}" data-duration="${r2(ce - cs)}">
  <div id="${id}-card-in" style="position:absolute;inset:0;transform-origin:192px 400px">
  <div class="kicker">${esc(S.label)}</div>
  <h1 id="${id}-card-h">${esc(c.title)}</h1>
${c.ideas.map((x, k) => `  <div id="${id}-idea${k}" class="idea" style="top:${470 + k * 110}px"><b>${k + 1}</b><span>${esc(x)}</span></div>`).join('\n')}
  </div>
</div>`);
        T(`#${id}-card-in`, { scale: 1 }, { scale: 1.03, duration: r2(ce - 0.4), ease: 'none' }, 0);
        T(`#${id}-card .kicker`, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.15);
        T(`#${id}-card-h`, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.25);
        c.ideas.forEach((_, k) => T(`#${id}-idea${k}`, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.55, ease: 'power3.out' }, L.start + 0.6 + k * Math.max(0.9, (L.dur - 0.6) / 3)));
        T(`#${id}-card-in`, { opacity: 1 }, { opacity: 0, duration: 0.4 }, ce - 0.4);
        return;
      }
      if (L.note) {
        html.push(`<div id="${id}-note" class="clip" data-start="${r2(L.start - 0.5)}" data-duration="${r2(L.end - L.start + 0.5)}" style="position:absolute;inset:0">
  <div id="${id}-note-a" style="position:absolute;left:192px;top:330px;font-size:40px;font-weight:600;color:#8C2F2B">¿Dudas o algún dato incorrecto?</div>
  <div id="${id}-note-b" style="position:absolute;left:192px;top:400px;width:1300px;font-size:84px;font-weight:700;color:#23408E;line-height:1.1">Comunícate con la administración.</div>
</div>`);
        T(`#${id}-note-a`, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, L.start - 0.4);
        T(`#${id}-note-a`, { scale: 1 }, { scale: 1.02, duration: r2(L.end - L.start), ease: 'none' }, L.start);
        T(`#${id}-note-b`, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, when(L, 'comunícate') - 0.3);
        return;
      }
      if (L.id === 'c3') {
        html.push(`<div id="${id}-end" class="clip" data-start="${r2(L.start - 0.6)}" data-duration="${r2(S.dur - L.start + 0.6)}" style="position:absolute;inset:0">
  <img id="${id}-end-logo" src="assets/logo.png" alt="" style="position:absolute;left:860px;top:300px;width:200px;height:200px;object-fit:contain">
  <div id="${id}-end-t" style="position:absolute;left:0;right:0;top:540px;text-align:center;font-size:76px;font-weight:700;color:#23408E">Listo para usar el sistema</div>
  <div id="${id}-end-s" style="position:absolute;left:0;right:0;top:648px;text-align:center;font-size:32px;font-weight:400;color:#5B6475">Ciencias e Ingeniería · Gestión académica</div>
</div>`);
        T(`#${id}-end-logo`, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' }, L.start - 0.5);
        T(`#${id}-end-t`, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, L.start - 0.1);
        T(`#${id}-end-s`, { opacity: 0 }, { opacity: 1, duration: 0.6 }, L.start + 0.5);
        T(`#${id}-end-t`, { scale: 1 }, { scale: 1.025, duration: r2(S.dur - L.start - 1.2), ease: 'none' }, L.start + 0.7);
        return;
      }

      // ---- frase con capturas ----
      stepNo++;
      const sStart = r2(L.start - 0.35), sEnd = L.end;
      const stepId = `${id}-step${stepNo}`;
      html.push(`<div id="${stepId}" class="step clip" data-start="${sStart}" data-duration="${r2(sEnd - sStart)}"><div class="n">Paso ${stepNo}</div><div class="t">${esc(L.step)}</div></div>`);
      T(`#${stepId} .n`, { opacity: 0 }, { opacity: 1, duration: 0.4 }, sStart + 0.05);
      T(`#${stepId} .t`, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, sStart + 0.1);

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
        (sh.privacy || []).forEach((p, pi) => parts.push(`        <img id="${sid}-priv${pi}" class="privacy" src="assets/privacidad/${p.src}" alt="" style="left:${p.box.x}px;top:${p.box.y}px;width:${p.box.w}px;height:${p.box.h}px">`));
        const foci = sh.focus.map(([kw, ref]) => ({ kw, b: boxOf(sh.img, ref) }));
        const camStates = [];
        foci.forEach((f, fi) => {
          if (f.b === 'urlbar') { camStates.push(null); return; }
          const c = camFor(G, f.b); camStates.push(c);
          const bw = r2(4 / (G.s * c.z)), pad = mobile ? 6 : 8;
          parts.push(`        <div id="${sid}-hl${fi}" class="hl" style="left:${r2(f.b.x - pad)}px;top:${r2(f.b.y - pad)}px;width:${r2(f.b.w + pad * 2)}px;height:${r2(f.b.h + pad * 2)}px;border-width:${bw}px;border-radius:${r2(10 / (G.s * c.z))}px"></div>`);
        });
        parts.push(`      </div>`);
        parts.push(`    </div></div>`);
        parts.push(mobile ? `    <div id="${sid}-cur" class="touch"></div>` : `    <div id="${sid}-cur" class="cursor">${CURSOR_SVG}</div>`);
        parts.push(`  </div>`);
        parts.push(`</div>`);
        html.push(parts.join('\n'));

        // entrada
        T(`#${sid}-in`, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out' }, st);
        // foco a foco
        let prev = { z: 1, x: 0, y: 0 }; let prevT = st; let curPos = null;
        foci.forEach((f, fi) => {
          let at = Math.max(prevT + (fi ? 1.1 : 0.5), when(L, f.kw) - 0.35);
          if (k + 1 < L.shots.length) at = Math.min(at, shotStarts[k + 1] - 0.9);
          const hlOutPrev = fi > 0 && camStates[fi - 1] ? `#${sid}-hl${fi - 1}` : null;
          if (hlOutPrev) T(hlOutPrev, { opacity: 1 }, { opacity: 0, duration: 0.25 }, at);
          if (f.b === 'urlbar') {
            T(`#${sid}-url`, { backgroundColor: '#F4F6F9', boxShadow: '0 0 0 0px #8C2F2B' }, { backgroundColor: '#FFFFFF', boxShadow: '0 0 0 3px #8C2F2B', duration: 0.35 }, at + 0.2);
            T(`#${sid}-url`, { boxShadow: '0 0 0 3px #8C2F2B' }, { boxShadow: '0 0 0 0px #8C2F2B', duration: 0.3 }, at + 2.4);
            prevT = at; return;
          }
          const c = camStates[fi];
          T(`#${sid}-cam`, { scale: prev.z, x: prev.x, y: prev.y }, { scale: c.z, x: c.x, y: c.y, duration: 0.8, ease: 'power2.inOut' }, at);
          T(`#${sid}-hl${fi}`, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }, at + 0.7);
          // cursor o toque
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
        // deriva lenta: la toma nunca queda congelada más de 3 s
        const d0 = r2(prevT + (foci.length ? 0.85 : 0.3)), d1 = r2(en - 0.4);
        if (d1 - d0 > 1.2) {
          const z2 = r2(prev.z * 1.035), dz = z2 - prev.z;
          T(`#${sid}-cam`, { scale: prev.z, x: prev.x, y: prev.y }, { scale: z2, x: r2(prev.x - G.cw / 2 * dz), y: r2(prev.y - G.ch / 2 * dz), duration: r2(d1 - d0), ease: 'none' }, d0);
        }
        // salida suave (se superpone con la siguiente toma)
        T(`#${sid}-in`, { opacity: 1 }, { opacity: 0, duration: 0.4, ease: 'power1.in' }, r2(en - 0.4));
      });
    });
  }
  html.push(`</div>`);
  // fundido de escena
  if (S.kind !== 'intro') T(`#${id}-stage`, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power1.out' }, 0);
  T(`#${id}-stage`, { opacity: 1 }, { opacity: 0, duration: 0.45, ease: 'power1.in' }, r2(S.dur - 0.45));
  emit();

  const doc = `<template>
<style>${BASE_CSS}</style>
<div id="root" data-composition-id="${id}" data-width="1920" data-height="1080" data-duration="${S.dur}">
${html.join('\n')}
</div>
<script>
const tl = gsap.timeline({ paused: true });
${js.join('\n')}
window.__timelines = window.__timelines || {};
window.__timelines["${id}"] = tl;
</script>
</template>
`;
  fs.writeFileSync(ROOT + 'compositions/' + file, doc);
}

// ---- subtítulos ----
function chunks(text, max = 78) {
  const out = []; let rest = text.trim();
  while (rest.length > max) {
    const win = rest.slice(0, max + 1);
    let cut = Math.max(win.lastIndexOf('. '), win.lastIndexOf(': '), win.lastIndexOf('; '));
    if (cut < max * 0.35) cut = win.lastIndexOf(', ');
    if (cut < max * 0.35) cut = win.lastIndexOf(' ');
    out.push(rest.slice(0, cut + 1).trim()); rest = rest.slice(cut + 1).trim();
  }
  if (rest) out.push(rest);
  return out;
}
function buildCaptions() {
  const groups = [];
  for (const S of plan) for (const L of S.lines) {
    const cs = chunks(L.text); let acc = 0;
    cs.forEach((c, i) => {
      const s = S.start + L.start + wordAt(L, acc);
      acc += c.length + 1;
      let e = S.start + L.start + wordEnd(L, Math.min(acc - 1, L.text.length)) + 0.25;
      if (i === cs.length - 1) e = Math.min(S.start + L.end - 0.15, S.start + L.start + L.dur + 0.7);
      groups.push({ text: c, s: r2(Math.max(0.2, s - 0.08)), e: r2(e) });
    });
  }
  for (let i = 0; i + 1 < groups.length; i++) groups[i].e = Math.min(groups[i].e, r2(groups[i + 1].s - 0.02));
  const html = groups.map((g, i) => `<div id="sub-g${i}" class="cap clip" data-start="${g.s}" data-duration="${r2(g.e - g.s)}"><span>${esc(g.text)}</span></div>`).join('\n');
  const js = groups.map((g, i) => `tl.fromTo("#sub-g${i} span", {opacity:0}, {opacity:1, duration:0.12}, ${g.s});`).join('\n');
  fs.writeFileSync(ROOT + 'compositions/subtitulos.html', `<template>
<style>
${FONT}
#root{position:absolute;inset:0;font-family:'Atkinson Hyperlegible Next',sans-serif;}
#root .cap{position:absolute;left:0;top:872px;width:1920px;height:120px;display:flex;align-items:flex-end;justify-content:center;}
#root .cap span{display:inline-block;max-width:1480px;padding:12px 30px 14px;background:#FFFFFF;border:1px solid #E1E5EC;border-radius:14px;font-size:40px;font-weight:600;line-height:1.3;color:#1A1F29;text-align:center;}
</style>
<div id="root" data-composition-id="subtitulos" data-width="1920" data-height="1080" data-duration="${TOTAL}">
${html}
</div>
<script>
const tl = gsap.timeline({ paused: true });
${js}
window.__timelines = window.__timelines || {};
window.__timelines["subtitulos"] = tl;
</script>
</template>
`);
  return groups.length;
}

// ---- voz: una sola pista con cada frase en su momento ----
function buildVoice() {
  const items = []; for (const S of plan) for (const L of S.lines) items.push({ id: L.id, at: S.start + L.start });
  const args = ['-v', 'error', '-y'];
  items.forEach(it => args.push('-i', ROOT + `assets/voz/${it.id}.wav`));
  const f = items.map((it, i) => `[${i}]adelay=${Math.round(it.at * 1000)}:all=1[a${i}]`).join(';') +
    ';' + items.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${items.length}:normalize=0:dropout_transition=0,apad=whole_dur=${TOTAL}[out]`;
  args.push('-filter_complex', f, '-map', '[out]', '-ar', '48000', '-ac', '2', '-t', String(TOTAL), ROOT + 'assets/voz/narracion.wav');
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
}

// ---- índice ----
const FILES = { apertura: '01-apertura.html', ingreso: '02-ingreso.html', pantalla: '03-pantalla.html', admin: '04-administrador.html', profesor: '05-profesor.html', alumno: '06-alumno.html', apoderado: '07-apoderado.html', cierre: '08-cierre.html' };
fs.mkdirSync(ROOT + 'compositions', { recursive: true });
for (const S of plan) buildScene(S, FILES[S.id]);
const nCaps = buildCaptions();
// difuminado canónico (/media-use) de los recortes con contraseñas
for (const f of Object.values(FILES)) {
  if (!fs.readFileSync(ROOT + 'compositions/' + f, 'utf8').includes('class="privacy"')) continue;
  execFileSync(`npx --yes hyperframes@0.9.9 media-treatment --project . --file compositions/${f} --selector "img.privacy" --grading "{\\"effects\\":{\\"blur\\":1}}" --apply`, { cwd: ROOT, stdio: 'ignore', shell: true });
}
if (!process.argv.includes('--no-audio')) buildVoice();

const hosts = plan.map(S => `      <div id="${S.id}" data-composition-id="${S.id}" data-composition-src="compositions/${FILES[S.id]}" data-start="${S.start}" data-duration="${S.dur}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>`).join('\n');
fs.writeFileSync(ROOT + 'index.html', `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>Ciencias e Ingeniería · Guía de uso</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #F4F6F9; }
      #main { position: relative; width: 1920px; height: 1080px; overflow: hidden; }
      #main-bg { position: absolute; inset: 0; background: #F4F6F9; }
    </style>
  </head>
  <body>
    <div id="main" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1920" data-height="1080">
      <div id="main-bg"></div>
${hosts}
      <div id="subtitulos" data-composition-id="subtitulos" data-composition-src="compositions/subtitulos.html" data-start="0" data-duration="${TOTAL}" data-track-index="2" data-track-kind="captions" data-width="1920" data-height="1080"></div>
      <audio id="voz" class="clip" src="assets/voz/narracion.wav" data-start="0" data-duration="${TOTAL}" data-track-index="3" data-volume="1"></audio>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`);
fs.writeFileSync(ROOT + 'tools/plan.json', JSON.stringify(plan.map(S => ({ id: S.id, start: S.start, dur: S.dur, lines: S.lines.map(l => ({ id: l.id, start: r2(S.start + l.start), dur: l.dur })) })), null, 1));
console.log('total', TOTAL, 's =', Math.floor(TOTAL / 60) + ':' + String(Math.round(TOTAL % 60)).padStart(2, '0'), '| subtítulos', nCaps);
for (const S of plan) console.log(S.id.padEnd(10), S.start, '+', S.dur);
