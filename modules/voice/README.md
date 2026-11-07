# voice

The voice assistant's heavy parts, on the Windows PC's NVIDIA GPU: hearing (Whisper),
speaking (F5-TTS) and thinking (llama-server). Home Assistant on the Pi listens through a
phone or a satellite, and calls them over the network.

```
listener ─> Home Assistant (Pi) ─ speech to text ─> Whisper      (PC, port 10300)
                                ─ conversation  ─> llama-server (PC, port 8080)
                                ─ text to speech ─> F5-TTS       (PC, port 10200)
                                                    or Piper     (Pi, port 10200, see ../homeassistant)
```

Each one starts at boot from a scheduled task, before anyone logs in, and a firewall rule
lets only the Pi (and devices you list) reach it. When the PC is off, Piper on the Pi still
speaks, but there's no Whisper or LLM until the PC is back: Home Assistant's own commands
need Speech-to-Phrase on the Pi for that (not set up yet).

| Folder | Copy to | What | Port |
|---|---|---|---|
| `windows/whisper/` | `D:\local-ai\whisper\` | [wyoming-faster-whisper](https://github.com/rhasspy/wyoming-faster-whisper), `large-v3-turbo` on CUDA, Portuguese | 10300 |
| `windows/f5-tts/` | `D:\local-ai\f5-tts\` | [F5-TTS](https://github.com/SWivid/F5-TTS) with firstpixel's [pt-br checkpoint](https://huggingface.co/firstpixel/F5-TTS-pt-br), cloning the `dora` voice; our own Wyoming server | 10200 |
| `windows/llm/` | `D:\local-ai\` | [llama.cpp](https://github.com/ggml-org/llama.cpp)'s `llama-server` in router mode, OpenAI-compatible API | 8080 |

The scripts expect those folders: code on `D:\local-ai\`, Python environments, models and
logs on `C:\local-ai\` (the SSD). To use other drives, change the paths at the top of each
script.

## Install, on the PC

You need an NVIDIA GPU (12 GB holds all three with the tested models), and the Pi's
addresses on the home network and on Tailscale (`hostname -I` and `tailscale ip` on the Pi).

1. Copy the three folders as in the table above.
2. **Whisper and F5-TTS**, as yourself (no administrator). Each one creates its Python
   environment with [uv](https://docs.astral.sh/uv/), downloads its model, and tests it:

   ```powershell
   powershell -ExecutionPolicy Bypass -File D:\local-ai\whisper\install.ps1
   powershell -ExecutionPolicy Bypass -File D:\local-ai\f5-tts\install.ps1
   ```
3. **llama-server:** unzip a Windows CUDA build of llama.cpp into `D:\local-ai\llama.cpp`, put
   the model files in `C:\local-ai\models\llm`, and copy `llm\models.ini.example` to
   `D:\local-ai\llama.cpp\models.ini`.
4. **Boot tasks and firewall**, in PowerShell **as administrator**, with your Pi's addresses
   (and, for the LLM, any other device of yours that should use it):

   ```powershell
   $pi = '192.168.0.77', '100.x.y.z', 'fd7a:115c:a1e0::xxxx'   # the Pi's addresses
   powershell -ExecutionPolicy Bypass -File D:\local-ai\whisper\setup-admin.ps1 -Allowed $pi
   powershell -ExecutionPolicy Bypass -File D:\local-ai\f5-tts\setup-admin.ps1 -Allowed $pi
   powershell -ExecutionPolicy Bypass -File D:\local-ai\setup-llm-service.ps1 -Allowed $pi
   ```

   Whisper's and F5-TTS's scripts run the server as LOCAL SERVICE (no password stored,
   almost no rights) and check that it works there, falling back to SYSTEM if the GPU isn't
   usable. llama-server runs as you, without a stored password (S4U). Account names are
   looked up by SID, because Windows translates them ("AUTORIDADE NT\SERVIÇO LOCAL").

Check from the Pi:

```bash
curl http://<pc>:8080/v1/models
python3 tts_test.py <pc> 10200 "olá, tudo bem?" ola.wav       # needs `pip install wyoming`
python3 wyoming_test.py <pc> 10300 ola.wav
```

## In Home Assistant

1. Settings → Devices & services → Add integration → **Wyoming Protocol**, once per server:
   `<pc>` port `10300` (Whisper), `<pc>` port `10200` (F5-TTS).
2. Add integration → **llama.cpp**, URL `http://<pc>:8080/v1`, model `gemma-4-12b`.
3. Settings → Voice assistants → Add assistant, Português (Brasil): speech to text Whisper,
   text to speech f5-tts with voice `dora`, conversation agent the llama.cpp one with
   "Prefer handling commands locally" on, so simple device commands skip the LLM.
4. Talk to it with the Home Assistant app's Assist button on your phone.

## Measured on an RTX 4070 SUPER 12 GB

| | |
|---|---|
| Whisper, a 4–5 s phrase | 0.2 s after the end of speech; +1.3 GB VRAM |
| F5-TTS, any reply up to 12 s of speech | 1.7–1.8 s at 32 steps; about 0.75 GB VRAM plus CUDA's overhead |
| gemma-4-12b with Whisper loaded | 55 tokens/s; 9 GB VRAM |

How the voices were chosen (Piper, Kokoro, Chatterbox, F5-TTS) is in
[../../pipa/RESULTS.md](../../pipa/RESULTS.md). Each folder's details (logs, everyday
commands, what bit during setup) are in the comments at the top of its scripts.

## Licenses

F5-TTS's pt-br checkpoint is CC BY-NC 4.0 (non-commercial). `dora.wav` is synthetic, made
with Kokoro's `pf_dora` voice (Apache 2.0).
