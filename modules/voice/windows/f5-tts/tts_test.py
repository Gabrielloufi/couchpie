"""Asks the F5-TTS server to speak, the way Home Assistant does, and saves the WAV.

  tts_test.py HOST PORT "texto" [out.wav] [voice]

Prints the time until the audio arrived and its length. Exit code 1 if no audio came back.
"""

import asyncio
import sys
import time
import wave

from wyoming.audio import AudioChunk, AudioStart, AudioStop
from wyoming.client import AsyncTcpClient
from wyoming.tts import Synthesize, SynthesizeVoice


async def main(host, port, text, out="tts_test.wav", voice=None):
    start = time.perf_counter()
    pcm, fmt = bytearray(), None
    async with AsyncTcpClient(host, int(port)) as client:
        await client.write_event(Synthesize(text=text, voice=SynthesizeVoice(name=voice) if voice else None).event())
        while (event := await client.read_event()) is not None:
            if AudioStart.is_type(event.type):
                fmt = AudioStart.from_event(event)
            elif AudioChunk.is_type(event.type):
                pcm += AudioChunk.from_event(event).audio
            elif AudioStop.is_type(event.type):
                break
    took = time.perf_counter() - start
    if not fmt or not pcm:
        print("no audio came back")
        return 1
    with wave.open(out, "wb") as w:
        w.setnchannels(fmt.channels)
        w.setsampwidth(fmt.width)
        w.setframerate(fmt.rate)
        w.writeframes(pcm)
    seconds = len(pcm) / (fmt.rate * fmt.width * fmt.channels)
    print(f"{seconds:.1f} s of audio in {took:.2f} s -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main(*sys.argv[1:])))
