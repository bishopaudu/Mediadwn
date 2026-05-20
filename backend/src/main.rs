/*fn main() {
    println!("Hello, world!");
}*/

use axum::{
    extract::{Path, State},
    http::{header, StatusCode},
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;
use uuid::Uuid;

// ---------- Data types ----------

#[derive(Clone, Debug, Serialize)]
struct Job {
    id: String,
    status: JobStatus,
    progress: u8, // 0-100
    filename: Option<String>,
    error: Option<String>,
    title: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
enum JobStatus {
    Pending,
    Processing,
    Done,
    Failed,
}

#[derive(Deserialize)]
struct AnalyzeRequest {
    url: String,
}

#[derive(Serialize)]
#[serde(untagged)]
enum AnalyzeResponse {
    Single {
        title: String,
        thumbnail: String,
        is_playlist: bool,
    },
    Playlist(Vec<PlaylistEntry>),
}

#[derive(Serialize)]
struct PlaylistEntry {
    title: String,
    url: String,
}

#[derive(Deserialize)]
struct DownloadRequest {
    url: String,
    format: String, // "mp4" or "mp3"
    quality: Option<String>, // e.g. "720p"
}

#[derive(Serialize)]
struct DownloadResponse {
    job_id: String,
}

#[derive(Serialize)]
struct StatusResponse {
    status: String,
    progress: u8,
    error: Option<String>,
}

struct AppState {
    jobs: Arc<RwLock<HashMap<String, Job>>>,
}

// ---------- Helpers ----------

fn output_dir() -> PathBuf {
    PathBuf::from("/tmp/offline-vault")
}

async fn ensure_output_dir() {
    tokio::fs::create_dir_all(output_dir()).await.unwrap();
}

fn sanitize_filename(s: &str) -> String {
    s.chars()
        .map(|c| if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
        .collect()
}

// ---------- Route handlers ----------

async fn analyze(
    Json(payload): Json<AnalyzeRequest>,
) -> Result<Json<AnalyzeResponse>, (StatusCode, String)> {
    let url = payload.url.trim().to_string();
    if url.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "URL is required".into()));
    }

    // Use yt-dlp to dump JSON; check if it's a playlist
    let output = tokio::process::Command::new("yt-dlp")
        .args(["-J", "--flat-playlist", &url])
        .output()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err((StatusCode::BAD_REQUEST, format!("yt-dlp error: {}", stderr)));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let trimmed = stdout.trim();

    if trimmed.starts_with('[') {
        // Playlist: parse array of entries
        let entries: Vec<serde_json::Value> =
            serde_json::from_str(trimmed).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let playlist: Vec<PlaylistEntry> = entries
            .into_iter()
            .filter_map(|v| {
                let title = v.get("title")?.as_str()?.to_string();
                let url = v.get("url")?.as_str()?.to_string();
                Some(PlaylistEntry { title, url })
            })
            .collect();
        Ok(Json(AnalyzeResponse::Playlist(playlist)))
    } else {
        // Single video
        let info: serde_json::Value =
            serde_json::from_str(trimmed).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let title = info["title"].as_str().unwrap_or("Unknown").to_string();
        let thumbnail = info["thumbnail"]
            .as_str()
            .unwrap_or("")
            .to_string();
        Ok(Json(AnalyzeResponse::Single {
            title,
            thumbnail,
            is_playlist: false,
        }))
    }
}

