// Tauri commands for the encrypted event store. Contract: docs/specs/sync-protocol-and-platform-contract.md.
mod store;

use std::path::PathBuf;
use std::sync::Mutex;

use serde::Serialize;
use serde_json::Value;
use tauri::{Manager, State};

use store::{EventPage, Store, StoreError};

pub struct AppState {
    store: Mutex<Store>,
    device: String,
    data_dir: PathBuf,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceInfo {
    device: String,
    data_dir: String,
}

#[tauri::command]
fn append_events(state: State<'_, AppState>, events: Vec<Value>) -> Result<usize, StoreError> {
    state.store.lock().unwrap().append(&events, false)
}

#[tauri::command]
fn list_events(state: State<'_, AppState>, after_seq: Option<i64>) -> Result<EventPage, StoreError> {
    state.store.lock().unwrap().list(after_seq.unwrap_or(0))
}

#[tauri::command]
fn device_info(state: State<'_, AppState>) -> DeviceInfo {
    DeviceInfo { device: state.device.clone(), data_dir: state.data_dir.display().to_string() }
}

fn env_or(name: &str, default: &str) -> String {
    std::env::var(name).ok().filter(|v| !v.trim().is_empty()).unwrap_or_else(|| default.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let data_dir = match std::env::var("ER_DATA_DIR") {
                Ok(d) if !d.trim().is_empty() => PathBuf::from(d),
                _ => app.path().app_data_dir()?,
            };
            let key = env_or("ER_DB_KEY", store::DEFAULT_DB_KEY);
            let device = env_or("ER_DEVICE", "A");
            let store = Store::open(&data_dir, &key)?;
            app.manage(AppState { store: Mutex::new(store), device, data_dir });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![append_events, list_events, device_info])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
