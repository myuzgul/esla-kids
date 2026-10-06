/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' }
    ],
  },
  async rewrites() {
    return [
      {
        source: '/index.php',
        has: [{ type: 'query', key: 'wc-api', value: 'wc_gateway_paytrcheckout' }],
        destination: '/api/paytr/callback',
      },
    ];
  },
};

export default nextConfig;
