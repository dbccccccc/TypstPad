use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, Emitter};

/// In-memory store for the API key (per session).
/// For a production app you would use a secure keychain / keyring.
static API_KEY: Mutex<Option<String>> = Mutex::new(None);

// ── Request / Response types ────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct ChatRequest {
    pub messages: Vec<ChatMessage>,
    pub model: Option<String>,
    pub temperature: Option<f64>,
    pub max_tokens: Option<u32>,
    /// Optional custom base URL (e.g. for Azure OpenAI or local models).
    pub base_url: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ChatResponse {
    pub content: String,
    pub model: String,
    pub finish_reason: String,
    pub usage: Option<UsageInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UsageInfo {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

/// Payload emitted to the frontend for each streamed chunk.
#[derive(Debug, Serialize, Clone)]
pub struct StreamChunk {
    pub delta: String,
    pub done: bool,
}

// ── Helper: resolve base URL ────────────────────────────────────────────────

fn resolve_base_url(custom: &Option<String>) -> String {
    custom
        .as_deref()
        .unwrap_or("https://api.openai.com/v1")
        .trim_end_matches('/')
        .to_string()
}

// ── Commands ────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn chat_completion(request: ChatRequest) -> Result<ChatResponse, String> {
    let api_key = API_KEY
        .lock()
        .map_err(|e| e.to_string())?
        .clone()
        .ok_or_else(|| "API key not configured".to_string())?;

    let base = resolve_base_url(&request.base_url);
    let model = request.model.unwrap_or_else(|| "gpt-4o-mini".into());

    let body = serde_json::json!({
        "model": model,
        "messages": request.messages.iter().map(|m| serde_json::json!({
            "role": m.role,
            "content": m.content,
        })).collect::<Vec<_>>(),
        "temperature": request.temperature.unwrap_or(0.7),
        "max_tokens": request.max_tokens.unwrap_or(2048),
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{base}/chat/completions"))
        .header("Authorization", format!("Bearer {api_key}"))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("OpenAI API error ({status}): {text}"));
    }

    let data: serde_json::Value = resp.json().await.map_err(|e| format!("Parse error: {e}"))?;

    let choice = data["choices"]
        .get(0)
        .ok_or_else(|| "No choices in response".to_string())?;

    let content = choice["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string();
    let finish_reason = choice["finish_reason"]
        .as_str()
        .unwrap_or("stop")
        .to_string();
    let resp_model = data["model"].as_str().unwrap_or(&model).to_string();

    let usage = data.get("usage").and_then(|u| {
        Some(UsageInfo {
            prompt_tokens: u["prompt_tokens"].as_u64()? as u32,
            completion_tokens: u["completion_tokens"].as_u64()? as u32,
            total_tokens: u["total_tokens"].as_u64()? as u32,
        })
    });

    Ok(ChatResponse {
        content,
        model: resp_model,
        finish_reason,
        usage,
    })
}

#[tauri::command]
pub async fn chat_completion_stream(
    app: AppHandle,
    request: ChatRequest,
) -> Result<(), String> {
    let api_key = API_KEY
        .lock()
        .map_err(|e| e.to_string())?
        .clone()
        .ok_or_else(|| "API key not configured".to_string())?;

    let base = resolve_base_url(&request.base_url);
    let model = request.model.unwrap_or_else(|| "gpt-4o-mini".into());

    let body = serde_json::json!({
        "model": model,
        "messages": request.messages.iter().map(|m| serde_json::json!({
            "role": m.role,
            "content": m.content,
        })).collect::<Vec<_>>(),
        "temperature": request.temperature.unwrap_or(0.7),
        "max_tokens": request.max_tokens.unwrap_or(2048),
        "stream": true,
    });

    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{base}/chat/completions"))
        .header("Authorization", format!("Bearer {api_key}"))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("OpenAI API error ({status}): {text}"));
    }

    // Process the SSE stream
    use futures_util::StreamExt;
    let mut stream = resp.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream error: {e}"))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        // Process complete SSE lines
        while let Some(pos) = buffer.find("\n\n") {
            let line_block = buffer[..pos].to_string();
            buffer = buffer[pos + 2..].to_string();

            for line in line_block.lines() {
                let line = line.trim();
                if line.is_empty() || line.starts_with(':') {
                    continue;
                }

                if let Some(data) = line.strip_prefix("data: ") {
                    let data = data.trim();
                    if data == "[DONE]" {
                        let _ = app.emit("ai-stream-chunk", StreamChunk {
                            delta: String::new(),
                            done: true,
                        });
                        return Ok(());
                    }

                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                        if let Some(delta) = parsed["choices"]
                            .get(0)
                            .and_then(|c| c["delta"]["content"].as_str())
                        {
                            let _ = app.emit("ai-stream-chunk", StreamChunk {
                                delta: delta.to_string(),
                                done: false,
                            });
                        }
                    }
                }
            }
        }
    }

    // Signal completion
    let _ = app.emit("ai-stream-chunk", StreamChunk {
        delta: String::new(),
        done: true,
    });

    Ok(())
}

#[tauri::command]
pub fn store_api_key(key: String) -> Result<(), String> {
    let mut guard = API_KEY.lock().map_err(|e| e.to_string())?;
    *guard = Some(key);
    Ok(())
}

#[tauri::command]
pub fn get_api_key() -> Result<Option<String>, String> {
    let guard = API_KEY.lock().map_err(|e| e.to_string())?;
    // Return a masked version for display, or None
    Ok(guard.as_ref().map(|k| {
        if k.len() > 8 {
            format!("{}...{}", &k[..4], &k[k.len() - 4..])
        } else {
            "****".to_string()
        }
    }))
}

#[tauri::command]
pub fn remove_api_key() -> Result<(), String> {
    let mut guard = API_KEY.lock().map_err(|e| e.to_string())?;
    *guard = None;
    Ok(())
}
