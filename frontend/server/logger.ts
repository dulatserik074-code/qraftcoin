import { AsyncLocalStorage } from "node:async_hooks";
export const requestContext = new AsyncLocalStorage<{ requestId: string }>();
type Event = "login_failed" | "business_created" | "invitation_created" | "invitation_accepted" | "employee_access_changed" | "password_reset_requested" | "password_reset_completed" | "email_failed" | "EARN" | "REDEEM" | "server_error" | "database_unavailable" | "security_rejected";
export function logEvent(event: Event, fields: { actorId?: string; businessId?: string; transactionId?: string; category?: string; status?: number } = {}) {
  // Deliberate allowlist: never serialize Error, request, body, URLs, email or env.
  console.info(JSON.stringify({ timestamp: new Date().toISOString(), event, requestId: requestContext.getStore()?.requestId, actorId: fields.actorId, businessId: fields.businessId, transactionId: fields.transactionId, category: fields.category, status: fields.status }));
}
