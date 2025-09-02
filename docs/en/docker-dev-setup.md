# Docker Dev Setup

This guide explains how to set up a development environment for couchPie using Docker with ARM64 emulation.

## Prerequisites
- Docker installed (with QEMU/binfmt support for ARM64)
- Linux, WSL2, or macOS recommended

## Build the Dev Image
From the project root:

```bash
docker build --platform=linux/arm64 -f docker/dev/Dockerfile -t couchpie-dev .
```

## Run the Dev Container

```bash
docker run --rm -it --platform=linux/arm64 -v $(pwd):/workspace -w /workspace couchpie-dev
```

- This mounts your project directory into the container for live development.
- You can add more options as needed (e.g., port mapping).

## Notes
- The first build may be slow due to ARM64 emulation. (@Gabrielloufi note: It is taking ~10 minutes on this version)
- Use the same Dockerfile for both local and QEMU VM builds for consistency.
