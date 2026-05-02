// /Users/orange/Documents/QHAIMODE copy 2/frontend/app/admin/ops/reviews/page.jsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import staffApi from '@/lib/axios/staffApi';
import { PageHeader, Spinner, ErrorBox, EmptyState, Button, SearchInput, Pagination } from '@/components/staff/ui';
import { showSuccess, showError } from '@/lib/utils/toast';

const TABS = ['all', 'pending', 'approved', 'rejected'];
const PAGE_SIZE = 20;

function StarRating({ rating }) {
  const n = Math.round(Math.max(0, Math.min(5, rating || 0)));
  return (
    <span className="text-base leading-none" title={`${rating}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < n ? 'text-amber-400' : 'text-[#D1D5DB]'}>★</span>
      ))}
    </span>
  );
}

function ReviewStatusBadge({ status }) {
  const map = {
    pending:  'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    approved: 'bg-[#F2F9F1] text-[#26472B] ring-1 ring-[#D6EBCF]',
    rejected: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-open-sauce-semibold ${map[status] || 'bg-[#F5F7F5] text-[#484848] ring-1 ring-[#E5E7EB]'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status || '—'}
    </span>
  );
}

export default function ReviewsModerationPage() {
  const [tab, setTab] = useState('pending');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const [items, setItems] = useState(null);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [busy, setBusy] = useState({});

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(PAGE_SIZE));
    if (tab !== 'all') params.set('status', tab);
    if (q.trim()) params.set('q', q.trim());
    return params.toString();
  }, [page, tab, q]);

  const load = useCallback(() => {
    staffApi
      .get(`/admin-ops/reviews?${queryString}`)
      .then((r) => {
        const d = r.data?.data;
        setItems(Array.isArray(d) ? d : []);
        setMeta(r.data?.meta || { total: 0, totalPages: 1 });
        setError(null);
      })
      .catch((err) => setError(err?.response?.data?.error?.message || 'Failed to load reviews'));
  }, [queryString]);

  useEffect(() => { load(); }, [load]);

  // Filter changes reset page back to 1.
  const updateTab = (t) => { setTab(t); setPage(1); };
  const updateQ   = (v) => { setQ(v);   setPage(1); };

  const moderate = async (id, status, note = '') => {
    setBusy((b) => ({ ...b, [id]: status }));
    try {
      await staffApi.patch(`/admin-ops/reviews/${id}/moderate`, { status, note });
      showSuccess(`Review ${status} successfully.`);
      setRejectingId(null);
      setRejectNote('');
      load();
    } catch (e) {
      showError(e?.response?.data?.error?.message || `Failed to ${status} review.`);
    } finally {
      setBusy((b) => ({ ...b, [id]: null }));
    }
  };

  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div>
      <PageHeader title="Reviews" subtitle="Moderate customer reviews" />
      <div className="p-4 sm:p-8 space-y-5">
        <ErrorBox error={error} />

        {/* Filter Tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex gap-1 bg-[#F2F9F1] border border-[#E5F1E2] rounded-xl p-1 w-fit">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => updateTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-open-sauce-semibold capitalize transition-all duration-150 cursor-pointer ${
                  tab === t
                    ? 'bg-[#45A735] text-white shadow-sm'
                    : 'text-[#636363] hover:text-[#26472B] hover:bg-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex-1 sm:max-w-md">
            <SearchInput value={q} onChange={updateQ} placeholder="Search comment or flag reason" />
          </div>
          <div className="text-xs text-[#909090]">
            {meta.total != null && `${meta.total} review${meta.total === 1 ? '' : 's'}`}
          </div>
        </div>

        {items === null && !error && <Spinner />}

        {items !== null && items.length === 0 && (
          <EmptyState message={tab === 'all' && !q ? 'No reviews found.' : 'No reviews match these filters.'} />
        )}

        {items !== null && items.length > 0 && (
          <div className="overflow-x-auto bg-white border border-[#E5F1E2] rounded-2xl shadow-[0_1px_3px_rgba(38,71,43,0.04)]">
            <table className="min-w-full text-sm font-open-sauce">
              <thead className="bg-[#F2F9F1] text-[#26472B]">
                <tr>
                  {['User', 'Rating', 'Comment', 'Booking ID', 'Date', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left font-open-sauce-semibold text-[12px] uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF5EC]">
                {items.map((rev) => {
                  const isExpanded = expanded[rev._id];
                  const comment = rev.comment || '';
                  const truncated = comment.length > 100 ? comment.slice(0, 100) + '…' : comment;
                  const isRejecting = rejectingId === rev._id;

                  return (
                    <tr key={rev._id} className="hover:bg-[#F7FBF6] transition-colors">
                      {/* User */}
                      <td className="px-4 py-3.5 align-top text-[#484848] whitespace-nowrap">
                        <div className="font-open-sauce-semibold text-[#26472B]">{rev.userName || '—'}</div>
                        <div className="text-[11px] text-[#909090] font-mono mt-0.5">{String(rev.userId || '').slice(-8)}</div>
                      </td>

                      {/* Rating */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <StarRating rating={rev.rating} />
                        <div className="text-[11px] text-[#909090] mt-0.5">{rev.rating}/5</div>
                      </td>

                      {/* Comment */}
                      <td className="px-4 py-3.5 align-top max-w-[260px]">
                        <p className="text-[#484848] leading-relaxed">
                          {isExpanded ? comment : truncated}
                        </p>
                        {comment.length > 100 && (
                          <button
                            onClick={() => toggleExpand(rev._id)}
                            className="text-[#45A735] text-xs font-open-sauce-semibold mt-1 cursor-pointer hover:underline"
                          >
                            {isExpanded ? 'Show less' : 'Read more'}
                          </button>
                        )}
                      </td>

                      {/* Booking ID */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <code className="text-xs text-[#909090] font-mono">{String(rev.bookingId || '').slice(-10)}</code>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap text-[#636363] text-xs">
                        {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <ReviewStatusBadge status={rev.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        {rev.status === 'pending' ? (
                          <div className="flex flex-col gap-2 min-w-[160px]">
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                variant="primary"
                                disabled={!!busy[rev._id]}
                                onClick={() => moderate(rev._id, 'approved')}
                              >
                                {busy[rev._id] === 'approved' ? '…' : 'Approve'}
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={!!busy[rev._id]}
                                onClick={() => {
                                  if (isRejecting) {
                                    setRejectingId(null);
                                    setRejectNote('');
                                  } else {
                                    setRejectingId(rev._id);
                                    setRejectNote('');
                                  }
                                }}
                              >
                                Reject
                              </Button>
                            </div>

                            {isRejecting && (
                              <div className="flex flex-col gap-1.5 mt-1">
                                <input
                                  type="text"
                                  value={rejectNote}
                                  onChange={(e) => setRejectNote(e.target.value)}
                                  placeholder="Rejection note (optional)"
                                  className="w-full px-2.5 py-1.5 border border-[#D6EBCF] rounded-lg text-xs font-open-sauce text-[#242424] focus:outline-none focus:ring-2 focus:ring-[#45A735]/40 focus:border-[#45A735]"
                                />
                                <Button
                                  size="sm"
                                  variant="danger"
                                  disabled={busy[rev._id] === 'rejected'}
                                  onClick={() => moderate(rev._id, 'rejected', rejectNote)}
                                >
                                  {busy[rev._id] === 'rejected' ? '…' : 'Confirm Reject'}
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[#909090] italic">No actions</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {items !== null && items.length > 0 && (
          <Pagination page={page} total={meta.total || 0} pageSize={PAGE_SIZE} onChange={setPage} />
        )}
      </div>
    </div>
  );
}
