# Devcontainer image: Rust + Node 20 + wasm32 target
FROM mcr.microsoft.com/devcontainers/rust:1

# Install Node.js 20 via NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Add wasm32 target for Soroban contract builds
RUN rustup target add wasm32-unknown-unknown

# Install Stellar CLI (latest)
RUN cargo install --locked stellar-cli --features opt 2>/dev/null || true
