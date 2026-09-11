import "server-only";
import { PrismaClient } from "@prisma/client";
import { getServerEnv } from "./env";
const globalDb = globalThis as unknown as { qazloyalDb?: PrismaClient };
let productionDb: PrismaClient | undefined;
function client() {
  const env = getServerEnv();
  if (env.nodeEnv === "production") return productionDb ??= new PrismaClient({ datasources: { db: { url: env.databaseUrl } } });
  return globalDb.qazloyalDb ??= new PrismaClient({ datasources: { db: { url: env.databaseUrl } } });
}
// One client per warm function/module, hot-reload singleton in development.
// Bind methods so Prisma interactive transactions retain their receiver.
export const db = new Proxy({} as PrismaClient, { get(_target, key) {
  const instance = client(); const value = Reflect.get(instance, key);
  return typeof value === "function" ? value.bind(instance) : value;
} });
