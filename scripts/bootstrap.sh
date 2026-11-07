#!/bin/bash
# Installs couchPie on a Raspberry Pi 5 running Raspberry Pi OS Bookworm (desktop).
# Run it on the Pi, as the desktop user, from a clone of this repository:
#
#   cp couchpie.conf.example couchpie.conf    # then fill in your values
#   scripts/bootstrap.sh
#
# Safe to run again: couchPie's files are replaced with the repository's versions,
# and settings shared with other tools (labwc's rc.xml, Pegasus's settings.txt,
# Kodi's sources) are merged. See docs/en/install.md.

set -euo pipefail

REPO=$(cd "$(dirname "$0")/.." && pwd)
M="$REPO/modules"
PEGASUS_COMMIT=2a13b4f49c5c4a18d308b0cb5e7c99a2e6b8ac9b

if [ "$(id -u)" -eq 0 ]; then
    echo "Run this as the desktop user, not root; it uses sudo where needed." >&2
    exit 1
fi
if [ ! -f "$REPO/couchpie.conf" ]; then
    echo "Copy couchpie.conf.example to couchpie.conf and fill it in first." >&2
    exit 1
fi
# shellcheck source=../couchpie.conf.example
source "$REPO/couchpie.conf"
KODI_FOLDER="/mnt/windows_share/$KODI_SHARE/"
HA_BACKUP_DIR="/mnt/windows_share/${HA_BACKUP_SHARE:-sharedFolder}/couchpie/homeassistant-backups"
TIMEZONE=$(timedatectl show -p Timezone --value)
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
NOTES=()

step() { printf '\n== %s\n' "$*"; }

# Fills in a template's @PLACEHOLDERS@ and prints the result
render() {
    sed -e "s|@HOME@|$HOME|g" -e "s|@UID@|$(id -u)|g" -e "s|@GID@|$(id -g)|g" \
        -e "s|@PC_HOST@|$PC_HOST|g" -e "s|@PC_ADDRESS@|$PC_ADDRESS|g" -e "s|@PC_MAC@|${PC_MAC:-}|g" \
        -e "s|@SMB_USER@|$SMB_USER|g" -e "s|@SHARE@|${SHARE:-}|g" \
        -e "s|@KODI_FOLDER@|$KODI_FOLDER|g" -e "s|@HA_BACKUP_DIR@|$HA_BACKUP_DIR|g" -e "s|@TZ@|$TIMEZONE|g" \
        -e "s|@CEC_DEVICE@|$CEC_DEVICE|g" -e "s|@CEC_INPUT@|$CEC_INPUT|g" "$1"
}

# install_template TEMPLATE DEST [MODE]: a file of the desktop user's
install_template() {
    mkdir -p "$(dirname "$2")"
    render "$1" > "$2"
    chmod "${3:-644}" "$2"
}

# install_system TEMPLATE DEST [MODE]: a root-owned file
install_system() {
    render "$1" > "$TMP"
    sudo install -D -m "${3:-644}" "$TMP" "$2"
}

kodi_running() { pgrep -x kodi.bin > /dev/null; }


step "Packages"
sudo apt-get update
sudo apt-get install -y --no-install-recommends \
    kodi chromium libwidevinecdm0 cifs-utils v4l-utils wtype \
    python3-evdev python3-gi python3-pil gir1.2-gtk-3.0 gir1.2-gtklayershell-0.1
if ! dpkg -s moonlight-qt > /dev/null 2>&1; then
    NOTES+=("Moonlight isn't installed: add its apt repository as described in docs/en/install.md, then run this again.")
fi
# The on-screen keyboard talks to the remote service over a socket owned by "input"
if ! id -nG | grep -qw input; then
    sudo usermod -aG input "$USER"
    NOTES+=("Added $USER to the input group; it takes effect after the reboot.")
fi


step "Pegasus"
if [ -x /usr/local/bin/pegasus-fe ]; then
    echo "Already installed (delete /usr/local/bin/pegasus-fe to rebuild it)."
