'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import staffApi from '@/lib/axios/staffApi';
import chatSocketService from '@/lib/services/chatSocketService';
import { showError, showSuccess } from '@/lib/utils/toast';
import { s } from '@/lib/utils/i18nText';
import { PageHeader, StatusBadge, Spinner, ErrorBox, Button } from '@/components/staff/ui';

function fmtDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleString(); } catch { return String(d); } }

export default function ResourceAssignmentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const [logHours, setLogHours] = useState('');
  const [logNote, setLogNote] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await staffApi.get(`/resource/assignments/${id}`);
      setJob(r.data?.data || null);
    } catch (e) { setError(e); }
  }, [id]);

  const loadMessages = useCallback(async () => {
    try {
      const r = await staffApi.get(`/resource/assignments/${id}/messages`);
      setMessages(r.data?.data || []);
    } catch {}
  }, [id]);

  useEffect(() => { load(); loadMessages(); }, [load, loadMessages]);

  // Real-time chat via socket. The backend (chat.service.js) broadcasts
  // `new-message` to room `booking_<id>` and direct-pushes `message:new`
  // to each participant's `user_<uid>` room. The resource is auto-joined
  // to their `user_<resourceId>` room on socket auth, so the direct push
  // fires regardless — but we ALSO join `booking_<id>` so the canonical
  // room broadcast is delivered. With 5K active resources, the previous
  // per-detail-page 5s poll would amplify into ~60K req/min on the chat
  // collection; with socket-driven updates that drops to ~0.
  useEffect(() => {
    if (!id) return;
    const sock = chatSocketService.socket;
    const bookingRoom = `booking_${id}`;

    const onMessage = (msg) => {
      if (!msg) return;
      // The user_<resourceId> push fires for every booking the resource
      // is part of — filter so only this booking's messages show here.
      const msgBookingId = String(
        msg.bookingId ||
        (typeof msg.roomId === 'string' && msg.roomId.replace(/^booking_/, '')) ||
        '',
      );
      if (msgBookingId && msgBookingId !== String(id)) return;
      setMessages((prev) => {
        const incomingId = String(msg._id || msg.id || msg.tempId || '');
        const exists = prev.some((m) => String(m._id || m.id || m.tempId) === incomingId);
        return exists ? prev : [...prev, msg];
      });
    };

    if (sock) {
      sock.emit('chat:join', { roomId: bookingRoom });
      sock.on('new-message', onMessage); // room broadcast
      sock.on('message:new', onMessage); // direct user-room push
    }

    // Polling now a 30s safety net — only kicks in if the socket drops.
    pollRef.current = setInterval(loadMessages, 30000);

    return () => {
      if (sock) {
        sock.emit('chat:leave', { roomId: bookingRoom });
        sock.off('new-message', onMessage);
        sock.off('message:new', onMessage);
      }
      clearInterval(pollRef.current);
    };
  }, [id, loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const action = async (kind) => {
    setBusy(kind);
    try { await staffApi.post(`/resource/assignments/${id}/${kind}`, {}); await load(); }
    catch (e) { showError(e?.response?.data?.error?.message || `Failed to ${kind}`); }
    finally { setBusy(null); }
  };

  const submitLog = async (e) => {
    e?.preventDefault();
    const hours = Number(logHours);
    if (!hours || hours <= 0) { showError('Enter valid hours'); return; }
    setBusy('log');
    try {
      await staffApi.post('/resource/time-log', { bookingId: id, hours, note: logNote });
      setLogHours(''); setLogNote('');
      showSuccess('Time logged ✓');
    } catch (e) { showError(e?.response?.data?.error?.message || 'Failed'); }
    finally { setBusy(null); }
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      const r = await staffApi.post(`/resource/assignments/${id}/messages`, { msg: text });
      setMessages((arr) => [...arr, r.data?.data]);
      setDraft('');
    } catch (e) { showError(e?.response?.data?.error?.message || 'Failed'); }
    finally { setSending(false); }
  };

  if (error) return <div className="p-6"><ErrorBox error={error} /></div>;
  if (!job) return <div className="p-6"><Spinner /></div>;
  const svc = job.services?.[0] || {};

  return (
    <div>
      <PageHeader
        title={`Assignment ${String(job._id).slice(-8)}`}
        subtitle="Your booking — accept, log time, chat with the team"
        action={<Button variant="subtle" size="sm" onClick={() => router.push('/resource/assignments')}>← Back</Button>}
      />
      <div className="p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — Details, accept/decline, log */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-open-sauce-bold text-[#26472B]">Status</h3>
              <StatusBadge status={job.status} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <Field label="Customer" value={s(job.customerName)} sub={job.customerMobile} />
              <Field label="Service" value={s(job.serviceName)} />
              <Field label="Date" value={svc.preferredStartDate ? new Date(svc.preferredStartDate).toLocaleDateString() : '—'} />
              <Field label="Start Time" value={svc.startTime || '—'} />
              <Field label="End Time" value={svc.endTime || '—'} />
              <Field label="Duration" value={`${svc.durationTime || 0}h`} />
              <Field label="PM" value={job.projectManager?.name || '—'} sub={job.projectManager?.mobile} />
              <Field label="Accepted At" value={fmtDate(job.resourceAcceptedAt)} />
            </div>
            {svc.requirements && (
              <div className="mt-4">
                <div className="text-[11px] uppercase tracking-wider text-[#909090] font-open-sauce-semibold mb-1">Requirements</div>
                <div className="text-sm text-[#26472B] whitespace-pre-wrap">{svc.requirements}</div>
              </div>
            )}
            <div className="flex gap-2 flex-wrap mt-5 border-t border-[#E5F1E2] pt-4">
              {!job.resourceAcceptedAt && (
                <>
                  <Button variant="primary" onClick={() => action('accept')} disabled={!!busy}>
                    {busy === 'accept' ? '…' : 'Accept'}
                  </Button>
                  <Button variant="danger" onClick={() => action('decline')} disabled={!!busy}>
                    {busy === 'decline' ? '…' : 'Decline'}
                  </Button>
                </>
              )}
              {job.resourceAcceptedAt && <span className="text-sm text-[#26472B]">✓ Accepted</span>}
            </div>
          </div>

          {/* Time Log */}
          <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
            <h3 className="text-sm font-open-sauce-bold text-[#26472B] mb-3">Log Time</h3>
            <form onSubmit={submitLog} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="24"
                  placeholder="Hours"
                  value={logHours}
                  onChange={(e) => setLogHours(e.target.value)}
                  className="border border-[#E5F1E2] rounded-lg px-3 py-2 text-sm w-32"
                />
                <input
                  type="text"
                  placeholder="Note (optional)"
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  className="border border-[#E5F1E2] rounded-lg px-3 py-2 text-sm flex-1"
                />
                <Button type="submit" variant="primary" disabled={busy === 'log' || !logHours}>
                  {busy === 'log' ? '…' : 'Log'}
                </Button>
              </div>
            </form>
          </div>

          {/* History */}
          {(job.history || []).length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
              <h3 className="text-sm font-open-sauce-bold text-[#26472B] mb-3">Recent Activity</h3>
              <div className="space-y-2">
                {[...job.history].reverse().slice(0, 10).map((h, i) => (
                  <div key={i} className="text-xs border-l-2 border-[#45A735] pl-3 py-1">
                    <div className="text-[#26472B] font-open-sauce-semibold">{h.event} <span className="text-[#909090] font-normal">· {h.actorRole}</span></div>
                    {h.note && <div className="text-[#636363]">{h.note}</div>}
                    <div className="text-[#909090]">{fmtDate(h.at)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Chat */}
        <div className="bg-white rounded-2xl border border-[#E5F1E2] p-0 flex flex-col h-[600px]">
          <div className="px-5 py-3 border-b border-[#E5F1E2]">
            <h3 className="text-sm font-open-sauce-bold text-[#26472B]">Group Chat</h3>
            <div className="text-[11px] text-[#909090]">Customer · PM · Resource · Admin</div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.length === 0 && <div className="text-sm text-[#909090] text-center mt-8">No messages yet.</div>}
            {messages.map((m) => <ChatBubble key={String(m._id)} m={m} mineRole="resource" />)}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={sendMessage} className="border-t border-[#E5F1E2] p-3 flex gap-2">
            <input type="text" className="flex-1 border border-[#E5F1E2] rounded-lg px-3 py-2 text-sm"
              placeholder="Message PM/customer…" value={draft} onChange={(e) => setDraft(e.target.value)} disabled={sending} />
            <Button type="submit" variant="primary" disabled={sending || !draft.trim()}>{sending ? '…' : 'Send'}</Button>
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

function ChatBubble({ m, mineRole }) {
  const role = m.senderRole || 'user';
  const isMine = role === mineRole;
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
