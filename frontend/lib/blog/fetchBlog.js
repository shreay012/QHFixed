import crypto from 'node:crypto';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function b64url(buf) {
  return (typeof buf === 'string' ? Buffer.from(buf) : buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function makeServiceToken() {
  const rawKey = process.env.JWT_PRIVATE_KEY;
  if (!rawKey) return null;
  const key = rawKey.replace(/\\n/g, '\n');
  const alg  = process.env.JWT_ALGORITHM || (key.includes('-----') ? 'RS256' : 'HS256');
  const now  = Math.floor(Date.now() / 1000);
  const payload = {
    sub: 'blog-service',
    role: 'viewer',
    iat: now,
    exp: now + 60,
    iss: process.env.JWT_ISSUER   || 'quickhire.services',
    aud: process.env.JWT_AUDIENCE || 'quickhire-api',
  };
  const header   = b64url(JSON.stringify({ typ: 'JWT', alg }));
  const body     = b64url(JSON.stringify(payload));
  const unsigned = `${header}.${body}`;
  try {
    let sig;
    if (alg === 'HS256') {
      sig = b64url(crypto.createHmac('sha256', key).update(unsigned).digest());
    } else {
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(unsigned);
      sig = b64url(Buffer.from(sign.sign(key, 'base64'), 'base64'));
    }
    return `${unsigned}.${sig}`;
  } catch { return null; }
}

function authHeader() {
  const token = makeServiceToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function blogFetchPosts(params = {}) {
  const sp = new URLSearchParams(params);
  const res = await fetch(`${BACKEND}/blog/posts?${sp}`, {
    headers: authHeader(),
    cache: 'no-store',
  });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return res.json();
}

export async function blogFetchPost(slug, lang = 'en', country = 'IN') {
  const res = await fetch(`${BACKEND}/blog/posts/${slug}?lang=${lang}&country=${country}`, {
    headers: authHeader(),
    cache: 'no-store',
  });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return res.json();
}

export async function blogFetchCategories(lang = 'en') {
  const res = await fetch(`${BACKEND}/blog/categories?lang=${lang}`, {
    headers: authHeader(),
    cache: 'no-store',
  });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return res.json();
}