else
    sudo apt-get install -y --no-install-recommends git cmake build-essential \
        qtbase5-dev qtdeclarative5-dev qttools5-dev qttools5-dev-tools qtmultimedia5-dev \
        libqt5svg5-dev libsdl2-dev libqt5gamepad5-dev libqt5sql5-sqlite \
        qml-module-qtquick2 qml-module-qtquick-window2 qml-module-qtquick-layouts \
        qml-module-qtgraphicaleffects qml-module-qtmultimedia qml-module-qtquick-controls2 \
        gstreamer1.0-plugins-good gstreamer1.0-libav
    src="$HOME/src/pegasus-frontend"
    [ -d "$src/.git" ] || git clone https://github.com/mmatyas/pegasus-frontend.git "$src"
    git -C "$src" fetch origin "$PEGASUS_COMMIT"
    git -C "$src" checkout --quiet "$PEGASUS_COMMIT"
    git -C "$src" submodule update --init --recursive
    echo "Building Pegasus; this takes 10 to 15 minutes on a Pi 5."
    cmake -S "$src" -B "$src/build" -DCMAKE_BUILD_TYPE=Release -DPEGASUS_ENABLE_LTO=OFF \
        -DCMAKE_INSTALL_PREFIX=/usr/local
    cmake --build "$src/build" -j"$(nproc)"
    sudo cmake --install "$src/build"
fi


