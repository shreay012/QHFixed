// /frontend/app/admin/payments/page.jsx
//
// Admin payments / transactions explorer.
//
// Lists every payment row from the `payments` collection with filters
// (status, country, currency, gateway, date range, free-text search),
// per-currency revenue stat cards, and a detail drawer that surfaces the
// hydrated customer + job context plus the full invoice breakdown stored
// at order-create time.
//
// Backend contract: GET /admin/payments + /admin/payments/stats +
// /admin/payments/:id (admin.routes.js, PERMS.PAYMENT_READ).

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import staffApi from '@/lib/axios/staffApi';
import {
  PageHeader,
  Spinner,
  ErrorBox,
  EmptyState,
  Table,
  Button,
  StatCard,
  StatusBadge,
  Input,
  Select,
  Pagination,
  SearchInput,
  SectionCard,
  InfoRow,
  Modal,
} from '@/components/staff/ui';
import { showError } from '@/lib/utils/toast';

const CURRENCY_SYMBOLS = {
  INR: '₹', USD: '$', AED: 'د.إ', EUR: '€', GBP: '£', AUD: 'A$', SGD: 'S$', CAD: 'C$', SAR: 'SR',
};

const STATUS_OPTIONS = ['', 'created', 'paid', 'failed', 'refunded', 'cancelled'];
const COUNTRY_OPTIONS = ['', 'IN', 'AE', 'DE', 'US', 'AU', 'GB', 'SA', 'SG'];
const CURRENCY_OPTIONS = ['', 'INR', 'AED', 'EUR', 'USD', 'AUD', 'GBP', 'SGD', 'SAR'];
const GATEWAY_OPTIONS = ['', 'razorpay', 'stripe', 'mock'];

