// Tauri commands for the encrypted event store and client sync. Contract: docs/specs/sync-protocol-and-platform-contract.md.
mod hub;
mod store;
mod sync;

use std::path::PathBuf;
use std::sync::Mutex;

use serde::Serialize;
use serde_json::Value;
use tauri::{Manager, State};

use store::{EventPage, Store, StoreError};
use sync::{SyncMemory, SyncStatus};

pub struct AppState {
    store: Mutex<Store>,
    sync_mem: Mutex<SyncMemory>,
    /// Serializes sync runs (poller + button).
    sync_lock: tauri::async_runtime::Mutex<()>,
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
async fn sync_now(state: State<'_, AppState>, central_url: String) -> Result<SyncStatus, StoreError> {
    let _guard = state.sync_lock.lock().await;
    sync::sync_now(&state.store, &state.sync_mem, &state.device, &central_url).await
}

#[tauri::command]
fn sync_status(state: State<'_, AppState>) -> Result<SyncStatus, StoreError> {
    sync::status(&state.store, &state.sync_mem)
}

/// ISS-0021: serve the central API from this laptop for peers on the same network.
#[tauri::command]
fn hub_start(app: tauri::AppHandle, hub: State<'_, hub::HubState>) -> Result<hub::HubInfo, String> {
    let port = env_or("ER_HUB_PORT", &hub::DEFAULT_PORT.to_string()).parse().unwrap_or(hub::DEFAULT_PORT);
    hub.start(port, std::sync::Arc::new(move |f| f(&app.state::<AppState>().store)))
}

#[tauri::command]
fn hub_stop(hub: State<'_, hub::HubState>) -> hub::HubInfo {
    hub.stop()
}

#[tauri::command]
fn hub_status(hub: State<'_, hub::HubState>) -> hub::HubInfo {
    hub.status()
}

/// `window.print()` is a no-op in the macOS WebView: print the window natively (Cartilla, contingency sheets).
#[tauri::command]
fn print_page(window: tauri::WebviewWindow) -> Result<(), String> {
    window.print().map_err(|e| e.to_string())
}

#[tauri::command]
fn device_info(state: State<'_, AppState>) -> DeviceInfo {
    DeviceInfo { device: state.device.clone(), data_dir: state.data_dir.display().to_string() }
}

/// Writes a user-requested export (backup JSON, CSV) to the Downloads folder, or `<data_dir>/exports`
/// when there is none, and returns the full path. Browser downloads are unreliable inside the webview.
#[tauri::command]
fn save_export(app: tauri::AppHandle, state: State<'_, AppState>, name: String, contents: String) -> Result<String, String> {
    let dir = app.path().download_dir().unwrap_or_else(|_| state.data_dir.join("exports"));
    save_to(&dir, &name, &contents)
}

fn save_to(dir: &std::path::Path, name: &str, contents: &str) -> Result<String, String> {
    let filtered: String = name.chars().filter(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_')).collect();
    let safe = filtered.trim_start_matches('.');
    if safe.is_empty() {
        return Err("nombre de archivo no válido".into());
    }
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let path = dir.join(safe);
    std::fs::write(&path, contents).map_err(|e| e.to_string())?;
    Ok(path.display().to_string())
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
            app.manage(AppState {
                store: Mutex::new(store),
                sync_mem: Mutex::new(SyncMemory::default()),
                sync_lock: Default::default(),
                device,
                data_dir,
            });
            app.manage(hub::HubState::default());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![append_events, list_events, sync_now, sync_status, device_info, print_page, save_export, hub_start, hub_stop, hub_status])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::save_to;

    #[test]
    fn save_to_writes_file_and_strips_path_tricks() {
        let dir = std::env::temp_dir().join(format!("er-export-{}", std::process::id()));
        let path = save_to(&dir, "../respaldo-A-2026-11-21.json", "[]").unwrap();
        assert!(path.ends_with("respaldo-A-2026-11-21.json"));
        assert!(path.starts_with(dir.to_str().unwrap()));
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "[]");
        assert!(save_to(&dir, "///", "x").is_err());
        std::fs::remove_dir_all(dir).ok();
    }
}
