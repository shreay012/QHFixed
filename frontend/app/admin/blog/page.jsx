'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import staffApi from '@/lib/axios/staffApi';
import { showSuccess, showError } from '@/lib/utils/toast';
import { PageHeader, Spinner, Button } from '@/components/staff/ui';

const STATUS_COLORS = {
  published: 'bg-[#d4f0cd] text-[#1a6b0f]',
  draft:     'bg-[#f0f0f0] text-[#555]',
  scheduled: 'bg-[#fef3c7] text-[#92400e]',
  archived:  'bg-[#fce7e7] text-[#9b1c1c]',
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AdminBlogPage() {
  const [posts, setPosts]     = useState([]);
  const [meta, setMeta]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [status, setStatus]   = useState('');
  const [search, setSearch]   = useState('');
  const [q, setQ]             = useState('');
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async (p = page, s = status, sq = q) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 15 });
      if (s)  params.set('status', s);
      if (sq) params.set('search', sq);
      const res = await staffApi.get(`/blog/admin/posts?${params}`);
      setPosts(res.data.data);
      setMeta(res.data.meta);
    } catch (e) {
      showError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [page, status, q]);

  useEffect(() => { load(page, status, q); }, [page, status, q]);

  async function quickPublish(id, newStatus) {
    const action = newStatus === 'published' ? 'publish' : 'unpublish';
    try {
      await staffApi.post(`/blog/admin/posts/${id}/${action}`);
      showSuccess(newStatus === 'published' ? 'Published!' : 'Moved to draft');
      load(page, status, q);
    } catch { showError('Action failed'); }
  }

  async function deletePost(id) {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await staffApi.delete(`/blog/admin/posts/${id}`);
      showSuccess('Post deleted');
      load(page, status, q);
    } catch { showError('Delete failed'); }
    finally { setDeleting(null); }
  }

  const tabs = [
    { label: 'All',       value: '' },
    { label: 'Published', value: 'published' },
    { label: 'Draft',     value: 'draft' },
    { label: 'Scheduled', value: 'scheduled' },
    { label: 'Archived',  value: 'archived' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FCF7]">
      <PageHeader
        title="Blog Posts"
        subtitle="Create and manage multi-lingual blog content"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Blog' }]}
        action={<Link href="/admin/blog/new"><Button variant="primary">+ New Post</Button></Link>}
        secondaryActions={[<Link key="cats" href="/admin/blog/categories"><Button variant="outline">Manage Categories</Button></Link>]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Status tabs */}
        <div className="flex gap-1 border-b border-[#E5F1E2] mb-6">
          {tabs.map(t => (
            <button key={t.value} onClick={() => { setStatus(t.value); setPage(1); }}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${status === t.value ? 'bg-white border border-b-white border-[#E5F1E2] text-[#45A735] -mb-px' : 'text-[#666] hover:text-[#333]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-3 mb-6">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setQ(search.trim()); setPage(1); } }}
            placeholder="Search by title, slug, or tag…"
            className="flex-1 border border-[#D0E8CB] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#45A735] bg-white"
          />
          <button onClick={() => { setQ(search.trim()); setPage(1); }}
                  className="bg-[#45A735] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#3a9028] transition-colors">
            Search
          </button>
          {q && <button onClick={() => { setSearch(''); setQ(''); setPage(1); }}
                        className="px-4 py-2.5 rounded-xl border border-[#D0E8CB] text-sm text-[#666] hover:bg-[#F2F9F1]">Clear</button>}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-[#888]">
            <div className="text-5xl mb-4">📝</div>
            <p className="font-medium text-[#444]">No posts found</p>
            <Link href="/admin/blog/new" className="mt-3 inline-block text-[#45A735] hover:underline text-sm">Create your first post →</Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E5F1E2] overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-[#F8FCF7] border-b border-[#E5F1E2]">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-[#444]">Title</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#444] hidden md:table-cell">Slug</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#444]">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#444] hidden lg:table-cell">Published</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#444] hidden lg:table-cell">Views</th>
                  <th className="text-right px-5 py-3 font-semibold text-[#444]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F9F1]">
                {posts.map(post => (
                  <tr key={post._id} className="hover:bg-[#FAFEF9] transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-medium text-[#1a2e1a] line-clamp-1">{post.title?.en || '(untitled)'}</div>
                      {post.featured && <span className="text-xs text-[#f59e0b]">⭐ Featured</span>}
                    </td>
                    <td className="px-4 py-4 text-[#888] font-mono text-xs hidden md:table-cell max-w-[160px]">
                      <span className="truncate block">{post.slug}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[post.status] || STATUS_COLORS.draft}`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#888] text-xs hidden lg:table-cell">{fmtDate(post.publishedAt)}</td>
                    <td className="px-4 py-4 text-[#888] text-xs hidden lg:table-cell">{(post.viewCount || 0).toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* View live */}
                        {post.status === 'published' && (
                          <a href={`/industry-perspectives/${post.slug}`} target="_blank" rel="noopener"
                             className="text-xs text-[#45A735] hover:underline">View</a>
                        )}
                        {/* Quick publish/unpublish */}
                        {post.status !== 'published' ? (
                          <button onClick={() => quickPublish(post._id, 'published')}
                                  className="text-xs bg-[#45A735] text-white px-2.5 py-1 rounded-lg hover:bg-[#3a9028] transition-colors">
                            Publish
                          </button>
                        ) : (
                          <button onClick={() => quickPublish(post._id, 'draft')}
                                  className="text-xs border border-[#D0E8CB] text-[#555] px-2.5 py-1 rounded-lg hover:bg-[#F2F9F1]">
                            Unpublish
                          </button>
                        )}
                        <Link href={`/admin/blog/${post._id}/edit`}
                              className="text-xs border border-[#D0E8CB] text-[#333] px-2.5 py-1 rounded-lg hover:bg-[#F2F9F1]">
                          Edit
                        </Link>
                        <button onClick={() => deletePost(post._id)} disabled={deleting === post._id}
                                className="text-xs text-[#e53e3e] hover:underline disabled:opacity-40">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-4 py-2 rounded-lg border border-[#D0E8CB] text-sm disabled:opacity-40 hover:bg-[#F2F9F1]">← Prev</button>
            <span className="px-4 py-2 text-sm text-[#666]">Page {page} / {meta.totalPages}</span>
            <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}
                    className="px-4 py-2 rounded-lg border border-[#D0E8CB] text-sm disabled:opacity-40 hover:bg-[#F2F9F1]">Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
