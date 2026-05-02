'use client';
import { showError } from '@/lib/utils/toast';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import staffApi from '@/lib/axios/staffApi';
import { s } from '@/lib/utils/i18nText';
import {
  PageHeader,
  Table,
  StatusBadge,
  Spinner,
  ErrorBox,
  Button,
  SearchInput,
  Select,
  Pagination,
  SectionCard,
  EmptyState,
} from '@/components/staff/ui';

const PAGE_SIZE = 20;
const STATUS_TABS = [
  { key: '',             label: 'All' },
  { key: 'assigned_to_pm', label: 'Assigned' },
  { key: 'in_progress',  label: 'In progress' },
  { key: 'paused',       label: 'Paused' },
  { key: 'completed',    label: 'Completed' },
  { key: 'cancelled',    label: 'Cancelled' },
];

function formatDuration(ms) {
  if (!ms || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function liveWorked(row, tick) {
  const base = row.workedMs || 0;
  if (row.status === 'in_progress' && row.currentSessionStart) {
    return base + (tick - new Date(row.currentSessionStart).getTime());
  }
  return base;
}

export default function PmBookingsPage() {
  const t = useTranslations('pm.bookings');
  const router = useRouter();

  // Filter / pagination state — drives the GET /pm/bookings query string.
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');

  // Data state
  const [items, setItems] = useState(null);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState({});

  // Live ticker state — only ticks while at least one row is in_progress,
  // and only on the rows currently rendered (max PAGE_SIZE), so the cost is
  // bounded regardless of how many bookings the PM owns globally.
  const [tick, setTick] = useState(Date.now());
  const tickRef = useRef(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(PAGE_SIZE));
    if (status) params.set('status', status);
    if (q.trim()) params.set('q', q.trim());
    return params.toString();
  }, [page, status, q]);

  const load = useCallback(() => {
    setError(null);
    staffApi.get(`/pm/bookings?${queryString}`)
      .then((r) => {
        setItems(r.data?.data || []);
        setMeta(r.data?.meta || { total: 0, totalPages: 1 });
      })
      .catch((e) => setError(e?.response?.data?.error?.message || 'Failed to load bookings'));
  }, [queryString]);

  useEffect(() => { load(); }, [load]);

  // Reset page when search / status changes (debounced search resets too).
  useEffect(() => { setPage(1); }, [status, q]);

  // Live tick only while at least one *visible* row is in_progress. With
  // pagination (max PAGE_SIZE rows), this stays cheap even for a PM with
  // thousands of total bookings — the previous unconditional 1s tick over
  // the entire fleet would burn the browser at scale.
  useEffect(() => {
    const hasActive = (items || []).some((j) => j.status === 'in_progress');
    if (!hasActive) return;
    tickRef.current = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(tickRef.current);
  }, [items]);

  const action = async (id, kind) => {
    setBusy((b) => ({ ...b, [id]: kind }));
    try {
      await staffApi.post(`/pm/bookings/${id}/${kind}`, {});
      load();
    } catch (e) {
      showError(e?.response?.data?.error?.message || `Failed to ${kind}`);
    } finally {
      setBusy((b) => ({ ...b, [id]: null }));
    }
  };

  const columns = [
    { key: '_id', label: 'ID', render: (r) => <code className="text-xs text-[#909090] font-mono">{String(r._id).slice(-8)}</code> },
    { key: 'customerName', label: 'Customer', render: (r) => (
      <div>
        <div className="text-sm text-[#26472B] font-open-sauce-semibold">{s(r.customerName) || '—'}</div>
        {r.customerMobile && <div className="text-[11px] text-[#909090]">{r.customerMobile}</div>}
      </div>
    ) },
    { key: 'serviceName', label: 'Service', render: (r) => <span className="text-sm text-[#26472B]">{s(r.serviceName) || '—'}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'time', label: 'Worked', render: (r) => (
      <code className="text-xs font-mono text-[#26472B]">{formatDuration(liveWorked(r, tick))}</code>
    ) },
    {
      key: 'actions', label: 'Actions',
      render: (r) => {
        const b = busy[r._id];
        return (
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="subtle" onClick={() => router.push(`/pm/bookings/${r._id}`)}>
              Open
            </Button>
            {(r.status === 'assigned_to_pm' || r.status === 'paid' || r.status === 'confirmed') && (
              <Button size="sm" variant="primary" onClick={() => action(r._id, 'start')} disabled={!!b}>
                {b === 'start' ? '…' : 'Start'}
              </Button>
            )}
            {r.status === 'in_progress' && (
              <>
                <Button size="sm" variant="subtle" onClick={() => action(r._id, 'stop')} disabled={!!b}>
                  {b === 'stop' ? '…' : 'Stop'}
                </Button>
                <Button size="sm" variant="primary" onClick={() => action(r._id, 'complete')} disabled={!!b}>
                  {b === 'complete' ? '…' : 'Complete'}
                </Button>
              </>
            )}
            {r.status === 'paused' && (
              <>
                <Button size="sm" variant="primary" onClick={() => action(r._id, 'start')} disabled={!!b}>
                  {b === 'start' ? '…' : 'Resume'}
                </Button>
                <Button size="sm" variant="subtle" onClick={() => action(r._id, 'complete')} disabled={!!b}>
                  {b === 'complete' ? '…' : 'Complete'}
                </Button>
              </>
            )}
            {r.status === 'completed' && (
              <span className="text-xs text-[#909090]">Done</span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        helpText="Click any row to open the booking detail. Use the live worked-time column to verify ongoing sessions."
      />
      <div className="p-4 sm:p-8 space-y-4">
        <SectionCard
          title="Filters"
          description="Search across customer, mobile, email, or any part of the booking ID."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Search by customer, mobile, email or booking ID"
            />
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_TABS.map((tab) => (
                <option key={tab.key || 'all'} value={tab.key}>{tab.label}</option>
              ))}
            </Select>
            <div className="flex items-end text-xs text-[#909090]">
              {meta.total != null && `${meta.total} booking${meta.total === 1 ? '' : 's'} match`}
            </div>
          </div>
          {(status || q.trim()) && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[#E5F1E2]">
              <span className="text-[11px] uppercase tracking-wider text-[#909090] font-open-sauce-semibold">Applied:</span>
              {q.trim() && <PmFilterChip label={`Search: "${q.trim()}"`} onRemove={() => setQ('')} />}
              {status   && <PmFilterChip label={`Status: ${status.replace(/_/g, ' ')}`} onRemove={() => setStatus('')} />}
            </div>
          )}
        </SectionCard>

        <ErrorBox error={error} />
        {items === null && !error && <Spinner />}
        {items !== null && items.length === 0 && (
          <EmptyState
            title={status || q ? 'No bookings match these filters' : 'No bookings assigned yet'}
            description={
              status || q
                ? 'Try clearing the filter or expanding the search.'
                : 'Bookings appear here once an admin assigns them to you.'
            }
            action={
              (status || q) && (
                <Button variant="subtle" size="md" onClick={() => { setQ(''); setStatus(''); }}>
                  Clear filters
                </Button>
              )
            }
          />
        )}
        {items !== null && items.length > 0 && (
          <>
            <Table columns={columns} rows={items} />
            <Pagination
              page={page}
              total={meta.total || 0}
              pageSize={PAGE_SIZE}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}

// Removable chip rendered in the "Applied:" filter strip.
function PmFilterChip({ label, onRemove }) {
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
