
markdown
# mediadwn

**A clean, fast web interface for downloading online media locally.**

Paste any video URL, pick MP4 (video) or MP3 (audio), choose a quality, and download the processed file straight to your machine. Everything runs on your own computer – no accounts, no cloud, no limits.

<p align="center">
  <img src="screenshot.png" width="600" alt="mediadwn home screen"/>
</p>

---

## ✨ Features

- **URL analysis** – fetch title, thumbnail, or playlist entries instantly  
- **Format selection** – MP4 (video) or MP3 (audio)  
- **Quality options** – 360p, 720p, 1080p for video  
- **Real-time progress** – live updates while the file is processed  
- **Direct download** – get the finished file with one click  
- **Mobile‑responsive** – works perfectly on phones, tablets, and desktops  
- **Local only** – all data stays on your computer, no internet connection needed for processing  

---

## 🧰 Tech Stack

| Layer         | Technology                            |
|---------------|---------------------------------------|
| Frontend      | React 18, Vite, Tailwind CSS 4       |
| Backend       | Rust (Axum), Tokio, Serde             |
| Media engine  | yt-dlp (extraction), ffmpeg (conversion) |
| File storage  | Local filesystem (`/tmp/offline-vault/`) |

---

## 📦 Prerequisites

Before running mediadwn, make sure these are installed on your system:

- **Rust** (1.70+) – [rustup.rs](https://rustup.rs)
- **Node.js** (v18+) and npm – [nodejs.org](https://nodejs.org)
- **yt-dlp**  
  ```bash
  pip install yt-dlp
or download a binary from yt-dlp GitHub

ffmpeg

Ubuntu/Debian: sudo apt install ffmpeg

macOS: brew install ffmpeg

Windows: ffmpeg.org/download.html

Verify that both yt-dlp and ffmpeg are available in your terminal:

bash
yt-dlp --version
ffmpeg -version
🚀 Quick Start
1. Clone the repository
bash
git clone https://github.com/yourusername/mediadwn.git
cd mediadwn
2. Start the backend
bash
cd backend
cargo run
The API server will start on http://localhost:4000. Keep this terminal open.

3. Start the frontend
Open a second terminal and run:

bash
cd frontend-vite
npm install
npm run dev
The frontend is now live at http://localhost:5173.

🧭 How to Use
Open http://localhost:5173 in your browser.

Paste a video or playlist URL (YouTube, Vimeo, etc.) and click Analyze.

On the preview screen:

Confirm the title/thumbnail

Choose MP4 (video) or MP3 (audio)

For MP4, select a resolution (360p, 720p, or 1080p)

Click Download.

Watch the progress bar fill up. When complete, a download link appears – click it to save the file.

📡 Backend API
The backend exposes these endpoints on http://localhost:4000:

Method	Endpoint	Description
POST	/analyze	Analyze a URL. Returns video info or playlist array.
POST	/download	Start a download/conversion job.
GET	/status/:job_id	Get status (pending, processing, done, failed) and progress (0-100).
GET	/file/:job_id	Download the finished file.
Example /analyze request:

json
POST /analyze
{ "url": "https://www.youtube.com/watch?v=..." }
Example response (single video):

json
{
  "title": "My Video Title",
  "thumbnail": "https://...",
  "is_playlist": false
}
Example response (playlist):

json
[
  { "title": "First video", "url": "https://..." },
  { "title": "Second video", "url": "https://..." }
]
🧩 Project Structure
text
mediadwn/
├── backend/                 # Rust API server
│   ├── Cargo.toml
│   └── src/
│       └── main.rs
├── frontend-vite/           # React + Vite app
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
└── README.md
🔧 Configuration
Output directory: Files are saved to /tmp/offline-vault/. To change this, edit the output_dir() function in backend/src/main.rs.

Frontend API URL: All fetch calls in the React components point to http://localhost:4000. If you change the backend port, update those URLs accordingly.

🐛 Troubleshooting
“yt-dlp not found” – Make sure yt-dlp is installed and in your PATH. Restart your terminal after installing.

“ffmpeg not found” – Same as above; ensure ffmpeg is installed and accessible.

Frontend fails to start – Delete node_modules and run npm install again.

Backend fails to compile – Ensure you have the latest stable Rust toolchain: rustup update stable.

Files not downloading – Check that the backend has write permission to /tmp/offline-vault/. The directory is created automatically.

🛡️ Important Notes
mediadwn is a personal tool for downloading media you have the right to access. Respect copyright laws in your country.

There is no authentication – run it on a trusted local network only.

All temporary files are stored in /tmp/offline-vault/, which is usually cleared on reboot. Clean up manually if needed.

🔮 Roadmap
Real-time progress via WebSockets

Persistent job history (SQLite)

Full playlist batch download

Custom file‑naming templates

Docker support

Desktop app wrapper (Tauri)

Contributions and ideas are welcome!

📄 License
MIT © 2026 Your Name

🙏 Acknowledgements
yt-dlp – outstanding media extractor

ffmpeg – universal media converter

Axum – elegant Rust web framework

Vite and Tailwind CSS – fast, beautiful frontend tooling

<p align="center"> Built with ❤️ for offline media lovers. </p> ```
