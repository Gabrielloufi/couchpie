# PiPA voice: Piper, Whisper, F5-TTS and the LLM server

Results of setting up the services Home Assistant's voice assistant needs, so PiPA can use
the same listener, on 2026-11-07. Each one was checked for an existing install first.

| # | Service | Runs on | Address for Home Assistant | State |
|---|---|---|---|---|
| 1 | Piper, text to speech (male voices; the voice for when the PC is off) | Pi, container | `127.0.0.1:10200` (Wyoming) | **Working** |
| 2 | Whisper, speech to text | PC GPU | `192.168.0.158:10300` (Wyoming) | **Working**, checked from the Pi |
| 3 | llama-server, the LLM | PC GPU | `http://192.168.0.158:8080/v1` | **Working**, checked from the Pi |
| 4 | **F5-TTS, text to speech, voice "dora"** (your pick) | PC GPU | `192.168.0.158:10200` (Wyoming) | Works; **boot task needs an admin run** |

## Before testing: run on the PC, in PowerShell as administrator

```powershell
powershell -ExecutionPolicy Bypass -File D:\local-ai\f5-tts\setup-admin.ps1
```

It adds F5-TTS's firewall rule and boot task, then checks that it speaks. It's safe to run
again. Whisper's and llama-server's scripts already ran (2026-11-07).

The first try of Whisper's script made its firewall rule but failed on the task. It named
the account `NT AUTHORITY\LOCAL SERVICE`, which is `AUTORIDADE NT\SERVIÇO LOCAL` on this
Windows. Both scripts now look accounts up by their SID.

## 1. Piper on the Pi

- **Existed:** nothing; only the Home Assistant container.
- **Built:** a `piper` service in `modules/homeassistant/compose.yaml`
  (`rhasspy/wyoming-piper:2.5.2`), listening on `127.0.0.1:10200` only, since Wyoming has no
  password. Voices are in `/srv/homeassistant/piper`.
- **Voice:** `pt_BR-faber-medium` by default, because it pauses the least. The other
  Brazilian voices (cadu, jeff, edresson) download on first use, so switching is a setting in
  Home Assistant. Samples of all four: `F:\sharedFolder\couchpie\piper-samples\`.

| Measured on the Pi 5, with Home Assistant running | |
|---|---|
| Two-sentence reply | 1.4–2.0 s in total |
| First sentence's audio ready | 0.55–1.06 s |
| First use of a voice after a restart | 4–8 s |
| Memory / disk | about 315 MB / 1 GB (image + voices); 6.2 GB left on the SD card |

## 2. Whisper on the PC

- **Existed:** nothing: no Whisper, no model, no real Windows Python. The pt-BR SAPI voice
  "Maria" was used to make test clips.
- **Built:**
  - `wyoming-faster-whisper` 3.8.1 on CUDA, in a uv environment in `C:\local-ai\whisper`.
  - The model is in `C:\local-ai\models\whisper` (1.6 GB).
  - The launcher and the admin script are in `D:\local-ai\whisper\`; its `README.md` has the details.
  - Port 10300, language fixed to Portuguese.
- **Model:** large-v3-turbo, int8_float16, beam 5:

| Model | Graphics memory | Time per clip, once loaded | Mistakes in the test clips |
|---|---|---|---|
| **large-v3-turbo** | +1.26 GB | 0.19–0.20 s | none |
| medium | +1.03 GB | 0.37–0.41 s | none |
| small | +0.35 GB | 0.21–0.23 s | "a manhã" |

- **From the Pi**, the way Home Assistant sends audio (through a temporary SSH tunnel, since
  the firewall rule wasn't in place yet):
  - "Liga o ventilador do quarto e desliga a luz da sala." 0.45 s (first call)
  - "Qual vai ser a previsão do tempo amanhã em São Paulo?" 0.22 s
  - "Me lembra de comprar pão amanhã às 8 da manhã." 0.22 s
- **Boot task "Wyoming Whisper":**
  - Runs as LOCAL SERVICE, with no password. It falls back to SYSTEM if the GPU doesn't
    work under that account; the script tests this with a real transcription.
  - Starts at boot and checks every 5 minutes, leaving a running copy alone.
- **Firewall:** TCP 10300 only from the Pi (home network and Tailscale), on Private networks.

## 3. llama-server on the PC

- **Existed:** the router setup in `D:\local-ai` (`models.ini` with 8 models, `--fit`,
  `--models-max 1`). `start-llm.bat` ran it on `127.0.0.1` only, with a window.
- **Built:**
  - `llama-serve.ps1` runs the same server on `0.0.0.0:8080` with no window, restarts it
    if it exits, and logs to `C:\local-ai\logs\`.
  - Task `\local-ai\llama-server` runs it at boot +30 s, as your own account without a
    stored password (S4U). Created by `setup-llm-service.ps1`.
  - `start-llm.bat` now just opens the web chat, and starts the task if needed. Without
    the task, it runs the server in its window as before.
- **Firewall:** TCP 8080, llama-server only, from the Pi, your phone and WSL. Not the whole
  tailnet: friends with the PC shared to them (Enshrouded) get tailnet addresses too.
- **No API key:** the MKT Orquestra chat calls the server from the browser without one; the
  firewall decides who gets in. Details in `D:\local-ai\README.md`.
- **Graphics memory with Whisper loaded** (measured with about 1.7 GB held): all models
  still load, leaving about 0.5 GB spare.

| Model | Graphics memory | Speed | First reply, including loading |
|---|---|---|---|
| **gemma-4-12b** (the pick for voice) | 9.0 GB | 55 tok/s | 8.3 s |
| qwen3.6-35b-a3b | 9.9 GB | 44 tok/s | 34 s |
| qwen3-14b | 10.0 GB | 13 tok/s | 14 s |

## Checked from the Pi, after the admin runs

- **Whisper:** "Liga o ventilador do quarto e desliga a luz da sala." came back word for
  word, 0.24 s after the audio ended.
- **llama-server:** `/v1/models` lists all 7 models. `gemma-4-12b` answered in Portuguese at
  51 tokens/s; a short reply with the model already loaded took 0.2 s.

## Not checked yet

- **F5-TTS from the Pi**, after its admin run (above).
- **Whisper, F5-TTS and llama-server starting before login:** needs a PC reboot.
- **Thinking:** if the LLM's spoken replies are slow because it thinks first, turn thinking
  off for voice in `models.ini`.
- **The first request after boot loads the model** (8 s for gemma). Later ones don't.

## Today's voice test

1. **Home Assistant** (`https://<pi>.<tailnet>.ts.net:8443`):
   - Create your account.
   - Add three **Wyoming Protocol** integrations: `192.168.0.158` port `10200` (F5-TTS),
     `192.168.0.158` port `10300` (Whisper), and `127.0.0.1` port `10200` (Piper, for later).
