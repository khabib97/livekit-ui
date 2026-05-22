/** @type {import('next').NextConfig} */

// Production default: backend runs on the same host, accessed directly (not via Nginx).
// Local dev override: set BACKEND_ORIGIN=https://gomeeting.video in .env.local
// to proxy API calls to the production backend instead.
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? 'http://127.0.0.1:8090'

const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${BACKEND_ORIGIN}/api/v1/:path*`,
      },
    ]
  },
}

export default nextConfig
