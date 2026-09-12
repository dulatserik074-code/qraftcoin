import { z } from "zod";
export function validateEnvironment(env: Record<string, string | undefined> = process.env) {
  const errors: string[] = [];
  const production = env.NODE_ENV === "production";
  if (!["development", "test", "production"].includes(env.NODE_ENV ?? "")) errors.push("NODE_ENV");
  try { const url = new URL(env.DATABASE_URL ?? ""); if (!["postgres:", "postgresql:"].includes(url.protocol)) errors.push("DATABASE_URL"); } catch { errors.push("DATABASE_URL"); }
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32 || /^(change|example|development|test-secret)/i.test(env.AUTH_SECRET)) errors.push("AUTH_SECRET (32+ random characters)");
  try {
    const url = new URL(env.NEXT_PUBLIC_APP_URL ?? "");
    if (!["http:", "https:"].includes(url.protocol) || (production && url.protocol !== "https:") || url.username || url.password || url.pathname !== "/" || url.search || url.hash) errors.push("NEXT_PUBLIC_APP_URL (HTTPS origin in production)");
    if (env.APP_URL && new URL(env.APP_URL).origin !== url.origin) errors.push("APP_URL must match NEXT_PUBLIC_APP_URL");
  } catch { errors.push("NEXT_PUBLIC_APP_URL"); }
  if (!["resend", "console", "disabled"].includes(env.EMAIL_PROVIDER ?? "") || (production && env.EMAIL_PROVIDER === "console")) errors.push("EMAIL_PROVIDER (resend or disabled in production)");
  if (env.EMAIL_PROVIDER === "resend") {
    if (!env.EMAIL_API_KEY || env.EMAIL_API_KEY.length < 12) errors.push("EMAIL_API_KEY");
    if (!z.string().email().safeParse(env.EMAIL_FROM).success) errors.push("EMAIL_FROM");
  }
  if (production && (!env.RATE_LIMIT_SECRET || env.RATE_LIMIT_SECRET.length < 32 || /^(change|example|development|test-secret)/i.test(env.RATE_LIMIT_SECRET))) errors.push("RATE_LIMIT_SECRET (32+ random characters)");
  if (!["none", "netlify", "trusted-proxy"].includes(env.TRUSTED_PROXY ?? "none")) errors.push("TRUSTED_PROXY");
  if (env.BLOCKCHAIN_ENABLED && !["true", "false"].includes(env.BLOCKCHAIN_ENABLED)) errors.push("BLOCKCHAIN_ENABLED");
  if (env.BLOCKCHAIN_ENABLED === "true") {
    const token = env.NEXT_PUBLIC_LEGACY_QFC_ADDRESS || env.NEXT_PUBLIC_QFC_ADDRESS || env.NEXT_PUBLIC_QFT_ADDRESS;
    for (const [key, value] of [["legacy token address", token], ["NEXT_PUBLIC_QRAFT_PAYMENT_ADDRESS", env.NEXT_PUBLIC_QRAFT_PAYMENT_ADDRESS]]) if (!/^0x[\da-f]{40}$/i.test(value ?? "") || /^0x0{40}$/i.test(value ?? "")) errors.push(key!);
    if (!/^0x[\da-f]{64}$/i.test(env.NEXT_PUBLIC_LEGACY_PAYMENT_CODE_HASH ?? "")) errors.push("NEXT_PUBLIC_LEGACY_PAYMENT_CODE_HASH");
    if (env.NEXT_PUBLIC_REQUIRED_CHAIN_ID && env.NEXT_PUBLIC_REQUIRED_CHAIN_ID !== "11155111") errors.push("NEXT_PUBLIC_REQUIRED_CHAIN_ID (Sepolia only)");
  }
  if (errors.length) throw new Error(`QazLoyal configuration error: ${[...new Set(errors)].join(", ")}. Check environment variable names; values are intentionally omitted.`);
  return Object.freeze({ nodeEnv: env.NODE_ENV as "development" | "test" | "production", databaseUrl: env.DATABASE_URL!, authSecret: env.AUTH_SECRET!, rateLimitSecret: env.RATE_LIMIT_SECRET || env.AUTH_SECRET!, appUrl: env.NEXT_PUBLIC_APP_URL!, emailProvider: env.EMAIL_PROVIDER as "resend" | "console" | "disabled", emailApiKey: env.EMAIL_API_KEY, emailFrom: env.EMAIL_FROM, trustedProxy: (env.TRUSTED_PROXY ?? "none") as "none" | "netlify" | "trusted-proxy", blockchainEnabled: env.BLOCKCHAIN_ENABLED === "true" });
}
