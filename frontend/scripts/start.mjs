import { spawn } from "node:child_process";
import nextEnv from "@next/env";
import { validateEnvironment } from "../server/environment.ts";
process.env.NODE_ENV = "production";
nextEnv.loadEnvConfig(process.cwd(), false);
try { validateEnvironment(); }
catch (error) { console.error(error instanceof Error ? error.message : "QazLoyal configuration error"); process.exit(1); }
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", ...process.argv.slice(2)], { stdio: "inherit", env: process.env, windowsHide: true });
child.on("error", () => { console.error("QazLoyal server could not start"); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { child.kill(signal); });
