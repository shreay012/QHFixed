const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://qhfixed.vercel.app';

const STATIC_PAGES = [
  { path: '/',                          priority: 1.0,  changeFreq: 'daily' },
  { path: '/how-it-works',              priority: 0.9,  changeFreq: 'weekly' },
  { path: '/book-your-resource',        priority: 0.9,  changeFreq: 'weekly' },
  { path: '/contact-us',               priority: 0.7,  changeFreq: 'monthly' },
  { path: '/faq',                       priority: 0.7,  changeFreq: 'weekly' },
  { path: '/industry-perspectives',     priority: 0.8,  changeFreq: 'daily' },
  { path: '/privacy-policy',            priority: 0.3,  changeFreq: 'yearly' },
  { path: '/terms-and-conditions',      priority: 0.3,  changeFreq: 'yearly' },
  { path: '/cancellation-and-refund-policy', priority: 0.3, changeFreq: 'yearly' },
];

export default async function sitemap() {
  const entries = STATIC_PAGES.map((p) => ({
    url: `${SITE}${p.path}`,
    lastModified: new Date(),
    changeFrequency: p.changeFreq,
    priority: p.priority,
  }));

  // Dynamic: service pages
  try {
    const res = await fetch(`${BASE}/services`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const { data } = await res.json();
      if (Array.isArray(data)) {
        for (const s of data) {
          const id = s.slug || String(s._id);
          entries.push({
            url: `${SITE}/service-details/${id}`,
            lastModified: s.updatedAt ? new Date(s.updatedAt) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.85,
          });
        }
      }
    }
  } catch { /* skip on error */ }

  // Dynamic: published blog posts
  try {
    const res = await fetch(`${BASE}/blog/posts?status=published&pageSize=200`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const { data } = await res.json();
      const posts = Array.isArray(data) ? data : (data?.posts || []);
      for (const p of posts) {
        if (!p.slug) continue;
        entries.push({
          url: `${SITE}/industry-perspectives/${p.slug}`,
          lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }
  } catch { /* skip on error */ }

  return entries;
}
