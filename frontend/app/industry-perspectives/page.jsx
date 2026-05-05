'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

const BASE = '';

function readCookie(n) {
  if (typeof document === 'undefined') return '';
  return document.cookie.match(new RegExp(`(?:^|; )${n}=([^;]*)`))?.[1] || '';
}
function readLang() {
  if (typeof localStorage === 'undefined') return 'en';
  return localStorage.getItem('qh_lang') || 'en';
}
function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function pick(field, lang) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[lang] || field.en || field[Object.keys(field)[0]] || '';
}

/* ── Blog card ─────────────────────────────────────────────────────────── */
function PostCard({ post, lang, size = 'sm' }) {
  const title   = pick(post.title, lang)   || 'Untitled';
  const excerpt = pick(post.excerpt, lang) || '';
  const cover   = post.coverImage      || '/images/blog-placeholder.png';
  const cat     = post.categoriesData?.[0];
  const slug    = post.slug;

  if (size === 'lg') {
    return (
      <Link href={`/industry-perspectives/${slug}`}
            className="group block relative overflow-hidden rounded-2xl bg-[#1a2e1a] shadow-xl hover:shadow-2xl transition-shadow h-full">
        <div className="relative h-[420px] sm:h-[480px]">
          <Image src={cover} alt={title} fill className="object-cover opacity-60 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700" sizes="(max-width:768px) 100vw,55vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f0d] via-[#0d1f0d99] to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-8">
            {cat && (
              <span className="inline-block self-start bg-[#45A735] text-white text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wide">
                {pick(cat.name, lang)}
              </span>
            )}
            <h2 className="text-white text-2xl sm:text-3xl font-bold leading-tight mb-3 line-clamp-3 group-hover:text-[#78EB54] transition-colors">
              {title}
            </h2>
            {excerpt && <p className="text-white/70 text-sm leading-relaxed mb-4 line-clamp-2">{excerpt}</p>}
            <div className="flex items-center gap-3 text-white/50 text-xs">
              {post.authorName && <span className="font-medium text-white/70">{post.authorName}</span>}
              {post.publishedAt && <><span>·</span><span>{fmtDate(post.publishedAt)}</span></>}
              <span>·</span><span>{post.readingTimeMinutes ?? 1} min read</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/industry-perspectives/${slug}`}
          className="group flex flex-col overflow-hidden rounded-2xl bg-white border border-[#E8F0E6] hover:border-[#45A735] hover:shadow-lg transition-all duration-300 h-full">
      <div className="relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <Image src={cover} alt={title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw" />
        {cat && (
          <span className="absolute top-3 left-3 bg-white/95 text-[#26472B] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shadow-sm">
            {pick(cat.name, lang)}
          </span>
        )}
      </div>
      <div className="flex flex-col flex-1 p-5">
        <h3 className="font-bold text-[#1a2e1a] text-base leading-snug mb-2 line-clamp-2 group-hover:text-[#45A735] transition-colors">
          {title}
        </h3>
        {excerpt && <p className="text-[#6b7280] text-sm leading-relaxed mb-4 line-clamp-3 flex-1">{excerpt}</p>}
        <div className="flex items-center gap-2 pt-3 border-t border-[#f3f4f6] mt-auto">
          <span className="text-xs text-[#9ca3af] truncate flex-1">{post.authorName || 'QuickHire Team'}</span>
          {post.publishedAt && <span className="text-xs text-[#9ca3af] shrink-0">{fmtDate(post.publishedAt)}</span>}
          <span className="text-xs text-[#45A735] font-medium shrink-0">{post.readingTimeMinutes ?? 1}m</span>
        </div>
      </div>
    </Link>
  );
}

/* ── Skeleton ──────────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="animate-pulse rounded-2xl overflow-hidden border border-[#E8F0E6] bg-white">
      <div className="aspect-[16/9] bg-[#e5f0e2]" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-[#e5f0e2] rounded w-1/4" />
        <div className="h-4 bg-[#e5f0e2] rounded" />
        <div className="h-4 bg-[#e5f0e2] rounded w-5/6" />
        <div className="h-3 bg-[#e5f0e2] rounded w-1/2 mt-4" />
      </div>
    </div>
  );
}

/* ── Main inner component ──────────────────────────────────────────────── */
function IndustryPerspectivesInner() {
  const sp  = useSearchParams();
  const [posts, setPosts]           = useState([]);
  const [cats, setCats]             = useState([]);
  const [meta, setMeta]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [activeCat, setActiveCat]   = useState(sp?.get('category') || '');
  const [activeTag, setActiveTag]   = useState(sp?.get('tag') || '');
  const [search, setSearch]         = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage]             = useState(1);
  const lang    = typeof window !== 'undefined' ? readLang() : 'en';
  const country = typeof window !== 'undefined' ? readCookie('qh_country') || 'IN' : 'IN';

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const p = new URLSearchParams({ country, lang, page, limit: 9 });
      if (activeCat)   p.set('category', activeCat);
      if (activeTag)   p.set('tag', activeTag);
      if (debouncedQ)  p.set('search', debouncedQ);
      const res  = await fetch(`${BASE}/api/blog/posts?${p}`);
      if (!res.ok) {
        console.error(`[blog] list fetch HTTP ${res.status}`);
        setFetchError(res.status);
        setPosts([]);
        return;
      }
      const json = await res.json();
      setPosts(json.data || []);
      setMeta(json.meta || null);
    } catch (e) {
      console.error('[blog] list fetch error:', e?.message);
      setFetchError('network');
      setPosts([]);
    }
    finally { setLoading(false); }
  }, [country, lang, page, activeCat, activeTag, debouncedQ]);

  useEffect(() => {
    fetch(`${BASE}/api/blog/categories?lang=${lang}`)
      .then(r => r.json())
      .then(j => setCats(j.data || []))
      .catch(() => {});
  }, [lang]);

  useEffect(() => { load(); }, [load]);

  const featured = !activeCat && !activeTag && !debouncedQ && page === 1 ? posts.find(p => p.featured) : null;
  const rest      = featured ? posts.filter(p => p !== featured) : posts;

  function selectCat(slug) { setActiveCat(slug); setActiveTag(''); setSearch(''); setPage(1); }

  return (
    <div className="min-h-screen bg-[#f9fbf8]">
      {/* ── Page header ──────────────────────────────────────────────── */}
      <section className="bg-white border-b border-[#e5ede3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 py-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <p className="text-[#45A735] text-xs font-bold uppercase tracking-widest mb-2">QuickHire</p>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1a2e1a] tracking-tight">Industry Perspectives</h1>
              <p className="text-[#6b7280] mt-2 text-base max-w-xl">Expert insights on hiring, technology, and building world-class remote teams.</p>
            </div>
            {/* Search */}
            <div className="relative sm:w-72 shrink-0">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx={11} cy={11} r={8} /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search articles…"
                className="w-full pl-9 pr-4 py-2.5 border border-[#d1e8cc] rounded-xl text-sm bg-white focus:outline-none focus:border-[#45A735] focus:ring-1 focus:ring-[#45A735]/20 transition"
              />
            </div>
          </div>

          {/* Category filter pills */}
          {cats.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              <button
                onClick={() => selectCat('')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${!activeCat ? 'bg-[#26472B] text-white shadow-sm' : 'bg-[#f0f7ee] text-[#3a5a3a] hover:bg-[#e0edd d]'}`}
              >
                All
              </button>
              {cats.map(c => (
                <button
                  key={c._id}
                  onClick={() => selectCat(c.slug)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeCat === c.slug ? 'bg-[#45A735] text-white shadow-sm' : 'bg-[#f0f7ee] text-[#3a5a3a] hover:bg-[#e0eddc]'}`}
                >
                  {pick(c.name, lang)}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Active filters ───────────────────────────────────────────── */}
      {(activeTag || debouncedQ) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 pt-4 flex gap-2 flex-wrap">
          {activeTag && (
            <span className="flex items-center gap-1.5 bg-[#45A735] text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              #{activeTag}
              <button onClick={() => { setActiveTag(''); setPage(1); }} className="opacity-70 hover:opacity-100">✕</button>
            </span>
          )}
          {debouncedQ && (
            <span className="flex items-center gap-1.5 bg-[#1a2e1a] text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              "{debouncedQ}"
              <button onClick={() => { setSearch(''); }} className="opacity-70 hover:opacity-100">✕</button>
            </span>
          )}
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 py-10">
        {loading ? (
          <>
            {!activeCat && !activeTag && !debouncedQ && page === 1 && (
              <div className="animate-pulse rounded-2xl overflow-hidden bg-[#e5f0e2] h-[420px] mb-10" />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}
            </div>
          </>
        ) : posts.length === 0 ? (
          <div className="py-32 text-center">
            {fetchError ? (
              <>
                <div className="text-6xl mb-5">⚠️</div>
                <h2 className="text-xl font-bold text-[#1a2e1a] mb-2">Could not load articles</h2>
                <p className="text-[#6b7280] text-sm mb-4">
                  {fetchError === 401
                    ? 'Authentication error (401) — backend auth config needs update.'
                    : fetchError === 'network'
                    ? 'Backend is not reachable. Render may be sleeping or crashed.'
                    : `Backend returned HTTP ${fetchError}. Check Render logs.`}
                </p>
                <button onClick={() => load()} className="text-[#45A735] text-sm hover:underline">Retry →</button>
              </>
            ) : (
              <>
                <div className="text-6xl mb-5">✍️</div>
                <h2 className="text-xl font-bold text-[#1a2e1a] mb-2">No articles found</h2>
                <p className="text-[#6b7280] text-sm">No published articles yet. Go to Admin → Blog → Publish a post.</p>
                {(activeCat || activeTag || debouncedQ) && (
                  <button onClick={() => { selectCat(''); setSearch(''); }} className="mt-5 text-[#45A735] text-sm hover:underline">
                    Clear filters →
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            {/* Featured post — full width */}
            {featured && (
              <div className="mb-10">
                <PostCard post={featured} lang={lang} size="lg" />
              </div>
            )}

            {/* Post grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rest.map(p => <PostCard key={p._id} post={p} lang={lang} size="sm" />)}
            </div>
          </>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-12">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#D0E8CB] text-[#555] disabled:opacity-30 hover:bg-[#F2F9F1] transition-colors text-sm"
            >←</button>
            {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === meta.totalPages || Math.abs(n - page) <= 2)
              .reduce((acc, n, i, arr) => { if (i && arr[i - 1] !== n - 1) acc.push('…'); acc.push(n); return acc; }, [])
              .map((n, i) => n === '…'
                ? <span key={`e${i}`} className="w-10 text-center text-[#aaa]">…</span>
                : <button key={n} onClick={() => setPage(n)}
                          className={`w-10 h-10 rounded-xl text-sm font-medium transition-colors ${n === page ? 'bg-[#45A735] text-white' : 'border border-[#D0E8CB] text-[#555] hover:bg-[#F2F9F1]'}`}>
                    {n}
                  </button>
              )
            }
            <button
              onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
              disabled={page === meta.totalPages}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#D0E8CB] text-[#555] disabled:opacity-30 hover:bg-[#F2F9F1] transition-colors text-sm"
            >→</button>
          </div>
        )}
      </main>

      {/* ── Bottom CTA ───────────────────────────────────────────────── */}
      <section className="bg-[#26472B] mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 py-14 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-white text-2xl font-bold mb-1">Ready to hire top tech talent?</h3>
            <p className="text-white/60 text-sm">Pre-vetted developers, designers, and engineers — globally.</p>
          </div>
          <Link href="/book-your-resource"
                className="shrink-0 bg-[#45A735] hover:bg-[#3a9028] text-white font-bold px-8 py-3 rounded-xl transition-colors text-sm whitespace-nowrap">
            Get Started →
          </Link>
        </div>
      </section>
    </div>
  );
}

export default function IndustryPerspectivesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f9fbf8] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#45A735] border-t-transparent rounded-full" />
      </div>
    }>
      <IndustryPerspectivesInner />
    </Suspense>
  );
}
