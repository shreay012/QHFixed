'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import staffApi from '@/lib/axios/staffApi';
import { showError, showSuccess } from '@/lib/utils/toast';
import { s } from '@/lib/utils/i18nText';
import chatSocketService from '@/lib/services/chatSocketService';
import {
  PageHeader,
  StatusBadge,
  Spinner,
  ErrorBox,
  Button,
  Avatar,
} from '@/components/staff/ui';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('en-IN'); } catch { return '—'; }
}

function fmtINR(amount) {
  if (amount == null || isNaN(Number(amount))) return '—';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function fmtDuration(ms) {
  if (!ms || ms < 0) ms = 0;
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** A single label/value data field inside a card */
function Field({ label, value, sub, mono, wide }) {
  return (
    <div className={wide ? 'col-span-2 sm:col-span-3' : ''}>
      <div className="text-[11px] uppercase tracking-wider text-[#909090] font-open-sauce-semibold mb-0.5">
        {label}
      </div>
      <div
        className={`text-sm leading-snug ${
          mono
            ? 'font-mono text-[11px] break-all text-[#484848]'
            : 'font-open-sauce-semibold text-[#26472B]'
        }`}
      >
        {value ?? '—'}
      </div>
      {sub && <div className="text-[11px] text-[#909090] mt-0.5">{sub}</div>}
    </div>
  );
}

/** Chat bubble — role-aware colours */
function ChatBubble({ m }) {
  const role = m.senderRole || 'user';
  const isMine = role === 'admin';

  const palette = {
    admin:    'bg-[#E5F1E2] text-[#26472B]',
    pm:       'bg-[#26472B] text-white',
    resource: 'bg-[#FFF3E0] text-[#724500]',
    user:     'bg-[#F7FBF6] text-[#484848]',
  };

  const roleBadge = {
    admin:    'Admin',
    pm:       'PM',
    resource: 'Resource',
    user:     'Customer',
  };

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-sm ${palette[role] || palette.user}`}>
        <div className="text-[10px] uppercase tracking-wider opacity-70 font-open-sauce-semibold mb-0.5">
          {roleBadge[role] || role}
        </div>
        <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.msg}</div>
        <div className="text-[10px] opacity-50 text-right mt-1">
          {m.createdAt
            ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : ''}
        </div>
      </div>
    </div>
  );
}

/** Section card wrapper */
function Card({ title, subtitle, children, action, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-[#E5F1E2] shadow-[0_1px_3px_rgba(38,71,43,0.04)] ${className}`}>
      {(title || action) && (
        <div className="px-5 pt-4 pb-3 border-b border-[#E5F1E2] flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-open-sauce-bold text-[#26472B]">{title}</div>
            {subtitle && <div className="text-xs text-[#636363] mt-0.5 font-open-sauce">{subtitle}</div>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminBookingDetailPage() {
  const { id } = useParams();
  const router  = useRouter();

  // ─── Core data ────────────────────────────────────────────────────────────
  const [job, setJob]           = useState(null);
  const [error, setError]       = useState(null);
  const [pms, setPms]           = useState([]);
  const [resources, setResources] = useState([]);

  // ─── Assignment pickers ───────────────────────────────────────────────────
  const [pickPm, setPickPm]   = useState('');
  const [pickRes, setPickRes] = useState('');

  // ─── Inline reject form (replaces window.confirm + window.prompt) ─────────
  const [showReject, setShowReject]     = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // ─── Busy states ──────────────────────────────────────────────────────────
  const [busy, setBusy] = useState(null); // 'confirm' | 'reject' | 'pm' | 'res'

  // ─── Chat ─────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [draft, setDraft]       = useState('');
  const [sending, setSending]   = useState(false);
  const chatBottomRef           = useRef(null);
  const pollRef                 = useRef(null);

  // ─── Data loaders ─────────────────────────────────────────────────────────
  const loadJob = useCallback(async () => {
    setError(null);
    try {
      const r = await staffApi.get(`/admin/bookings/${id}`);
      setJob(r.data?.data || r.data || null);
    } catch (e) {
      setError(e);
    }
  }, [id]);

  const loadMessages = useCallback(async () => {
    try {
      const r = await staffApi.get(`/admin/bookings/${id}/messages`);
      const msgs = r.data?.data || r.data || [];
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch {}
  }, [id]);

  const loadPickers = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        staffApi.get('/admin/pms-list'),
        staffApi.get('/admin/resources-list'),
      ]);
      setPms(a.data?.data || a.data || []);
      setResources(b.data?.data || b.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadJob();
    loadMessages();
    loadPickers();
  }, [loadJob, loadMessages, loadPickers]);

  // ─── Real-time chat: socket + 10s polling fallback ────────────────────────
  useEffect(() => {
    const sock = chatSocketService.socket;

    const onMessage = (msg) => {
      if (!msg) return;
      setMessages((prev) => {
        const exists = prev.some((m) => String(m._id) === String(msg._id || msg.id));
        return exists ? prev : [...prev, msg];
      });
    };

    if (sock) {
      sock.on('new-message', onMessage);
      sock.on('new_message', onMessage);
      sock.on('message:new', onMessage);
      sock.on('chat-message', onMessage);
      sock.on('receive-message', onMessage);
    }

    pollRef.current = setInterval(loadMessages, 10_000);

    return () => {
      if (sock) {
        sock.off('new-message', onMessage);
        sock.off('new_message', onMessage);
        sock.off('message:new', onMessage);
        sock.off('chat-message', onMessage);
        sock.off('receive-message', onMessage);
      }
      clearInterval(pollRef.current);
    };
  }, [loadMessages]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const doConfirm = async () => {
    setBusy('confirm');
    try {
      await staffApi.post(`/admin/bookings/${id}/confirm`);
      showSuccess('Booking confirmed successfully.');
      await loadJob();
    } catch (e) {
      showError(e?.response?.data?.error?.message || e?.message || 'Failed to confirm.');
    } finally {
      setBusy(null);
    }
  };

  const doReject = async () => {
    setBusy('reject');
    try {
      await staffApi.patch(`/admin/bookings/${id}/reject`, { reason: rejectReason.trim() });
      showSuccess('Booking cancelled.');
      setShowReject(false);
      setRejectReason('');
      await loadJob();
    } catch (e) {
      showError(e?.response?.data?.error?.message || e?.message || 'Failed to cancel booking.');
    } finally {
      setBusy(null);
    }
  };

  const doAssignPm = async () => {
    if (!pickPm) return;
    setBusy('pm');
    try {
      await staffApi.post(`/admin/bookings/${id}/assign-pm`, { pmId: pickPm });
      showSuccess('PM assigned successfully.');
      setPickPm('');
      await loadJob();
    } catch (e) {
      showError(e?.response?.data?.error?.message || e?.message || 'Failed to assign PM.');
    } finally {
      setBusy(null);
    }
  };

  const doAssignResource = async () => {
    if (!pickRes) return;
    setBusy('res');
    try {
      await staffApi.post(`/admin/bookings/${id}/assign-resource`, { resourceId: pickRes });
      showSuccess('Resource assigned successfully.');
      setPickRes('');
      await loadJob();
    } catch (e) {
      showError(e?.response?.data?.error?.message || e?.message || 'Failed to assign resource.');
    } finally {
      setBusy(null);
    }
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      const r = await staffApi.post(`/admin/bookings/${id}/messages`, { msg: text });
      const newMsg = r.data?.data || r.data;
      if (newMsg) setMessages((arr) => [...arr, newMsg]);
      setDraft('');
    } catch (e) {
      showError(e?.response?.data?.error?.message || e?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  // ─── Loading / error states ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F7F5]">
        <PageHeader
          title="Booking Detail"
          subtitle="Failed to load booking"
          backHref="/admin/bookings"
        />
        <div className="p-6">
          <ErrorBox error={error} />
          <div className="mt-4">
            <Button variant="subtle" onClick={() => router.push('/admin/bookings')}>
              ← Back to Bookings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#F5F7F5]">
        <PageHeader title="Booking Detail" subtitle="Loading…" backHref="/admin/bookings" />
        <div className="p-6">
          <Spinner />
        </div>
      </div>
    );
  }

  // ─── Derived data ──────────────────────────────────────────────────────────
  const svc       = job.services?.[0] || {};
  const bookingId = String(job._id);
  const canCancel = !['cancelled', 'completed'].includes(job.status);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F5F7F5]">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <PageHeader
        title={`Booking #${bookingId.slice(-8)}`}
        subtitle={`${job.customerName || 'Customer'} · ${job.serviceName || 'Service'} · ${job.status?.replace(/_/g, ' ') || 'pending'}`}
        backHref="/admin/bookings"
        breadcrumbs={[
          { label: 'Admin',    href: '/admin' },
          { label: 'Bookings', href: '/admin/bookings' },
          { label: `#${bookingId.slice(-8)}` },
        ]}
        helpText="Use the right column to assign a PM, transition status, message participants, or cancel the booking."
        action={
          <Button variant="subtle" size="sm" onClick={() => router.push('/admin/bookings')}>
            ← All Bookings
          </Button>
        }
      />

      {/* ── 3-column grid ────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ══════════════════════ LEFT (col-span-2) ══════════════════════ */}
        <div className="lg:col-span-2 space-y-5">

          {/* ── 1. Booking Summary Card ──────────────────────────────────── */}
          <Card
            title={
              <span className="flex items-center gap-2">
                Booking #{bookingId.slice(-8)}
                <StatusBadge status={job.status} size="lg" />
              </span>
            }
            subtitle={`Created ${fmtDate(job.createdAt)}`}
          >
            {/* Data grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              <Field
                label="Customer"
                value={s(job.customerName) || '—'}
                sub={job.customerMobile}
              />
              <Field label="Service" value={s(job.serviceName) || s(svc.name) || '—'} />
              <Field label="Amount" value={fmtINR(job.amount)} />
              <Field label="Duration" value={svc.durationTime ? `${svc.durationTime} h` : '—'} />
              <Field label="Start Time" value={svc.startTime || fmtDate(job.startTime) || '—'} />
              <Field label="Start Date" value={svc.preferredStartDate ? new Date(svc.preferredStartDate).toLocaleDateString('en-IN') : '—'} />
              <Field label="Time Worked" value={fmtDuration(job.workedMs || 0)} mono />
              <Field label="Started At" value={fmtDate(job.startedAt)} />
              <Field label="Completed At" value={fmtDate(job.completedAt)} />
              <Field label="Resource" value={s(job.resourceName) || s(job.assignedResource?.name) || '—'} />
              <Field label="PM" value={s(job.pmName) || s(job.projectManager?.name) || '—'} />
              <Field label="Booking ID" value={bookingId} mono wide />
            </div>

            {/* Requirements */}
            {(svc.requirements || job.requirements) && (
              <div className="mt-5 pt-4 border-t border-[#E5F1E2]">
                <div className="text-[11px] uppercase tracking-wider text-[#909090] font-open-sauce-semibold mb-2">
                  Requirements
                </div>
                <textarea
                  readOnly
                  value={svc.requirements || job.requirements}
                  rows={3}
                  className="w-full border border-[#E5F1E2] rounded-xl px-3 py-2.5 text-sm text-[#484848] bg-[#F7FBF6] resize-none font-open-sauce focus:outline-none"
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap mt-5 pt-4 border-t border-[#E5F1E2]">
              {job.status === 'pending' && (
                <Button
                  variant="primary"
                  onClick={doConfirm}
                  disabled={!!busy}
                  loading={busy === 'confirm'}
                >
                  ✓ Confirm Booking
                </Button>
              )}

              {canCancel && !showReject && (
                <Button
                  variant="danger"
                  onClick={() => { setShowReject(true); setRejectReason(''); }}
                  disabled={!!busy}
                >
                  ✗ Cancel Booking
                </Button>
              )}
            </div>

            {/* Inline reject form — no window.prompt anywhere */}
            {showReject && (
              <div className="mt-3 border border-red-200 rounded-xl p-4 bg-red-50">
                <p className="text-xs font-open-sauce-semibold text-red-700 mb-2">
                  Reason for cancellation:
                </p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter reason (optional)…"
                  rows={2}
                  className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm font-open-sauce text-[#484848] bg-white resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                />
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={doReject}
                    disabled={busy === 'reject'}
                    loading={busy === 'reject'}
                  >
                    Confirm Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setShowReject(false); setRejectReason(''); }}
                    disabled={busy === 'reject'}
                  >
                    Nevermind
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* ── 2. PM Assignment Card ─────────────────────────────────────── */}
          <Card title="Project Manager" subtitle="Assign or reassign the PM for this booking">
            {/* Current PM display */}
            {job.projectManager ? (
              <div className="flex items-center gap-3 mb-4 p-3 bg-[#F2F9F1] rounded-xl border border-[#E5F1E2]">
                <Avatar name={job.projectManager.name || 'PM'} size="md" />
                <div>
                  <div className="text-sm font-open-sauce-semibold text-[#26472B]">
                    {job.projectManager.name || '—'}
                  </div>
                  {job.projectManager.mobile && (
                    <div className="text-xs text-[#909090] mt-0.5">
                      {job.projectManager.mobile}
                    </div>
                  )}
                </div>
                <span className="ml-auto">
                  <StatusBadge status="active" />
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-4 p-3 bg-[#F7FBF6] rounded-xl border border-dashed border-[#D6EBCF]">
                <div className="w-10 h-10 rounded-full bg-[#E5F1E2] flex items-center justify-center flex-shrink-0">
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <circle cx={12} cy={8} r={4} stroke="#909090" strokeWidth={1.8} />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#909090" strokeWidth={1.8} strokeLinecap="round" />
                  </svg>
                </div>
                <span className="text-sm text-[#909090] font-open-sauce italic">No PM assigned yet.</span>
              </div>
            )}

            {/* PM picker */}
            <div className="flex gap-2 flex-wrap items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-open-sauce-semibold text-[#636363] uppercase tracking-wider mb-1.5">
                  {job.projectManager ? 'Reassign to' : 'Select PM'}
                </label>
                <div className="relative">
                  <select
                    value={pickPm}
                    onChange={(e) => setPickPm(e.target.value)}
                    className="w-full appearance-none border border-[#D6EBCF] rounded-lg px-3 py-2.5 pr-9 text-sm font-open-sauce text-[#242424] bg-white focus:ring-2 focus:ring-[#45A735]/30 focus:border-[#45A735] focus:outline-none transition-colors"
                  >
                    <option value="">Select a PM…</option>
                    {pms.map((pm) => (
                      <option key={pm._id} value={pm._id}>
                        {pm.name || pm.mobile}
                        {pm.mobile && pm.name ? ` · ${pm.mobile}` : ''}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#636363]">
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={doAssignPm}
                disabled={!pickPm || busy === 'pm'}
                loading={busy === 'pm'}
              >
                {job.projectManager ? 'Reassign PM' : 'Assign PM'}
              </Button>
            </div>
          </Card>

          {/* ── 3. Resource Assignment Card ───────────────────────────────── */}
          <Card title="Assigned Resource" subtitle="Assign or reassign the field resource">
            {/* Current resource display */}
            {job.assignedResource ? (
              <div className="flex items-center gap-3 mb-4 p-3 bg-[#F2F9F1] rounded-xl border border-[#E5F1E2]">
                <Avatar name={job.assignedResource.name || 'R'} size="md" />
                <div>
                  <div className="text-sm font-open-sauce-semibold text-[#26472B]">
                    {job.assignedResource.name || '—'}
                  </div>
                  {job.assignedResource.mobile && (
                    <div className="text-xs text-[#909090] mt-0.5">
                      {job.assignedResource.mobile}
                    </div>
                  )}
                  {(job.assignedResource.skills || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {job.assignedResource.skills.slice(0, 4).map((s, i) => (
                        <span key={i} className="text-[10px] bg-[#E5F1E2] text-[#26472B] rounded-full px-2 py-0.5 font-open-sauce-semibold">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="ml-auto">
                  <StatusBadge status="active" />
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-4 p-3 bg-[#F7FBF6] rounded-xl border border-dashed border-[#D6EBCF]">
                <div className="w-10 h-10 rounded-full bg-[#E5F1E2] flex items-center justify-center flex-shrink-0">
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C8.69 2 6 4.69 6 8s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zM4 20c0-3.31 3.58-6 8-6s8 2.69 8 6" stroke="#909090" strokeWidth={1.8} strokeLinecap="round" />
                  </svg>
                </div>
                <span className="text-sm text-[#909090] font-open-sauce italic">No resource assigned yet.</span>
              </div>
            )}

            {/* Resource picker */}
            <div className="flex gap-2 flex-wrap items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-open-sauce-semibold text-[#636363] uppercase tracking-wider mb-1.5">
                  {job.assignedResource ? 'Reassign to' : 'Select Resource'}
                </label>
                <div className="relative">
                  <select
                    value={pickRes}
                    onChange={(e) => setPickRes(e.target.value)}
                    className="w-full appearance-none border border-[#D6EBCF] rounded-lg px-3 py-2.5 pr-9 text-sm font-open-sauce text-[#242424] bg-white focus:ring-2 focus:ring-[#45A735]/30 focus:border-[#45A735] focus:outline-none transition-colors"
                  >
                    <option value="">Select a resource…</option>
                    {resources.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name || r.mobile}
                        {r.mobile && r.name ? ` · ${r.mobile}` : ''}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#636363]">
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={doAssignResource}
                disabled={!pickRes || busy === 'res'}
                loading={busy === 'res'}
              >
                {job.assignedResource ? 'Reassign Resource' : 'Assign Resource'}
              </Button>
            </div>
          </Card>

          {/* ── 4. Activity Timeline Card ─────────────────────────────────── */}
          {job.history && job.history.length > 0 && (
            <Card
              title="Activity Timeline"
              subtitle={`${job.history.length} event${job.history.length !== 1 ? 's' : ''} recorded`}
            >
              <div className="relative">
                {/* Left line */}
                <div className="absolute left-[7px] top-0 bottom-0 w-px bg-[#E5F1E2]" />

                <div className="space-y-4 pl-6">
                  {[...job.history].reverse().map((h, i) => (
                    <div key={i} className="relative">
                      {/* Dot */}
                      <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[#45A735] border-2 border-white shadow-sm flex-shrink-0" />

                      <div className="bg-[#F7FBF6] rounded-xl border border-[#E5F1E2] px-4 py-3">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-open-sauce-semibold text-[#26472B]">
                              {h.event}
                            </span>
                            {h.actorRole && (
                              <span className="text-[10px] bg-[#E5F1E2] text-[#26472B] rounded-full px-2 py-0.5 font-open-sauce-semibold uppercase tracking-wider">
                                {h.actorRole}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#909090] font-open-sauce flex-shrink-0">
                            {fmtDate(h.at || h.timestamp || h.createdAt)}
                          </span>
                        </div>
                        {h.note && (
                          <p className="text-xs text-[#636363] font-open-sauce mt-1 leading-relaxed">
                            {h.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Empty timeline placeholder */}
          {(!job.history || job.history.length === 0) && (
            <Card title="Activity Timeline" subtitle="No events recorded yet">
              <div className="py-4 text-center text-sm text-[#909090] font-open-sauce italic">
                Activity will appear here as the booking progresses.
              </div>
            </Card>
          )}
        </div>

        {/* ══════════════════════ RIGHT (col-span-1) ═════════════════════ */}
        <div className="lg:col-span-1 flex flex-col gap-5">

          {/* ── Quick Status Overview ─────────────────────────────────────── */}
          <Card title="Booking Status">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#909090] font-open-sauce-semibold uppercase tracking-wider">
                  Current Status
                </span>
                <StatusBadge status={job.status} size="lg" />
              </div>
              <div className="h-px bg-[#E5F1E2]" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#909090] font-open-sauce-semibold uppercase tracking-wider">
                  Booking ID
                </span>
                <code className="text-xs font-mono text-[#484848] bg-[#F2F9F1] px-2 py-1 rounded-lg">
                  #{bookingId.slice(-8)}
                </code>
              </div>
              {job.amount != null && (
                <>
                  <div className="h-px bg-[#E5F1E2]" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#909090] font-open-sauce-semibold uppercase tracking-wider">
                      Amount
                    </span>
                    <span className="text-sm font-open-sauce-bold text-[#26472B]">
                      {fmtINR(job.amount)}
                    </span>
                  </div>
                </>
              )}
              {svc.durationTime && (
                <>
                  <div className="h-px bg-[#E5F1E2]" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#909090] font-open-sauce-semibold uppercase tracking-wider">
                      Duration
                    </span>
                    <span className="text-sm font-open-sauce-semibold text-[#26472B]">
                      {svc.durationTime} h
                    </span>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* ── Group Chat Panel ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-[#E5F1E2] shadow-[0_1px_3px_rgba(38,71,43,0.04)] flex flex-col h-[600px]">
            {/* Chat header */}
            <div className="px-5 py-3.5 border-b border-[#E5F1E2] flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-open-sauce-bold text-[#26472B]">Group Chat</div>
                  <div className="text-[11px] text-[#909090] font-open-sauce mt-0.5">
                    Customer · PM · Resource · Admin
                  </div>
                </div>
                {/* Live indicator */}
                <div className="flex items-center gap-1.5">
                  <span className="relative w-2 h-2">
                    <span className="absolute inset-0 rounded-full bg-[#45A735] opacity-40 animate-ping" />
                    <span className="relative block w-2 h-2 rounded-full bg-[#45A735]" />
                  </span>
                  <span className="text-[10px] text-[#45A735] font-open-sauce-semibold uppercase tracking-wider">
                    Live
                  </span>
                </div>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-[#F2F9F1] flex items-center justify-center">
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                      <path d="M8 10h8M8 14h5M5 20l-2 2V6a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5z" stroke="#45A735" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-sm text-[#909090] font-open-sauce">No messages yet.</p>
                  <p className="text-xs text-[#909090] font-open-sauce opacity-70">Start the conversation below.</p>
                </div>
              )}

              {messages.map((m, i) => (
                <ChatBubble key={m._id ? String(m._id) : `msg-${i}`} m={m} />
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Message input */}
            <form
              onSubmit={sendMessage}
              className="border-t border-[#E5F1E2] p-3 flex gap-2 flex-shrink-0"
            >
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Reply as admin…"
                disabled={sending}
                className="flex-1 border border-[#E5F1E2] rounded-xl px-3.5 py-2 text-sm font-open-sauce text-[#242424] bg-white placeholder:text-[#909090] focus:outline-none focus:ring-2 focus:ring-[#45A735]/30 focus:border-[#45A735] disabled:bg-[#F5F7F5] transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(e);
                  }
                }}
              />
              <Button
                type="submit"
                variant="primary"
                disabled={sending || !draft.trim()}
                loading={sending}
              >
                Send
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
