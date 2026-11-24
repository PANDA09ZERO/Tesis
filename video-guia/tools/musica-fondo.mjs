// Música de fondo original para la guía: bucle continuo de 80 s (96 BPM, Do mayor), sin dependencias.
// Suave y estable para ir debajo de la voz: piano eléctrico, bajo redondo, arpegio ligero y shaker muy bajo.
// Las notas que pasan el final del bucle se escriben al inicio (módulo N), así el bucle empalma sin cortes.
// Uso (desde video-guia/):  node tools/musica-fondo.mjs   →  assets/musica/bucle.wav
import fs from 'node:fs';

const SR = 44100, BPM = 96, BEAT = 60 / BPM, BAR = BEAT * 4, BARS = 32;
const N = Math.round(BAR * BARS * SR);
const L = new Float32Array(N), R = new Float32Array(N);
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const add = (t, l, r = l) => { const i = ((Math.round(t * SR) % N) + N) % N; L[i] += l; R[i] += r; };

// Cmaj7 – Am7 – Fmaj7 – G6, dos compases cada uno
const ACORDES = [[48, 55, 59, 64], [45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 55, 59]];
let semilla = 11; const ruido = () => ((semilla = (semilla * 1103515245 + 12345) % 2147483648) / 1073741824 - 1);

function epiano(t0, m, dur, vel, pan = 0) {
  const f = hz(m);
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR, env = Math.min(1, t / 0.008) * Math.exp(-t * 1.1) * Math.min(1, (dur - t) / 0.25);
    const s = Math.sin(2 * Math.PI * f * t) + 0.35 * Math.exp(-t * 4) * Math.sin(4 * Math.PI * f * t) + 0.08 * Math.exp(-t * 9) * Math.sin(2 * Math.PI * f * 3.5 * t);
    add(t0 + t, vel * env * s * (1 - pan) , vel * env * s * (1 + pan));
  }
}

for (let bar = 0; bar < BARS; bar++) {
  const acorde = ACORDES[Math.floor(bar / 2) % 4], t0 = bar * BAR, ciclo = Math.floor(bar / 8);
  // acorde en el tiempo 1 (y un toque suave en el 3 del segundo compás)
  if (bar % 2 === 0) acorde.forEach((m, k) => epiano(t0 + k * 0.012, m + 12, BAR * 2 + 0.3, 0.05, (k - 1.5) * 0.15));
  else acorde.slice(1).forEach((m, k) => epiano(t0 + BEAT * 2 + k * 0.01, m + 12, BEAT * 2 + 0.3, 0.025, (k - 1) * 0.2));
  // bajo: fundamental en 1 y 3
  for (const b of [0, 2]) {
    const f = hz(acorde[0] - 12);
    for (let i = 0; i < BEAT * 1.8 * SR; i++) {
      const t = i / SR, env = Math.min(1, t / 0.01) * Math.exp(-t * 2.2);
      add(t0 + b * BEAT + t, 0.07 * env * (Math.sin(2 * Math.PI * f * t) + 0.2 * Math.sin(4 * Math.PI * f * t)));
    }
  }
  // arpegio en corcheas (desde el segundo ciclo, alternando registro para variar)
  if (ciclo >= 1) for (let k = 0; k < 8; k++) {
    const nota = acorde[[1, 2, 3, 2, 1, 2, 3, 0][k]] + (ciclo % 2 ? 24 : 12);
    epiano(t0 + k * BEAT / 2, nota, 0.5, 0.012 + (k % 2 ? 0 : 0.004), k % 2 ? 0.35 : -0.35);
  }
  // shaker muy bajo en semicorcheas (ciclos 2 y 3)
  if (ciclo >= 2) for (let k = 0; k < 16; k++) {
    let prev = 0; const v = k % 4 === 2 ? 0.012 : 0.006;
    for (let i = 0; i < 0.04 * SR; i++) { const t = i / SR, n = ruido(), hp = n - prev; prev = n; add(t0 + k * BEAT / 4 + t, v * Math.exp(-t * 90) * hp, v * 1.2 * Math.exp(-t * 90) * hp); }
  }
}

let pico = 0; for (let i = 0; i < N; i++) pico = Math.max(pico, Math.abs(L[i]), Math.abs(R[i]));
const g = 0.7 / pico;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * g * 32767), 46 + i * 4); }
const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
fs.mkdirSync(ROOT + 'assets/musica', { recursive: true });
fs.writeFileSync(ROOT + 'assets/musica/bucle.wav', buf);
console.log('bucle', (N / SR).toFixed(1), 's');
