use axum::{
    extract::{Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Json},
    routing::{delete, get, post},
    Router,
};
//use futures::TryStreamExt;
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;
use uuid::Uuid;
use axum::debug_handler;

// ---------- Data types ----------

#[derive(Clone, Debug, Serialize)]
struct Job {
    id: String,
    status: JobStatus,
    progress: u8,
    filename: Option<String>,
    error: Option<String>,
    title: Option<String>,
    url: Option<String>,
    format: Option<String>,
    quality: Option<String>,
    thumbnail: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
struct HistoryEntry {
    id: Uuid,
    job_id: String,
    user_id: String,
    url: String,
    title: Option<String>,
    format: String,
    quality: Option<String>,
    file_path: Option<String>,
    thumbnail: Option<String>,
    downloaded_at: chrono::DateTime<chrono::Utc>,
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
    format: String,
    quality: Option<String>,
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
    db: PgPool,
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
        .map(|c| {
            if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect()
}

fn extract_user_id(headers: &HeaderMap) -> Result<String, StatusCode> {
    headers
        .get("X-User-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty())
        .ok_or(StatusCode::UNAUTHORIZED)
}

// ---------- Route handlers ----------

async fn analyze(
    Json(payload): Json<AnalyzeRequest>,
) -> Result<Json<AnalyzeResponse>, (StatusCode, String)> {
    // unchanged – see previous version
    let url = payload.url.trim().to_string();
    if url.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "URL is required".into()));
    }
    // ... same yt-dlp logic as before
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
    let json: serde_json::Value = serde_json::from_str(trimmed)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    if let Some(entries) = json.get("entries") {
        let playlist: Vec<PlaylistEntry> = entries
            .as_array()
            .ok_or_else(|| (StatusCode::INTERNAL_SERVER_ERROR, "Invalid playlist format".into()))?
            .iter()
            .filter_map(|v| {
                let title = v.get("title")?.as_str()?.to_string();
                let url = v.get("url").or_else(|| v.get("webpage_url"))?.as_str()?.to_string();
                Some(PlaylistEntry { title, url })
            })
            .collect();
        Ok(Json(AnalyzeResponse::Playlist(playlist)))
    } else if json.is_array() {
        let entries: Vec<serde_json::Value> = serde_json::from_str(trimmed)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let playlist: Vec<PlaylistEntry> = entries
            .into_iter()
            .filter_map(|v| {
                let title = v.get("title")?.as_str()?.to_string();
                let url = v.get("url").or_else(|| v.get("webpage_url"))?.as_str()?.to_string();
                Some(PlaylistEntry { title, url })
            })
            .collect();
        Ok(Json(AnalyzeResponse::Playlist(playlist)))
    } else {
        let title = json["title"].as_str().unwrap_or("Unknown").to_string();
        let thumbnail = json["thumbnail"].as_str().unwrap_or("").to_string();
        Ok(Json(AnalyzeResponse::Single {
            title,
            thumbnail,
            is_playlist: false,
        }))
    }
}

async fn download(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<DownloadRequest>,
) -> Result<Json<DownloadResponse>, (StatusCode, String)> {
    let user_id = extract_user_id(&headers).map_err(|_| {
        (StatusCode::UNAUTHORIZED, "Missing X-User-ID header".to_string())
    })?;

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
        url: Some(url.clone()),
        format: Some(format.clone()),
        quality: Some(quality.clone()),
        thumbnail: None,
    };

    state.jobs.write().await.insert(job_id.clone(), job);

    let jobs = state.jobs.clone();
    let db = state.db.clone();
    let jid = job_id.clone();

    tokio::spawn(async move {
        // Processing...
        let mut map = jobs.write().await;
        if let Some(j) = map.get_mut(&jid) {
            j.status = JobStatus::Processing;
            j.progress = 10;
        }
        drop(map);

        let output_path = output_dir().join(&jid);
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
                cmd.args(["-f", &format!("bestvideo[height<={0}]+bestaudio/best[height<={0}]", height)]);
            }
            _ => {}
        }

        let result = cmd.output().await;
        let mut map = jobs.write().await;
        let j = match map.get_mut(&jid) {
            Some(j) => j,
            None => return,
        };

