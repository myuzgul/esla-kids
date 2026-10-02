import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://eslakids.com';

  const robots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /hesabim/
Disallow: /sepet
Disallow: /odeme

Sitemap: ${baseUrl}/sitemap.xml
`;

  return new NextResponse(robots, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
