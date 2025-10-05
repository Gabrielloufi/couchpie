# 🧱 CouchPie — Windows Shared Folders (SMB Mount Setup)

This document explains how to **expose folders from a Windows PC** to the Raspberry Pi (running CouchPie) over your local network, ensuring full **read/write access**, **real-time sync**, and **auto-mounting at boot** via `systemd`.

---

## 1️⃣ Overview

We will:
1. Share specific folders on Windows (e.g. `qbit` and `sharedFolder`);
2. Create a credential file on the Pi for secure authentication;
3. Mount the shares using optimized CIFS options (`noperm`, `nounix`, `cache=none`, etc.);
4. Persist the configuration via `.mount` units under `/etc/systemd/system`.

Result: the Pi and Windows stay in perfect sync — ideal for CouchPie modules like **Jellyfin**, **qBittorrent**, or **Home Assistant**.

---

## 2️⃣ Windows Configuration

### A. Create the local user
1. Open *Settings → Accounts → Other users* → Add account.  
2. Choose **Local user**, e.g.  
   ```
   Username: couchpie
   Password: yourStrongPassword
   ```

### B. Share the folders
1. Right-click the folder → **Properties → Sharing → Advanced Sharing...**
2. Check ✅ **Share this folder**
3. Click **Permissions**
4. Add the `couchpie` user:
   - Click **Add → Advanced → Find Now → couchpie → OK**
   - Mark ✅ **Full Control** (this automatically includes *Change* + *Read*).

### C. Adjust NTFS permissions
1. Tab **Security → Edit → Add → Advanced → Find Now → couchpie → OK**
2. Grant:
   - ✅ *Modify*
   - ✅ *Read & execute*
   - ✅ *List folder contents*
   - ✅ *Read*
   - ✅ *Write*
3. Apply → OK.

Ensure “Read-only” is **not** checked on the folder properties.

---

## 3️⃣ Raspberry Pi Configuration

### A. Create credentials file
```bash
sudo nano /etc/cifs-creds
```
Contents:
```
username=couchpie
password=yourStrongPassword
```
Protect it:
```bash
sudo chmod 600 /etc/cifs-creds
```

### B. Create mount points
```bash
sudo mkdir -p /mnt/windows_share/qbit
sudo mkdir -p /mnt/windows_share/sharedFolder
```

---

## 4️⃣ Manual Mount Test (verify first)

Run this once to confirm connectivity:
```bash
sudo mount -t cifs //192.168.0.158/qbit /mnt/windows_share/qbit \
  -o credentials=/etc/cifs-creds,vers=3.0,sec=ntlmssp,rw,noperm,nounix,uid=1000,gid=1000,file_mode=0666,dir_mode=0777,cache=none,actimeo=1
```

Then test write:
```bash
echo "test" > /mnt/windows_share/qbit/test.txt
ls -l /mnt/windows_share/qbit
```

If the file appears, everything is working.  
Repeat for `sharedFolder` if desired.

---

## 5️⃣ Persistent Mount via systemd

Create two unit files:

### `/etc/systemd/system/mnt-windows_share-qbit.mount`
```ini
[Unit]
Description=Mount Windows qbit share
After=network-online.target
Wants=network-online.target

[Mount]
What=//192.168.0.158/qbit
Where=/mnt/windows_share/qbit
Type=cifs
Options=credentials=/etc/cifs-creds,vers=3.0,sec=ntlmssp,rw,noperm,nounix,uid=1000,gid=1000,file_mode=0666,dir_mode=0777,cache=none,actimeo=1
TimeoutSec=30

[Install]
WantedBy=multi-user.target
```

### `/etc/systemd/system/mnt-windows_share-sharedFolder.mount`
```ini
[Unit]
Description=Mount Windows sharedFolder share
After=network-online.target
Wants=network-online.target

[Mount]
What=//192.168.0.158/sharedFolder
Where=/mnt/windows_share/sharedFolder
Type=cifs
Options=credentials=/etc/cifs-creds,vers=3.0,sec=ntlmssp,rw,noperm,nounix,uid=1000,gid=1000,file_mode=0666,dir_mode=0777,cache=none,actimeo=1
TimeoutSec=30

[Install]
WantedBy=multi-user.target
```

---

## 6️⃣ Reload & Enable

```bash
sudo systemctl daemon-reload
sudo systemctl enable mnt-windows_share-qbit.mount
sudo systemctl enable mnt-windows_share-sharedFolder.mount
sudo systemctl start  mnt-windows_share-qbit.mount
sudo systemctl start  mnt-windows_share-sharedFolder.mount
```

Check:
```bash
df -h | grep windows_share
```

---

## 7️⃣ Optional: Auto-Mount on Demand (lazy mount)

To mount only when accessed (non-blocking boot), create `.automount` files:

Example: `/etc/systemd/system/mnt-windows_share-qbit.automount`
```ini
[Unit]
Description=Auto-mount Windows qbit share

[Automount]
Where=/mnt/windows_share/qbit

[Install]
WantedBy=multi-user.target
```

Enable it:
```bash
sudo systemctl enable --now mnt-windows_share-qbit.automount
```

Same structure applies to `sharedFolder`.

---

## 8️⃣ Verification & Troubleshooting

- **View mount options:**
  ```bash
  mount | grep cifs
  ```
- **Force refresh:**
  ```bash
  sudo umount /mnt/windows_share/qbit && sudo mount /mnt/windows_share/qbit
  ```
- **Check logs:**
  ```bash
  dmesg | tail -20
  ```
- **Windows explorer refresh:** sometimes requires `F5` to reflect new files instantly (CIFS already syncs).

---

## 9️⃣ Summary of Key Options

| Option | Purpose |
|---------|----------|
| `rw` | read/write mode |
| `noperm` | ignore Linux-side permission checks |
| `nounix` | avoid Unix ACL conflicts |
| `uid/gid` | map ownership to local user |
| `file_mode/dir_mode` | ensures full access |
| `cache=none, actimeo=1` | near real-time updates |
| `credentials=/etc/cifs-creds` | secure auth |
| `x-systemd.automount` | lazy-mount only when used |

---

## ✅ Expected Behavior
- Files created on Windows appear on the Pi instantly (after UI refresh).  
- Files created or modified on the Pi appear on Windows immediately.  
- Mounts reconnect automatically at boot or on access.  
- CouchPie services can safely store/download media directly to the shared folders.

---

> **Note:** If you ever reinstall Windows or change the PC hostname/IP, just update the `What=` line in each `.mount` file and reload systemd.

