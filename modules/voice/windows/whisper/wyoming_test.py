"""Sends WAV files to a Wyoming speech-to-text server, the way Home Assistant does, and
prints each transcript with the time it took after the end of speech. Needs the
`wyoming` package; works on Windows and on the Pi.

  python wyoming_test.py HOST PORT clip.wav [clip.wav ...]
"""

import asyncio
import sys
import time
import wave

from wyoming.asr import Transcribe, Transcript
from wyoming.audio import AudioChunk, AudioStart, AudioStop
from wyoming.client import AsyncTcpClient
from wyoming.info import Describe, Info

LANGUAGE = "pt"


async def describe(host, port):
    client = AsyncTcpClient(host, port)
    await client.connect()
    try:
        await client.write_event(Describe().event())
        while True:
            event = await client.read_event()
            if event is None:
                raise SystemExit("the server closed the connection")
            if Info.is_type(event.type):
                for asr in Info.from_event(event).asr:
                    for model in asr.models:
                        print(f"server: {asr.name} {asr.version}, model {model.name}, "
                              f"{len(model.languages)} languages")
                return
    finally:
        await client.disconnect()


async def transcribe(host, port, path):
    with wave.open(path, "rb") as wav:
        rate, width, channels = wav.getframerate(), wav.getsampwidth(), wav.getnchannels()
        audio = wav.readframes(wav.getnframes())
    client = AsyncTcpClient(host, port)
    await client.connect()
    try:
        await client.write_event(Transcribe(language=LANGUAGE).event())
        await client.write_event(AudioStart(rate=rate, width=width, channels=channels).event())
        step = rate * width * channels // 10  # 100 ms chunks, as a satellite streams them
        for i in range(0, len(audio), step):
            chunk = AudioChunk(rate=rate, width=width, channels=channels, audio=audio[i:i + step])
            await client.write_event(chunk.event())
        start = time.perf_counter()
        await client.write_event(AudioStop().event())
        while True:
            event = await client.read_event()
            if event is None:
                raise SystemExit("the server closed the connection")
            if Transcript.is_type(event.type):
                text = Transcript.from_event(event).text
                print(f"{path}: {time.perf_counter() - start:.2f} s | {text}")
                return
    finally:
        await client.disconnect()


async def main(host, port, paths):
    await describe(host, port)
    for path in paths:
        await transcribe(host, port, path)


if __name__ == "__main__":
    if len(sys.argv) < 4:
        sys.exit(__doc__.split("\n\n")[-1])
    sys.stdout.reconfigure(encoding="utf-8")
    asyncio.run(main(sys.argv[1], int(sys.argv[2]), sys.argv[3:]))
