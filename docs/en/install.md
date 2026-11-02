# Installing couchPie on a Raspberry Pi

## You need

- Raspberry Pi 5 with Raspberry Pi OS Bookworm, 64-bit, **with desktop**
- A TV with HDMI-CEC turned on (Samsung calls it Anynet+; tested on a Samsung TV)
- For game streaming: a PC running [Sunshine](https://github.com/LizardByte/Sunshine)
- For media files: a Windows PC to share folders from

## 1. Moonlight

Moonlight isn't in Raspberry Pi OS; add its repository, then install it and pair it
with the PC once (open Moonlight from the desktop menu and pick the PC):

```bash
curl -1sLf 'https://dl.cloudsmith.io/public/moonlight-game-streaming/moonlight-qt/setup.deb.sh' \
  | distro=raspbian codename=$(lsb_release -cs) sudo -E bash
sudo apt install moonlight-qt
```

## 2. couchPie

```bash
git clone https://github.com/Gabrielloufi/couchpie.git
cd couchpie
cp couchpie.conf.example couchpie.conf
nano couchpie.conf        # your PC's name and address, shares, HDMI port
scripts/bootstrap.sh
```

The first run builds Pegasus, which takes 10 to 15 minutes. The script:

- installs the packages couchPie needs, and builds Pegasus at a tested commit;
- installs the modules (see [modules/](../../modules/)), filling in your settings;
- merges its key bindings into labwc's `rc.xml` (keeping a `rc.xml.bak`) and its
  settings into Pegasus's `settings.txt`;
- sets up the shared folders and the TV remote service;
- sets the Pi to log in to the desktop automatically.

It ends with a list of anything left for you to do. Run it again any time, for
example after `git pull`; it only replaces couchPie's own files.

## 3. Steam games and the green button

So that the green button on a stream closes the game and Steam Big Picture, not
only the stream, on the Windows PC in PowerShell as administrator:

```powershell
powershell -ExecutionPolicy Bypass -File modules\streaming\sunshine-setup.ps1
```

## 4. The PC's shared folders

On the Windows PC, in PowerShell as administrator, with your folders:

```powershell
powershell -ExecutionPolicy Bypass -File modules\smb\windows-share.ps1 -Folders F:\qbit,F:\sharedFolder
```

Then put the password you chose in `/etc/cifs-creds` on the Pi:

```bash
sudo nano /etc/cifs-creds
```

## 5. First start

```bash
sudo reboot
```

- The Pi comes up in Pegasus. If the remote does nothing, switch the TV to another
  input and back.
- The first time you open Kodi, it asks whether to enable "Quiosque: abrir Downloads
  do PC": choose Yes. If the script said Kodi hadn't run yet, close Kodi and run
  `scripts/bootstrap.sh` once more to turn off Kodi's own CEC support.
- Sign in to each streaming service once; each keeps its own login.

## Remote access (optional)

With [Tailscale](https://tailscale.com/) on the Pi you can SSH to it from anywhere.
Turn off key expiry for the Pi in the Tailscale admin console; otherwise it drops off
the tailnet after about six months and needs to be signed in again at the Pi.

## Everyday commands

```bash
kiosk off      # next boot shows the desktop
kiosk on       # next boot shows Pegasus again
kiosk status
remote-keyboard press home   # act as if a remote button was pressed
```

On the Pi, the red button, Ctrl+Alt+K or the Pegasus icon on the desktop bring the
menu back.
