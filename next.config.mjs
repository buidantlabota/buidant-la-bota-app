/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
    experimental: {
        serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium']
    },
};

export default nextConfig;
