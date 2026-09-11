import type { NextConfig } from "next";
import { securityHeaders } from "./securityHeaders";
const nextConfig: NextConfig = { outputFileTracingRoot: process.cwd(), async headers() { return [{ source: "/:path*", headers: securityHeaders(process.env.NODE_ENV === "production", process.env.NEXT_PUBLIC_APP_URL) }]; } };
export default nextConfig;
