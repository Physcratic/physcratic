/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Render metadata in <head> for every user agent (incl. AI crawlers and link unfurlers).
  htmlLimitedBots: /.*/,
  images: {
    unoptimized: true,
  },
  outputFileTracingIncludes: {
    "/api/submissions": ["./public/corpus/problems/*.json"],
    "/api/submission-info/*": ["./public/corpus/problems/*.json"],
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
