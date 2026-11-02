# smb

Folders shared from the Windows PC, mounted on the Pi at `/mnt/windows_share/<share>`.

| File | Installed to | Purpose |
|---|---|---|
| `share.mount.in` | `/etc/systemd/system/mnt-windows_share-<share>.mount` | The CIFS mount, one per share in `SMB_SHARES`. |
| `share.automount.in` | `/etc/systemd/system/mnt-windows_share-<share>.automount` | Mounts it the first time something opens the folder. |
| `cifs-creds.example` | `/etc/cifs-creds` (only if missing, mode 600) | The Windows account the Pi signs in with. |
| `windows-share.ps1` | run on the PC | Sets up the Windows side. |

Mounting on demand means a PC that's off doesn't hold up or fail the boot; opening
the folder while it's off fails after about 15 seconds, and works again by itself
once the PC is back.

## Windows side

In PowerShell as administrator, on the PC:

```powershell
powershell -ExecutionPolicy Bypass -File windows-share.ps1 -Folders F:\qbit,F:\sharedFolder
```

It creates the `couchpie` account (asking for its password), gives it access to the
folders, shares them, sets the Ethernet network to Private and allows file sharing.
Then put the same password in `/etc/cifs-creds` on the Pi (`sudo nano /etc/cifs-creds`).

If the Pi still can't connect, check that the PC answers on port 445
(`timeout 4 bash -c '</dev/tcp/<pc-address>/445'` on the Pi) and that a VPN on the
PC isn't hiding it from the local network (NordVPN: "Invisibilidade na LAN").
