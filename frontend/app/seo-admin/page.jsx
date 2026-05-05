'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import staffApi from '@/lib/axios/staffApi';
import { showError } from '@/lib/utils/toast';
import Link from 'next/link';

function ScoreRing({ score }) {
  const color = score >= 80 ? '#45A735' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx={18} cy={18} r={15.9} fill="none" stroke="#E5F1E2" strokeWidth={3} />
        <circle cx={18} cy={18} r={15.9} fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={`${score} 100`} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

function StatCard({ label, value, sub, color = '#45A735' }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
      <p className="text-xs text-[#909090] uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-[#636363] mt-1">{sub}</p>}
    </div>
  );
}

export default function SeoAdminDashboard() {
  const router = useRouter();
  const [pages, setPages] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    staffApi.get('/admin/seo/pages')
      .then((r) => setPages(r.data?.data || []))
      .catch(() => showError('Failed to load SEO data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-8 flex items-center gap-3 text-[#636363]">
      <div className="w-5 h-5 rounded-full border-2 border-[#45A735] border-t-transparent animate-spin" />
      Loading SEO overview…
    </div>
  );

  const total      = pages?.length || 0;
  const optimised  = pages?.filter((p) => p.score >= 80).length || 0;
  const needs      = pages?.filter((p) => p.score < 50).length || 0;
  const noTitle    = pages?.filter((p) => !p.hasTitle).length || 0;
  const noDesc     = pages?.filter((p) => !p.hasDesc).length || 0;
  const noOg       = pages?.filter((p) => !p.hasOg).length || 0;
  const avgScore   = total ? Math.round(pages.reduce((s, p) => s + p.score, 0) / total) : 0;

  const byScore = [...(pages || [])].sort((a, b) => a.score - b.score);

  return (
    <div className="p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#26472B]">SEO Dashboard</h1>
        <p className="text-sm text-[#636363] mt-1">Overview of all page SEO health scores and quick actions.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Avg Score"     value={`${avgScore}%`} sub="across all pages" color="#45A735" />
        <StatCard label="Optimised"     value={optimised}      sub="score ≥ 80%"      color="#45A735" />
        <StatCard label="Needs Work"    value={needs}          sub="score < 50%"      color="#ef4444" />
        <StatCard label="Missing Title" value={noTitle}        sub="pages"            color="#f59e0b" />
        <StatCard label="Missing Desc"  value={noDesc}         sub="pages"            color="#f59e0b" />
        <StatCard label="Missing OG"    value={noOg}           sub="image"            color="#f59e0b" />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: '/seo-admin/pages',    label: 'Edit Page SEO',      desc: 'Meta titles, descriptions, OG images for every page', icon: '📄' },
          { href: '/seo-admin/global',   label: 'Global Settings',    desc: 'robots.txt, sitemaps, verification tags, schema', icon: '⚙️' },
          { href: '/seo-admin/redirects',label: 'Redirects',          desc: 'Manage 301/302 URL redirects without a deploy', icon: '↪️' },
        ].map((card) => (
          <Link key={card.href} href={card.href}
            className="bg-white rounded-2xl border border-[#E5F1E2] p-5 hover:border-[#45A735] hover:shadow-sm transition-all group">
            <div className="text-2xl mb-2">{card.icon}</div>
            <p className="font-semibold text-[#26472B] group-hover:text-[#45A735] transition-colors">{card.label}</p>
            <p className="text-xs text-[#909090] mt-1">{card.desc}</p>
          </Link>
        ))}
      </div>

      {/* Pages health table */}
      <div className="bg-white rounded-2xl border border-[#E5F1E2] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5F1E2] flex items-center justify-between">
          <h2 className="font-semibold text-[#26472B]">Page Health — Worst First</h2>
          <Link href="/seo-admin/pages" className="text-xs text-[#45A735] hover:underline">View all →</Link>
        </div>
        <div className="divide-y divide-[#F5F7F5]">
          {byScore.slice(0, 15).map((p) => (
            <div key={p.key} className="flex items-center gap-4 px-6 py-3 hover:bg-[#F7FBF6] transition-colors">
              <ScoreRing score={p.score} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#26472B] truncate">{p.label}</p>
                <p className="text-xs text-[#909090] truncate">{p.path}</p>
                <div className="flex gap-2 mt-1">
                  {!p.hasTitle && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-500 font-medium">No title</span>}
                  {!p.hasDesc  && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-medium">No description</span>}
                  {!p.hasOg   && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-medium">No OG image</span>}
                  {p.noindex   && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">noindex</span>}
                </div>
              </div>
              <Link href={`/seo-admin/pages/${encodeURIComponent(p.key)}`}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-[#45A735] text-[#26472B] text-xs font-medium hover:bg-[#F2F9F1] transition-colors">
                Edit SEO
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
