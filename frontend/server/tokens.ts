import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
export const opaqueToken = z.string().regex(/^[A-Za-z0-9_-]{43}$/, "Invalid or expired link");
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");
export const emailInput = z.object({ email: z.string().trim().email().max(254).transform(s => s.toLowerCase()) }).strict();
