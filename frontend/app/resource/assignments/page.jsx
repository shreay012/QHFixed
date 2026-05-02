'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import staffApi from '@/lib/axios/staffApi';
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
const STATUS_OPTIONS = [
  { value: '',             label: 'All statuses' },
  { value: 'assigned',     label: 'Assigned' },
  { value: 'accepted',     label: 'Accepted' },
  { value: 'in_progress',  label: 'In progress' },
  { value: 'paused',       label: 'Paused' },
  { value: 'completed',    label: 'Completed' },
  { value: 'cancelled',    label: 'Cancelled' },
];

export default function ResourceAssignmentsPage() {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');

  const [items, setItems] = useState(null);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [error, setError] = useState(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(PAGE_SIZE));
    if (status) params.set('status', status);
    if (q.trim()) params.set('q', q.trim());
    return params.toString();
  }, [page, status, q]);

  const load = useCallback(() => {
    // setError is only called from the async .then/.catch (not synchronously
    // in this function body) so the effect that invokes load() doesn't
    // trigger a cascading render — keeps the react-hooks/set-state-in-effect
    // lint happy.
    staffApi.get(`/resource/assignments?${queryString}`)
      .then((r) => {
        setItems(r.data?.data || []);
        setMeta(r.data?.meta || { total: 0, totalPages: 1 });
        setError(null);
      })
      .catch((e) => setError(e?.response?.data?.error?.message || 'Failed to load assignments'));
  }, [queryString]);

  useEffect(() => { load(); }, [load]);

  // Page resets are folded into the setter callbacks below rather than
  // chained from a useEffect on [status, q] — that pattern trips the
  // react-hooks/set-state-in-effect rule (cascading-render warning).
  const updateStatus = (e) => { setStatus(e.target.value); setPage(1); };
  const updateQ      = (val) => { setQ(val); setPage(1); };

  const columns = [
    { key: '_id', label: 'ID', render: (r) => <code className="text-xs text-[#909090] font-mono">{String(r._id).slice(-8)}</code> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'customerName', label: 'Customer' },
    { key: 'serviceName', label: 'Service' },
    { key: 'startTime', label: 'Start',
      render: (r) => r.services?.[0]?.preferredStartDate
        ? new Date(r.services[0].preferredStartDate).toLocaleDateString()
        : (r.startTime ? new Date(r.startTime).toLocaleString() : '—') },
    { key: 'duration', label: 'Hours',
      render: (r) => r.services?.[0]?.durationTime || r.duration || '—' },
    { key: 'actions', label: '',
      render: (r) => (
        <Button size="sm" variant="subtle" onClick={() => router.push(`/resource/assignments/${r._id}`)}>Open</Button>
      ) },
  ];

  return (
    <div>
      <PageHeader
        title="Assignments"
        subtitle="Bookings allocated to you by your PM"
        helpText="Click any row to open the booking, log time, or chat with the customer."
      />
      <div className="p-4 sm:p-8 space-y-4">
        <SectionCard
          title="Filters"
          description="Narrow your assignments by status or search by customer / mobile / email / booking ID."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <SearchInput
              value={q}
              onChange={updateQ}
              placeholder="Search by customer, mobile, email or booking ID"
            />
            <Select label="Status" value={status} onChange={updateStatus}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>{o.label}</option>
              ))}
            </Select>
            <div className="flex items-end text-xs text-[#909090]">
              {meta.total != null && `${meta.total} assignment${meta.total === 1 ? '' : 's'} match`}
            </div>
          </div>
          {(status || q.trim()) && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[#E5F1E2]">
              <span className="text-[11px] uppercase tracking-wider text-[#909090] font-open-sauce-semibold">Applied:</span>
              {q.trim() && <ResFilterChip label={`Search: "${q.trim()}"`} onRemove={() => updateQ('')} />}
              {status   && <ResFilterChip label={`Status: ${status.replace(/_/g, ' ')}`} onRemove={() => updateStatus({ target: { value: '' } })} />}
            </div>
          )}
        </SectionCard>

        <ErrorBox error={error} />
        {items === null && !error && <Spinner />}
        {items !== null && items.length === 0 && (
          <EmptyState
            title={status || q ? 'No assignments match these filters' : 'No assignments yet'}
            description={
              status || q
                ? 'Try clearing the filter or expanding the search.'
                : 'Your PM will assign bookings here. Once they do, you’ll see them appear in real time.'
            }
            action={
              (status || q) && (
                <Button variant="subtle" size="md" onClick={() => { updateQ(''); updateStatus({ target: { value: '' } }); }}>
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

// Local filter chip — same shape as the admin pages, kept inline
// rather than hoisting to ui.jsx until we have 3+ adopters.
function ResFilterChip({ label, onRemove }) {
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