async fn download(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<DownloadRequest>,
) -> Result<Json<DownloadResponse>, (StatusCode, String)> {
    let url = payload.url.trim().to_string();
    let format = payload.format.to_lowercase();
    if url.is_empty() || !["mp4", "mp3"].contains(&format.as_str()) {
        return Err((StatusCode::BAD_REQUEST, "Invalid URL or format".into()));
    }

    let quality = match format.as_str() {
        "mp4" => payload.quality.clone().unwrap_or_else(|| "720p".into()),
        _ => String::new(),
    };

    let job_id = Uuid::new_v4().to_string();
    let job = Job {
        id: job_id.clone(),
        status: JobStatus::Pending,
        progress: 0,
        filename: None,
        error: None,
        title: None,
    };

    state.jobs.write().await.insert(job_id.clone(), job);

    let jobs = state.jobs.clone();
    let jid = job_id.clone();

    tokio::spawn(async move {
        // Update status to Processing
        {
            let mut map = jobs.write().await;
            if let Some(j) = map.get_mut(&jid) {
                j.status = JobStatus::Processing;
                j.progress = 10;
            }
        }

        let output_path = output_dir().join(&jid); // base name, extension will be added by yt-dlp
        let output_template = output_path.to_string_lossy().to_string() + ".%(ext)s";

        let mut cmd = tokio::process::Command::new("yt-dlp");
        cmd.arg("-o").arg(&output_template).arg(&url);

        match format.as_str() {
            "mp3" => {
                cmd.args(["--extract-audio", "--audio-format", "mp3", "--audio-quality", "0"]);
            }
            "mp4" => {
                let height: u32 = match quality.as_str() {
                    "360p" => 360,
                    "720p" => 720,
                    "1080p" => 1080,
                    _ => 720,
                };
                let format_str = format!(
                    "bestvideo[height<={0}]+bestaudio/best[height<={0}]",
                    height
                );
                cmd.args(["-f", &format_str]);
                // For MP4 we might need to remux to mp4; yt-dlp does that automatically
            }
            _ => unreachable!(),
        }

        // Execute yt-dlp
        let result = cmd.output().await;
        match result {
            Ok(output) if output.status.success() => {
                // Find the generated file(s) – yt-dlp often prints the filename to stdout
                let stdout = String::from_utf8_lossy(&output.stdout);
                // Try to locate file: look for files starting with job_id in the output dir
                let mut final_file: Option<PathBuf> = None;
                let mut entries = tokio::fs::read_dir(output_dir()).await.ok();
              // while let Some(entry) = entries.as_mut().and_then(|e: &mut tokio::fs::ReadDir| e.next_entry().await.ok()).flatten() {
              while let Some(entry) = match entries.as_mut() {
    Some(dir) => dir.next_entry().await.ok().flatten(),
    None => None,
} {
                    let fname = entry.file_name().to_string_lossy().into_owned();
                    if fname.starts_with(&jid) {
                        final_file = Some(entry.path());
                        break;
                    }
                } 
               
                // Also try to parse from stdout: yt-dlp may print "[download] Destination: ..."
                if final_file.is_none() {
                    for line in stdout.lines() {
                        if line.contains("Destination:") {
                            let dest = line.split("Destination:").nth(1).unwrap_or("").trim();
                            let path = PathBuf::from(dest);
                            if path.exists() {
                                final_file = Some(path);
                                break;
                            }
                        }
                    }
                }

                let mut map = jobs.write().await;
                if let Some(j) = map.get_mut(&jid) {
                    if let Some(file_path) = final_file {
                        j.status = JobStatus::Done;
                        j.progress = 100;
                        j.filename = Some(file_path.to_string_lossy().into_owned());
                    } else {
                        j.status = JobStatus::Failed;
                        j.error = Some("Output file not found after download".into());
                    }
                }
            }
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let mut map = jobs.write().await;
                if let Some(j) = map.get_mut(&jid) {
                    j.status = JobStatus::Failed;
                    j.error = Some(format!("yt-dlp failed: {}", stderr));
                }
            }
            Err(e) => {
                let mut map = jobs.write().await;
                if let Some(j) = map.get_mut(&jid) {
                    j.status = JobStatus::Failed;
                    j.error = Some(e.to_string());
                }
            }
        }
    });

    Ok(Json(DownloadResponse { job_id }))
}

async fn job_status(
    State(state): State<Arc<AppState>>,
    Path(job_id): Path<String>,
) -> Result<Json<StatusResponse>, StatusCode> {
    let map = state.jobs.read().await;
    if let Some(job) = map.get(&job_id) {
        Ok(Json(StatusResponse {
            status: format!("{:?}", job.status).to_lowercase(),
            progress: job.progress,
            error: job.error.clone(),
        }))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

async fn download_file(
    State(state): State<Arc<AppState>>,
    Path(job_id): Path<String>,
) -> Result<impl IntoResponse, StatusCode> {
    let job = {
        let map = state.jobs.read().await;
        map.get(&job_id).cloned()
    };

    match job {
        Some(j) if j.status == JobStatus::Done => {
            if let Some(ref filename) = j.filename {
                let path = PathBuf::from(filename);
                if !path.exists() {
                    return Err(StatusCode::NOT_FOUND);
                }
                let data = tokio::fs::read(&path).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
                let mime = mime_guess::from_path(&path).first_or_octet_stream();
                let disposition = format!(
                    "attachment; filename=\"{}\"",
                    sanitize_filename(
                        &j.title
                            .as_deref()
                            .unwrap_or("download")
                            .to_string()
                    )
                );
                let headers = [
                    (header::CONTENT_TYPE, mime.as_ref().to_string()),
                    (header::CONTENT_DISPOSITION, disposition),
                ];
                Ok((headers, data))
            } else {
                Err(StatusCode::NOT_FOUND)
            }
        }
        Some(_) => Err(StatusCode::CONFLICT), // not yet ready
        None => Err(StatusCode::NOT_FOUND),
    }
}

#[tokio::main]
async fn main() {
    ensure_output_dir().await;

    let state = Arc::new(AppState {
        jobs: Arc::new(RwLock::new(HashMap::new())),
    });

    let app = Router::new()
        .route("/analyze", post(analyze))
        .route("/download", post(download))
        .route("/status/:job_id", get(job_status))
        .route("/file/:job_id", get(download_file))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:4000").await.unwrap();
    println!("Backend listening on http://0.0.0.0:4000");
    axum::serve(listener, app).await.unwrap();
}
