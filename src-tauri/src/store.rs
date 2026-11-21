// Encrypted local event store (SQLCipher). See docs/specs/sync-protocol-and-platform-contract.md.
// Rust treats event payloads as opaque JSON: it only reads `id`, `type` and `patientId`.
use std::path::Path;

use rusqlite::{Connection, OptionalExtension, params};
use serde::Serialize;
use serde_json::Value;

pub const DEFAULT_DB_KEY: &str = "jornada-demo";
pub const DB_FILE: &str = "expediente.db";

#[derive(Debug, thiserror::Error)]
pub enum StoreError {
    #[error("database error: {0}")]
    Db(#[from] rusqlite::Error),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("invalid event: {0}")]
    InvalidEvent(String),
}

// Tauri commands need serializable errors; send them to the UI as plain strings.
impl Serialize for StoreError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventPage {
    pub events: Vec<Value>,
    pub last_seq: i64,
}

pub struct Store {
    conn: Connection,
}

fn field<'a>(event: &'a Value, key: &str) -> Result<&'a str, StoreError> {
    event
        .get(key)
        .and_then(Value::as_str)
        .ok_or_else(|| StoreError::InvalidEvent(format!("missing string field `{key}`")))
}

impl Store {
    /// Opens (or creates) `<dir>/expediente.db`, keyed with `key` before anything else.
    pub fn open(dir: &Path, key: &str) -> Result<Self, StoreError> {
        std::fs::create_dir_all(dir)?;
        let conn = Connection::open(dir.join(DB_FILE))?;
        conn.pragma_update(None, "key", key)?;
        // Fails here with "file is not a database" if the key is wrong.
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS events (
               seq     INTEGER PRIMARY KEY AUTOINCREMENT,
               id      TEXT NOT NULL UNIQUE,
               type    TEXT NOT NULL,
               patient TEXT NOT NULL,
               json    TEXT NOT NULL,
               synced  INTEGER NOT NULL DEFAULT 0
             );
             CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);",
        )?;
        Ok(Self { conn })
    }

    /// Inserts events, ignoring ids already stored. Returns how many were new.
    pub fn append(&mut self, events: &[Value], synced: bool) -> Result<usize, StoreError> {
        let tx = self.conn.transaction()?;
        let mut added = 0;
        {
            let mut stmt = tx.prepare(
                "INSERT OR IGNORE INTO events (id, type, patient, json, synced) VALUES (?1, ?2, ?3, ?4, ?5)",
            )?;
            for e in events {
                let id = field(e, "id")?;
                let ty = field(e, "type")?;
                let patient = field(e, "patientId")?;
                added += stmt.execute(params![id, ty, patient, serde_json::to_string(e)?, synced as i64])?;
            }
        }
        tx.commit()?;
        Ok(added)
    }

    /// Events with `seq > after_seq` in insertion order. `last_seq` is the highest seq in the store
    /// (or `after_seq` when there is nothing newer).
    pub fn list(&self, after_seq: i64) -> Result<EventPage, StoreError> {
        let mut stmt = self.conn.prepare("SELECT seq, json FROM events WHERE seq > ?1 ORDER BY seq")?;
        let mut last_seq = after_seq;
        let mut events = Vec::new();
        let rows = stmt.query_map([after_seq], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?)))?;
        for row in rows {
            let (seq, json) = row?;
            last_seq = last_seq.max(seq);
            events.push(serde_json::from_str(&json)?);
        }
        Ok(EventPage { events, last_seq })
    }

    /// Unsynced events in insertion order, at most `limit`.
    pub fn pending_batch(&self, limit: usize) -> Result<Vec<(String, Value)>, StoreError> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, json FROM events WHERE synced = 0 ORDER BY seq LIMIT ?1")?;
        let rows = stmt.query_map([limit as i64], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))?;
        let mut out = Vec::new();
        for row in rows {
            let (id, json) = row?;
            out.push((id, serde_json::from_str(&json)?));
        }
        Ok(out)
    }

    pub fn mark_synced(&mut self, ids: &[String]) -> Result<(), StoreError> {
        let tx = self.conn.transaction()?;
        {
            let mut stmt = tx.prepare("UPDATE events SET synced = 1 WHERE id = ?1")?;
            for id in ids {
                stmt.execute([id])?;
            }
        }
        tx.commit()?;
        Ok(())
    }

    pub fn pending_count(&self) -> Result<i64, StoreError> {
        Ok(self.conn.query_row("SELECT COUNT(*) FROM events WHERE synced = 0", [], |r| r.get(0))?)
    }

    pub fn get_meta(&self, key: &str) -> Result<Option<String>, StoreError> {
        Ok(self
            .conn
            .query_row("SELECT value FROM meta WHERE key = ?1", [key], |r| r.get(0))
            .optional()?)
    }

    pub fn set_meta(&self, key: &str, value: &str) -> Result<(), StoreError> {
        self.conn.execute(
            "INSERT INTO meta (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn tmp_dir(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("er-test-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        dir
    }

    fn ev(id: &str) -> Value {
        json!({ "id": id, "type": "patient.created", "patientId": "p1", "at": "2026-11-21T10:00:00Z",
                "device": "A", "author": "ana", "role": "capturista", "jornadaId": "j1",
                "payload": { "identity": { "fullName": "Ficticia" } } })
    }

    #[test]
    fn dedups_by_id() {
        let dir = tmp_dir("dedup");
        let mut s = Store::open(&dir, DEFAULT_DB_KEY).unwrap();
        assert_eq!(s.append(&[ev("a"), ev("b")], false).unwrap(), 2);
        assert_eq!(s.append(&[ev("a"), ev("c")], false).unwrap(), 1);
        assert_eq!(s.list(0).unwrap().events.len(), 3);
        assert_eq!(s.pending_count().unwrap(), 3);
    }

    #[test]
    fn lists_after_seq_in_order_and_roundtrips_json() {
        let dir = tmp_dir("list");
        let mut s = Store::open(&dir, DEFAULT_DB_KEY).unwrap();
        s.append(&[ev("a"), ev("b"), ev("c")], false).unwrap();
        let all = s.list(0).unwrap();
        assert_eq!(all.last_seq, 3);
        assert_eq!(all.events[0], ev("a"));
        let tail = s.list(1).unwrap();
        let ids: Vec<_> = tail.events.iter().map(|e| e["id"].as_str().unwrap()).collect();
        assert_eq!(ids, ["b", "c"]);
        let empty = s.list(3).unwrap();
        assert!(empty.events.is_empty());
        assert_eq!(empty.last_seq, 3);
    }

    #[test]
    fn rejects_events_without_id() {
        let dir = tmp_dir("invalid");
        let mut s = Store::open(&dir, DEFAULT_DB_KEY).unwrap();
        assert!(s.append(&[json!({ "type": "x", "patientId": "p" })], false).is_err());
    }

    #[test]
    fn sync_bookkeeping() {
        let dir = tmp_dir("sync");
        let mut s = Store::open(&dir, DEFAULT_DB_KEY).unwrap();
        s.append(&[ev("a"), ev("b")], false).unwrap();
        s.append(&[ev("r")], true).unwrap();
        assert_eq!(s.pending_count().unwrap(), 2);
        let batch = s.pending_batch(1).unwrap();
        assert_eq!(batch[0].0, "a");
        s.mark_synced(&["a".into()]).unwrap();
        assert_eq!(s.pending_count().unwrap(), 1);
        assert_eq!(s.get_meta("remote_cursor").unwrap(), None);
        s.set_meta("remote_cursor", "1-0").unwrap();
        s.set_meta("remote_cursor", "2-0").unwrap();
        assert_eq!(s.get_meta("remote_cursor").unwrap().as_deref(), Some("2-0"));
    }

    #[test]
    fn file_is_unreadable_without_key() {
        let dir = tmp_dir("enc");
        {
            let mut s = Store::open(&dir, DEFAULT_DB_KEY).unwrap();
            s.append(&[ev("secret-id")], false).unwrap();
        }
        // Plaintext must not appear in the file.
        let bytes = std::fs::read(dir.join(DB_FILE)).unwrap();
        assert!(!bytes.windows(9).any(|w| w == b"secret-id"));
        assert!(!bytes.starts_with(b"SQLite format 3"));
        // No key: reading fails.
        let plain = Connection::open(dir.join(DB_FILE)).unwrap();
        assert!(plain.query_row("SELECT COUNT(*) FROM events", [], |r| r.get::<_, i64>(0)).is_err());
        // Wrong key: opening fails.
        assert!(Store::open(&dir, "wrong-key").is_err());
        // Right key: data is back.
        assert_eq!(Store::open(&dir, DEFAULT_DB_KEY).unwrap().list(0).unwrap().events.len(), 1);
    }
}
