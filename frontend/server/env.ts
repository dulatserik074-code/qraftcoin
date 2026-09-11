import "server-only";
import { validateEnvironment } from "./environment";
export type ServerConfig = ReturnType<typeof validateEnvironment>;
// Lazy validation: every serverless request is guarded, even without npm start
// or instrumentation. No secrets are serialized; no import-time DB connection.
export function getServerEnv(): ServerConfig { return validateEnvironment(process.env); }
