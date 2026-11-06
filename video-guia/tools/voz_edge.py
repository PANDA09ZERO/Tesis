"""Genera la narración con Edge-TTS (voz es-PE-CamilaNeural), una pista por frase.

Uso (desde video-guia/):  <python con edge-tts> tools/voz_edge.py
Escribe assets/voz/<id>.wav, assets/voz/duraciones.json y assets/voz/palabras.json
(tiempo de cada palabra, para sincronizar los subtítulos).
"""
import asyncio, json, os, subprocess, sys

import edge_tts

VOICE = "es-PE-CamilaNeural"
RATE = "-6%"
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
    for line in lines:
        i, d, w = await one(line)
        dur[i], pal[i] = d, w
        print(i, d, len(w), file=sys.stderr)
    json.dump(dur, open(os.path.join(VOZ, "duraciones.json"), "w"), indent=1)
    json.dump(pal, open(os.path.join(VOZ, "palabras.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print("total", round(sum(dur.values()), 1))


asyncio.run(main())
