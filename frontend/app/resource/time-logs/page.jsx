'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import staffApi from '@/lib/axios/staffApi';
import { showError, showSuccess } from '@/lib/utils/toast';
import {
  PageHeader,
  Table,
  Spinner,
  ErrorBox,
  Button,
  Select,
  Input,
  Pagination,
  SectionCard,
} from '@/components/staff/ui';

const PAGE_SIZE = 20;

export default function ResourceTimeLogsPage() {
  // ── Form state ─────────────────────────────────────────────────────
  // Resources used to paste a raw 24-char Mongo ObjectId here, which is
  // unusable in practice. We now load their active + recent assignments
  // and offer a dropdown labeled with customer + service so logging time
  // is one click + the hours field.
  const [assignments, setAssignments] = useState([]);
  const [bookingId, setBookingId] = useState('');
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // ── List state (paginated) ─────────────────────────────────────────
  const [items, setItems] = useState(null);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(PAGE_SIZE));
    return params.toString();
  }, [page]);

  const loadLogs = useCallback(() => {
    setError(null);
    staffApi.get(`/resource/time-logs?${queryString}`)
      .then((r) => {
        setItems(r.data?.data || []);
        setMeta(r.data?.meta || { total: (r.data?.data || []).length, totalPages: 1 });
      })
      .catch((e) => setError(e?.response?.data?.error?.message || 'Failed to load logs'));
  }, [queryString]);

  // Pull assignments once on mount so the dropdown stays populated even
  // as the user navigates between log pages. We grab page 1 with a
  // generous pageSize since a resource is unlikely to have >100 active
  // assignments simultaneously, and we filter to non-completed below.
  const loadAssignments = useCallback(() => {
    staffApi.get('/resource/assignments?page=1&pageSize=100')
      .then((r) => setAssignments(r.data?.data || []))
      .catch(() => setAssignments([]));
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  // Show only assignments that are still in flight first; completed/cancelled
  // sink to the bottom so a resource backfilling a log can still find them.
  const sortedAssignments = useMemo(() => {
    const order = { in_progress: 0, paused: 1, assigned: 2, accepted: 3, completed: 9, cancelled: 9 };
    return [...assignments].sort((a, b) => {
      const ra = order[a.status] ?? 5;
      const rb = order[b.status] ?? 5;
      if (ra !== rb) return ra - rb;
      return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
    });
  }, [assignments]);

  // Build a quick lookup so the table row can show "Customer · Service"
  // instead of an opaque ObjectId tail.
  const assignmentLabel = useCallback((id) => {
    const match = assignments.find((a) => String(a._id) === String(id));
    if (!match) return null;
    const cust = match.customerName || '';
    const svc  = match.serviceName  || match.title || '';
    return [cust, svc].filter(Boolean).join(' · ');
  }, [assignments]);

  const submit = async (e) => {
    e.preventDefault();
    if (!bookingId) {
      showError('Pick an assignment first');
      return;
    }
    setBusy(true);
    try {
      await staffApi.post('/resource/time-log', {
        bookingId,
        hours: Number(hours),
        note,
      });
      setBookingId(''); setHours(''); setNote('');
      showSuccess('Time logged');
      // Hop back to page 1 so the new entry is immediately visible.
      if (page === 1) loadLogs();
      else setPage(1);
    } catch (err) {
      showError(err?.response?.data?.error?.message || 'Failed to log time');
    } finally { setBusy(false); }
  };

  const columns = [
    { key: 'createdAt', label: 'Logged at',
      render: (r) => <span className="text-xs text-[#636363]">{new Date(r.createdAt).toLocaleString()}</span> },
    { key: 'bookingId', label: 'Booking',
      render: (r) => {
        const label = assignmentLabel(r.bookingId);
        return label ? (
          <div>
            <div className="text-sm text-[#26472B]">{label}</div>
            <code className="text-[10px] text-[#909090] font-mono">{String(r.bookingId).slice(-8)}</code>
          </div>
        ) : (
          <code className="text-xs font-mono text-[#909090]">{String(r.bookingId).slice(-8)}</code>
        );
      } },
    { key: 'hours', label: 'Hours',
      render: (r) => <span className="font-open-sauce-semibold text-[#26472B]">{r.hours}</span> },
    { key: 'note', label: 'Note',
      render: (r) => <span className="text-[#636363]">{r.note || '—'}</span> },
  ];

  return (
    <div>
      <PageHeader title="Time Logs" subtitle="Log hours against your assignments" />
      <div className="p-4 sm:p-8 space-y-6">
        <SectionCard title="Add time entry">
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-6">
              <Select label="Assignment" value={bookingId} onChange={(e) => setBookingId(e.target.value)} required>
                <option value="">{sortedAssignments.length ? 'Select an assignment…' : 'No assignments available'}</option>
                {sortedAssignments.map((a) => {
                  const cust = a.customerName || 'Customer';
                  const svc  = a.serviceName  || a.title || 'Service';
                  const tail = String(a._id).slice(-6);
                  return (
                    <option key={a._id} value={a._id}>
                      {cust} · {svc} · {a.status || 'pending'} · #{tail}
                    </option>
                  );
                })}
              </Select>
            </div>
            <div className="sm:col-span-3">
              <Input label="Hours" type="number" step="0.25" min="0.25" max="24"
                value={hours} onChange={(e) => setHours(e.target.value)} required />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" disabled={busy || !bookingId} className="w-full">
                {busy ? 'Saving…' : 'Add log'}
              </Button>
            </div>
            <div className="sm:col-span-12">
              <Input label="Note (optional)" value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What did you work on?" />
            </div>
          </form>
        </SectionCard>

        <ErrorBox error={error} />
        {items === null && !error && <Spinner />}
        {items !== null && (
          <>
            <Table columns={columns} rows={items} empty="No time logs yet." />
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
