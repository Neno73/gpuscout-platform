/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Pages configuration
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Static export for Cloudflare Pages
  output: 'export',
  distDir: 'out'
}

module.exports = nextConfig