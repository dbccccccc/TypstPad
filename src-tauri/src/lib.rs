mod ai;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            ai::chat_completion,
            ai::chat_completion_stream,
            ai::store_api_key,
            ai::get_api_key,
            ai::remove_api_key,
        ])
        .setup(|app| {
            // Ensure the app data directory exists for storing settings
            let app_dir = app.path().app_data_dir().expect("failed to get app data dir");
            std::fs::create_dir_all(&app_dir).ok();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
