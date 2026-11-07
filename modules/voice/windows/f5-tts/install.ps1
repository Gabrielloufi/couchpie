<#
Installs the Wyoming F5-TTS server for this user: Python 3.12, PyTorch 2.8 (CUDA 12.8) and
F5-TTS in C:\local-ai\f5-tts (with uv), and the models in C:\local-ai\models\f5-tts. No
administrator needed; run setup-admin.ps1 as administrator after.

  powershell -ExecutionPolicy Bypass -File D:\local-ai\f5-tts\install.ps1

Run it from D:\local-ai\f5-tts (a copy of modules\voice\windows\f5-tts): server.py and the
boot task expect that folder.
#>

$ErrorActionPreference = 'Stop'
$Folder = $PSScriptRoot
$Base = 'C:\local-ai\f5-tts'
$Python = "$Base\.venv\Scripts\python.exe"
$Port = 10200

$uv = "$env:USERPROFILE\.local\bin\uv.exe"
if (-not (Test-Path $uv)) {
    powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
}
# Python, packages and uv's cache outside the user profile, so the service account can read them
$env:UV_CACHE_DIR = "$Base\uv-cache"
$env:UV_PYTHON_INSTALL_DIR = "$Base\python"
$env:UV_PYTHON_PREFERENCE = 'only-managed'
New-Item -ItemType Directory -Force $Base, 'C:\local-ai\models\f5-tts' | Out-Null
& $uv venv -q -p 3.12 "$Base\.venv"
# PyTorch from its CUDA 12.8 index. Newer torchaudio needs FFmpeg libraries that aren't here.
& $uv pip install -q --python $Python --index-strategy unsafe-best-match `
    --extra-index-url https://download.pytorch.org/whl/cu128 `
    torch==2.8.0 torchaudio==2.8.0 f5-tts==1.1.22 wyoming==1.11.0 num2words soundfile

# Download the models by running the server once, on 127.0.0.1 only: listening on every
# interface before the firewall rule exists makes Windows ask about Python
"Downloading the models (1.4 GB) and testing..."
$server = Start-Process $Python -ArgumentList "`"$Folder\server.py`"", '--download', '--uri', "tcp://127.0.0.1:$Port" `
    -WorkingDirectory $Base -WindowStyle Hidden -PassThru
try {
    while (-not (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)) {
        if ($server.HasExited) { throw "The server stopped; see $Base\logs\server.log" }
        Start-Sleep -Seconds 2
    }
    & $Python "$Folder\tts_test.py" 127.0.0.1 $Port 'pronto, o servidor de voz está instalado.' "$Base\install-test.wav"
} finally {
    Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
}
"Done: listen to $Base\install-test.wav. Next, in PowerShell as administrator: setup-admin.ps1 -Allowed <the Pi's addresses>"