step "Kiosk"
install_template "$M/kiosk/kiosk" "$HOME/.local/bin/kiosk" 755
install_template "$M/kiosk/kiosk-confirm" "$HOME/.local/bin/kiosk-confirm" 755
install_template "$M/remote/remote-keyboard" "$HOME/.local/bin/remote-keyboard" 755
install_template "$M/kiosk/pegasus.desktop" "$HOME/.local/share/applications/pegasus.desktop"
install_template "$M/kiosk/pegasus.desktop" "$(xdg-user-dir DESKTOP)/pegasus.desktop" 755
rm -rf "$HOME/.config/kiosk/tv-browser"
mkdir -p "$HOME/.config/kiosk/tv-browser"
cp "$M"/browser/tv-browser/* "$HOME/.config/kiosk/tv-browser/"

autostart="$HOME/.config/labwc/autostart"
mkdir -p "$(dirname "$autostart")"
touch "$autostart"
for line in "$HOME/.local/bin/kiosk boot &" "$HOME/.local/bin/remote-keyboard &"; do
    grep -qxF "$line" "$autostart" || echo "$line" >> "$autostart"
done

# Key bindings for the remote's Home and Close buttons and for raising open apps.
# Merged into rc.xml, which Raspberry Pi's own tools also write (touchscreen setup).
rc="$HOME/.config/labwc/rc.xml"
render "$M/kiosk/labwc-rc.xml" > "$TMP"
[ -f "$rc" ] && cp "$rc" "$rc.bak"
python3 -I - "$rc" "$TMP" << 'EOF'
import sys
import xml.etree.ElementTree as ET

NS = "{http://openbox.org/3.4/rc}"
ET.register_namespace("", NS[1:-1])
target, ours_path = sys.argv[1:]

def parse(path):
    return ET.parse(path, ET.XMLParser(target=ET.TreeBuilder(insert_comments=True)))

ours = parse(ours_path).getroot().find(NS + "keyboard")
try:
    tree = parse(target)
except (OSError, ET.ParseError):
    tree = ET.ElementTree(ET.Element(NS + "openbox_config"))
root = tree.getroot()
keyboard = root.find(NS + "keyboard")
if keyboard is None:
    keyboard = ET.SubElement(root, NS + "keyboard")

# Drop earlier copies of our bindings and comments (they all mention the kiosk),
# keep everything else
our_keys = {b.get("key") for b in ours.iter(NS + "keybind")}
for child in list(keyboard):
    ours_comment = child.tag is ET.Comment and "kiosk" in (child.text or "").lower()
    if child.get("key") in our_keys or ours_comment:
        keyboard.remove(child)
keyboard.extend(ours)

ET.indent(tree, "  ")
tree.write(target, encoding="utf-8", xml_declaration=True)
EOF
pidof labwc > /dev/null && kill -HUP "$(pidof labwc)"


step "Pegasus menu and theme"
menu="$HOME/.config/kiosk/menu"
install_template "$M/pegasus/menu/metadata.pegasus.txt" "$menu/metadata.pegasus.txt"
install_template "$M/pegasus/menu/streaming/metadata.pegasus.txt" "$menu/streaming/metadata.pegasus.txt"
install_template "$M/pegasus/menu/make-tiles" "$menu/make-tiles" 755
mkdir -p "$menu/logos"
find "$M/pegasus/menu/logos" -type f ! -name README.md -exec cp {} "$menu/logos/" \;
"$menu/make-tiles"

pegasus="$HOME/.config/pegasus-frontend"
mkdir -p "$pegasus/themes/kiosk-tv"
cp "$M"/pegasus/theme/kiosk-tv/* "$pegasus/themes/kiosk-tv/"
printf '%s\n' "$menu" "$menu/streaming" > "$pegasus/game_dirs.txt"
# Our settings replace the same keys; whatever else Pegasus saved stays
settings="$pegasus/settings.txt"
touch "$settings"
while IFS= read -r line; do
    grep -v "^${line%%:*}:" "$settings" > "$TMP" || true
    echo "$line" >> "$TMP"
    cp "$TMP" "$settings"
done < "$M/pegasus/settings.txt"


step "TV remote (HDMI-CEC)"
install_system "$M/remote/cec-remote" /usr/local/bin/cec-remote 755
install_system "$M/remote/cec-remote.service" /etc/systemd/system/cec-remote.service
sudo systemctl daemon-reload
sudo systemctl enable cec-remote
sudo systemctl restart cec-remote


step "Waking the PC and the TV"
if [ -z "${PC_MAC:-}" ]; then
    NOTES+=("Add PC_MAC (the PC's wired network card) to couchpie.conf and run this again, or \"Ligar PC\" won't work.")
fi
install_template "$M/wake/wake-pc" "$HOME/.local/bin/wake-pc" 755
install_template "$M/wake/wake-page" "$HOME/.local/bin/wake-page" 755
install_template "$M/wake/wake-page.service" "$HOME/.config/systemd/user/wake-page.service"
# A user service; lingering starts it at boot, whether or not the desktop has logged in
sudo loginctl enable-linger "$USER"
systemctl --user daemon-reload
systemctl --user enable wake-page
systemctl --user restart wake-page
# Published to the tailnet only (not Funnel), with the Pi's ts.net HTTPS certificate
if command -v tailscale > /dev/null && sudo tailscale serve --bg http://127.0.0.1:8095 > /dev/null; then
    host=$(tailscale status --json | python3 -I -c 'import json, sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')
    NOTES+=("Wake page: open https://$host/ on the phone (with Tailscale on) and add it to the home screen.")
else
    NOTES+=("The wake page isn't on the tailnet: set up Tailscale with HTTPS certificates on, then run this again.")
fi


step "PC shared folders (SMB)"
if ! sudo test -f /etc/cifs-creds; then
    install_system "$M/smb/cifs-creds.example" /etc/cifs-creds 600
    NOTES+=("Put the password of the $SMB_USER Windows account in /etc/cifs-creds: sudo nano /etc/cifs-creds")
fi
for SHARE in $SMB_SHARES; do
    unit=$(systemd-escape -p "/mnt/windows_share/$SHARE")
    sudo mkdir -p "/mnt/windows_share/$SHARE"
    install_system "$M/smb/share.mount.in" "/etc/systemd/system/$unit.mount"
    install_system "$M/smb/share.automount.in" "/etc/systemd/system/$unit.automount"
done
sudo systemctl daemon-reload
for SHARE in $SMB_SHARES; do
    unit=$(systemd-escape -p "/mnt/windows_share/$SHARE")
    sudo systemctl disable "$unit.mount" 2> /dev/null || true  # earlier installs mounted at boot
    sudo systemctl enable --now "$unit.automount"
done


step "Home Assistant (Docker)"
M_HA="$M/homeassistant"
HA=/srv/homeassistant
# Docker's log limits, so container logs can't fill the microSD card
render "$M_HA/daemon.json" > "$TMP"
if ! sudo cmp -s "$TMP" /etc/docker/daemon.json; then
    sudo install -D -m 644 "$TMP" /etc/docker/daemon.json
    systemctl is-active --quiet docker && sudo systemctl restart docker
fi
# Home Assistant needs Docker Engine 23 or later, newer than Debian's docker.io
if ! dpkg -s docker-ce > /dev/null 2>&1; then
    sudo install -m 0755 -d /etc/apt/keyrings
    sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc]" \
        "https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" |
        sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

install_system "$M_HA/compose.yaml" "$HA/compose.yaml"
# configuration.yaml is Home Assistant's to keep once it exists; ours only on a fresh install
if ! sudo test -f "$HA/config/configuration.yaml"; then
    install_system "$M_HA/configuration.yaml" "$HA/config/configuration.yaml"
    # The files it includes, as Home Assistant would create them
    echo "[]" | sudo tee "$HA/config/automations.yaml" "$HA/config/scenes.yaml" > /dev/null
    sudo touch "$HA/config/scripts.yaml"
    sudo mkdir -p "$HA/config/themes"
elif ! sudo grep -q "packages: !include_dir_named packages" "$HA/config/configuration.yaml"; then
    NOTES+=("Add 'homeassistant: packages: !include_dir_named packages' to $HA/config/configuration.yaml, or couchPie's Home Assistant settings aren't loaded.")
fi
package_changed=false
render "$M_HA/couchpie.yaml" > "$TMP"
if ! sudo cmp -s "$TMP" "$HA/config/packages/couchpie.yaml"; then
    sudo install -D -m 644 "$TMP" "$HA/config/packages/couchpie.yaml"
    package_changed=true
fi
was_running=$(sudo docker ps -q -f name='^homeassistant$')
echo "Starting Home Assistant; the first time, this downloads about 600 MB."
sudo docker compose -f "$HA/compose.yaml" up -d
# Home Assistant reads its YAML at start, so a running one needs a restart for ours
if [ -n "$was_running" ] && $package_changed; then
    sudo docker restart homeassistant > /dev/null
fi

# Backups are written on the Pi and copied to the PC whenever it's on
install_system "$M_HA/ha-backup-sync" /usr/local/bin/ha-backup-sync 755
install_system "$M_HA/ha-backup-sync.service" /etc/systemd/system/ha-backup-sync.service
install_system "$M_HA/ha-backup-sync.timer" /etc/systemd/system/ha-backup-sync.timer
sudo systemctl daemon-reload
sudo systemctl enable --now ha-backup-sync.timer

# On the tailnet with HTTPS, next to the wake page on 443
if command -v tailscale > /dev/null && sudo tailscale serve --bg --https=8443 http://127.0.0.1:8123 > /dev/null; then
    host=$(tailscale status --json | python3 -I -c 'import json, sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')
    NOTES+=("Home Assistant: https://$host:8443/ on the tailnet, or http://$(hostname).local:8123 at home. The first start takes a few minutes; then create your account there.")
else
    NOTES+=("Home Assistant: http://$(hostname).local:8123 (it isn't on the tailnet with HTTPS: set up Tailscale with HTTPS certificates, then run this again).")
fi


step "Kodi"
kodi="$HOME/.kodi"
addon="$kodi/addons/service.kiosk.startfolder"
install_template "$M/kodi/service.kiosk.startfolder/addon.xml" "$addon/addon.xml"
install_template "$M/kodi/service.kiosk.startfolder/service.py" "$addon/service.py"
if kodi_running; then
    NOTES+=("Kodi was open, so its sources and CEC setting weren't changed: close Kodi and run this again.")
else
    if [ ! -f "$kodi/userdata/sources.xml" ]; then
        install_template "$M/kodi/sources.xml" "$kodi/userdata/sources.xml"
    elif ! grep -qF "$KODI_FOLDER" "$kodi/userdata/sources.xml"; then
        NOTES+=("Kodi already has sources: add $KODI_FOLDER in Kodi (Vídeos > Arquivos > Adicionar vídeos).")
    fi
    # Kodi's own CEC support would take the TV connection from cec-remote
    cec="$kodi/userdata/peripheral_data/cec_CEC_Adapter.xml"
    if [ -f "$cec" ]; then
        sed -i 's|<setting id="enabled" value="1" />|<setting id="enabled" value="0" />|' "$cec"
    else
        NOTES+=("Kodi hasn't run yet: start it once, close it, and run this again to turn off its CEC support.")
    fi
fi


step "Boot"
# Log in to the desktop automatically; labwc's autostart then opens Pegasus
sudo raspi-config nonint do_boot_behaviour B4


step "Done"
NOTES+=("Kodi asks once whether to enable \"Quiosque: abrir Downloads do PC\": choose Yes.")
NOTES+=("Reboot to start couchPie: sudo reboot")
printf '* %s\n' "${NOTES[@]}"
