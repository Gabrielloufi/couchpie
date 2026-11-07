# Opens the PC downloads folder when Kodi starts, so the Kodi tile in the kiosk goes
# straight to the movies. "return" makes Back from that folder go to Kodi's home.
import xbmc

FOLDER = "@KODI_FOLDER@"

xbmc.executebuiltin(f'ActivateWindow(Videos,"{FOLDER}",return)')
