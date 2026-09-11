import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
if (existsSync(".env")) process.loadEnvFile(".env");
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test")) throw new Error("TEST_DATABASE_URL must identify an isolated *_test database");
const env = { ...process.env, DATABASE_URL: url };
for (const args of [["node_modules/prisma/build/index.js", "migrate", "deploy"], ["--conditions=react-server", "--import", "tsx", "--test", "test/integration/*.test.ts"]]) {
  const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
