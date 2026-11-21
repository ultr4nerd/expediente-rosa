# Live demo: presenter commands

Run everything from the repo root on the demo Mac. Fictitious data only.

## 0. Before the pitch (once)

```sh
export PATH="/opt/homebrew/opt/rustup/bin:$PATH"   # Rust, only needed if the app must be rebuilt
scripts/demo-reset.sh        # closes the app, flushes Valkey, folio counter -> 142, wipes /tmp/er-a /tmp/er-b, starts the central
```

Check: `curl localhost:8787/health` → `{"ok":true}`.

## 1. Start the two "laptops"

Terminal 1 (laptop A, builds the app and serves the UI on :1420):

```sh
ER_DATA_DIR=/tmp/er-a ER_DEVICE=A pnpm tauri dev
```

Terminal 2 (laptop B, only after A's window is open):

```sh
ER_DATA_DIR=/tmp/er-b ER_DEVICE=B src-tauri/target/debug/expediente-rosa
```

Demo users (PIN): Laura Méndez, capturista `1111` · Dra. Ana Robles, médico `2222` · Dr. Jorge Silva, patólogo `3333`.

Do not edit code while the app is open: a hot reload can leave the sync indicator stuck on «Comprobando» (close and relaunch both windows if it happens).

## 2. Central off / on (the "Wi-Fi" moment)

```sh
docker compose -f server/compose.yaml stop server    # offline
docker compose -f server/compose.yaml start server   # back online; each laptop syncs within 10 s (or click the indicator)
```

Expected after both sync: provisional `A-0001` / `B-0001` become **2026-0143** / **2026-0144**, and *Sincronización* shows *Posibles duplicados (1)* → *Vincular (misma persona)*.

## 3. Optional: LAN hub without the central

1. A: *Sincronización* → switch *Esta laptop es el hub* (shows `http://<ip>:8788`).
2. B: *Sincronización* → *URL de la central* = `http://127.0.0.1:8788` → *Guardar dirección*.
3. Events cross A ↔ B with the central stopped. When the central is back, A forwards B's events and the final folios reach B through the hub.
4. To undo: B's URL back to `http://localhost:8787`, A switches the hub off.

## 4. Close: the file is encrypted

```sh
sqlite3 /tmp/er-a/expediente.db .tables      # Error: file is not a database
xxd /tmp/er-a/expediente.db | head -3         # random bytes, no "SQLite format 3"
```

## Reset between rehearsals

```sh
scripts/demo-reset.sh
```
