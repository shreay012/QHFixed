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
      <PageHeader title="Assignments" subtitle="Bookings allocated to you by your PM" />
      <div className="p-4 sm:p-8 space-y-4">
        <SectionCard title="Filters">
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
        </SectionCard>

        <ErrorBox error={error} />
        {items === null && !error && <Spinner />}
        {items !== null && (
          <>
            <Table
              columns={columns}
              rows={items}
              empty="No assignments yet. Ask your PM to assign you to a booking."
            />
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