        match result {
            Ok(output) if output.status.success() => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let mut final_file: Option<PathBuf> = None;
                if let Ok(mut entries) = tokio::fs::read_dir(output_dir()).await {
                    while let Ok(Some(entry)) = entries.next_entry().await {
                        let fname = entry.file_name().to_string_lossy().into_owned();
                        if fname.starts_with(&jid) {
                            final_file = Some(entry.path());
                            break;
                        }
                    }
                }
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

                if let Some(file_path) = final_file {
                    j.status = JobStatus::Done;
                    j.progress = 100;
                    j.filename = Some(file_path.to_string_lossy().into_owned());

                    // Save to PostgreSQL
                    let history_id = Uuid::new_v4();
                    let _ = sqlx::query(
                        "INSERT INTO downloads (id, job_id, user_id, url, title, format, quality, file_path, thumbnail)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"
                    )
                    .bind(history_id)
                    .bind(&j.id)
                    .bind(&user_id)
                    .bind(j.url.as_deref().unwrap_or(""))
                    .bind(j.title.as_deref().unwrap_or("Unknown"))
                    .bind(j.format.as_deref().unwrap_or(&format))
                    .bind(j.quality.as_deref())
                    .bind(j.filename.as_deref())
                    .bind(j.thumbnail.as_deref())
                    .execute(&db)
                    .await;
                } else {
                    j.status = JobStatus::Failed;
                    j.error = Some("Output file not found after download".into());
                }
            }
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                j.status = JobStatus::Failed;
                j.error = Some(format!("yt-dlp failed: {}", stderr));
            }
            Err(e) => {
                j.status = JobStatus::Failed;
                j.error = Some(e.to_string());
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
                let data = tokio::fs::read(&path)
                    .await
                    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
                let mime = mime_guess::from_path(&path).first_or_octet_stream();
                let disposition = format!(
                    "attachment; filename=\"{}\"",
                    sanitize_filename(j.title.as_deref().unwrap_or("download"))
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
        Some(_) => Err(StatusCode::CONFLICT),
        None => Err(StatusCode::NOT_FOUND),
    }
}

// ---------- History endpoints (user‑specific) ----------

