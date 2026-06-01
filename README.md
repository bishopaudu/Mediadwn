# mediadwn

> **Free online media downloader — paste a link, pick a format, download instantly.**

mediadwn is a fast, no-account web app that lets anyone download videos and audio from YouTube, TikTok, Instagram, Twitter/X, SoundCloud, Vimeo, Twitch, Facebook, and thousands more platforms powered by [yt-dlp](https://github.com/yt-dlp/yt-dlp).

No sign-up. No extensions. Just a URL.

---

## ✨ Features

| | |
|---|---|
| 🎬 **MP4 Video** | Download at 360p, 720p, or 1080p |
| 🎵 **MP3 Audio** | High-quality audio extraction |
| 📋 **Playlist support** | Auto-detect playlists, pick individual videos or batch-download all |
| ✂️ **Trim on download** | Set a start and end time to clip only the section you need |
| 📝 **Subtitle support** | Write or embed subtitle tracks into your download (MP4) |
| ⚡ **Real-time progress** | Live status updates while your file is being processed |
| 🌗 **Dark / light mode** | System-aware theme with a manual toggle |
| 📱 **Mobile responsive** | Works on any screen size |
| 🔒 **No tracking** | Your data stays yours — files are auto-deleted after 24 hours |

---

## 🌐 Supported Platforms

YouTube · TikTok · Instagram · Twitter / X · Facebook · SoundCloud · Vimeo · Twitch · and [thousands more](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)

> **Note:** Some content may be unavailable due to platform restrictions (private videos, age gates, region locks, live streams in progress).

---

## 🖥️ How It Works

1. **Paste** a video or playlist URL into the input field
2. **Analyze** — mediadwn fetches the title, thumbnail, and metadata
3. **Choose** your format (MP4 or MP3) and quality
4. **Download** — the backend processes the file and streams it straight to your browser

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS 4, React Router |
| **Backend** | Rust, Axum, Tokio, SQLx |
| **Database** | PostgreSQL (job tracking & share links) |
| **Media Engine** | yt-dlp + ffmpeg |
| **Analytics** | PostHog (privacy-friendly, opt-out available) |

---

## 📡 API Reference

The backend exposes a simple REST API on port `4000`.

### `POST /analyze`

Fetch metadata for a URL. Returns a single video object or a playlist array.

```json
{
  "url": "https://www.youtube.com/watch?v=..."
}
```

**Single video response:**
```json
{
  "title": "Video Title",
  "thumbnail": "https://...",
  "is_playlist": false,
  "duration": 212.0,
  "view_count": 1500000,
  "uploader": "Channel Name",
  "filesize_approx": 45000000
}
```

**Playlist response:**
```json
[
  { "title": "First Video",  "url": "https://..." },
  { "title": "Second Video", "url": "https://..." }
]
```

---

### `POST /download`

Start an async download job. Returns a `job_id` immediately.

```json
{
  "url": "https://...",
  "format": "mp4",
  "quality": "720p",
  "custom_filename": "my-clip",
  "speed_limit": "5M",
  "start_time": "00:01:30",
  "end_time": "00:03:00",
  "write_subs": true,
  "embed_subs": true,
  "sub_langs": "en"
}
```

| Field | Type | Description |
|---|---|---|
| `url` | string | **Required.** The media URL |
| `format` | string | **Required.** `"mp4"` or `"mp3"` |
| `quality` | string | `"360p"`, `"720p"`, `"1080p"` (MP4 only, defaults to `720p`) |
| `custom_filename` | string | Custom output filename (without extension) |
| `speed_limit` | string | Bandwidth cap e.g. `"2M"`, `"500K"` |
| `start_time` | string | Trim start `"HH:MM:SS"` |
| `end_time` | string | Trim end `"HH:MM:SS"` |
| `write_subs` | bool | Write subtitle file alongside video |
| `embed_subs` | bool | Embed subtitles directly into the MP4 |
| `sub_langs` | string | Subtitle language codes e.g. `"en,es"` |

---

### `GET /status/:job_id`

Poll the status of a running job.

```json
{
  "status": "processing",
  "progress": 65,
  "error": null
}
```

Possible status values: `pending` · `processing` · `done` · `failed`

---

### `GET /file/:job_id`

Retrieve the finished file. Returns the binary with appropriate `Content-Disposition` and `Content-Type` headers.

---

### `POST /share`

Create a shareable download link for a completed job.

```json
{
  "job_id": "abc-123",
  "password": "optional-secret",
  "expires_in_hours": 24
}
```

Returns:
```json
{
  "url": "https://yourdomain.com/share/Xk9pQrZ1aB2c",
  "token": "Xk9pQrZ1aB2c"
}
```

---

### `GET /share/:token`

Serve a shared file. Accepts an optional `?password=` query parameter if the share is password-protected. Returns `410 Gone` if the link has expired.

---

## 🗂️ Project Structure

```
mediadwn/
├── backend/
│   ├── Cargo.toml          # Rust dependencies
│   ├── Dockerfile
│   └── src/
│       └── main.rs         # All API routes, job engine, share logic
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── App.jsx          # Routes: / → /preview → /progress
│       ├── config.js        # API base URL
│       ├── pages/
│       │   ├── Home.jsx         # URL input, platform pills, FAQ
│       │   ├── Preview.jsx      # Format/quality picker, metadata display
│       │   ├── Progress.jsx     # Real-time job status polling
│       │   └── BatchProgress.jsx
│       ├── components/
│       │   ├── InfoModal.jsx    # About / Terms / Privacy / Contact modals
│       │   └── ThemeToggle.jsx
│       └── context/
│           └── ThemeContext.jsx
│
└── README.md
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `PORT` | Port for the API server | `4000` |
| `BACKEND_URL` | Public URL of the backend (used in share links) | auto-detected |
| `YOUTUBE_COOKIES` | Cookie string for age-restricted / member content | — |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_BASE` | Full URL of the backend API |

---

## 🛡️ Privacy & Legal

- Downloaded files are **automatically deleted after 24 hours**
- No user accounts, no login, no personal data stored
- mediadwn is intended for **personal use** — archiving content you have the right to save
- Always respect the copyright and Terms of Service of the source platform
- We do not condone downloading content for redistribution or commercial purposes

---

## 🔮 Roadmap

- [ ] WebSocket real-time progress (no polling)
- [ ] Full playlist batch-download queue
- [ ] Download history per session
- [ ] Custom subtitle language selector UI
- [ ] Tauri desktop wrapper

---

## 🙏 Acknowledgements

Built on the shoulders of giants:

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — the media extraction engine
- [ffmpeg](https://ffmpeg.org) — audio/video processing & trimming
- [Axum](https://github.com/tokio-rs/axum) — Rust web framework
- [Tokio](https://tokio.rs) — async Rust runtime
- [Vite](https://vitejs.dev) + [React](https://react.dev) — frontend
- [Tailwind CSS](https://tailwindcss.com) — styling

---

## 📄 License

MIT © 2026 mediadwn

---

<p align="center">
  Fast · Free · No account needed
</p>
