import jwt from 'jsonwebtoken';

const BACKEND  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_KEY  = process.env.BLOG_API_KEY        || '';
const RAW_KEY  = (process.env.JWT_PRIVATE_KEY    || '').replace(/\\n/g, '\n');
const ALG      = process.env.JWT_ALGORITHM       || (RAW_KEY.includes('-----') ? 'RS256' : 'HS256');
const ISSUER   = process.env.JWT_ISSUER          || 'quickhire.services';
const AUDIENCE = process.env.JWT_AUDIENCE        || 'quickhire-api';

function makeToken() {
  if (!RAW_KEY) return null;
  try {
    return jwt.sign(
      { sub: 'blog-service', role: 'viewer' },
      RAW_KEY,
      { algorithm: ALG, expiresIn: 60, issuer: ISSUER, audience: AUDIENCE },
    );
  } catch (e) {
    console.error('[blog] JWT sign failed:', e.message);
    return null;
  }
}

function authHeaders() {
  const h = {};
  if (API_KEY) h['x-blog-api-key'] = API_KEY;
  const token = makeToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export async function blogFetchPosts(params = {}) {
  const sp  = new URLSearchParams(params);
  const res = await fetch(`${BACKEND}/blog/posts?${sp}`, { headers: authHeaders(), cache: 'no-store' });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return res.json();
}

export async function blogFetchPost(slug, lang = 'en', country = 'IN') {
  const res = await fetch(`${BACKEND}/blog/posts/${slug}?lang=${lang}&country=${country}`, {
    headers: authHeaders(), cache: 'no-store',
  });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return res.json();
}

export async function blogFetchCategories(lang = 'en') {
  const res = await fetch(`${BACKEND}/blog/categories?lang=${lang}`, {
    headers: authHeaders(), cache: 'no-store',
  });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return res.json();
}
