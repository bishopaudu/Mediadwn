# mediadwn

**A clean, fast web interface for downloading online media locally.**

Paste any video URL, pick MP4 (video) or MP3 (audio), choose a quality, and download the processed file straight to your machine.

Everything runs on your own computer — no accounts, no cloud, no limits.

<p align="center">
  <img src="screenshot.png" width="600" alt="mediadwn home screen"/>
</p>

---

# ✨ Features

- URL analysis — fetch title, thumbnail, or playlist entries instantly
- Format selection — MP4 (video) or MP3 (audio)
- Quality options — 360p, 720p, 1080p for video
- Real-time progress updates
- Direct file downloads
- Mobile responsive UI
- Local-only processing
- Playlist support
- Fast Rust backend powered by Axum + Tokio

---

# 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS 4 |
| Backend | Rust, Axum, Tokio, Serde |
| Media Engine | yt-dlp, ffmpeg |
| Storage | Local filesystem |

---

# 📦 Prerequisites

Before running `mediadwn`, install the following:

## Rust

Install Rust from:

- https://rustup.rs

Verify:

```bash
rustc --version
cargo --version
```

---

## Node.js

Install Node.js v18+ from:

- https://nodejs.org

Verify:

```bash
node --version
npm --version
```

---

## yt-dlp

Install with pip:

```bash
pip install yt-dlp
```

Or download binaries from:

- https://github.com/yt-dlp/yt-dlp

Verify:

```bash
yt-dlp --version
```

---

## ffmpeg

### macOS

```bash
brew install ffmpeg
```

### Ubuntu / Debian

```bash
sudo apt install ffmpeg
```

### Windows

Download from:

- https://ffmpeg.org/download.html

Verify:

```bash
ffmpeg -version
```

---

# 🚀 Quick Start

## 1. Clone the Repository

```bash
git clone https://github.com/yourusername/mediadwn.git
cd mediadwn
```

---

## 2. Start the Backend

```bash
cd backend
cargo run
```

Backend runs on:

```txt
http://localhost:4000
```

Keep this terminal running.

---

## 3. Start the Frontend

Open another terminal:

```bash
cd frontend-vite
npm install
npm run dev
```

Frontend runs on:

```txt
http://localhost:5173
```

---

# 🧭 How to Use

1. Open:

```txt
http://localhost:5173
```

2. Paste a video or playlist URL

3. Click **Analyze**

4. Choose:
   - MP4 or MP3
   - Video quality (360p / 720p / 1080p)

5. Click **Download**

6. Wait for processing

7. Download the finished file

---

# 📡 Backend API

Base URL:

```txt
http://localhost:4000
```

| Method | Endpoint | Description |
|---|---|---|
| POST | `/analyze` | Analyze video or playlist |
| POST | `/download` | Start download job |
| GET | `/status/:job_id` | Get job progress |
| GET | `/file/:job_id` | Download finished file |

---

## Example Analyze Request

```json
POST /analyze

{
  "url": "https://www.youtube.com/watch?v=..."
}
```

---

## Example Single Video Response

```json
{
  "title": "My Video Title",
  "thumbnail": "https://...",
  "is_playlist": false
}
```

---

## Example Playlist Response

```json
[
  {
    "title": "First Video",
    "url": "https://..."
  },
  {
    "title": "Second Video",
    "url": "https://..."
  }
]
```

---

# 🧩 Project Structure

```txt
mediadwn/
├── backend/
│   ├── Cargo.toml
│   └── src/
│       └── main.rs
│
├── frontend-vite/
│   ├── public/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Preview.jsx
│   │   │   └── Progress.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

# 🔧 Configuration

## Output Directory

Downloaded files are stored in:

```txt
/tmp/offline-vault/
```

To change this, edit:

```rust
fn output_dir() -> PathBuf
```

inside:

```txt
backend/src/main.rs
```

---

## Frontend API URL

Frontend requests currently point to:

```txt
http://localhost:4000
```

If you change the backend port, update the frontend fetch URLs.

---

# 🐛 Troubleshooting

## yt-dlp not found

Ensure yt-dlp is installed and available in PATH.

Restart your terminal after installation.

---

## ffmpeg not found

Install ffmpeg and verify:

```bash
ffmpeg -version
```

---

## Frontend fails to start

Delete dependencies and reinstall:

```bash
rm -rf node_modules
npm install
```

---

## Backend fails to compile

Update Rust:

```bash
rustup update stable
```

---

## Files are not downloading

Ensure backend can write to:

```txt
/tmp/offline-vault/
```

---

# 🛡️ Important Notes

- `mediadwn` is intended for personal/offline use
- Respect copyright laws in your country
- No authentication is included
- Run only on trusted networks
- Temporary files are stored locally

---

# 🔮 Roadmap

- Real-time WebSocket progress
- SQLite job history
- Full playlist batch downloads
- Docker support
- Tauri desktop app
- Custom filename templates

---

# 📄 License

MIT © 2026

---

# 🙏 Acknowledgements

- yt-dlp
- ffmpeg
- Axum
- Tokio
- Vite
- Tailwind CSS

---

<p align="center">
Built with ❤️ for offline media lovers.
</p>
