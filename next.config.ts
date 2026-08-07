import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { securityHeaders } from "./src/lib/securityHeaders";

const nextConfig: NextConfig = {
  images: {
    // Event flyer images are uploaded to Supabase Storage and served from its
    // public object URL, e.g. https://<project-ref>.supabase.co/storage/v1/object/public/...
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
  experimental: {
    // Server Actions default to a 1MB request body limit, well under the
    // 25MB the event-media upload action allows — raise it to match.
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
});

