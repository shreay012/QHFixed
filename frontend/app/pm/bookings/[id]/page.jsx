'use client';
import { showError, showSuccess } from '@/lib/utils/toast';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import staffApi from '@/lib/axios/staffApi';
import chatSocketService from '@/lib/services/chatSocketService';
import { s } from '@/lib/utils/i18nText';
import { PageHeader, StatusBadge, Spinner, ErrorBox, Button } from '@/components/staff/ui';

function fmtDuration(ms) {
  if (!ms || ms < 0) ms = 0;
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function liveWorked(j, tick) {
  const base = j?.workedMs || 0;
  if (j?.status === 'in_progress' && j?.currentSessionStart) {
    return base + (tick - new Date(j.currentSessionStart).getTime());
  }
  return base;
}
function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
}

export default function PmBookingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [tick, setTick] = useState(Date.now());
  const tickRef = useRef(null);

  // Resource assignment
  const [resources, setResources] = useState([]);
  const [pickResource, setPickResource] = useState('');

  // Chat
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const chatBottomRef = useRef(null);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await staffApi.get(`/pm/bookings/${id}`);
      setJob(r.data?.data || null);
    } catch (e) { setError(e); }
  }, [id]);

  const loadMessages = useCallback(async () => {
    try {
      const r = await staffApi.get(`/pm/bookings/${id}/messages`);
      setMessages(r.data?.data || []);
    } catch {}
  }, [id]);

  const loadResources = useCallback(async () => {
    try {
      const r = await staffApi.get('/pm/resources');
      setResources(r.data?.data || []);
    } catch {}
  }, []);

  useEffect(() => { load(); loadMessages(); loadResources(); }, [load, loadMessages, loadResources]);

  // Live tick when in progress
  useEffect(() => {
    if (job?.status === 'in_progress') {
      tickRef.current = setInterval(() => setTick(Date.now()), 1000);
      return () => clearInterval(tickRef.current);
    }
  }, [job?.status]);

  // Real-time chat via socket. Backend convention (chat.service.js):
  //   • Broadcasts `new-message` to room `booking_<bookingId>`
  //   • Direct-pushes `message:new` to every participant's `user_<uid>` room
  // The PM is auto-joined to their `user_<pmId>` room on socket auth, so the
  // direct push fires regardless — but we ALSO join `booking_<id>` so the
  // canonical room broadcast is delivered (covers the rare case where the
  // backend's user-room fan-out skipped someone). Then we filter every
  // incoming message by bookingId so a PM viewing one booking never sees
  // bubbles from another booking they also manage.
  useEffect(() => {
    const sock = chatSocketService.socket;
    const bookingRoom = id ? `booking_${id}` : null;

    const onMessage = (msg) => {
      if (!msg) return;
      // Bookings room → only fires for this booking, but message:new fan-out
      // arrives for every booking the PM is part of. Filter so the right
      // bubbles render in the right pane.
      const msgBookingId = String(msg.bookingId || msg.roomId?.replace(/^booking_/, '') || '');
      if (msgBookingId && msgBookingId !== String(id)) return;
      setMessages(prev => {
        const incomingId = String(msg._id || msg.id || msg.tempId || '');
        const exists = prev.some(m => String(m._id || m.id || m.tempId) === incomingId);
        return exists ? prev : [...prev, msg];
      });
    };

    if (sock) {
      if (bookingRoom) {
        // Server accepts both event names; emit the canonical one.
        sock.emit('chat:join', { roomId: bookingRoom });
      }
      sock.on('new-message', onMessage); // room broadcast
      sock.on('message:new', onMessage); // direct user-room push
    }

    // Polling fallback in case the socket is briefly disconnected. Cadence
    // bumped to 30s — the socket is the primary path now, polling is just a
    // safety net so a 5K-resource fleet doesn't hammer the chat API.
    pollRef.current = setInterval(loadMessages, 30000);

    return () => {
      if (sock) {
        if (bookingRoom) sock.emit('chat:leave', { roomId: bookingRoom });
        sock.off('new-message', onMessage);
        sock.off('message:new', onMessage);
      }
      clearInterval(pollRef.current);
    };
  }, [id, loadMessages]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const action = async (kind) => {
    setBusy(kind);
    try {
      await staffApi.post(`/pm/bookings/${id}/${kind}`, {});
      await load();
    } catch (e) {
      showError(e?.response?.data?.error?.message || `Failed to ${kind}`);
    } finally { setBusy(null); }
  };

  const assignResource = async () => {
    if (!pickResource) return;
    setBusy('resource');
    try {
      await staffApi.post(`/pm/bookings/${id}/assign-resource`, { resourceId: pickResource });
      setPickResource('');
      await load();
    } catch (e) {
      showError(e?.response?.data?.error?.message || 'Failed to assign resource');
    } finally { setBusy(null); }
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      const r = await staffApi.post(`/pm/bookings/${id}/messages`, { msg: text });
      setMessages((arr) => [...arr, r.data?.data]);
      setDraft('');
    } catch (e) {
      showError(e?.response?.data?.error?.message || 'Failed to send');
    } finally { setSending(false); }
  };

  if (error) return <div className="p-6"><ErrorBox error={error} /></div>;
  if (!job) return <div className="p-6"><Spinner /></div>;

  const svc = job.services?.[0] || {};
  const status = job.status;
  const canStart = ['assigned_to_pm', 'paid', 'confirmed', 'paused'].includes(status);
  const canStop = status === 'in_progress';
  const canComplete = ['in_progress', 'paused'].includes(status);

  return (
    <div>
      <PageHeader
        title={`Booking ${String(job._id).slice(-8)}`}
        subtitle="Manage this booking — assign resource, chat, and track progress"
        action={<Button variant="subtle" size="sm" onClick={() => router.push('/pm/bookings')}>← Back</Button>}
      />

      <div className="p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — Details + actions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-open-sauce-bold text-[#26472B]">Status</h3>
              <StatusBadge status={status} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <Field label="Customer" value={s(job.customerName)} sub={job.customerMobile} />
              <Field label="Service" value={s(job.serviceName)} />
              <Field label="Amount" value={`₹${job.amount || 0}`} />
              <Field label="Scheduled Date" value={svc.preferredStartDate ? new Date(svc.preferredStartDate).toLocaleDateString() : '—'} />
              <Field label="Start Time" value={svc.startTime || svc.timeSlot?.startTime || '—'} />
              <Field label="End Time" value={svc.endTime || svc.timeSlot?.endTime || '—'} />
              <Field label="Duration" value={`${svc.durationTime || job.durationTime || 0}h`} />
              <Field label="Worked" value={fmtDuration(liveWorked(job, tick))} mono />
              <Field label="Started" value={fmtDate(job.startedAt)} />
            </div>
            {svc.requirements && (
              <div className="mt-4">
                <div className="text-[11px] uppercase tracking-wider text-[#909090] font-open-sauce-semibold mb-1">Requirements</div>
                <div className="text-sm text-[#26472B] whitespace-pre-wrap">{svc.requirements}</div>
              </div>
            )}
            <div className="flex gap-2 flex-wrap mt-5 border-t border-[#E5F1E2] pt-4">
              {canStart && (
                <Button variant="primary" onClick={() => action('start')} disabled={!!busy}>
                  {busy === 'start' ? 'Starting…' : (status === 'paused' ? 'Resume Work' : 'Start Work')}
                </Button>
              )}
              {canStop && (
                <Button variant="subtle" onClick={() => action('stop')} disabled={!!busy}>
                  {busy === 'stop' ? 'Stopping…' : 'Stop'}
                </Button>
              )}
              {canComplete && (
                <Button variant="primary" onClick={() => action('complete')} disabled={!!busy}>
                  {busy === 'complete' ? 'Completing…' : 'Mark Complete'}
                </Button>
              )}
              {status === 'completed' && <span className="text-sm text-[#26472B]">✅ Booking completed</span>}
            </div>
          </div>

          {/* Resource assignment */}
          <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
            <h3 className="text-sm font-open-sauce-bold text-[#26472B] mb-3">Assigned Resource</h3>
            {job.assignedResource ? (
              <div className="text-sm">
                <div className="font-open-sauce-semibold text-[#26472B]">{job.assignedResource.name}</div>
                {job.assignedResource.mobile && <div className="text-[#909090] text-xs">{job.assignedResource.mobile}</div>}
              </div>
            ) : (
              <div className="text-sm text-[#909090]">No resource assigned yet.</div>
            )}
            <div className="mt-3 flex gap-2 flex-wrap">
              <select
                className="border border-[#E5F1E2] rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
                value={pickResource}
                onChange={(e) => setPickResource(e.target.value)}
              >
                <option value="">Select a resource…</option>
                {resources.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name || r.mobile || String(r._id).slice(-6)}
                  </option>
                ))}
              </select>
              <Button variant="primary" onClick={assignResource} disabled={!pickResource || busy === 'resource'}>
                {busy === 'resource' ? 'Assigning…' : (job.assignedResource ? 'Reassign' : 'Assign')}
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT — Chat */}
        <div className="bg-white rounded-2xl border border-[#E5F1E2] p-0 flex flex-col h-[600px]">
          <div className="px-5 py-3 border-b border-[#E5F1E2]">
            <h3 className="text-sm font-open-sauce-bold text-[#26472B]">Group Chat</h3>
            <div className="text-[11px] text-[#909090]">Customer · PM · Resource · Admin</div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.length === 0 && <div className="text-sm text-[#909090] text-center mt-8">No messages yet — start the conversation.</div>}
            {messages.map((m) => (
              <ChatBubble key={String(m._id)} m={m} />
            ))}
            <div ref={chatBottomRef} />
          </div>
          <form onSubmit={sendMessage} className="border-t border-[#E5F1E2] p-3 flex gap-2">
            <input
              type="text"
              className="flex-1 border border-[#E5F1E2] rounded-lg px-3 py-2 text-sm"
              placeholder="Type a message…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={sending}
            />
            <Button type="submit" variant="primary" disabled={sending || !draft.trim()}>
              {sending ? '…' : 'Send'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, sub, mono }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-[#909090] font-open-sauce-semibold">{label}</div>
      <div className={`text-sm text-[#26472B] ${mono ? 'font-mono' : 'font-open-sauce-semibold'}`}>{value || '—'}</div>
      {sub && <div className="text-[11px] text-[#909090]">{sub}</div>}
    </div>
  );
}

function ChatBubble({ m }) {
  const role = m.senderRole || 'user';
  const isMine = role === 'pm';
  const palette = {
    pm: 'bg-[#26472B] text-white',
    user: 'bg-[#F1F7EE] text-[#26472B]',
    resource: 'bg-[#FFF3E0] text-[#724500]',
    admin: 'bg-[#E5F1E2] text-[#26472B]',
  };
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${palette[role] || palette.user}`}>
        <div className="text-[10px] uppercase tracking-wider opacity-70 font-open-sauce-semibold">{role}</div>
        <div className="text-sm whitespace-pre-wrap break-words">{m.msg}</div>
        <div className="text-[10px] opacity-60 text-right mt-0.5">
          {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </div>
      </div>
    </div>
  );
}