2. **Settings → Voice assistants → Add assistant**, language Português (Brasil):
   - Speech to text: Whisper.
   - Text to speech: f5-tts, voice `dora`.
   - Conversation agent: Home Assistant, to test the voice chain alone first.
3. **The listener:** the Home Assistant app on your phone, signed in at the tailnet address
   above; use the Assist button.
4. **Then the LLM:** add the **llama.cpp** integration, URL `http://192.168.0.158:8080/v1`,
   model `gemma-4-12b`. Make it the assistant's conversation agent, with "Prefer handling
   commands locally" on. Simple device commands still skip the LLM.
5. PiPA itself (nanobot, and the bridge between it and Home Assistant) comes after this.

## Files

- couchpie repo (not committed):
  - `modules/homeassistant/compose.yaml` and `README.md`.
  - The rest of the Home Assistant and wake modules, from earlier.
  - Another session's browser-extension changes are in the same working tree, so commit them separately.
- PC: `D:\local-ai\f5-tts\` and `C:\local-ai\f5-tts\` (+ models in `C:\local-ai\models\f5-tts`);
  `D:\local-ai\whisper\` and `C:\local-ai\whisper\`; `D:\local-ai\llama-serve.ps1`,
  `setup-llm-service.ps1`, `start-llm.bat` (old one in `start-llm.bat.bak-2026-11-07`),
  `README.md`.

## Female voice: Chatterbox and F5-TTS (2026-11-07)

You wanted a female voice instead of Piper's male Brazilian ones. Both engines copy a voice
from a short reference clip, so they were tested with three references:

- `dii` (Piper) and `dora` (Kokoro), both synthetic.
- `f2`, the female prompt from Resemble's own pt-BR demo.

Setup: installed in WSL (`~/tts-lab`, see its README), on the PC's GPU. Audio is in
`F:\sharedFolder\couchpie\tts-tests\` (`chatterbox\`, `f5\`, `referencias\`); file names are
`engine-voice-length[-nfeN].wav`.

| | **F5-TTS** (firstpixel pt-br) | **Chatterbox** (Multilingual V3, pt-BR finetune) |
|---|---|---|
| Short reply (2–3 s of speech) | **0.8–1.0 s** (16 steps), 1.6–2.0 s (32 steps) | 4.8–5.8 s |
| Long reply (10–13 s of speech) | **1.1–1.3 s** (16 steps), 1.9–2.3 s (32 steps) | 12–15 s |
| Speed vs. real time | 2–10× faster (16 steps) | 0.5–0.9× (slower than real time) |
| Graphics memory, peak | about 0.75 GB | about 3.5 GB |
| Load time | 8 s | 63 s (first time, including download) |
| Whisper heard it right | 4 of 9 clips at 16 steps had a slip (e.g. "sol pela manhã" → "lá manhã"); about the same at 32 | 9 of 9 clips, word for word |
| License | CC BY-NC 4.0 (non-commercial; home use is fine) | MIT, but retired by Resemble; an inaudible watermark in every clip |

Measured with the LLM unloaded for Chatterbox. F5 ran with `qwen3-14b` loaded, because
something else had loaded it.

**So far:**
- **F5 is fast enough for voice, but its checkpoint (a "preliminary test", per its author)
  sometimes slurs or swaps a word.**
- **Chatterbox is accurate, but too slow for replies as it is.** It takes several seconds
  before you hear anything.
- Neither has a Wyoming server for Home Assistant, so the one you choose needs a small
  wrapper, like Whisper's, running on Windows at boot.
- **Graphics memory:** Whisper (1.3 GB) + gemma (9 GB) + F5 (about 1 GB with its CUDA
  overhead) is about all the 12 GB card holds. llama-server would then put a little of gemma
  in system RAM, which makes it somewhat slower. Chatterbox (3.5 GB) would push much more of
  it out.
- A robot or metallic effect can be added on top of either.

**Picked (2026-11-07): F5-TTS, voice "dora", 32 steps.** It's now a Wyoming server on the
PC (`D:\local-ai\f5-tts\`, port 10200), about 1.7 s per reply whatever the length; see the table
at the top. Piper stays on the Pi as the voice for when the PC is off.
