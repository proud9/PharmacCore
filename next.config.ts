import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `npm run demo` and `npm test` build into their own folders so `npm run dev` (which uses .next)
  // never overwrites the production build they serve. See scripts/prod-build.ts.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    // Client router cache: a page visited (or prefetched) in the last 30 s is shown instantly on
    // the way back instead of waiting on the server. Every save calls router.refresh(), which
    // empties this cache, so staff never see their own changes go missing.
    staleTimes: { dynamic: 30, static: 300 },
  },
  async headers() {
    return [
      {
        // Brand images change only with a release; let browsers keep them for a week.
        source: "/brand/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
