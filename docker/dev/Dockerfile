# Dockerfile for couchPie dev (arm64 base) - remember to use --platform=linux/arm64
FROM debian:bookworm

# Install basic dev tools (edit as needed)
RUN apt-get update && \
	apt-get install -y --no-install-recommends \
		python3 python3-pip git curl sudo \
		ca-certificates && \
	rm -rf /var/lib/apt/lists/*

# Set up a non-root user (optional, for dev)
RUN useradd -ms /bin/bash devuser && echo "devuser ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
USER devuser
WORKDIR /home/devuser

# Entrypoint (can be changed as needed)
CMD ["bash"]
