/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Allow the frontend to call the backend API (same domain via nginx)
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:8090/api/v1/:path*',
      },
    ]
  },
}

export default nextConfig
