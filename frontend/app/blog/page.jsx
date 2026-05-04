'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import axiosInstance from '@/lib/axios/axiosInstance';
import BlogCard from '@/features/blog/components/BlogCard';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function readCountry() {
  if (typeof document === 'undefined') return 'IN';
  return document.cookie.match(/qh_country=([A-Z]{2})/)?.[1] || 'IN';
}
function readLang() {
  if (typeof localStorage === 'undefined') return 'en';
  return localStorage.getItem('qh_lang') || 'en';
}

function BlogListingInner() {
  const sp = useSearchParams();
  const [posts, setPosts]       = useState([]);
  const [cats, setCats]         = useState([]);
  const [meta, setMeta]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState(sp?.get('search') || '');
  const [activeSearch, setActiveSearch] = useState(sp?.get('search') || '');
  const [activeCat, setActiveCat]   = useState(sp?.get('category') || '');
  const [activeTag, setActiveTag]   = useState(sp?.get('tag') || '');
  const [page, setPage]         = useState(1);
  const country = typeof window !== 'undefined' ? readCountry() : 'IN';
  const lang    = typeof window !== 'undefined' ? readLang()    : 'en';

  const fetchPosts = useCallback(async (p = 1, cat = activeCat, tag = activeTag, q = activeSearch) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ country, lang, page: p, limit: 9 });
      if (cat) params.set('category', cat);
      if (tag) params.set('tag', tag);
      if (q)   params.set('search', q);
      const res = await axiosInstance.get(`/blog/posts?${params}`);
      setPosts(res.data.data);
      setMeta(res.data.meta);
    } finally {
      setLoading(false);
    }
  }, [country, lang, activeCat, activeTag, activeSearch]);

  useEffect(() => {
    axiosInstance.get(`/blog/categories?lang=${lang}`).then(r => setCats(r.data.data)).catch(() => {});
  }, [lang]);

  useEffect(() => { fetchPosts(page); }, [page, activeCat, activeTag, activeSearch]);

  const featured = posts.find(p => p.featured);
  const rest     = posts.filter(p => !p.featured || p !== featured);

  function handleSearch(e) {
    e.preventDefault();
    setActiveCat(''); setActiveTag(''); setPage(1);
    setActiveSearch(search.trim());
  }

  function selectCat(slug) {
    setActiveCat(slug); setActiveTag(''); setActiveSearch(''); setSearch(''); setPage(1);
  }

  return (
    <div className="min-h-screen bg-[#F8FCF7]">
      {/* ── Hero header ─────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#26472B] to-[#1a3020] py-16 px-4 text-white text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-3">QuickHire Blog</h1>
        <p className="text-white/70 text-lg mb-8">Insights on hiring, tech, and global teams</p>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex max-w-lg mx-auto rounded-xl overflow-hidden shadow-lg">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search articles…"
            className="flex-1 px-5 py-3 text-[#1a2e1a] outline-none text-sm"
          />
          <button type="submit" className="bg-[#45A735] hover:bg-[#3a9028] px-6 py-3 font-semibold text-sm transition-colors">
            Search
          </button>
        </form>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col lg:flex-row gap-8">
        {/* ── Main content ──────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">
          {/* Active filters */}
          {(activeCat || activeTag || activeSearch) && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-sm text-[#666]">Filtering by:</span>
              {activeCat && (
                <span className="flex items-center gap-1 bg-[#45A735] text-white text-xs px-3 py-1 rounded-full">
                  Category: {cats.find(c => c.slug === activeCat)?.name?.[lang] || activeCat}
                  <button onClick={() => selectCat('')} className="ml-1 hover:opacity-70">✕</button>
                </span>
              )}
              {activeTag && (
                <span className="flex items-center gap-1 bg-[#45A735] text-white text-xs px-3 py-1 rounded-full">
                  #{activeTag}
                  <button onClick={() => { setActiveTag(''); setPage(1); }} className="ml-1 hover:opacity-70">✕</button>
                </span>
              )}
              {activeSearch && (
                <span className="flex items-center gap-1 bg-[#26472B] text-white text-xs px-3 py-1 rounded-full">
                  "{activeSearch}"
                  <button onClick={() => { setActiveSearch(''); setSearch(''); setPage(1); }} className="ml-1 hover:opacity-70">✕</button>
                </span>
              )}
            </div>
          )}

          {/* Featured post */}
          {featured && !activeCat && !activeTag && !activeSearch && page === 1 && (
            <div className="mb-8">
              <BlogCard post={featured} lang={lang} variant="featured" />
            </div>
          )}

          {/* Post grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-[#E5F1E2] overflow-hidden animate-pulse bg-white">
                  <div className="aspect-[16/9] bg-[#E5F1E2]" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 bg-[#E5F1E2] rounded w-1/3" />
                    <div className="h-4 bg-[#E5F1E2] rounded" />
                    <div className="h-4 bg-[#E5F1E2] rounded w-4/5" />
                    <div className="h-3 bg-[#E5F1E2] rounded w-2/3 mt-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 text-[#888]">
              <div className="text-5xl mb-4">📝</div>
              <p className="text-lg font-medium text-[#444]">No articles found</p>
              <p className="text-sm mt-1">Try a different search or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {(featured && !activeCat && !activeTag && !activeSearch && page === 1 ? rest : posts).map(post => (
                <BlogCard key={post._id} post={post} lang={lang} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-10">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="px-4 py-2 rounded-lg border border-[#D0E8CB] text-sm disabled:opacity-40 hover:bg-[#F2F9F1] transition-colors">
                ← Prev
              </button>
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === meta.totalPages || Math.abs(p - page) <= 2)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && arr[idx - 1] !== p - 1) acc.push('…');
                  acc.push(p); return acc;
                }, [])
                .map((p, i) => p === '…' ? <span key={`e${i}`} className="px-2 text-[#aaa]">…</span> : (
                  <button key={p} onClick={() => setPage(p)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium border transition-colors ${p === page ? 'bg-[#45A735] text-white border-[#45A735]' : 'border-[#D0E8CB] hover:bg-[#F2F9F1]'}`}>
                    {p}
                  </button>
                ))}
              <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}
                      className="px-4 py-2 rounded-lg border border-[#D0E8CB] text-sm disabled:opacity-40 hover:bg-[#F2F9F1] transition-colors">
                Next →
              </button>
            </div>
          )}
        </main>

        {/* ── Sidebar ───────────────────────────────────────────────── */}
        <aside className="w-full lg:w-72 flex-shrink-0 space-y-6">
          {/* Categories */}
          {cats.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5F1E2] p-5">
              <h3 className="font-bold text-[#26472B] mb-4">Categories</h3>
              <ul className="space-y-1">
                <li>
                  <button onClick={() => selectCat('')}
                          className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${!activeCat ? 'bg-[#45A735] text-white font-medium' : 'hover:bg-[#F2F9F1] text-[#333]'}`}>
                    All Articles
                  </button>
                </li>
                {cats.map(cat => (
                  <li key={cat._id}>
                    <button onClick={() => selectCat(cat.slug)}
                            className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${activeCat === cat.slug ? 'bg-[#45A735] text-white font-medium' : 'hover:bg-[#F2F9F1] text-[#333]'}`}>
                      {cat.name?.[lang] || cat.name?.en}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA */}
          <div className="bg-gradient-to-br from-[#45A735] to-[#26472B] rounded-xl p-6 text-white text-center">
            <h4 className="font-bold text-lg mb-2">Hire Top Tech Talent</h4>
            <p className="text-sm text-white/80 mb-4">Get matched with pre-vetted developers, designers & more.</p>
            <Link href="/book-your-resource" className="block bg-white text-[#26472B] font-semibold text-sm py-2.5 rounded-lg hover:bg-[#F2F9F1] transition-colors">
              Get Started →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function BlogListingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FCF7] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-[#45A735] border-t-transparent rounded-full" /></div>}>
      <BlogListingInner />
    </Suspense>
  );
}
