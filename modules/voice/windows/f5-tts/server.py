"""Wyoming text-to-speech server: F5-TTS with firstpixel's Brazilian Portuguese checkpoint,
on the GPU, speaking with a cloned reference voice ("dora" by default). For Home Assistant's
voice assistant on the Pi.

Started at boot by the "Wyoming F5-TTS" scheduled task (setup-admin.ps1), before anyone
logs in. Each voice is voices\\<name>.wav plus voices\\<name>.txt, the clip's exact words.

  server.py [--uri tcp://0.0.0.0:10200] [--voice dora] [--nfe 32] [--download] [--debug]
"""

import argparse
import asyncio
import logging
import os
import re
import sys
import time
from functools import partial
from logging.handlers import RotatingFileHandler
from pathlib import Path

HERE = Path(__file__).resolve().parent
VOICES = HERE / "voices"
MODELS = Path(r"C:\local-ai\models\f5-tts")
LOG = Path(r"C:\local-ai\f5-tts\logs\server.log")
CHECKPOINT = ("firstpixel/F5-TTS-pt-br", "pt-br/model_last.safetensors")
CHUNK_BYTES = 2048 * 2

parser = argparse.ArgumentParser()
parser.add_argument("--uri", default="tcp://0.0.0.0:10200")
parser.add_argument("--voice", default="dora", help="default voice, a name in voices\\")
parser.add_argument("--nfe", type=int, default=32, help="denoising steps: 32 is clearer, 16 faster")
parser.add_argument("--download", action="store_true", help="allow downloading the models")
parser.add_argument("--debug", action="store_true")
args = parser.parse_args()

# Hugging Face's caches next to the models, not in whichever profile runs this; the boot
# task never downloads (setup-admin.ps1 fetches the models first)
os.environ.setdefault("HF_HOME", str(MODELS / "hf-home"))
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
if not args.download:
    os.environ["HF_HUB_OFFLINE"] = "1"

# A task started at boot has no console, so log to a file too
LOG.parent.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.DEBUG if args.debug else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    handlers=[RotatingFileHandler(LOG, maxBytes=1_000_000, backupCount=3, encoding="utf-8"),
              logging.StreamHandler()],
)
log = logging.getLogger("f5-tts")

import numpy as np  # noqa: E402
from huggingface_hub import hf_hub_download  # noqa: E402
from num2words import num2words  # noqa: E402
from wyoming.audio import AudioChunk, AudioStart, AudioStop  # noqa: E402
from wyoming.event import Event  # noqa: E402
from wyoming.info import Attribution, Describe, Info, TtsProgram, TtsVoice  # noqa: E402
from wyoming.server import AsyncEventHandler, AsyncServer  # noqa: E402
from wyoming.tts import Synthesize  # noqa: E402


# The checkpoint was trained on lowercase text with numbers written out, so Home
# Assistant's "21,5 °C" or "às 8:30" are spelled out before speaking
UNITS = [
    (r"\s*[°º]\s*c\b", " graus"),
    (r"\s*[°º]", " graus"),
    (r"\s*%", " por cento"),
    (r"\s*km/h\b", " quilômetros por hora"),
]


def words(n):
    return num2words(n, lang="pt_BR")


def time_of_day(match):
    hours, minutes = int(match.group(1)), int(match.group(2))
    spoken = {1: "uma", 2: "duas"}.get(hours, words(hours))
    if minutes == 0:
        return f"{spoken} {'hora' if hours == 1 else 'horas'}"
    return f"{spoken} e {words(minutes)}"


NUMBER = r"\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?"


def number(match):
    text = match.group(0)
    if re.fullmatch(r"\d{1,3}(\.\d{3})+(,\d+)?", text):  # 1.500 or 1.500,25: dots group thousands
        text = text.replace(".", "")
    whole, _, fraction = text.replace(".", ",").partition(",")  # 21,5 and 21.5 are decimals
    if not fraction:
        return words(int(whole))
    # 21,05 is "vírgula zero cinco", not "vírgula cinco"
    spoken = " ".join(words(int(d)) for d in fraction) if fraction.startswith("0") else words(int(fraction))
    return f"{words(int(whole))} vírgula {spoken}"


