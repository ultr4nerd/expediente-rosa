// ISS-0021: embedded LAN hub. One laptop serves the central HTTP API (GET /health, POST /events,
// GET /events) over its own encrypted store, so another laptop syncs over local Wi-Fi with no
// internet: on that laptop, set the central URL to http://<hub-ip>:8788.
//
// Rules:
// - Events pushed by a peer are stored as PENDING (synced = 0) on the hub: the peer marks them
//   synced once the hub acknowledges them, so the hub forwards them to the real central later.
// - No final folios: the hub only relays events. `folio.assigned` still comes from the central.
// - Cursor = "0-<seq>" (hub insertion order). It is a valid Valkey stream id lower than any real
//   one, so a laptop that switches back to the central re-pulls from the start (dedup by id makes
//   that safe), and a real stream id sent to the hub is treated as "from the start".
// - No auth (simulated, like the rest of the demo): only start it on the jornada's own network.
use std::net::UdpSocket;
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;

use serde::Serialize;
use serde_json::{Value, json};
use tiny_http::{Header, Method, Request, Response, Server};

use crate::store::Store;

pub const DEFAULT_PORT: u16 = 8788;
const MAX_BODY: u64 = 10 * 1024 * 1024;

/// Runs `f` with the store. In the app it reads Tauri state; in tests, an Arc<Mutex<Store>>.
pub type WithStore = Arc<dyn Fn(&mut dyn FnMut(&Mutex<Store>)) + Send + Sync>;

struct Running {
    server: Arc<Server>,
    port: u16,
    thread: Option<JoinHandle<()>>,
}

