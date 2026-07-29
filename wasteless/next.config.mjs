import withPWAInit from "@ducanh2912/next-pwa";

const isCloudflare = process.env.DEPLOY_TARGET === "cloudflare";

const withPWA = withPWAInit({
  dest: "public",
  // Keep PWA on for Cloudflare so each deploy regenerates sw.js precache.
  // customWorkerSrc must NOT be "worker" — that dir is the CF Worker.
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  customWorkerSrc: "sw-custom",
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
    // false → Workbox adds SKIP_WAITING message listener; Update button activates.
    skipWaiting: false,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(isCloudflare
    ? {
        output: "export",
        images: { unoptimized: true },
      }
    : {}),
};

export default withPWA(nextConfig);
