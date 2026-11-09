# Choosing a USB Wi-Fi adapter

For the planned travel router mode (see the roadmap), the Pi needs two Wi-Fi connections:
one to the hotel, one to your own devices. The usual arrangement is the Pi's built-in
Wi-Fi as the access point for the phones and the TV box, and a USB adapter as the
uplink to the hotel's network. The adapter plugs straight into one of the Pi's USB ports.
With an Ethernet uplink (a hotel room's wall socket, a travel router, or USB tethering
from a phone) no adapter is needed.

> **Not tested yet.** No specific adapter model has been tested with couchPie. This page
> lists what to check before buying; confirm each point for the model you choose, and
> please add what you find.

## Limitations to know before buying

**Linux driver support varies a lot.**
- Many cheap adapters only work with a driver that isn't part of the Linux kernel.
  Realtek chipsets are the usual case: the driver has to be built separately (DKMS),
  can break after a kernel update, and needs the kernel headers for Raspberry Pi OS
  (64-bit, Bookworm) installed.
- Prefer a chipset whose driver is in the mainline kernel and ships with Raspberry Pi OS.
  The MediaTek `mt76` family (for example MT7612U and MT7921AU) and the Atheros AR9271
  (2.4 GHz only) are the ones commonly named for this. Check the current community lists
  for the Pi 5 and your OS version, since chipsets are re-badged under many names and
  the same product can contain different chipsets from one batch to the next.
- Wi-Fi 6 and 6E adapters are the least reliable on Linux today. A plain dual-band
  Wi-Fi 5 adapter with a well-supported chipset is usually the safer choice.

**Access point mode is not guaranteed.** For the uplink you only need client mode,
which every adapter has. If you plan to use the adapter as the access point instead,
check that it supports it: `iw list` should show `AP` under "Supported interface modes".
Many adapters list only client mode.

**The built-in Wi-Fi has limits too.** It can run an access point and a client at the
same time on some chips, but then both must share one channel, which can be slow or
unstable. This is the reason for using a second adapter.

**USB 3.0 interferes with 2.4 GHz.** Ports and cables of USB 3.0 produce radio noise in
the 2.4 GHz band, which weakens a Wi-Fi adapter plugged in beside them. Use a USB 2.0
port, or a short USB extension cable that moves the adapter away from the Pi and its
USB 3.0 devices.

**Power.** Use the official 27 W supply. As far as we know, the Pi 5 limits the power it
gives to USB devices when it cannot negotiate the full supply, and a power-hungry adapter
can then drop out. Check the adapter's power draw.

**Bands and channels.** Hotels often have a crowded 2.4 GHz band, so dual band
(2.4 and 5 GHz) is useful. Some 5 GHz channels (DFS) have extra rules that make
connections slower to start or drop when radar is detected, and which channels are
allowed depends on the country setting.

**Range and antennas.** A small USB stick has a weak antenna. An adapter with an external
antenna, placed with an extension cable near a window, often gives a better hotel
signal than the Pi itself.

**Hotel networks.**
- Login pages (captive portals) need a browser; see the roadmap's captive portal item.
- Networks that need a username and password per user (WPA-Enterprise) take extra
  configuration in `wpa_supplicant`.
- Many hotels limit the number of devices per room. One Pi sharing the connection
  counts as one device, which helps.
- Some hotel networks block devices from seeing each other. This is why the phones join
  the Pi's own network instead of the hotel's.

## Checking an adapter

After plugging it in:

```bash
lsusb            # the adapter's USB ID, to look up the chipset
dmesg | tail     # whether the kernel found a driver or reported an error
iw dev           # a new wlanN interface should appear
iw list          # supported modes (look for AP), bands and channels
```

Then connect it to a network, run a speed test over it, and let it run for a while
under load; some adapters work for minutes and then disconnect.
