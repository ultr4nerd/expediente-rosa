import { serve } from "@hono/node-server";
import { Valkey } from "iovalkey";
import { createApp } from "./app.ts";

const url = process.env.VALKEY_URL ?? "redis://localhost:6379";
const port = Number(process.env.PORT ?? 8787);

const valkey = new Valkey(url, { maxRetriesPerRequest: 3 });
valkey.on("error", (err: Error) => console.error("[valkey]", err.message));

serve({ fetch: createApp(valkey).fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`Expediente Rosa central listening on :${info.port} (valkey ${url})`);
});
