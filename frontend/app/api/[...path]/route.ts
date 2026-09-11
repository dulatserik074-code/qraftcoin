import { after, NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import QRCode from "qrcode";
import { AppError } from "@/server/input";
import { SESSION_COOKIE, createSession, getUser, login, logout, register } from "@/server/authService";
import { createBusiness, listBusinesses, requireBusiness, updateBusiness } from "@/server/businessService";
import { createCustomer, findByPublicId, listCustomers, requireCustomer } from "@/server/customerService";
import { transactReward } from "@/server/loyaltyService";
import { transactionHistory } from "@/server/transactionService";
import { analytics } from "@/server/analyticsService";
import { randomUUID } from "node:crypto";
import { requestContext, logEvent } from "@/server/logger";
import { health } from "@/server/healthService";
import { requestPasswordReset, resetPassword } from "@/server/passwordService";
import { acceptInvitation, inviteEmployee, listEmployees, revokeInvitation, setEmployeeAccess } from "@/server/employeeService";
import { getServerEnv } from "@/server/env";
import { limitAuthIp, RateLimitError } from "@/server/rateLimit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
function response(value: unknown, status = 200) {
  return NextResponse.json(JSON.parse(JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item)), { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Request-ID": requestContext.getStore()?.requestId ?? randomUUID() } });
}
async function body(request: NextRequest) {
  const origin = getServerEnv().appUrl;
  if (!origin || new URL(origin).origin !== request.headers.get("origin")) throw new AppError(403, "Invalid request origin");
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new AppError(415, "JSON body required");
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, "Request body required");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 16384) { await reader.cancel(); throw new AppError(413, "Request too large"); } chunks.push(value); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new AppError(400, "Invalid JSON"); }
}
async function handle(request: NextRequest, context: Context) {
  try {
    const { path } = await context.params;
    const method = request.method;
    if (path.join("/") === "health" && method === "GET") { const result = await health(); return response(result.body, result.statusCode); }
    getServerEnv();
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const data = method === "GET" ? null : await body(request);
    if (path.length === 2 && path[0] === "auth" && method === "POST") {
      if (["forgot-password", "reset-password"].includes(path[1])) {
        await limitAuthIp(request, path[1] as "forgot-password" | "reset-password");
        return response(await (path[1] === "forgot-password" ? requestPasswordReset(data, undefined, work => after(work)) : resetPassword(data)));
      }
      if (["register", "login"].includes(path[1])) {
        await limitAuthIp(request, path[1] as "login" | "register");
        const user = await (path[1] === "register" ? register(data) : login(data));
        const session = await createSession(user.id, user.authVersion);
        await logout(token);
        const result = response({ user }, path[1] === "register" ? 201 : 200);
        result.cookies.set(SESSION_COOKIE, session.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", expires: session.expiresAt });
        return result;
      }
      if (path[1] === "logout") { await logout(token); const result = response({ ok: true }); result.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 }); return result; }
    }
    const actor = await getUser(token);
    if (path.join("/") === "invitations/accept" && method === "POST") { await limitAuthIp(request, "invitation-accept"); return response(await acceptInvitation(data, actor)); }
    if (!actor) throw new AppError(401, "Please sign in");
    if (path.join("/") === "me" && method === "GET") return response({ user: actor, businesses: await listBusinesses(actor) });
    if (path.join("/") === "businesses" && method === "POST") { const business = await createBusiness(actor, data); logEvent("business_created", { actorId: actor.id, businessId: business.id }); return response(business, 201); }
    if (path[0] === "businesses" && path.length >= 2) {
      const businessId = path[1];
      await requireBusiness(actor, businessId);
      const pagination = { page: request.nextUrl.searchParams.get("page") ?? "1", query: request.nextUrl.searchParams.get("query") ?? "" };
      if (path.length === 2 && method === "GET") return response(await requireBusiness(actor, businessId));
      if (path.length === 2 && method === "PATCH") return response(await updateBusiness(actor, businessId, data));
      if (path.length === 3 && path[2] === "dashboard" && method === "GET") return response(await analytics(actor, businessId));
      if (path.length === 3 && path[2] === "transactions" && method === "GET") return response(await transactionHistory(actor, businessId, pagination));
      if (path.length === 3 && path[2] === "rewards" && method === "POST") {
        const result = await transactReward(actor, businessId, data);
        if (result.transaction && !result.replayed) logEvent(result.transaction.type === "REDEEM" ? "REDEEM" : "EARN", { actorId: actor.id, businessId, transactionId: result.transaction.id });
        return response(result);
      }
      if (path.length === 3 && path[2] === "employees" && method === "GET") return response(await listEmployees(actor, businessId));
      if (path.length === 4 && path[2] === "employees" && method === "PATCH") return response(await setEmployeeAccess(actor, businessId, path[3], data));
      if (path.length === 3 && path[2] === "invitations" && method === "POST") return response(await inviteEmployee(actor, businessId, data), 201);
      if (path.length === 4 && path[2] === "invitations" && method === "DELETE") return response(await revokeInvitation(actor, businessId, path[3]));
      if (path.length === 3 && path[2] === "scan" && method === "GET") return response(await findByPublicId(actor, businessId, request.nextUrl.searchParams.get("code") ?? ""));
      if (path[2] === "customers") {
        if (path.length === 3 && method === "GET") return response(await listCustomers(actor, businessId, pagination));
        if (path.length === 3 && method === "POST") return response(await createCustomer(actor, businessId, data), 201);
        if (path.length === 4 && method === "GET") {
          const member = await requireCustomer(actor, businessId, path[3]);
          const appUrl = process.env.NEXT_PUBLIC_APP_URL;
          if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL required");
          const qrUrl = new URL("/scan", appUrl); qrUrl.searchParams.set("code", member.publicId); qrUrl.searchParams.set("businessId", businessId);
          return response({ ...member, qrImage: await QRCode.toDataURL(qrUrl.href, { width: 240, margin: 2 }), history: await transactionHistory(actor, businessId, pagination, path[3]) });
        }
      }
    }
    throw new AppError(404, "Not found");
  } catch (error) {
    if (error instanceof AppError) { if ([401,403,404,429].includes(error.status)) logEvent("security_rejected", { status: error.status }); const result = response({ error: error.message }, error.status); if (error instanceof RateLimitError) result.headers.set("Retry-After", String(error.retryAfter)); return result; }
    if (error instanceof ZodError) return response({ error: error.issues.map(item => `${item.path.join(".")}: ${item.message}`).join("; ") }, 400);
    // Do not send Prisma/SQL details or personal data to clients.
    logEvent("server_error", { category: error instanceof Error ? error.name : "UnknownError", status: 500 });
    return response({ error: "Something went wrong. Please try again with the same request identifier." }, 500);
  }
}
const withContext = (request: NextRequest, context: Context) => requestContext.run({ requestId: randomUUID() }, () => handle(request, context));
export const GET = withContext;
export const POST = withContext;
export const PATCH = withContext;
export const DELETE = withContext;
