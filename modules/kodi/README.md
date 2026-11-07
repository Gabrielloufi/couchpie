# kodi

| File | Installed to | Purpose |
|---|---|---|
| `service.kiosk.startfolder/` | `~/.kodi/addons/` | Opens the PC downloads folder when Kodi starts; Back from it goes to Kodi's home. |
| `sources.xml` | `~/.kodi/userdata/sources.xml` (only if missing) | The "Downloads do PC" video source. |

Kodi asks once, on its next start, whether to enable "Quiosque: abrir Downloads do
PC": choose Yes.

`scripts/bootstrap.sh` also turns off Kodi's own CEC support
(`userdata/peripheral_data/cec_CEC_Adapter.xml`). Left on, Kodi takes the TV
connection away from `cec-remote` while it runs; with it off, Kodi gets the remote as
ordinary keys (arrows, Enter, Esc, media keys) like every other app.

Kodi's language is its own setting: Configurações → Interface → Região → Idioma →
Português (Brasil); Kodi downloads it.