function fmtMoney(amount, currency) {
  const symbol = CURRENCY_SYMBOLS[currency] || (currency ? currency + ' ' : '');
  return `${symbol}${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
}

// Map backend status → StatusBadge tone
function badgeStatus(s) {
  const map = {
    paid:      'completed',
    created:   'pending',
    failed:    'rejected',
    refunded:  'cancelled',
    cancelled: 'cancelled',
  };
  return map[s] || s || 'pending';
}

// ── Detail drawer ────────────────────────────────────────────────────────────
function PaymentDetailModal({ paymentId, onClose }) {
  const [data, setData] = useState(null);
  const [err,  setErr]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paymentId) return;
    let alive = true;
    staffApi.get(`/admin/payments/${paymentId}`)
      .then((r) => {
        if (!alive) return;
        setData(r.data?.data || null);
        setErr(null);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.response?.data?.error?.message || 'Failed to load payment');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [paymentId]);

  return (
    <Modal
      open={!!paymentId}
      onClose={onClose}
      title="Payment Detail"
      subtitle={data ? `${data.provider || 'gateway'} · ${data.country || '—'}` : ''}
      size="lg"
    >
      {loading && <Spinner />}
      {err && <ErrorBox error={err} />}
      {data && !loading && (
        <div className="space-y-5">
          <SectionCard title="Transaction">
            <InfoRow label="Status"            value={<StatusBadge status={badgeStatus(data.status)} />} />
            <InfoRow label="Amount"            value={fmtMoney(data.amount, data.currency)} />
            <InfoRow label="Gateway"           value={data.provider || '—'} />
            <InfoRow label="Mock"              value={data.mock ? 'Yes' : 'No'} />
            <InfoRow label="Order ID"          value={data.orderId   || '—'} mono copy />
            <InfoRow label="Payment ID"        value={data.paymentId || '—'} mono copy />
            <InfoRow label="Country"           value={data.country   || '—'} />
            <InfoRow label="Created"           value={fmtDate(data.createdAt)} />
            <InfoRow label="Updated"           value={fmtDate(data.updatedAt)} />
          </SectionCard>

          <SectionCard title="Customer">
            <InfoRow label="Name"   value={data.customerName   || '—'} />
            <InfoRow label="Mobile" value={data.customerMobile || '—'} mono copy />
            <InfoRow label="Email"  value={data.customerEmail  || '—'} mono copy />
            <InfoRow label="User ID" value={String(data.userId || '—')} mono copy />
          </SectionCard>

          <SectionCard title="Job / Booking">
            <InfoRow label="Job ID"     value={String(data.jobId || '—')} mono copy />
            <InfoRow label="Job Title"  value={data.jobTitle  || '—'} />
            <InfoRow label="Job Status" value={data.jobStatus || '—'} />
            <InfoRow label="Booking ID" value={String(data.bookingId || '—')} mono copy />
          </SectionCard>

          {data.invoice && (
            <SectionCard title="Invoice Breakdown">
              <InfoRow label="Subtotal" value={fmtMoney(data.invoice.subtotal,    data.currency)} />
              {data.invoice.tax && (
                <InfoRow
                  label={`${data.invoice.tax.name || 'Tax'} (${((data.invoice.tax.rate || 0) * 100).toFixed(0)}%)`}
                  value={fmtMoney(data.invoice.tax.amount, data.currency)}
                />
              )}
              {data.invoice.discount > 0 && (
                <InfoRow label="Discount" value={`-${fmtMoney(data.invoice.discount, data.currency)}`} />
              )}
              <InfoRow label="Total" value={fmtMoney(data.invoice.total || data.amount, data.currency)} />
              {data.invoice.url && (
                <InfoRow label="Invoice PDF" value={
                  <a href={data.invoice.url} target="_blank" rel="noreferrer" className="text-[#45A735] hover:underline">Open</a>
                } />
              )}
            </SectionCard>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminPaymentsPage() {
  const [filters, setFilters] = useState({
    status: '', country: '', currency: '', gateway: '',
    q: '', from: '', to: '',
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [rows, setRows]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [openId, setOpenId]   = useState(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    return params.toString();
  }, [filters, page]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [list, kpi] = await Promise.all([
        staffApi.get(`/admin/payments?${queryString}`),
        staffApi.get('/admin/payments/stats'),
      ]);
      setRows(list.data?.data?.payments || []);
      setTotal(list.data?.data?.total   || 0);
      setStats(kpi.data?.data || null);
    } catch (e) {
      const msg = e?.response?.data?.error?.message || 'Failed to load payments';
      setError(msg); showError(msg);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key, val) => { setFilters((p) => ({ ...p, [key]: val })); setPage(1); };
  const resetFilters = () => {
    setFilters({ status: '', country: '', currency: '', gateway: '', q: '', from: '', to: '' });
    setPage(1);
  };

  const columns = [
    { key: 'createdAt',   label: 'Date',     render: (r) => <span className="text-xs text-[#636363]">{fmtDate(r.createdAt)}</span> },
    { key: 'paymentId',   label: 'Txn',      render: (r) => (
        <button
          onClick={() => setOpenId(r._id)}
          className="font-mono text-xs text-[#26472B] hover:text-[#45A735] hover:underline cursor-pointer"
        >
          {r.paymentId || r.orderId || String(r._id).slice(-8)}
        </button>
      ),
    },
    { key: 'customerName', label: 'Customer', render: (r) => (
        <div className="flex flex-col">
          <span className="text-sm text-[#26472B]">{r.customerName || '—'}</span>
          <span className="text-xs text-[#909090]">{r.customerMobile || r.customerEmail || ''}</span>
        </div>
      ),
    },
    { key: 'amount',      label: 'Amount',   render: (r) => (
        <span className="font-semibold text-[#26472B]">{fmtMoney(r.amount, r.currency)}</span>
      ),
    },
    { key: 'country',  label: 'Country',  render: (r) => <span className="text-xs">{r.country || '—'}</span> },
    { key: 'provider', label: 'Gateway',  render: (r) => (
        <span className="text-xs uppercase tracking-wider text-[#636363]">{r.provider || '—'}{r.mock ? ' · mock' : ''}</span>
      ),
    },
    { key: 'status',   label: 'Status',   render: (r) => <StatusBadge status={badgeStatus(r.status)} /> },
    { key: 'actions',  label: '',         render: (r) => (
        <Button variant="ghost" size="sm" onClick={() => setOpenId(r._id)}>View</Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        subtitle="Every transaction across countries, currencies, and gateways"
        helpText="Click a transaction ID to see customer, job, and full invoice breakdown. KPIs are grouped by currency so you never mix INR with EUR totals."
      />

      {/* KPIs — one stat card per active currency */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(stats?.paidByCurrency || []).map((c) => (
          <StatCard
            key={c.currency}
            label={`Paid (${c.currency})`}
            value={fmtMoney(c.total, c.currency)}
            hint={`${c.count} transactions`}
          />
        ))}
        {stats && (stats.paidByCurrency || []).length === 0 && (
          <StatCard label="Paid" value="—" hint="No paid transactions yet" />
        )}
        {stats?.mockPayments > 0 && (
          <StatCard
            label="Mock Payments"
            value={String(stats.mockPayments)}
            hint="Dev / sandbox transactions"
            color="amber"
          />
        )}
      </div>

      {/* Filters */}
      <SectionCard
        title="Filters"
        description="Narrow by status, country, currency, gateway, or date range. Search matches payment / order IDs and partial Razorpay/Stripe IDs."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SearchInput
            value={filters.q}
            onChange={(v) => setFilter('q', v)}
            placeholder="Search payment / order ID"
          />
          <Select label="Status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            {STATUS_OPTIONS.map((s) => <option key={s || 'all'} value={s}>{s ? s : 'All statuses'}</option>)}
          </Select>
          <Select label="Country" value={filters.country} onChange={(e) => setFilter('country', e.target.value)}>
            {COUNTRY_OPTIONS.map((s) => <option key={s || 'all'} value={s}>{s ? s : 'All countries'}</option>)}
          </Select>
          <Select label="Currency" value={filters.currency} onChange={(e) => setFilter('currency', e.target.value)}>
            {CURRENCY_OPTIONS.map((s) => <option key={s || 'all'} value={s}>{s ? s : 'All currencies'}</option>)}
          </Select>
          <Select label="Gateway" value={filters.gateway} onChange={(e) => setFilter('gateway', e.target.value)}>
            {GATEWAY_OPTIONS.map((s) => <option key={s || 'all'} value={s}>{s ? s : 'All gateways'}</option>)}
          </Select>
          <Input label="From" type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
          <Input label="To"   type="date" value={filters.to}   onChange={(e) => setFilter('to',   e.target.value)} />
          <div className="flex items-end">
            <Button variant="ghost" onClick={resetFilters}>Reset</Button>
          </div>
        </div>

        {/* Applied filter chips — gives the user an at-a-glance view of
            what's narrowing the result set, with one-click chip removal.
            Hides itself when no filters are active. */}
        {(filters.status || filters.country || filters.currency || filters.gateway || filters.from || filters.to || (filters.q && filters.q.trim())) && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[#E5F1E2]">
            <span className="text-[11px] uppercase tracking-wider text-[#909090] font-open-sauce-semibold">Applied:</span>
            {filters.q && filters.q.trim() && (
              <FilterChip label={`Search: "${filters.q.trim()}"`} onRemove={() => setFilter('q', '')} />
            )}
            {filters.status   && <FilterChip label={`Status: ${filters.status}`}     onRemove={() => setFilter('status', '')} />}
            {filters.country  && <FilterChip label={`Country: ${filters.country}`}   onRemove={() => setFilter('country', '')} />}
            {filters.currency && <FilterChip label={`Currency: ${filters.currency}`} onRemove={() => setFilter('currency', '')} />}
            {filters.gateway  && <FilterChip label={`Gateway: ${filters.gateway}`}   onRemove={() => setFilter('gateway', '')} />}
            {filters.from     && <FilterChip label={`From: ${filters.from}`}         onRemove={() => setFilter('from', '')} />}
            {filters.to       && <FilterChip label={`To: ${filters.to}`}             onRemove={() => setFilter('to', '')} />}
          </div>
        )}
      </SectionCard>

      {/* Table */}
      {error && <ErrorBox error={error} />}
      {loading && <Spinner />}
      {!loading && rows.length === 0 && !error && (
        <EmptyState
          title="No payments match these filters"
          description="Try clearing one or more filters, or expanding the date range."
          action={<Button variant="subtle" size="md" onClick={resetFilters}>Reset filters</Button>}
        />
      )}
      {!loading && rows.length > 0 && (
        <>
          <Table columns={columns} rows={rows} keyField="_id" />
          <Pagination
            page={page}
            total={total}
            pageSize={pageSize}
            onChange={setPage}
          />
        </>
      )}

      <PaymentDetailModal key={openId || 'none'} paymentId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

/**
 * FilterChip — removable chip used by the "Applied:" filter strip.
 * Reusable enough to be hoisted into ui.jsx later if other pages
 * adopt the same pattern.
 */
function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F2F9F1] text-[#26472B] text-[11px] font-open-sauce-semibold ring-1 ring-[#D6EBCF]">
      <span className="truncate max-w-[180px]">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="-mr-0.5 ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-[#D6EBCF] transition-colors"
        aria-label={`Remove ${label}`}
      >
        <svg width={9} height={9} viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
        </svg>
      </button>
    </span>
  );
}
