// /frontend/app/admin/ops/refunds/page.jsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import staffApi from '@/lib/axios/staffApi';
import {
  PageHeader,
  Spinner,
  ErrorBox,
  EmptyState,
  Button,
  StatCard,
  Pagination,
  SearchInput,
} from '@/components/staff/ui';
import { showSuccess, showError } from '@/lib/utils/toast';

const PAGE_SIZE = 20;

const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  AED: 'د.إ',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  SGD: 'S$',
};

function formatAmount(amount, currency) {
  const symbol = CURRENCY_SYMBOLS[currency] || (currency ? currency + ' ' : '');
  return `${symbol}${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

const STATUS_TABS = ['All', 'pending', 'approved', 'rejected'];

// ── Create Refund Modal ──────────────────────────────────────────────────────
function CreateRefundModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ bookingId: '', amount: '', reason: '' });
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.bookingId.trim() || !form.amount || !form.reason.trim()) {
      showError('All fields are required.');
      return;
    }
    setLoading(true);
    try {
      await staffApi.post('/admin-ops/refunds', {
        bookingId: form.bookingId.trim(),
        amount: Number(form.amount),
        reason: form.reason.trim(),
      });
      showSuccess('Refund request created.');
      onCreated();
    } catch (err) {
      showError(err?.response?.data?.error?.message || 'Failed to create refund.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl border border-[#E5F1E2] shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-open-sauce-bold text-[#26472B]">Create Refund Request</h2>
          <button onClick={onClose} className="text-[#909090] hover:text-[#484848] transition-colors cursor-pointer text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-open-sauce-semibold text-[#636363] uppercase tracking-wider mb-1.5">
              Booking ID
            </label>
            <input
              name="bookingId"
              value={form.bookingId}
              onChange={handle}
              placeholder="e.g. BK-00123"
              className="w-full border border-[#D6EBCF] rounded-lg px-3 py-2 text-sm font-open-sauce text-[#484848] focus:outline-none focus:ring-2 focus:ring-[#45A735]/40 focus:border-[#45A735]"
            />
          </div>
          <div>
            <label className="block text-xs font-open-sauce-semibold text-[#636363] uppercase tracking-wider mb-1.5">
              Amount
            </label>
            <input
              name="amount"
              type="number"
              min="1"
              value={form.amount}
              onChange={handle}
              placeholder="e.g. 5000"
              className="w-full border border-[#D6EBCF] rounded-lg px-3 py-2 text-sm font-open-sauce text-[#484848] focus:outline-none focus:ring-2 focus:ring-[#45A735]/40 focus:border-[#45A735]"
            />
          </div>
          <div>
            <label className="block text-xs font-open-sauce-semibold text-[#636363] uppercase tracking-wider mb-1.5">
              Reason
            </label>
            <textarea
              name="reason"
              value={form.reason}
              onChange={handle}
              rows={3}
              placeholder="Describe the reason for this refund…"
              className="w-full border border-[#D6EBCF] rounded-lg px-3 py-2 text-sm font-open-sauce text-[#484848] focus:outline-none focus:ring-2 focus:ring-[#45A735]/40 focus:border-[#45A735] resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create Refund'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Review Modal ─────────────────────────────────────────────────────────────
function ReviewModal({ refund, action, onClose, onReviewed }) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await staffApi.patch(`/admin-ops/refunds/${refund._id}/review`, {
        status: action,
        note: note.trim(),
      });
      showSuccess(`Refund ${action === 'approved' ? 'approved' : 'rejected'} successfully.`);
      onReviewed();
    } catch (err) {
      showError(err?.response?.data?.error?.message || 'Review action failed.');
    } finally {
      setLoading(false);
    }
  };

  const isApprove = action === 'approved';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl border border-[#E5F1E2] shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-open-sauce-bold ${isApprove ? 'text-[#26472B]' : 'text-red-700'}`}>
            {isApprove ? 'Approve Refund' : 'Reject Refund'}
          </h2>
          <button onClick={onClose} className="text-[#909090] hover:text-[#484848] transition-colors cursor-pointer text-xl leading-none">&times;</button>
        </div>
        <div className="mb-4 p-3 rounded-lg bg-[#F2F9F1] border border-[#E5F1E2]">
          <p className="text-xs text-[#636363] font-open-sauce-semibold uppercase tracking-wider mb-1">Booking</p>
          <p className="text-sm font-open-sauce text-[#484848]">{refund.bookingId}</p>
          <p className="text-xs text-[#636363] font-open-sauce mt-1">{refund.userName} · {formatAmount(refund.amount, refund.currency)}</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-open-sauce-semibold text-[#636363] uppercase tracking-wider mb-1.5">
              Review Note <span className="normal-case font-open-sauce text-[#909090]">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add an internal note…"
              className="w-full border border-[#D6EBCF] rounded-lg px-3 py-2 text-sm font-open-sauce text-[#484848] focus:outline-none focus:ring-2 focus:ring-[#45A735]/40 focus:border-[#45A735] resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={isApprove ? 'primary' : 'danger'}
              disabled={loading}
            >
              {loading ? 'Submitting…' : (isApprove ? 'Confirm Approve' : 'Confirm Reject')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Status badge with extended statuses ─────────────────────────────────────
function RefundStatusBadge({ status }) {
  const map = {
    pending: 'bg-amber-50 text-amber-700 ring-amber-200',
    approved: 'bg-[#F2F9F1] text-[#26472B] ring-[#D6EBCF]',
    rejected: 'bg-red-50 text-red-700 ring-red-200',
  };
  const cls = map[status] || 'bg-[#F5F7F5] text-[#484848] ring-[#E5E7EB]';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-open-sauce-semibold ring-1 ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status || '—'}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminOpsRefundsPage() {
  const [items, setItems] = useState(null);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [stats, setStats] = useState({ pending: 0, approvedAmount: 0, rejected: 0 });
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('All');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [review, setReview] = useState(null); // { refund, action }

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(PAGE_SIZE));
    if (tab !== 'All') params.set('status', tab);
    if (q.trim()) params.set('q', q.trim());
    return params.toString();
  }, [page, tab, q]);

  const load = useCallback(() => {
    staffApi.get(`/admin-ops/refunds?${queryString}`)
      .then((r) => {
        setItems(r.data?.data || []);
        setMeta(r.data?.meta || { total: 0, totalPages: 1 });
        setError(null);
      })
      .catch((err) => {
        setError(err?.response?.data?.error?.message || 'Failed to load refunds');
        setItems([]);
      });
  }, [queryString]);

  useEffect(() => { load(); }, [load]);

  // Stats are pulled separately so they reflect the FULL queue regardless
  // of the current filter/page. We hit the same endpoint with a
  // per-status filter and a tiny pageSize — only the meta.total field is
  // needed, so this is cheap.
  useEffect(() => {
    let alive = true;
    Promise.all([
      staffApi.get('/admin-ops/refunds?status=pending&pageSize=1').catch(() => null),
      staffApi.get('/admin-ops/refunds?status=approved&pageSize=100').catch(() => null),
      staffApi.get('/admin-ops/refunds?status=rejected&pageSize=1').catch(() => null),
    ]).then(([pending, approved, rejected]) => {
      if (!alive) return;
      const approvedAmt = (approved?.data?.data || [])
        .reduce((s, r) => s + (Number(r.amount) || 0), 0);
      setStats({
        pending:        pending?.data?.meta?.total ?? 0,
        approvedAmount: approvedAmt,
        rejected:       rejected?.data?.meta?.total ?? 0,
      });
    });
    return () => { alive = false; };
  }, []);

  // Inline setters reset the page back to 1 so a new search/tab change
  // doesn't strand the user on an empty page beyond the result range.
  const updateTab = (t) => { setTab(t); setPage(1); };
  const updateQ   = (v) => { setQ(v);   setPage(1); };

  const cols = [
    {
      key: 'bookingId',
      label: 'Booking ID',
      render: (r) => (
        <code className="text-xs font-mono text-[#909090] bg-[#F5F7F5] px-1.5 py-0.5 rounded">
          {r.bookingId || '—'}
        </code>
      ),
    },
    {
      key: 'userName',
      label: 'User',
      render: (r) => (
        <div>
          <div className="font-open-sauce-semibold text-[#26472B] text-sm">{r.userName || '—'}</div>
          {r.userId && (
            <div className="text-[11px] text-[#909090] font-mono mt-0.5">{String(r.userId).slice(-8)}</div>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (r) => (
        <span className="font-open-sauce-semibold text-[#26472B]">
          {formatAmount(r.amount, r.currency)}
        </span>
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (r) => (
        <span className="text-sm text-[#484848] line-clamp-2 max-w-[200px]">
          {r.reason || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <RefundStatusBadge status={r.status} />,
    },
    {
      key: 'requestedAt',
      label: 'Requested',
      render: (r) => r.requestedAt
        ? new Date(r.requestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => {
        if (r.status !== 'pending') {
          return (
            <span className="text-xs text-[#909090] font-open-sauce italic">
              {r.reviewedAt
                ? `Reviewed ${new Date(r.reviewedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
                : 'No action'}
            </span>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => setReview({ refund: r, action: 'approved' })}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => setReview({ refund: r, action: 'rejected' })}
            >
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7FBF6]">
      <PageHeader
        title="Refunds"
        subtitle="Review and process refund requests"
        action={
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            + Create Refund
          </Button>
        }
      />

      <div className="p-4 sm:p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Pending"
            value={stats.pending}
            hint="Awaiting review"
            color="orange"
          />
          <StatCard
            label="Total Approved"
            value={formatAmount(stats.approvedAmount, 'INR')}
            hint="Sum of approved refunds"
            color="green"
          />
          <StatCard
            label="Total Rejected"
            value={stats.rejected}
            hint="Declined requests"
            color="red"
          />
        </div>

        {/* Error */}
        <ErrorBox error={error} />

        {/* Filter Tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-[#E5F1E2] rounded-xl p-1 w-fit">
            {STATUS_TABS.map((t) => (
              <button
                key={t}
                onClick={() => updateTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-open-sauce-semibold transition-all duration-150 cursor-pointer ${
                  tab === t
                    ? 'bg-[#45A735] text-white shadow-sm'
                    : 'text-[#636363] hover:text-[#26472B] hover:bg-[#F2F9F1]'
                }`}
              >
                {t === 'All' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex-1 sm:max-w-md">
            <SearchInput value={q} onChange={updateQ} placeholder="Search by booking ID, payment ID, reason, notes" />
          </div>
          <div className="text-xs text-[#909090]">
            {meta.total != null && `${meta.total} refund${meta.total === 1 ? '' : 's'}`}
          </div>
        </div>

        {/* Table */}
        {items === null && !error && <Spinner />}
        {items !== null && (
          items.length === 0
            ? <EmptyState message={tab === 'All' && !q ? 'No refund requests found.' : 'No refunds match these filters.'} />
            : (
              <>
                <div className="overflow-x-auto bg-white border border-[#E5F1E2] rounded-2xl shadow-[0_1px_3px_rgba(38,71,43,0.04)]">
                  <table className="min-w-full text-sm font-open-sauce">
                    <thead className="bg-[#F2F9F1] text-[#26472B]">
                      <tr>
                        {cols.map((c) => (
                          <th
                            key={c.key}
                            className="text-left font-open-sauce-semibold text-[12px] uppercase tracking-wider px-4 py-3 whitespace-nowrap"
                          >
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEF5EC]">
                      {items.map((r) => (
                        <tr key={r._id} className="hover:bg-[#F7FBF6] transition-colors">
                          {cols.map((c) => (
                            <td key={c.key} className="px-4 py-3.5 align-top text-[#484848]">
                              {c.render ? c.render(r) : r[c.key] ?? '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={page} total={meta.total || 0} pageSize={PAGE_SIZE} onChange={setPage} />
              </>
            )
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateRefundModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
      {review && (
        <ReviewModal
          refund={review.refund}
          action={review.action}
          onClose={() => setReview(null)}
          onReviewed={() => { setReview(null); load(); }}
        />
      )}
    </div>
  );
}