def normalize(text):
    text = text.strip()
    for pattern, spoken in UNITS:
        text = re.sub(pattern, spoken, text, flags=re.IGNORECASE)
    text = re.sub(r"\b(\d{1,2})[:h](\d{2})\b", time_of_day, text)
    text = re.sub(NUMBER, number, text)
    return text.lower()


class Engine:
    def __init__(self, nfe):
        from f5_tts.api import F5TTS
        start = time.perf_counter()
        checkpoint = hf_hub_download(*CHECKPOINT)
        self.tts = F5TTS(model="F5TTS_Base", ckpt_file=checkpoint)
        self.nfe = nfe
        self.voices = {wav.stem: (wav, wav.with_suffix(".txt").read_text(encoding="utf-8").strip())
                       for wav in sorted(VOICES.glob("*.wav"))}
        log.info("model loaded in %.1f s; voices: %s", time.perf_counter() - start, ", ".join(self.voices))

    def speak(self, text, voice):
        clip, clip_text = self.voices[voice]
        audio, rate, _ = self.tts.infer(str(clip), clip_text, normalize(text), nfe_step=self.nfe,
                                        show_info=log.debug, progress=None)
        return audio, rate


class Handler(AsyncEventHandler):
    def __init__(self, info, engine, lock, default_voice, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.info, self.engine, self.lock, self.default_voice = info, engine, lock, default_voice

    async def handle_event(self, event: Event) -> bool:
        if Describe.is_type(event.type):
            await self.write_event(self.info.event())
            return True
        if not Synthesize.is_type(event.type):
            return True
        synthesize = Synthesize.from_event(event)
        voice = synthesize.voice.name if synthesize.voice and synthesize.voice.name in self.engine.voices \
            else self.default_voice
        start = time.perf_counter()
        async with self.lock:  # one reply at a time on the GPU
            audio, rate = await asyncio.to_thread(self.engine.speak, synthesize.text, voice)
        pcm = (np.clip(audio, -1.0, 1.0) * 32767).astype("<i2").tobytes()
        log.info("%s: %.1f s of audio in %.2f s: %r", voice, len(audio) / rate,
                 time.perf_counter() - start, synthesize.text[:80])
        await self.write_event(AudioStart(rate=rate, width=2, channels=1).event())
        for i in range(0, len(pcm), CHUNK_BYTES):
            await self.write_event(AudioChunk(audio=pcm[i:i + CHUNK_BYTES], rate=rate, width=2, channels=1).event())
        await self.write_event(AudioStop().event())
        return True


async def main():
    engine = Engine(args.nfe)
    if args.voice not in engine.voices:
        sys.exit(f"no voice {args.voice!r} in {VOICES}")
    engine.speak("olá.", args.voice)  # the first reply is slow; take that hit now
    attribution = Attribution(name="firstpixel (F5-TTS pt-br)", url="https://huggingface.co/firstpixel/F5-TTS-pt-br")
    info = Info(tts=[TtsProgram(
        name="f5-tts", description="F5-TTS, português do Brasil", attribution=attribution,
        installed=True, version="1.1",
        voices=[TtsVoice(name=name, description=f"{name} (F5-TTS)", attribution=attribution,
                         installed=True, version=None, languages=["pt-BR"])
                for name in engine.voices],
    )])
    server = AsyncServer.from_uri(args.uri)
    log.info("ready on %s, voice %s, %d steps", args.uri, args.voice, args.nfe)
    await server.run(partial(Handler, info, engine, asyncio.Lock(), args.voice))


if __name__ == "__main__":
    asyncio.run(main())
