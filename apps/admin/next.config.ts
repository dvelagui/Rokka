import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@rokka/shared', '@rokka/ui', '@rokka/supabase'],
  experimental: {
    // Reduce memory pressure during builds with many client components
    optimizePackageImports: ['framer-motion', '@dnd-kit/core', '@dnd-kit/sortable'],
  },
}

export default nextConfig
