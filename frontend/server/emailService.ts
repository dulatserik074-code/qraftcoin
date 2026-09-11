import { getServerEnv } from "./env";
import { randomUUID } from "node:crypto";
export type EmailMessage = { to: string; subject: string; text: string };
export interface EmailService { send(message: EmailMessage): Promise<void> }
export const emailService: EmailService = {
  async send(message) {
    const env = getServerEnv();
    if (env.emailProvider === "console" && ["development", "test"].includes(env.nodeEnv)) {
      console.info("DEVELOPMENT EMAIL ONLY", message); return;
    }
    if (env.emailProvider !== "resend" || !env.emailApiKey || !env.emailFrom) throw new Error("Email provider not configured");
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.emailApiKey}`, "Content-Type": "application/json", "User-Agent": "QazLoyal/0.4.1", "Idempotency-Key": randomUUID() }, body: JSON.stringify({ from: env.emailFrom, to: [message.to], subject: message.subject, text: message.text }), signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("Email delivery unavailable");
  },
};
export function actionLink(path: string, token: string) {
  const link = new URL(path, getServerEnv().appUrl);
  // Fragment is not sent to server/proxy access logs or Referer headers.
  link.hash = new URLSearchParams({ token }).toString(); return link.href;
}
