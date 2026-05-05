const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_KEY  = process.env.BLOG_API_KEY || '';

function headers() {
  const h = { 'Content-Type': 'application/json' };
  if (API_KEY) h['x-blog-api-key'] = API_KEY;
  return h;
}

export async function blogFetchPosts(params = {}) {
  const sp  = new URLSearchParams(params);
  const res = await fetch(`${BACKEND}/blog/posts?${sp}`, { headers: headers(), cache: 'no-store' });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return res.json();
}

export async function blogFetchPost(slug, lang = 'en', country = 'IN') {
  const res = await fetch(`${BACKEND}/blog/posts/${slug}?lang=${lang}&country=${country}`, {
    headers: headers(), cache: 'no-store',
  });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return res.json();
}

export async function blogFetchCategories(lang = 'en') {
  const res = await fetch(`${BACKEND}/blog/categories?lang=${lang}`, {
    headers: headers(), cache: 'no-store',
  });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return res.json();
}
