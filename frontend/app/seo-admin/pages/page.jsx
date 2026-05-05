'use client';
import { useEffect, useState, useMemo } from 'react';
import staffApi from '@/lib/axios/staffApi';
import { showError } from '@/lib/utils/toast';
import Link from 'next/link';

function ScoreRing({ score }) {
  const color = score >= 80 ? '#45A735' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx={18} cy={18} r={15.9} fill="none" stroke="#E5F1E2" strokeWidth={3} />
        <circle cx={18} cy={18} r={15.9} fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={`${score} 100`} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

const FILTERS = [
  { label: 'All',          fn: () => true },
  { label: 'Optimised',   fn: (p) => p.score >= 80 },
  { label: 'Needs Work',  fn: (p) => p.score < 50 },
  { label: 'No Title',    fn: (p) => !p.hasTitle },
  { label: 'No Desc',     fn: (p) => !p.hasDesc },
  { label: 'No OG',       fn: (p) => !p.hasOg },
  { label: 'Noindex',     fn: (p) => p.noindex },
];

export default function SeoPages() {
  const [pages, setPages]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(0);
  const [sort, setSort]     = useState('score_asc');

  useEffect(() => {
    staffApi.get('/admin/seo/pages')
      .then((r) => setPages(r.data?.data || []))
      .catch(() => showError('Failed to load pages'))
      .finally(() => setLoading(false));
  }, []);

  const displayed = useMemo(() => {
    if (!pages) return [];
    let list = pages.filter(FILTERS[filter].fn);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.label.toLowerCase().includes(q) || p.path.toLowerCase().includes(q) || p.key.toLowerCase().includes(q));
    }
    list = [...list];
    if (sort === 'score_asc')  list.sort((a, b) => a.score - b.score);
    if (sort === 'score_desc') list.sort((a, b) => b.score - a.score);
    if (sort === 'label')      list.sort((a, b) => a.label.localeCompare(b.label));
    return list;
  }, [pages, search, filter, sort]);

  if (loading) return (
    <div className="p-8 flex items-center gap-3 text-[#636363]">
      <div className="w-5 h-5 rounded-full border-2 border-[#45A735] border-t-transparent animate-spin" />
      Loading pages…
    </div>
  );

  return (
    <div className="p-6 sm:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#26472B]">Page SEO</h1>
          <p className="text-sm text-[#636363] mt-0.5">{pages?.length || 0} pages tracked</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#909090]" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx={11} cy={11} r={8} /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pages…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735] bg-white"
          />
        </div>

        {/* Sort */}
        <select
          value={sort} onChange={(e) => setSort(e.target.value)}
          className="text-sm border border-[#E5F1E2] rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-[#45A735] text-[#26472B]"
        >
          <option value="score_asc">Score: Low → High</option>
          <option value="score_desc">Score: High → Low</option>
          <option value="label">Name A–Z</option>
        </select>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f, i) => (
          <button key={f.label} onClick={() => setFilter(i)}
            className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
              filter === i
                ? 'bg-[#45A735] text-white border-[#45A735]'
                : 'bg-white text-[#636363] border-[#E5F1E2] hover:border-[#45A735]'
            }`}>
            {f.label}
            {pages && <span className="ml-1 opacity-70">({pages.filter(f.fn).length})</span>}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E5F1E2] overflow-hidden">
        {displayed.length === 0 ? (
          <div className="px-6 py-12 text-center text-[#909090] text-sm">No pages match your filter.</div>
        ) : (
          <div className="divide-y divide-[#F5F7F5]">
            {displayed.map((p) => (
              <div key={p.key} className="flex items-center gap-4 px-5 py-3 hover:bg-[#F7FBF6] transition-colors">
                <ScoreRing score={p.score} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#26472B]">{p.label}</span>
                    {p.noindex && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">noindex</span>
                    )}
                  </div>
                  <p className="text-xs text-[#909090] truncate">{p.path}</p>

                  {/* Issue badges */}
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {!p.hasTitle && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-500 font-medium">No title</span>}
                    {!p.hasDesc  && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-medium">No description</span>}
                    {!p.hasOg   && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-medium">No OG image</span>}
                    {p.hasTitle && p.hasDesc && p.hasOg && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium">All set</span>
                    )}
                  </div>
                </div>

                {/* Score bar */}
                <div className="hidden sm:block w-24">
                  <div className="h-1.5 bg-[#E5F1E2] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${p.score}%`,
                        background: p.score >= 80 ? '#45A735' : p.score >= 50 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-[#909090] mt-0.5 text-right">{p.score}%</p>
                </div>

                <Link
                  href={`/seo-admin/pages/${encodeURIComponent(p.key)}`}
                  className="flex-shrink-0 px-3 py-1.5 rounded-xl border border-[#45A735] text-[#26472B] text-xs font-medium hover:bg-[#F2F9F1] transition-colors whitespace-nowrap"
                >
                  Edit SEO
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-[#909090] text-center">Showing {displayed.length} of {pages?.length || 0} pages</p>
    </div>
  );
}
