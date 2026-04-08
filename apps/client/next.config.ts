import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@rokka/shared', '@rokka/ui', '@rokka/supabase'],
}

export default nextConfig
