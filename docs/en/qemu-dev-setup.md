# QEMU Dev Setup

This guide explains how to set up a full Raspberry Pi OS (Bookworm, 64-bit) virtual machine using QEMU for GUI and hardware simulation.

## Prerequisites
- QEMU and qemu-system-aarch64 installed
- Raspberry Pi OS (64-bit) image file (.img)
- Raspberry Pi firmware files (required for `raspi4b` machine type)

## Steps
1. **Install QEMU:**
   First, remove any existing QEMU installation:
   ```bash
   sudo apt-get remove --purge qemu-system-* qemu-utils qemu-efi-*
   ```

   Then install build dependencies:
   ```bash
   sudo apt-get update && sudo apt-get install -y \
     git libglib2.0-dev libfdt-dev libpixman-1-dev zlib1g-dev \
     ninja-build meson python3-sphinx python3-venv python3-tomli gcc make \
     pkg-config libsdl2-dev
   ```

   Build and install QEMU from source:
   ```bash
   cd /tmp && git clone https://gitlab.com/qemu-project/qemu.git && cd qemu && git checkout v10.1.0 && ./configure --target-list=aarch64-softmmu && make -j$(nproc) && sudo make install
   ```

   Verify the installation:
   ```bash
   qemu-system-aarch64 --version  # Should show version 10.1.0
   ```
   
   > **Note:** We use the `raspi4b` machine type which provides proper support for Raspberry Pi 4/5 features. This requires QEMU version 7.0 or higher.

2. **Download Raspberry Pi OS Image:**
   - Go to [Raspberry Pi OS Downloads](https://www.raspberrypi.com/software/operating-systems/)
   - Download "Raspberry Pi OS with desktop (64-bit)" - we need the arm64 version for Pi 4/5
   - The file will be a .img.xz archive, extract it at your WSL terminal:
   ```bash
   # Extract with progress monitoring -- Evolve this ASAP
   WIN_USER=$(cmd.exe /c echo %USERNAME% 2>/dev/null | tr -d '\r')
   XZ_FILE="/mnt/c/Users/${WIN_USER}/Downloads/*bookworm*.xz"
   IMG_FILE="${XZ_FILE%.xz}"
   xz -vd "$XZ_FILE" & 
   PID=$!
   START_TIME=$SECONDS
   dots=""
   while kill -0 $PID 2>/dev/null; do
     elapsed=$((SECONDS - START_TIME))
     dots=".${dots}"
     [ ${#dots} -gt 3 ] && dots="."
     if [ -f "$IMG_FILE" ]; then
       size=$(du -h "$IMG_FILE" 2>/dev/null | cut -f1)
       printf "\rExtracting%s [%02d:%02d] Size: %s" "$dots" $((elapsed/60)) $((elapsed%60)) "$size"
     else
       printf "\rExtracting%s [%02d:%02d]" "$dots" $((elapsed/60)) $((elapsed%60))
     fi
     sleep 1
   done
   wait $PID
   elapsed=$((SECONDS - START_TIME))
   echo -e "\nExtraction complete in ${elapsed}s: $(du -h "$IMG_FILE" | cut -f1)"
   ```
   - This will give you the .img file needed for QEMU

3. **Get Raspberry Pi Firmware:**
   Download and extract the required firmware files:
   ```bash
   # Install unzip if not already installed
   sudo apt-get update && sudo apt-get install -y unzip

   # Create firmware directory
   mkdir -p ~/qemu-rpi-firmware && cd ~/qemu-rpi-firmware

   # Download and extract firmware
   wget https://github.com/raspberrypi/firmware/archive/refs/heads/master.zip
   unzip master.zip
   
   # Copy needed files to working directory
   cp firmware-master/boot/{fixup4.dat,start4.elf,bcm2711-rpi-4-b.dtb,kernel8.img} .
   ```

4. **Resize Image:**
   The Raspberry Pi 4B emulation requires the SD card image size to be a power of 2. Resize the image to 8 GiB:
   ```bash
   qemu-img resize "$IMG_FILE" 8G
   ```

5. **Run QEMU:**
   - Example command (adjust paths as needed):
   ```bash
   cd ~/qemu-rpi-firmware && \
   IMG_PATH=$(ls /mnt/c/Users/$(cmd.exe /c echo %USERNAME% 2>/dev/null | tr -d '\r')/Downloads/*bookworm*.img) && \
   qemu-system-aarch64 \
     -M raspi4b \
     -m 2048 \
     -cpu cortex-a72 \
     -dtb bcm2711-rpi-4-b.dtb \
     -kernel kernel8.img \
     -append "console=ttyAMA0 root=/dev/mmcblk0p2 rw rootwait rootfstype=ext4" \
     -drive file="$IMG_PATH",format=raw,if=sd \
     -drive file=start4.elf,format=raw,if=pflash \
     -drive file=fixup4.dat,format=raw,if=pflash \
     -serial stdio \
     -display sdl \
     -usb \
     -device usb-mouse \
     -device usb-kbd
   ```
   - For advanced hardware emulation, you may need additional kernel/firmware files.

## Windows/WSL: Enabling GUI with VcXsrv

If you are running QEMU from WSL and want to see the Raspberry Pi OS desktop (GUI), you need an X server on Windows. We recommend using [VcXsrv](https://sourceforge.net/projects/vcxsrv/):

1. Install VcXsrv on Windows and launch it (accept default settings or enable 'Disable access control' for easier setup).
2. In your WSL terminal, set the DISPLAY variable:
   ```bash
   export DISPLAY=host.docker.internal:0.0
   ```
3. Now run your QEMU command with `-display sdl` or `-display gtk` to open the GUI in a Windows window.

This allows you to interact with the full Raspberry Pi OS desktop from your QEMU VM.

## Notes
- QEMU VM is best for testing the full GUI and user experience.
- You can install Docker inside the VM for native ARM64 builds.
