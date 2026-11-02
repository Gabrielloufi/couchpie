# Shares folders on this Windows PC with the couchPie Raspberry Pi over SMB.
#
# Run in PowerShell as administrator:
#   powershell -ExecutionPolicy Bypass -File windows-share.ps1 -Folders F:\qbit,F:\sharedFolder
#
# Creates a local account for the Pi to sign in with (not an administrator, hidden
# from the sign-in screen), gives it read/write access to the folders, shares each
# folder under its own name, marks the Ethernet network as Private and allows file
# sharing on Private networks. Safe to run again.

param(
    [Parameter(Mandatory)] [string[]] $Folders,
    [string] $User = "couchpie",            # must match username= in /etc/cifs-creds on the Pi
    [string] $Owner = $env:USERNAME,        # keeps full control of the shares
    [string] $Interface = "Ethernet"
)
$ErrorActionPreference = "Stop"

if (-not (Get-LocalUser $User -ErrorAction SilentlyContinue)) {
    $password = Read-Host "Password for $User (it also goes in /etc/cifs-creds on the Pi)" -AsSecureString
    New-LocalUser $User -Password $password -PasswordNeverExpires -UserMayNotChangePassword `
        -Description "couchPie Raspberry Pi access to shared folders" | Out-Null
}

foreach ($folder in $Folders) {
    icacls $folder /grant "${User}:(OI)(CI)M" | Out-Null
    $name = Split-Path $folder -Leaf
    if (-not (Get-SmbShare $name -ErrorAction SilentlyContinue)) {
        New-SmbShare -Name $name -Path $folder -ChangeAccess $User -FullAccess $Owner | Out-Null
    }
    "Shared $folder as \\$env:COMPUTERNAME\$name"
}

# Windows blocks file sharing on Public networks
Set-NetConnectionProfile -InterfaceAlias $Interface -NetworkCategory Private
Enable-NetFirewallRule -Name FPS-SMB-In-TCP

# Keep the account off the sign-in screen. Create the key only if it's missing:
# New-Item -Force on an existing key would wipe the other hidden accounts.
$key = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon\SpecialAccounts\UserList"
if (-not (Test-Path $key)) { New-Item $key -Force | Out-Null }
New-ItemProperty $key -Name $User -Value 0 -PropertyType DWord -Force | Out-Null
