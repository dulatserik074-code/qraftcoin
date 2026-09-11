import "server-only";
import { isIP } from "node:net";
import { getServerEnv } from "./env";
export function normalizeIp(value: string | null): string | null {
  if (!value || value.includes("%") || !isIP(value.trim())) return null;
  const ip = value.trim();
  if (isIP(ip) === 4) return ip;
  const canonical = new URL("http://[" + ip + "]").hostname.slice(1, -1);
  const mapped = canonical.match(/^::ffff:([a-f0-9]+):([a-f0-9]+)$/);
  if (mapped) { const n = parseInt(mapped[1],16) * 65536 + parseInt(mapped[2],16); return [24,16,8,0].map(shift => (n >>> shift) & 255).join("."); }
  return canonical;
}
export function getTrustedClientIp(request: Pick<Request, "headers">, mode = getServerEnv().trustedProxy): string {
  // Netlify's edge overwrites x-nf-client-connection-ip. Enable only on Netlify.
  // Other hosts: trusted-proxy requires an inaccessible origin and a proxy that
  // overwrites x-real-ip from its socket peer. Never use arbitrary X-Forwarded-For.
  const header = mode === "netlify" ? "x-nf-client-connection-ip" : mode === "trusted-proxy" ? "x-real-ip" : null;
  // Missing/invalid trusted metadata shares a conservative, isolated bucket.
  // Do not use attacker-controlled cookies, user agents or forwarded IPs here.
  return (header && normalizeIp(request.headers.get(header))) || "unresolved-client";
}
