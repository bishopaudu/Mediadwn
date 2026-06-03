# ---- Build stage ----
FROM rust:latest AS builder
WORKDIR /app
COPY . .
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*
RUN cargo build --release
# ---- Runtime stage ----
# ---- Runtime stage ----
FROM rust:latest
WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    gcc \
    ffmpeg \
    curl \
    ca-certificates \
    unzip \
    && pip3 install --break-system-packages curl-cffi \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
       -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp \
    && curl -fsSL https://deno.land/install.sh | sh \
    && mv /root/.deno/bin/deno /usr/local/bin/deno \
    && python3 -c "import curl_cffi; print('curl_cffi OK')" \
    && yt-dlp --list-impersonate-targets \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/mediadwn-backend .

EXPOSE 4000
CMD ["./mediadwn-backend"]