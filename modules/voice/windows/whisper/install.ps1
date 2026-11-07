<#
Installs the Wyoming Whisper server for this user: Python 3.12 and the packages in
C:\local-ai\whisper (with uv), the model in C:\local-ai\models\whisper, and a Portuguese
test clip in test\. No administrator needed; run setup-admin.ps1 as administrator after.

  powershell -ExecutionPolicy Bypass -File D:\local-ai\whisper\install.ps1

Run it from D:\local-ai\whisper (a copy of modules\voice\windows\whisper): run.py and the
boot task expect that folder.
#>

$ErrorActionPreference = 'Stop'
$Folder = $PSScriptRoot
$Base = 'C:\local-ai\whisper'
$Python = "$Base\.venv\Scripts\python.exe"
$Port = 10300

$uv = "$env:USERPROFILE\.local\bin\uv.exe"
if (-not (Test-Path $uv)) {
    powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
}
# Python, packages and uv's cache outside the user profile, so the service account can read them
$env:UV_CACHE_DIR = "$Base\uv-cache"
$env:UV_PYTHON_INSTALL_DIR = "$Base\python"
$env:UV_PYTHON_PREFERENCE = 'only-managed'
New-Item -ItemType Directory -Force $Base, 'C:\local-ai\models\whisper', "$Folder\test" | Out-Null
& $uv venv -q -p 3.12 "$Base\.venv"
# PyAV 19 breaks faster-whisper 1.2.1. CTranslate2 needs CUDA 12 cuBLAS and cuDNN 9, which
# nothing system-wide provides; run.py puts these wheels' folders on the DLL search path.
& $uv pip install -q --python $Python wyoming-faster-whisper==3.8.1 av==18.1.0 `
    nvidia-cublas-cu12 "nvidia-cudnn-cu12==9.*"

# A test clip in Portuguese, from Windows' own pt-BR voice if there is one (16 kHz mono)
Add-Type -AssemblyName System.Speech
$speech = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice = $speech.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -eq 'pt-BR' } | Select-Object -First 1
if ($voice) { $speech.SelectVoice($voice.VoiceInfo.Name) } else { Write-Warning 'No pt-BR voice in Windows; the test clip will sound wrong' }
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000,
    [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$speech.SetOutputToWaveFile("$Folder\test\comando.wav", $format)
$speech.Speak('Liga o ventilador do quarto e desliga a luz da sala.')
$speech.Dispose()

# Download the model by running the server once, on 127.0.0.1 only: listening on every
# interface before the firewall rule exists makes Windows ask about Python, and "Cancel"
# creates a block rule that wins over setup-admin.ps1's
"Downloading the model (1.6 GB) and testing it..."
$server = Start-Process $Python -ArgumentList "`"$Folder\run.py`"", '--uri', "tcp://127.0.0.1:$Port" `
    -WindowStyle Hidden -PassThru
try {
    while (-not (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)) {
        if ($server.HasExited) { throw "The server stopped; see $Base\logs\server.log" }
        Start-Sleep -Seconds 2
    }
    & $Python "$Folder\wyoming_test.py" 127.0.0.1 $Port "$Folder\test\comando.wav"
} finally {
    Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
}
"Done. Next, in PowerShell as administrator: setup-admin.ps1 -Allowed <the Pi's addresses>"
