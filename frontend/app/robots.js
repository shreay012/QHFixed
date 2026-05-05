const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://qhfixed.vercel.app';

export default async function robots() {
  try {
    const res = await fetch(`${BASE}/admin/seo/public/global`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const { data } = await res.json();
      if (data?.robotsTxt) {
        // Parse the stored robots.txt text and return structured object
        // Next.js robots() needs a structured object, so we also keep the raw
        // text as a fallback via a custom header approach. For simplicity,
        // return sensible defaults derived from the stored text.
        const txt = data.robotsTxt;
        const noindexAll = txt.includes('Disallow: /') && txt.includes('User-agent: *');
        if (noindexAll && txt.includes('Disallow: /\n')) {
          return { rules: { userAgent: '*', disallow: '/' } };
        }
      }
    }
  } catch { /* fallback below */ }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/seo-admin/', '/staff-login', '/api/'],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
