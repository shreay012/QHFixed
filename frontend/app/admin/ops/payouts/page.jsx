// /frontend/app/admin/ops/payouts/page.jsx
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

const STATUS_TABS = ['All', 'pending', 'processed', 'failed'];

// ── Status badge ──────────────────────────────────────────────────────────────
function PayoutStatusBadge({ status }) {
  const map = {
    pending: 'bg-amber-50 text-amber-700 ring-amber-200',
    processed: 'bg-[#F2F9F1] text-[#26472B] ring-[#D6EBCF]',
    failed: 'bg-red-50 text-red-700 ring-red-200',
  };
  const cls = map[status] || 'bg-[#F5F7F5] text-[#484848] ring-[#E5E7EB]';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-open-sauce-semibold ring-1 ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status || '—'}
    </span>
  );
}

// ── Compute Payout Modal ──────────────────────────────────────────────────────
function ComputePayoutModal({ onClose, onComputed }) {
  const [staff, setStaff] = useState([]);
  const [staffId, setStaffId] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [commissionPct, setCommissionPct] = useState(20);
  const [loading, setLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(true);

  useEffect(() => {
    Promise.all([
      staffApi.get('/admin/pms-list').catch(() => ({ data: { data: [] } })),
      staffApi.get('/admin/resources-list').catch(() => ({ data: { data: [] } })),
    ]).then(([pmRes, resRes]) => {
      const pms = (pmRes.data?.data || pmRes.data || []).map((p) => ({ ...p, role: 'pm' }));
      const reses = (resRes.data?.data || resRes.data || []).map((r) => ({ ...r, role: 'resource' }));
      setStaff([...pms, ...reses]);
    }).finally(() => setLoadingStaff(false));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!staffId) { showError('Select a staff member.'); return; }
    setLoading(true);
    try {
      await staffApi.post('/admin-ops/payouts/compute', {
        staffId,
        cycleStart: new Date(from).toISOString(),
        cycleEnd: new Date(to + 'T23:59:59').toISOString(),
        commissionPct: Number(commissionPct),
      });
      showSuccess('Payout computed.');
      onComputed();
    } catch (err) {
      showError(err?.response?.data?.error?.message || 'Failed to compute payout.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl border border-[#E5F1E2] shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-open-sauce-bold text-[#26472B]">Compute Payout</h2>
          <button onClick={onClose} className="text-[#909090] hover:text-[#484848] cursor-pointer text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-open-sauce-semibold text-[#26472B] mb-1.5">Staff member</label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              disabled={loadingStaff}
              className="w-full border border-[#E5F1E2] rounded-lg px-3 py-2 text-sm font-open-sauce focus:ring-2 focus:ring-[#45A735]/30 focus:border-[#45A735] focus:outline-none"
              required
            >
              <option value="">{loadingStaff ? 'Loading…' : 'Select…'}</option>
              {staff.map((p) => (
                <option key={p._id} value={p._id}>
                  [{p.role.toUpperCase()}] {p.name || p.mobile || String(p._id).slice(-6)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-open-sauce-semibold text-[#26472B] mb-1.5">From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required
                className="w-full border border-[#E5F1E2] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#45A735]/30 focus:border-[#45A735] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-open-sauce-semibold text-[#26472B] mb-1.5">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} required
                className="w-full border border-[#E5F1E2] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#45A735]/30 focus:border-[#45A735] focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-open-sauce-semibold text-[#26472B] mb-1.5">Commission %</label>
            <input type="number" min="0" max="100" step="0.5" value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
              className="w-full border border-[#E5F1E2] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#45A735]/30 focus:border-[#45A735] focus:outline-none" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" variant="primary" disabled={loading} className="flex-1">
              {loading ? 'Computing…' : 'Compute'}
            </Button>
            <Button type="button" variant="subtle" onClick={onClose} disabled={loading}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Reconciliation Modal ──────────────────────────────────────────────────────
function ReconciliationModal({ onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    setData(null);
    try {
      const r = await staffApi.get('/admin-ops/payouts/reconciliation', { params: { from, to } });
      setData(r.data?.data || r.data);
    } catch (err) {
      showError(err?.response?.data?.error?.message || 'Failed to fetch reconciliation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl border border-[#E5F1E2] shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-open-sauce-bold text-[#26472B]">Payout Reconciliation</h2>
          <button onClick={onClose} className="text-[#909090] hover:text-[#484848] cursor-pointer text-xl leading-none">&times;</button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-open-sauce-semibold text-[#26472B] mb-1.5">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="w-full border border-[#E5F1E2] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#45A735]/30 focus:border-[#45A735] focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-open-sauce-semibold text-[#26472B] mb-1.5">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="w-full border border-[#E5F1E2] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#45A735]/30 focus:border-[#45A735] focus:outline-none" />
          </div>
        </div>
        <Button onClick={fetchReport} variant="primary" disabled={loading} className="w-full mb-4">
          {loading ? 'Generating…' : 'Run Report'}
        </Button>
        {data && (
          <div className="bg-[#F7FBF6] border border-[#E5F1E2] rounded-lg p-4 space-y-2 max-h-72 overflow-auto">
            <pre className="text-xs text-[#484848] font-mono whitespace-pre-wrap break-words">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
        <div className="flex justify-end mt-4">
          <Button variant="subtle" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

// ── Mark Processed Modal ──────────────────────────────────────────────────────
function MarkProcessedModal({ payout, onClose, onProcessed }) {
  const [utr, setUtr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!utr.trim()) {
      showError('UTR reference is required.');
      return;
    }
    setLoading(true);
    try {
      await staffApi.patch(`/admin-ops/payouts/${payout._id}/process`, {
        txnRef: utr.trim(),
      });
      showSuccess('Payout marked as processed.');
      onProcessed();
    } catch (err) {
      showError(err?.response?.data?.error?.message || 'Failed to process payout.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl border border-[#E5F1E2] shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-open-sauce-bold text-[#26472B]">Mark Payout as Processed</h2>
          <button onClick={onClose} className="text-[#909090] hover:text-[#484848] transition-colors cursor-pointer text-xl leading-none">&times;</button>
        </div>

        {/* Payout summary */}
        <div className="mb-5 p-3 rounded-lg bg-[#F2F9F1] border border-[#E5F1E2] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#636363] font-open-sauce-semibold uppercase tracking-wider">Resource</span>
            <span className="text-sm font-open-sauce-semibold text-[#26472B]">{payout.resourceName || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#636363] font-open-sauce-semibold uppercase tracking-wider">Amount</span>
            <span className="text-sm font-open-sauce-semibold text-[#45A735]">{formatAmount(payout.amount, payout.currency)}</span>
          </div>
          {payout.period && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#636363] font-open-sauce-semibold uppercase tracking-wider">Period</span>
              <span className="text-sm font-open-sauce text-[#484848]">{payout.period}</span>
            </div>
          )}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-open-sauce-semibold text-[#636363] uppercase tracking-wider mb-1.5">
              UTR Reference Number
            </label>
            <input
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="e.g. UTR123456789012"
              className="w-full border border-[#D6EBCF] rounded-lg px-3 py-2 text-sm font-open-sauce text-[#484848] focus:outline-none focus:ring-2 focus:ring-[#45A735]/40 focus:border-[#45A735] font-mono tracking-wide"
            />
            <p className="mt-1 text-[11px] text-[#909090] font-open-sauce">
              Enter the UTR / transaction reference from your payment gateway.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Processing…' : 'Confirm & Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminOpsPayoutsPage() {
  const [items, setItems] = useState(null);
  const [meta, setMeta]   = useState({ total: 0, totalPages: 1 });
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('All');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [processing, setProcessing] = useState(null); // payout being acted on
  const [showCompute, setShowCompute] = useState(false);
  const [showRecon, setShowRecon] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(PAGE_SIZE));
    if (tab !== 'All') params.set('status', tab);
    if (q.trim()) params.set('q', q.trim());
    return params.toString();
  }, [page, tab, q]);

  const load = useCallback(() => {
    staffApi.get(`/admin-ops/payouts?${queryString}`)
      .then((r) => {
        setItems(r.data?.data || []);
        setMeta(r.data?.meta || { total: 0, totalPages: 1 });
        setError(null);
      })
      .catch((err) => setError(err?.response?.data?.error?.message || 'Failed to load payouts'));
  }, [queryString]);

  useEffect(() => { load(); }, [load]);

  // Stats: pulled from dedicated tiny queries so they reflect the full
  // queue (not just the current filter/page). Same trick as refunds.
  const [stats, setStats] = useState({ pendingAmount: 0, processedCount: 0, thisMonthAmount: 0 });
  useEffect(() => {
    let alive = true;
    const currentMonth = new Date().getMonth();
    const currentYear  = new Date().getFullYear();
    Promise.all([
      // Pull up to 100 pending payouts so we can sum amount; bounded.
      staffApi.get('/admin-ops/payouts?status=pending&pageSize=100').catch(() => null),
      staffApi.get('/admin-ops/payouts?status=processed&pageSize=100').catch(() => null),
    ]).then(([pending, processed]) => {
      if (!alive) return;
      const pendList   = pending?.data?.data   || [];
      const procList   = processed?.data?.data || [];
      const pendingAmount = pendList.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const thisMonthAmount = procList
        .filter((p) => {
          const d = p.processedAt ? new Date(p.processedAt) : null;
          return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((s, p) => s + (Number(p.amount) || 0), 0);
      setStats({
        pendingAmount,
        processedCount: processed?.data?.meta?.total ?? procList.length,
        thisMonthAmount,
      });
    });
    return () => { alive = false; };
  }, []);

  const updateTab = (t) => { setTab(t); setPage(1); };
  const updateQ   = (v) => { setQ(v);   setPage(1); };

  const cols = [
    {
      key: 'resourceName',
      label: 'Resource',
      render: (p) => (
        <div>
          <div className="font-open-sauce-semibold text-[#26472B] text-sm">{p.resourceName || '—'}</div>
          {p.resourceId && (
            <div className="text-[11px] text-[#909090] font-mono mt-0.5">{String(p.resourceId).slice(-8)}</div>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (p) => (
        <span className="font-open-sauce-semibold text-[#26472B]">
          {formatAmount(p.amount, p.currency)}
        </span>
      ),
    },
    {
      key: 'period',
      label: 'Period',
      render: (p) => (
        <span className="text-sm text-[#484848] font-open-sauce">
          {p.period || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (p) => <PayoutStatusBadge status={p.status} />,
    },
    {
      key: 'processedAt',
      label: 'Processed Date',
      render: (p) => p.processedAt
        ? new Date(p.processedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : <span className="text-[#909090]">—</span>,
    },
    {
      key: 'utr',
      label: 'UTR Ref',
      render: (p) => p.utr
        ? <code className="text-xs font-mono text-[#45A735] bg-[#F2F9F1] px-1.5 py-0.5 rounded">{p.utr}</code>
        : <span className="text-[#909090]">—</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (p) => {
        if (p.status !== 'pending') {
          return (
            <span className="text-xs text-[#909090] font-open-sauce italic">
              {p.status === 'processed' ? 'Settled' : 'No action'}
            </span>
          );
        }
        return (
          <Button
            size="sm"
            variant="primary"
            onClick={() => setProcessing(p)}
          >
            Mark Processed
          </Button>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7FBF6]">
      <PageHeader
        title="Payouts"
        subtitle="Manage resource and PM payouts"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={() => setShowCompute(true)}>+ Compute Payout</Button>
            <Button variant="subtle" size="sm" onClick={() => setShowRecon(true)}>📊 Reconciliation</Button>
          </div>
        }
      />

      <div className="p-4 sm:p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Pending"
            value={formatAmount(stats.pendingAmount, 'INR')}
            hint="Sum of pending payouts"
            color="orange"
          />
          <StatCard
            label="Total Processed"
            value={stats.processedCount}
            hint="Payouts marked settled"
            color="green"
          />
          <StatCard
            label="This Month"
            value={formatAmount(stats.thisMonthAmount, 'INR')}
            hint="Processed in current month"
            color="slate"
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
            <SearchInput value={q} onChange={updateQ} placeholder="Search by staff name, mobile, or staff ID" />
          </div>
          <div className="text-xs text-[#909090]">
            {meta.total != null && `${meta.total} payout${meta.total === 1 ? '' : 's'}`}
          </div>
        </div>

        {/* Table */}
        {items === null && !error && <Spinner />}
        {items !== null && (
          items.length === 0
            ? <EmptyState message={tab === 'All' && !q ? 'No payouts found.' : 'No payouts match these filters.'} />
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
                      {items.map((p) => (
                        <tr key={p._id} className="hover:bg-[#F7FBF6] transition-colors">
                          {cols.map((c) => (
                            <td key={c.key} className="px-4 py-3.5 align-top text-[#484848]">
                              {c.render ? c.render(p) : p[c.key] ?? '—'}
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

      {/* Mark Processed Modal */}
      {processing && (
        <MarkProcessedModal
          payout={processing}
          onClose={() => setProcessing(null)}
          onProcessed={() => { setProcessing(null); load(); }}
        />
      )}

      {/* Compute Payout Modal */}
      {showCompute && (
        <ComputePayoutModal
          onClose={() => setShowCompute(false)}
          onComputed={() => { setShowCompute(false); load(); }}
        />
      )}

      {/* Reconciliation Modal */}
      {showRecon && <ReconciliationModal onClose={() => setShowRecon(false)} />}
    </div>
  );
}