async fn list_history(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Vec<HistoryEntry>>, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    let search = params.get("q").cloned().unwrap_or_default();

    let entries = if search.is_empty() {
        sqlx::query_as::<_, HistoryEntry>(
            "SELECT id, job_id, user_id, url, title, format, quality, file_path, thumbnail, downloaded_at
             FROM downloads WHERE user_id = $1 ORDER BY downloaded_at DESC LIMIT 100"
        )
        .bind(&user_id)
        .fetch_all(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    } else {
        let like = format!("%{}%", search);
        sqlx::query_as::<_, HistoryEntry>(
            "SELECT id, job_id, user_id, url, title, format, quality, file_path, thumbnail, downloaded_at
             FROM downloads WHERE user_id = $1 AND (title ILIKE $2 OR url ILIKE $2) ORDER BY downloaded_at DESC LIMIT 100"
        )
        .bind(&user_id)
        .bind(&like)
        .fetch_all(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    };

    Ok(Json(entries))
}
#[axum::debug_handler]
async fn delete_history(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,        // ← Path FIRST
    headers: HeaderMap,           // ← HeaderMap SECOND
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;

    // Get file path to delete from disk
    let row: Option<(Option<String>,)> = sqlx::query_as(
        "SELECT file_path FROM downloads WHERE id = $1 AND user_id = $2"
    )
    .bind(id)
    .bind(&user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if let Some((Some(file_path),)) = row {
        let _ = tokio::fs::remove_file(&file_path).await;
    }

    let result = sqlx::query("DELETE FROM downloads WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(&user_id)
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if result.rows_affected() == 0 {
        return Err(StatusCode::NOT_FOUND);
    }
    Ok(StatusCode::NO_CONTENT)
}
#[axum::debug_handler]
async fn download_again(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,        // ← Path FIRST
    headers: HeaderMap,           // ← HeaderMap SECOND
) -> Result<impl IntoResponse, StatusCode> {
    let user_id = extract_user_id(&headers)?;

    let entry: HistoryEntry = sqlx::query_as(
        "SELECT id, job_id, user_id, url, title, format, quality, file_path, thumbnail, downloaded_at
         FROM downloads WHERE id = $1 AND user_id = $2"
    )
    .bind(id)
    .bind(&user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let file_path = entry.file_path.ok_or(StatusCode::NOT_FOUND)?;
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err(StatusCode::NOT_FOUND);
    }

    let data = tokio::fs::read(&path)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let mime = mime_guess::from_path(&path).first_or_octet_stream();
    let disposition = format!(
        "attachment; filename=\"{}\"",
        sanitize_filename(entry.title.as_deref().unwrap_or("download"))
    );
    let headers = [
        (header::CONTENT_TYPE, mime.as_ref().to_string()),
        (header::CONTENT_DISPOSITION, disposition),
    ];
    Ok((headers, data))
}

// ---------- Main ----------

#[tokio::main]
async fn main() {
    ensure_output_dir().await;

    // Connect to PostgreSQL
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://mediadwn:mediadwn@localhost/mediadwn".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to create PostgreSQL pool");

    // Create table if not exists
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS downloads (
            id UUID PRIMARY KEY,
            job_id TEXT UNIQUE NOT NULL,
            user_id TEXT NOT NULL,
            url TEXT NOT NULL,
            title TEXT,
            format TEXT NOT NULL,
            quality TEXT,
            file_path TEXT,
            thumbnail TEXT,
            downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )"
    )
    .execute(&pool)
    .await
    .expect("Failed to create downloads table");

    let state = Arc::new(AppState {
        jobs: Arc::new(RwLock::new(HashMap::new())),
        db: pool,
    });

    let app = Router::new()
        .route("/analyze", post(analyze))
        .route("/download", post(download))
        .route("/status/:job_id", get(job_status))
        .route("/file/:job_id", get(download_file))
        .route("/history", get(list_history))
        .route("/history/:id", delete(delete_history))
        .route("/download-again/:id", get(download_again))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:4000").await.unwrap();
    println!("Backend listening on http://0.0.0.0:4000");
    axum::serve(listener, app).await.unwrap();
}

/*use axum::{
    extract::{Path, State},
    http::{header, StatusCode},
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use mongodb::{Client, Database, IndexModel, bson::{self, Document, doc}};
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
#[derive(Debug, Serialize, Deserialize)]
struct HistoryDoc {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    id: Option<bson::oid::ObjectId>,
    job_id: String,
    url: String,
    title: Option<String>,
    format: String,
    quality: Option<String>,
    file_path: Option<String>,
    thumbnail: Option<String>,
    downloaded_at: bson::DateTime,   // stored as MongoDB date
    user_id: Option<String>,         // for future auth
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

/*struct AppState {
    jobs: Arc<RwLock<HashMap<String, Job>>>,
}*/


struct AppState {
    jobs: Arc<RwLock<HashMap<String, Job>>>,
    db: Database,   // MongoDB database handle
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


async fn analyze(
    Json(payload): Json<AnalyzeRequest>,
) -> Result<Json<AnalyzeResponse>, (StatusCode, String)> {
    let url = payload.url.trim().to_string();
    if url.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "URL is required".into()));
    }

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

    // Parse the JSON output
    let json: serde_json::Value = serde_json::from_str(trimmed)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Check if it's a playlist (either an array or an object with "entries")
    if let Some(entries) = json.get("entries") {
        // Object with "entries" -> playlist
        let playlist: Vec<PlaylistEntry> = entries
            .as_array()
            .ok_or_else(|| (StatusCode::INTERNAL_SERVER_ERROR, "Invalid playlist format".into()))?
            .iter()
            .filter_map(|v| {
                let title = v.get("title")?.as_str()?.to_string();
                let url = v.get("url").or_else(|| v.get("webpage_url"))?.as_str()?.to_string();
                Some(PlaylistEntry { title, url })
            })
            .collect();

        Ok(Json(AnalyzeResponse::Playlist(playlist)))
    } else if json.is_array() {
        // Top-level array -> playlist (rare but supported)
        let entries: Vec<serde_json::Value> = serde_json::from_str(trimmed)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        let playlist: Vec<PlaylistEntry> = entries
            .into_iter()
            .filter_map(|v| {
                let title = v.get("title")?.as_str()?.to_string();
                let url = v.get("url").or_else(|| v.get("webpage_url"))?.as_str()?.to_string();
                Some(PlaylistEntry { title, url })
            })
            .collect();
        Ok(Json(AnalyzeResponse::Playlist(playlist)))
    } else {
        // Single video
        let title = json["title"].as_str().unwrap_or("Unknown").to_string();
        let thumbnail = json["thumbnail"].as_str().unwrap_or("").to_string();
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
/*async fn main() {
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
}*/

async fn main() {
    ensure_output_dir().await;

    // Connect to MongoDB
    let mongo_uri = std::env::var("MONGODB_URI")
        .unwrap_or_else(|_| "mongodb://localhost:27017".to_string());
    let client = Client::with_uri_str(&mongo_uri)
        .await
        .expect("Failed to connect to MongoDB");
    let db = client.database("mediadwn");   // database name

    // Optional: create indexes for faster queries
    db.collection::<Document>("history")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "job_id": 1 })
                .build(),
            None,
        )
        .await
        .ok();

    let state = Arc::new(AppState {
        jobs: Arc::new(RwLock::new(HashMap::new())),
        db,
    });

}*/
