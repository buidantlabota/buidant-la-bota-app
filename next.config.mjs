/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
};

export default nextConfig;
