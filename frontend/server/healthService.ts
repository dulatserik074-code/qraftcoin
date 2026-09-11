import { getServerEnv } from "./env";
import { db } from "./db";
import { logEvent } from "./logger";
export async function health(probe: () => Promise<unknown> = () => db.$queryRaw`SELECT 1`) {
  try { getServerEnv(); await probe(); return { statusCode: 200, body: { status: "ok", database: "ok", version: "0.4.1", timestamp: new Date().toISOString() } }; }
  catch { logEvent("database_unavailable", { category: "health_probe" }); return { statusCode: 503, body: { status: "unavailable", database: "unavailable", version: "0.4.1", timestamp: new Date().toISOString() } }; }
}
