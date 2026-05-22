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
use rand::Rng;
use axum::debug_handler;
use dotenvy::dotenv;
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
    custom_filename: Option<String>,
    speed_limit: Option<String>,
    start_time: Option<String>,
    end_time: Option<String>,
    write_subs: Option<bool>,   
    embed_subs: Option<bool>,   
    sub_langs: Option<String>,  
    title: Option<String>,
    thumbnail: Option<String>,
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

#[derive(Deserialize)]
struct ShareRequest {
    job_id: String,
    password: Option<String>,
    expires_in_hours: Option<i64>,
}

#[derive(Serialize)]
struct ShareResponse {
    url: String,
    token: String,
}

#[derive(sqlx::FromRow)]
struct ShareRecord {
    id: Uuid,
    job_id: String,
    token: String,
    password: Option<String>,
    expires_at: Option<chrono::DateTime<chrono::Utc>>,
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
        eprintln!("Analyzing URL: {}", payload.url.trim());

    // unchanged – see previous version
    let url = payload.url.trim().to_string();
    if url.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "URL is required".into()));
    }
    
   /*  let output = tokio::process::Command::new("yt-dlp")
        .args(["-J", "--flat-playlist", &url])
        .output()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;*/
    let mut cmd = tokio::process::Command::new("yt-dlp");
if std::path::Path::new("/app/cookies.txt").exists() {
    cmd.args(["--cookies", "/app/cookies.txt"]);
}
cmd.args(["-J", "--flat-playlist", &url]);
let output = cmd
    .output()
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
   /*  if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err((StatusCode::BAD_REQUEST, format!("yt-dlp error: {}", stderr)));
    }*/
    if !output.status.success() {
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        eprintln!("yt-dlp stderr: {}", stderr);

    let user_message = if stderr.contains("No module named expat") {
        "Instagram and Facebook downloads are currently unavailable due to a known issue. Please try YouTube, Twitter, TikTok, or other supported sites.".to_string()
    } else if stderr.contains("This video is not available") {
        "This video is not available or has been removed.".to_string()
    } else if stderr.contains("Private video") {
        "This video is private and cannot be downloaded.".to_string()
    } else if stderr.contains("Sign in to confirm your age") {
        "This video requires age verification and cannot be downloaded.".to_string()
    } else if stderr.contains("Premieres in") {
        "This video has not premiered yet. Please try again later.".to_string()
    } else if stderr.contains("This live event will begin in") 
        || stderr.contains("is not currently available") {
        "This live stream has not started yet.".to_string()
    } else if stderr.contains("Unable to extract") 
        || stderr.contains("Unsupported URL") {
        "This URL is not supported. Please try a different video link.".to_string()
    } else {
        "Failed to analyze this URL. Please check the link and try again.".to_string()
    };
    
    return Err((StatusCode::BAD_REQUEST, user_message));
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
        title: payload.title.clone(),
        url: Some(url.clone()),
        format: Some(format.clone()),
        quality: Some(quality.clone()),
        thumbnail: payload.thumbnail.clone(),
    };

    state.jobs.write().await.insert(job_id.clone(), job);

    let jobs = state.jobs.clone();
    let db = state.db.clone();
    let jid = job_id.clone();

    let custom_filename = payload.custom_filename.clone();
    let speed_limit = payload.speed_limit.clone();
    let start_time = payload.start_time.clone();
    let end_time = payload.end_time.clone();

    // Add these alongside your other clones before tokio::spawn
