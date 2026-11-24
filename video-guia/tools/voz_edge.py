"""Genera la narración con Edge-TTS (voz es-PE-CamilaNeural), una pista por frase.

Uso (desde video-guia/):  <python con edge-tts> tools/voz_edge.py
Escribe assets/voz/<id>.wav, assets/voz/duraciones.json y assets/voz/palabras.json
(tiempo de cada palabra, para sincronizar los subtítulos).
"""
import asyncio, json, os, subprocess, sys

import edge_tts

VOICE = "es-PE-CamilaNeural"
# Velocidad: la guía v3 (celular) va 18 % más rápida que la v2 (que usaba -6 %): 0,94 × 1,18 ≈ +11 %.
RATE = os.environ.get("VOZ_RATE", "+11%")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOZ = os.path.join(ROOT, "assets", "voz")


async def one(line):
    mp3 = os.path.join(VOZ, line["id"] + ".mp3")
    words = []
    com = edge_tts.Communicate(line["text"], VOICE, rate=RATE, boundary="WordBoundary")
    with open(mp3, "wb") as f:
        async for chunk in com.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                s = chunk["offset"] / 1e7
                words.append({"text": chunk["text"], "start": round(s, 3), "end": round(s + chunk["duration"] / 1e7, 3)})
    wav = os.path.join(VOZ, line["id"] + ".wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp3, "-ar", "48000", "-ac", "1", wav], check=True)
    os.remove(mp3)
    d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav],
                             capture_output=True, text=True, check=True).stdout.strip())
    return line["id"], round(d, 3), words


async def main():
    lines = json.load(open(os.path.join(ROOT, "narracion.json"), encoding="utf8"))
    dur, pal = {}, {}
    # Por defecto solo se generan las frases que aún no tienen audio (VOZ_TODO=1 las regenera todas).
    todo = os.environ.get("VOZ_TODO") == "1"
    prev_d = os.path.join(VOZ, "duraciones.json"); prev_p = os.path.join(VOZ, "palabras.json")
    old_d = json.load(open(prev_d)) if os.path.exists(prev_d) else {}
    old_p = json.load(open(prev_p, encoding="utf8")) if os.path.exists(prev_p) else {}
    for line in lines:
        i = line["id"]
        if not todo and i in old_d and i in old_p and os.path.exists(os.path.join(VOZ, i + ".wav")):
            dur[i], pal[i] = old_d[i], old_p[i]
            continue
        i, d, w = await one(line)
        dur[i], pal[i] = d, w
        print(i, d, len(w), file=sys.stderr)
    json.dump(dur, open(os.path.join(VOZ, "duraciones.json"), "w"), indent=1)
    json.dump(pal, open(os.path.join(VOZ, "palabras.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print("total", round(sum(dur.values()), 1))


asyncio.run(main())