#[derive(Default)]
pub struct HubState {
    running: Mutex<Option<Running>>,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HubInfo {
    pub running: bool,
    pub port: u16,
    /// URL the other laptop should use as its central (LAN IP when known).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}

impl HubState {
    pub fn start(&self, port: u16, with_store: WithStore) -> Result<HubInfo, String> {
        let mut guard = self.running.lock().unwrap();
        if guard.is_none() {
            let server = Arc::new(
                Server::http(("0.0.0.0", port)).map_err(|e| format!("no se pudo abrir el puerto {port}: {e}"))?,
            );
            let port = server.server_addr().to_ip().map(|a| a.port()).unwrap_or(port);
            let s = server.clone();
            let thread = std::thread::spawn(move || {
                for req in s.incoming_requests() {
                    handle(req, &with_store);
                }
            });
            *guard = Some(Running { server, port, thread: Some(thread) });
        }
        Ok(info(guard.as_ref()))
    }

    pub fn stop(&self) -> HubInfo {
        if let Some(mut r) = self.running.lock().unwrap().take() {
            r.server.unblock();
            if let Some(t) = r.thread.take() {
                let _ = t.join();
            }
        }
        info(None)
    }

    pub fn status(&self) -> HubInfo {
        info(self.running.lock().unwrap().as_ref())
    }
}

fn info(r: Option<&Running>) -> HubInfo {
    match r {
        Some(r) => HubInfo { running: true, port: r.port, url: lan_ip().map(|ip| format!("http://{ip}:{}", r.port)) },
        None => HubInfo { running: false, port: DEFAULT_PORT, url: None },
    }
}

/// LAN address of this laptop: the source address the OS would use for an outside route.
/// UDP `connect` sends no packet, so this works without internet as long as there is a network.
fn lan_ip() -> Option<String> {
    let sock = UdpSocket::bind("0.0.0.0:0").ok()?;
    sock.connect("192.168.0.1:80").or_else(|_| sock.connect("10.0.0.1:80")).ok()?;
    let ip = sock.local_addr().ok()?.ip();
    (!ip.is_unspecified()).then(|| ip.to_string())
}

/// Hub cursor "0-<seq>" -> seq; anything else (a real Valkey id, "0", garbage) -> from the start.
pub fn parse_cursor(after: &str) -> i64 {
    after.strip_prefix("0-").and_then(|s| s.parse().ok()).unwrap_or(0)
}

/// Pure request handling: (status, JSON body).
pub fn route(store: &Mutex<Store>, method: &Method, url: &str, body: &str) -> (u16, Value) {
    let (path, query) = url.split_once('?').unwrap_or((url, ""));
    match (method, path) {
        (Method::Get, "/health") => (200, json!({ "ok": true, "hub": true })),
        (Method::Post, "/events") => {
            let Ok(parsed) = serde_json::from_str::<Value>(body) else {
                return (400, json!({ "error": "body must be JSON" }));
            };
            let Some(events) = parsed.get("events").and_then(Value::as_array) else {
                return (400, json!({ "error": "expected { device, events }" }));
            };
            let mut accepted = Vec::new();
            let mut duplicates = Vec::new();
            let mut s = store.lock().unwrap();
            for e in events {
                let Some(id) = e.get("id").and_then(Value::as_str) else {
                    return (400, json!({ "error": "events need an id" }));
                };
                // Stored pending so the hub forwards it to the central later.
                match s.append(std::slice::from_ref(e), false) {
                    Ok(1) => accepted.push(id.to_string()),
                    Ok(_) => duplicates.push(id.to_string()),
                    Err(err) => return (400, json!({ "error": err.to_string(), "id": id })),
                }
            }
            (200, json!({ "accepted": accepted, "duplicates": duplicates }))
        }
        (Method::Get, "/events") => {
            let after = query
                .split('&')
                .find_map(|kv| kv.strip_prefix("after="))
                .unwrap_or("0");
            let seq = parse_cursor(after);
            match store.lock().unwrap().list(seq) {
                Ok(page) => {
                    let cursor = if page.events.is_empty() { after.to_string() } else { format!("0-{}", page.last_seq) };
                    (200, json!({ "events": page.events, "cursor": cursor }))
                }
                Err(err) => (500, json!({ "error": err.to_string() })),
            }
        }
        (Method::Options, _) => (204, Value::Null),
        _ => (404, json!({ "error": "not found" })),
    }
}

fn handle(mut req: Request, with_store: &WithStore) {
    let mut body = String::new();
    if req.body_length().unwrap_or(0) as u64 > MAX_BODY || req.as_reader().read_to_string(&mut body).is_err() {
        let _ = req.respond(Response::from_string("{\"error\":\"bad body\"}").with_status_code(400));
        return;
    }
    let (method, url) = (req.method().clone(), req.url().to_string());
    let mut out = (500, Value::Null);
    with_store(&mut |store| out = route(store, &method, &url, &body));
    let text = if out.1.is_null() { String::new() } else { out.1.to_string() };
    let mut resp = Response::from_string(text).with_status_code(out.0);
    for (k, v) in [
        ("Content-Type", "application/json"),
        ("Access-Control-Allow-Origin", "*"),
        ("Access-Control-Allow-Headers", "content-type"),
        ("Access-Control-Allow-Methods", "GET, POST, OPTIONS"),
    ] {
        resp.add_header(Header::from_bytes(k, v).unwrap());
    }
    let _ = req.respond(resp);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::DEFAULT_DB_KEY;
    use crate::sync::{SyncMemory, sync_now};

    fn open(name: &str) -> Store {
        let dir = std::env::temp_dir().join(format!("er-hub-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        Store::open(&dir, DEFAULT_DB_KEY).unwrap()
    }

    fn ev(id: &str, device: &str) -> Value {
        json!({ "id": id, "type": "patient.created", "patientId": format!("p-{id}"), "at": "2026-11-21T10:00:00",
                "device": device, "author": "u", "role": "capturista", "jornadaId": "j", "payload": { "provisionalFolio": format!("{device}-0001") } })
    }

    #[test]
    fn cursor_is_compatible_with_valkey_ids() {
        assert_eq!(parse_cursor("0-42"), 42);
        assert_eq!(parse_cursor("0"), 0);
        assert_eq!(parse_cursor("1795283953361-1"), 0);
        assert_eq!(parse_cursor("garbage"), 0);
    }

    #[test]
    fn push_dedups_and_keeps_peer_events_pending_for_the_central() {
        let store = Mutex::new(open("route"));
        let body = json!({ "device": "B", "events": [ev("b1", "B")] }).to_string();
        let (code, out) = route(&store, &Method::Post, "/events", &body);
        assert_eq!((code, out), (200, json!({ "accepted": ["b1"], "duplicates": [] })));
        let (_, again) = route(&store, &Method::Post, "/events", &body);
        assert_eq!(again, json!({ "accepted": [], "duplicates": ["b1"] }));
        assert_eq!(store.lock().unwrap().pending_count().unwrap(), 1);
        let (_, pulled) = route(&store, &Method::Get, "/events?after=0", "");
        assert_eq!(pulled["events"].as_array().unwrap().len(), 1);
        let (_, none) = route(&store, &Method::Get, &format!("/events?after={}", pulled["cursor"].as_str().unwrap()), "");
        assert_eq!(none["events"], json!([]));
        assert_eq!(route(&store, &Method::Post, "/events", "nope").0, 400);
    }

    /// End-to-end: laptop B syncs with laptop A's hub over HTTP using the real sync client.
    #[tokio::test(flavor = "multi_thread")]
    async fn peer_syncs_through_the_hub() {
        let hub_store = Arc::new(Mutex::new(open("hub-a")));
        hub_store.lock().unwrap().append(&[ev("a1", "A")], false).unwrap();
        let s = hub_store.clone();
        let hub = HubState::default();
        // Port 0: the OS picks a free port, so the test never clashes with a running central.
        let info = hub.start(0, Arc::new(move |f| f(&s))).unwrap();
        assert!(info.running);
        let url = format!("http://127.0.0.1:{}", info.port);

        let b = Mutex::new(open("peer-b"));
        b.lock().unwrap().append(&[ev("b1", "B")], false).unwrap();
        let mem = Mutex::new(SyncMemory::default());
        let st = sync_now(&b, &mem, "B", &url).await.unwrap();
        assert_eq!((st.connectivity, st.pending, st.last_error.clone()), ("online", 0, None));

        let ids = |s: &Mutex<Store>| -> Vec<String> {
            s.lock().unwrap().list(0).unwrap().events.iter().map(|e| e["id"].as_str().unwrap().to_string()).collect()
        };
        let mut on_b = ids(&b);
        on_b.sort();
        assert_eq!(on_b, ["a1", "b1"]);
        assert_eq!(ids(&hub_store), ["a1", "b1"]);
        // Both a1 (hub's own) and b1 (relayed) stay pending on the hub for the central.
        assert_eq!(hub_store.lock().unwrap().pending_count().unwrap(), 2);
        // Idempotent second sync.
        sync_now(&b, &mem, "B", &url).await.unwrap();
        assert_eq!(ids(&b).len(), 2);

        assert!(!hub.stop().running);
        let st = sync_now(&b, &mem, "B", &url).await.unwrap();
        assert_eq!(st.connectivity, "offline");
    }
}
