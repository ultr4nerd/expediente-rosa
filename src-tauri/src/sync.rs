// Client sync against the central server. Algorithm: docs/specs/sync-protocol-and-platform-contract.md.
// The std Mutex around the store is never held across an `.await`.
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::store::{Store, StoreError};

const BATCH: usize = 200;
const MAX_PULL_PAGES: usize = 100;
const META_CURSOR: &str = "remote_cursor";
const META_LAST_SYNC: &str = "last_sync_at";

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub connectivity: &'static str,
    pub pending: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_sync_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_error: Option<String>,
}

/// Last known connectivity and error, kept in memory between calls.
#[derive(Default)]
pub struct SyncMemory {
    pub connectivity: Option<&'static str>,
    pub last_error: Option<String>,
}

#[derive(Deserialize)]
struct PushResponse {
    #[serde(default)]
    accepted: Vec<String>,
    #[serde(default)]
    duplicates: Vec<String>,
}

#[derive(Deserialize)]
struct PullResponse {
    #[serde(default)]
    events: Vec<Value>,
    #[serde(default)]
    cursor: Option<String>,
}

#[derive(Debug, thiserror::Error)]
enum SyncError {
    #[error("{0}")]
    Http(#[from] reqwest::Error),
    #[error("{0}")]
    Store(#[from] StoreError),
    #[error("central respondió {0}")]
    Status(reqwest::StatusCode),
}

pub fn status(store: &Mutex<Store>, mem: &Mutex<SyncMemory>) -> Result<SyncStatus, StoreError> {
    let (pending, last_sync_at) = {
        let s = store.lock().unwrap();
        (s.pending_count()?, s.get_meta(META_LAST_SYNC)?)
    };
    let m = mem.lock().unwrap();
    Ok(SyncStatus {
        connectivity: m.connectivity.unwrap_or("unknown"),
        pending,
        last_sync_at,
        last_error: m.last_error.clone(),
    })
}

/// Health check, push pending in batches, pull after the remote cursor. Never loses local data:
/// on any failure events stay pending and the error is reported in `lastError`.
pub async fn sync_now(
    store: &Mutex<Store>,
    mem: &Mutex<SyncMemory>,
    device: &str,
    central_url: &str,
) -> Result<SyncStatus, StoreError> {
    let base = central_url.trim().trim_end_matches('/').to_string();
    let result = run(store, device, &base).await;
    {
        let mut m = mem.lock().unwrap();
        match &result {
            Ok(()) => {
                m.connectivity = Some("online");
                m.last_error = None;
            }
            Err(Offline) => {
                m.connectivity = Some("offline");
                m.last_error = None;
            }
            Err(Failed(e)) => {
                m.connectivity = Some("online");
                m.last_error = Some(e.clone());
            }
        }
    }
    if result.is_ok() {
        store.lock().unwrap().set_meta(META_LAST_SYNC, &now_iso())?;
    }
    status(store, mem)
}

enum Outcome {
    Offline,
    Failed(String),
}
use Outcome::{Failed, Offline};

async fn run(store: &Mutex<Store>, device: &str, base: &str) -> Result<(), Outcome> {
    let health = reqwest::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .map_err(|e| Failed(e.to_string()))?;
    match health.get(format!("{base}/health")).send().await {
        Ok(r) if r.status().is_success() => {}
        _ => return Err(Offline),
    }
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| Failed(e.to_string()))?;
    push(&client, store, device, base).await.map_err(|e| Failed(e.to_string()))?;
    pull(&client, store, base).await.map_err(|e| Failed(e.to_string()))
}

async fn push(client: &reqwest::Client, store: &Mutex<Store>, device: &str, base: &str) -> Result<(), SyncError> {
    loop {
        let batch = store.lock().unwrap().pending_batch(BATCH)?;
        if batch.is_empty() {
            return Ok(());
        }
        let events: Vec<&Value> = batch.iter().map(|(_, e)| e).collect();
        let resp = client
            .post(format!("{base}/events"))
            .json(&json!({ "device": device, "events": events }))
            .send()
            .await?;
        if !resp.status().is_success() {
            return Err(SyncError::Status(resp.status()));
        }
        let body: PushResponse = resp.json().await?;
        let acked: Vec<String> = body.accepted.into_iter().chain(body.duplicates).collect();
        // A central that acknowledges nothing would loop forever; stop and leave the rest pending.
        let progressed = batch.iter().any(|(id, _)| acked.contains(id));
        store.lock().unwrap().mark_synced(&acked)?;
        if !progressed || batch.len() < BATCH {
            return Ok(());
        }
    }
}

async fn pull(client: &reqwest::Client, store: &Mutex<Store>, base: &str) -> Result<(), SyncError> {
    for _ in 0..MAX_PULL_PAGES {
        let cursor = store.lock().unwrap().get_meta(META_CURSOR)?.unwrap_or_else(|| "0".into());
        let resp = client.get(format!("{base}/events?after={cursor}")).send().await?;
        if !resp.status().is_success() {
            return Err(SyncError::Status(resp.status()));
        }
        let body: PullResponse = resp.json().await?;
        let s = &mut *store.lock().unwrap();
        // Skip malformed remote events instead of failing the whole page.
        let valid: Vec<Value> = body
            .events
            .iter()
            .filter(|e| ["id", "type", "patientId"].iter().all(|k| e.get(*k).is_some_and(Value::is_string)))
            .cloned()
            .collect();
        s.append(&valid, true)?;
        match body.cursor.filter(|c| !c.is_empty() && *c != cursor) {
            Some(next) if !body.events.is_empty() => s.set_meta(META_CURSOR, &next)?,
            _ => return Ok(()),
        }
    }
    Ok(())
}

/// Current UTC time as `YYYY-MM-DDTHH:MM:SSZ` (no chrono dependency).
pub fn now_iso() -> String {
    let secs = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0);
    format_iso(secs)
}

