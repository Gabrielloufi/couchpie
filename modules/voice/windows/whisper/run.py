"""Wyoming Whisper server on the GPU, for Home Assistant's voice assistant on the Pi.

Started at boot by the "Wyoming Whisper" scheduled task (setup-admin.ps1), before
anyone logs in. Extra arguments are passed on to wyoming-faster-whisper, e.g.
`--debug`, or `--model small` to try another model.

CTranslate2 loads cuBLAS and cuDNN by name when it first uses the GPU. They come from
NVIDIA's pip packages in the venv, so their folders go on the DLL search path first.
"""

import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

MODELS = r"C:\local-ai\models\whisper"
LOG = Path(r"C:\local-ai\whisper\logs\server.log")
SERVER_ARGS = [
    "--uri", "tcp://0.0.0.0:10300",
    # "auto" would hand Portuguese to qwen3-asr on the CPU
    "--stt-library", "faster-whisper",
    "--model", "large-v3-turbo",
    "--language", "pt",
    "--device", "cuda",
    "--compute-type", "int8_float16",
    "--beam-size", "5",
    "--data-dir", MODELS,
    "--download-dir", MODELS,
]

import nvidia  # noqa: E402  (namespace package of the nvidia-* wheels)

for base in nvidia.__path__:
    for library in ("cublas", "cudnn", "cuda_nvrtc"):
        bin_dir = Path(base, library, "bin")
        if bin_dir.is_dir():
            os.add_dll_directory(str(bin_dir))
            os.environ["PATH"] = f"{bin_dir}{os.pathsep}{os.environ['PATH']}"

# Hugging Face's caches next to the models, not in whichever profile runs this
os.environ.setdefault("HF_HOME", rf"{MODELS}\hf-home")
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")

# A task started at boot has no console, so log to a file too. The server's own
# logging.basicConfig() then does nothing, which is why --debug is handled here.
LOG.parent.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.DEBUG if "--debug" in sys.argv else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    handlers=[RotatingFileHandler(LOG, maxBytes=1_000_000, backupCount=3, encoding="utf-8"),
              logging.StreamHandler()],
)

from wyoming_faster_whisper.__main__ import run  # noqa: E402

sys.argv = [sys.argv[0], *SERVER_ARGS, *sys.argv[1:]]
run()
