export function securityHeaders(production: boolean, appUrl?: string) {
  const policy = ["default-src 'self'", "script-src 'self' 'unsafe-inline'" + (production ? "" : " 'unsafe-eval'"), "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "connect-src 'self'" + (production ? "" : " ws: wss:"), "font-src 'self'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'"];
  const headers = [{ key: "Content-Security-Policy", value: policy.join("; ") }, { key: "Referrer-Policy", value: "no-referrer" }, { key: "X-Content-Type-Options", value: "nosniff" }, { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" }];
  if (production && appUrl?.startsWith("https://")) headers.push({ key: "Strict-Transport-Security", value: "max-age=31536000" });
  return headers;
}
