/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Pages configuration
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // API routes proxy to Cloudflare Workers
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8787/api/:path*' // Dev workers URL
      }
    ]
  },
  // Static export for Cloudflare Pages
  output: 'export',
  distDir: 'dist'
}

module.exports = nextConfig