fn format_iso(secs: i64) -> String {
    let (days, rem) = (secs.div_euclid(86_400), secs.rem_euclid(86_400));
    // Howard Hinnant's civil_from_days.
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + i64::from(m <= 2);
    format!("{y:04}-{m:02}-{d:02}T{:02}:{:02}:{:02}Z", rem / 3600, rem % 3600 / 60, rem % 60)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::DEFAULT_DB_KEY;

    #[test]
    fn formats_iso() {
        assert_eq!(format_iso(0), "1970-01-01T00:00:00Z");
        assert_eq!(format_iso(1_795_258_861), "2026-11-21T11:01:01Z");
        assert_eq!(format_iso(951_782_400), "2000-02-29T00:00:00Z");
    }

    #[tokio::test]
    async fn offline_keeps_events_pending() {
        let dir = std::env::temp_dir().join(format!("er-test-offline-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let mut s = Store::open(&dir, DEFAULT_DB_KEY).unwrap();
        s.append(&[json!({ "id": "a", "type": "patient.created", "patientId": "p" })], false).unwrap();
        let store = Mutex::new(s);
        let mem = Mutex::new(SyncMemory::default());
        assert_eq!(status(&store, &mem).unwrap().connectivity, "unknown");
        // Port 9 (discard) is closed on dev machines: the health check fails fast.
        let st = sync_now(&store, &mem, "A", "http://127.0.0.1:9").await.unwrap();
        assert_eq!(st.connectivity, "offline");
        assert_eq!(st.pending, 1);
        assert_eq!(st.last_sync_at, None);
    }

    /// End-to-end against a running central: `ER_TEST_CENTRAL=http://localhost:8787 cargo test two_devices`.
    #[tokio::test]
    async fn two_devices_exchange_events_through_central() {
        let Ok(url) = std::env::var("ER_TEST_CENTRAL") else { return };
        let open = |name: &str| {
            let dir = std::env::temp_dir().join(format!("er-test-e2e-{name}-{}", std::process::id()));
            let _ = std::fs::remove_dir_all(&dir);
            Mutex::new(Store::open(&dir, DEFAULT_DB_KEY).unwrap())
        };
        let (a, b) = (open("a"), open("b"));
        let (ma, mb) = (Mutex::new(SyncMemory::default()), Mutex::new(SyncMemory::default()));
        let tag = std::process::id();
        let ev = |id: String, p: &str| json!({ "id": id, "type": "patient.created", "patientId": p, "at": "2026-11-21T10:00:00-06:00", "device": "T", "author": "test", "role": "capturista", "jornadaId": "j", "payload": { "provisionalFolio": "T-0001" } });
        a.lock().unwrap().append(&[ev(format!("a-{tag}"), &format!("pa-{tag}"))], false).unwrap();
        b.lock().unwrap().append(&[ev(format!("b-{tag}"), &format!("pb-{tag}"))], false).unwrap();
        let sa = sync_now(&a, &ma, "A", &url).await.unwrap();
        assert_eq!((sa.connectivity, sa.pending, sa.last_error.clone()), ("online", 0, None));
        assert!(sa.last_sync_at.is_some());
        sync_now(&b, &mb, "B", &url).await.unwrap();
        sync_now(&a, &ma, "A", &url).await.unwrap();
        let ids = |s: &Mutex<Store>| -> Vec<String> {
            s.lock().unwrap().list(0).unwrap().events.iter().map(|e| e["id"].as_str().unwrap().to_string()).collect()
        };
        for s in [&a, &b] {
            let ids = ids(s);
            assert!(ids.contains(&format!("a-{tag}")) && ids.contains(&format!("b-{tag}")), "{ids:?}");
            assert_eq!(s.lock().unwrap().pending_count().unwrap(), 0);
            // The central assigns a final folio to each patient and both devices receive both.
            let page = s.lock().unwrap().list(0).unwrap();
            let folios = page.events.iter().filter(|e| e["type"] == "folio.assigned").count();
            assert!(folios >= 2, "expected folio.assigned events, got {folios}");
        }
        // Idempotent: a second sync adds nothing.
        let before = ids(&a).len();
        sync_now(&a, &ma, "A", &url).await.unwrap();
        assert_eq!(ids(&a).len(), before);
    }
}