let write_subs = payload.write_subs;
let embed_subs = payload.embed_subs;
let sub_langs = payload.sub_langs.clone();

    tokio::spawn(async move {
        // Update to Processing
        {
            let mut map = jobs.write().await;
            if let Some(j) = map.get_mut(&jid) {
                j.status = JobStatus::Processing;
                j.progress = 10;
            }
        }

        // Determine output template
        let filename_prefix = if let Some(ref custom) = custom_filename {
            sanitize_filename(custom)
        } else {
            jid.clone()
        };
        let output_template = output_dir()
            .join(format!("{}.%(ext)s", filename_prefix))
            .to_string_lossy()
            .to_string();

        // Build yt-dlp command
        let mut cmd = tokio::process::Command::new("yt-dlp");
        cmd.arg("-o").arg(&output_template).arg(&url);
        cmd.arg("--no-simulate");
        cmd.arg("--print").arg("after_move:filepath");

         if std::path::Path::new("/app/cookies.txt").exists() {
            cmd.args(["--cookies", "/app/cookies.txt"]);
        }

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
                cmd.args([
                    "-f",
                    &format!("bestvideo[height<={0}]+bestaudio/best[height<={0}]", height),
                    "--merge-output-format",
                    "mp4",
                ]);
            }
            _ => unreachable!(),
        }

        // Speed limit
        if let Some(ref limit) = speed_limit {
            if limit != "unlimited" {
                cmd.args(["--limit-rate", limit]);
            }
        }

        // ---- Add subtitle options (only for video, but we can allow for audio too if user wants) ----
   if format == "mp4" {
            if embed_subs.unwrap_or(false) {
                // always write first, then embed
                cmd.args(["--write-subs", "--embed-subs"]);
                if let Some(ref langs) = sub_langs {
                    if !langs.is_empty() {
                        cmd.args(["--sub-langs", langs]);
                    }
                }
            } else if write_subs.unwrap_or(false) {
                cmd.arg("--write-subs");
                if let Some(ref langs) = sub_langs {
                    if !langs.is_empty() {
                        cmd.args(["--sub-langs", langs]);
                    }
                }
            }
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

                // Try the path yt-dlp printed via --print after_move:filepath
                let printed_path = stdout
                    .lines()
                    .find(|l| !l.trim().is_empty())
                    .map(|l| PathBuf::from(l.trim()));

                let mut final_file: Option<PathBuf> = None;

                if let Some(ref p) = printed_path {
                    if p.exists() {
                        final_file = Some(p.clone());
                    }
                }

                // Fallback: scan output dir for a real media file with our prefix
                if final_file.is_none() {
                    if let Ok(mut entries) = tokio::fs::read_dir(output_dir()).await {
                        while let Ok(Some(entry)) = entries.next_entry().await {
                            let fname = entry.file_name().to_string_lossy().into_owned();
                            if fname.starts_with(&filename_prefix) {
                                let path = entry.path();
                                if let Some(ext) = path.extension() {
                                    let ext = ext.to_string_lossy().to_lowercase();
                                    if ["mp4", "mp3", "webm", "mkv", "m4a", "ogg"]
                                        .contains(&ext.as_str())
                                    {
                                        final_file = Some(path);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }

                if let Some(file_path) = final_file {
                    // Trimming with ffmpeg
                    let need_trim = start_time.is_some() || end_time.is_some();

                    if need_trim {
                        let ext = file_path
                            .extension()
                            .map(|e| format!(".{}", e.to_string_lossy()))
                            .unwrap_or_default();
                        let trimmed = output_dir()
                            .join(format!("{}_trimmed{}", filename_prefix, ext));

                        let mut ffmpeg = tokio::process::Command::new("ffmpeg");
                        ffmpeg.arg("-i").arg(&file_path);
                        if let Some(ref start) = start_time {
                            ffmpeg.args(["-ss", start]);
                        }
                        if let Some(ref end) = end_time {
                            ffmpeg.args(["-to", end]);
                        }
                        ffmpeg.arg("-c").arg("copy").arg(&trimmed);

                        match ffmpeg.output().await {
                            Ok(ffout) if ffout.status.success() => {
                                let _ = tokio::fs::remove_file(&file_path).await;
                                let _ = tokio::fs::rename(&trimmed, &file_path).await;
                            }
                            Ok(_) => {
                                j.error =
                                    Some("Trimming failed, keeping original file".into());
                            }
                            Err(e) => {
                                j.error = Some(format!("Trimming error: {}", e));
                            }
                        }
                    }

                    j.status = JobStatus::Done;
                    j.progress = 100;
                    j.filename = Some(file_path.to_string_lossy().into_owned());

                    // Save to PostgreSQL
                    let history_id = Uuid::new_v4();
                    let _ = sqlx::query(
                        "INSERT INTO downloads (id, job_id, user_id, url, title, format, quality, file_path, thumbnail)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
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
                let error_msg = if stderr.contains("No module named expat") 
        || stderr.contains("CURRENTLY BROKEN") 
    {
        "Instagram downloads are currently not supported. Try YouTube, Vimeo, TikTok or other supported sites.".to_string()
    } else {
        format!("yt-dlp failed: {}", stderr)
    };
                j.status = JobStatus::Failed;
                j.error = Some(error_msg);
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

                // Use the actual filename from disk, NOT j.title
                let actual_filename = path
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| "download".to_string());

                let disposition = format!(
                    "attachment; filename=\"{}\"",
                    actual_filename  // ← has the real name + extension e.g. "abc-123.mp4"
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
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Query(params): Query<HashMap<String, String>>,
) -> Result<impl IntoResponse, StatusCode> {
    let user_id = extract_user_id(&headers)
        .or_else(|_| params.get("user_id").cloned().ok_or(StatusCode::UNAUTHORIZED))?;

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
        //sanitize_filename(entry.title.as_deref().unwrap_or("download")
        PathBuf::from(&file_path)
    .file_name()
    .map(|n| n.to_string_lossy().to_string())
    .unwrap_or_else(|| "download".to_string())
        );
    
    let headers = [
        (header::CONTENT_TYPE, mime.as_ref().to_string()),
        (header::CONTENT_DISPOSITION, disposition),
    ];
    Ok((headers, data))
}

async fn create_share(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<ShareRequest>,
) -> Result<Json<ShareResponse>, StatusCode> {
    let _user_id = extract_user_id(&headers)?;

    // Verify job exists and is done
    let job = {
        let map = state.jobs.read().await;
        map.get(&payload.job_id).cloned()
    }
    .ok_or(StatusCode::NOT_FOUND)?;

    if job.status != JobStatus::Done {
        return Err(StatusCode::CONFLICT);
    }

    // Generate random token
    let token: String = rand::thread_rng()
        .sample_iter(&rand::distributions::Alphanumeric)
        .take(12)
        .map(char::from)
        .collect();

    let expires_at = payload.expires_in_hours.map(|h| {
        chrono::Utc::now() + chrono::Duration::hours(h)
    });

    let share_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO shares (id, job_id, token, password, expires_at)
         VALUES ($1, $2, $3, $4, $5)"
    )
    .bind(share_id)
    .bind(&payload.job_id)
    .bind(&token)
    .bind(&payload.password)
    .bind(expires_at)
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(ShareResponse {
        url: format!("http://localhost:4000/share/{}", token),
        token,
    }))
}

async fn serve_share(
    State(state): State<Arc<AppState>>,
    Path(token): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<impl IntoResponse, StatusCode> {
    // Fetch share record from DB using function (not macro)
    let share: ShareRecord = sqlx::query_as::<_, ShareRecord>(
        "SELECT id, job_id, token, password, expires_at FROM shares WHERE token = $1"
    )
    .bind(&token)
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    // Check expiration
    if let Some(exp) = share.expires_at {
        if exp < chrono::Utc::now() {
            return Err(StatusCode::GONE);
        }
    }

    // Check password
    if let Some(ref pass) = share.password {
        let provided = params.get("password").cloned();
        if provided.as_deref() != Some(pass.as_str()) {
            return Err(StatusCode::UNAUTHORIZED);
        }
    }

    // Look up file path from downloads table NOT from memory
    // so it works even after server restarts
    let row: Option<(Option<String>,)> = sqlx::query_as(
        "SELECT file_path FROM downloads WHERE job_id = $1"
    )
    .bind(&share.job_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let file_path = row
        .and_then(|(fp,)| fp)
        .ok_or(StatusCode::NOT_FOUND)?;

    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err(StatusCode::NOT_FOUND);
    }

    let data = tokio::fs::read(&path)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mime = mime_guess::from_path(&path).first_or_octet_stream();

    // Use actual filename from disk (fix for the title bug)
    let actual_filename = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "download".to_string());

    let disposition = format!("attachment; filename=\"{}\"", actual_filename);
    let headers = [
        (header::CONTENT_TYPE, mime.as_ref().to_string()),
        (header::CONTENT_DISPOSITION, disposition),
    ];
    Ok((headers, data))
}

// ---------- Main ----------

#[tokio::main]
async fn main() {
        dotenv().ok();
        if let Ok(cookies) = std::env::var("YOUTUBE_COOKIES") {
        tokio::fs::write("/app/cookies.txt", cookies).await.ok();
        println!("YouTube cookies loaded");
    }
    ensure_output_dir().await;

    // Connect to PostgreSQL
   // let database_url = std::env::var("DATABASE_URL_HOSTED")
      //  .unwrap_or_else(|_| data_base_hosted.to_string());
      let database_url =
        std::env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(std::time::Duration::from_secs(10))
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

    sqlx::query(
    "CREATE TABLE IF NOT EXISTS shares (
        id UUID PRIMARY KEY,
        job_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        password TEXT,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )"
)
.execute(&pool)
.await
.expect("Failed to create shares table");

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
        .route("/share", post(create_share))
.route("/share/:token", get(serve_share))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:4000").await.unwrap();
    println!("Backend listening on http://0.0.0.0:4000");
    axum::serve(listener, app).await.unwrap();
}

