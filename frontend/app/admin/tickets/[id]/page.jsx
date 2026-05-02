'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import staffApi from '@/lib/axios/staffApi';
import { showError, showSuccess } from '@/lib/utils/toast';
import {
  PageHeader,
  StatusBadge,
  Spinner,
  ErrorBox,
  Button,
} from '@/components/staff/ui';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(d);
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminTicketDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [ticket, setTicket]               = useState(null);
  const [messages, setMessages]           = useState([]);
  const [error, setError]                 = useState(null);
  const [reply, setReply]                 = useState('');
  const [sending, setSending]             = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [escalating, setEscalating]       = useState(false);
  const [showEscalate, setShowEscalate]   = useState(false);
  const [escalationNotes, setEscalationNotes] = useState('');

  const chatBottomRef = useRef(null);
  const replyRef      = useRef(null);

  // ── Load ticket + messages ─────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const r = await staffApi.get(`/admin/tickets/${id}/detail`);
      setTicket(r.data?.data?.ticket || null);
      setMessages(r.data?.data?.messages || []);
    } catch (e) {
      setError(e);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ── Scroll to bottom when new messages arrive ──────────────────────────────

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Status update ──────────────────────────────────────────────────────────

  const updateStatus = async (status) => {
    setUpdatingStatus(true);
    try {
      await staffApi.patch(`/admin/tickets/${id}/status`, { status });
      setTicket(prev => ({ ...prev, status }));
      showSuccess(`Status updated to ${status.replace('_', ' ')}`);
    } catch (e) {
      showError(e?.response?.data?.error?.message || 'Failed');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ── Escalate ───────────────────────────────────────────────────────────────

  const escalate = async () => {
    setEscalating(true);
    try {
      await staffApi.post(`/admin-ops/tickets/${id}/escalate`, {
        notes: escalationNotes.trim() || undefined,
      });
      setTicket(prev => ({ ...prev, status: 'escalated' }));
      setShowEscalate(false);
      setEscalationNotes('');
      showSuccess('Ticket escalated');
      load();
    } catch (e) {
      showError(e?.response?.data?.error?.message || 'Failed to escalate');
    } finally {
      setEscalating(false);
    }
  };

  // ── Send reply ─────────────────────────────────────────────────────────────

  const sendReply = async (e) => {
    e?.preventDefault();
    const text = reply.trim();
    if (!text) return;
    setSending(true);
    try {
      const r = await staffApi.post(`/admin/tickets/${id}/message`, { msg: text });
      setMessages(prev => [...prev, r.data?.data]);
      setReply('');
      replyRef.current?.focus();
    } catch (e) {
      showError(e?.response?.data?.error?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────

  if (error) {
    return (
      <div>
        <PageHeader
          title="Support Ticket"
          subtitle="Ticket detail"
          action={
            <Button variant="subtle" onClick={() => router.back()}>
              ← Back to Tickets
            </Button>
          }
        />
        <div className="p-6"><ErrorBox error={error} /></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div>
        <PageHeader
          title={`Ticket #${String(id).slice(-8)}`}
          subtitle="Loading…"
          action={
            <Button variant="subtle" onClick={() => router.back()}>
              ← Back to Tickets
            </Button>
          }
        />
        <div className="p-6"><Spinner /></div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title={`Ticket #${String(id).slice(-8)}`}
        subtitle={ticket.subject || 'Support Ticket'}
        breadcrumbs={[
          { label: 'Admin',   href: '/admin' },
          { label: 'Tickets', href: '/admin/tickets' },
          { label: `#${String(id).slice(-8)}` },
        ]}
        helpText="Update status from the right column. Reply to the customer in the message thread; replies are sent via email + in-app notification."
        action={
          <Button variant="subtle" onClick={() => router.back()}>
            ← Back to Tickets
          </Button>
        }
      />

      <div className="p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── LEFT COLUMN ───────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Ticket Info Card */}
          <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-open-sauce-bold text-[#26472B]">Ticket Details</h3>
              <StatusBadge status={ticket.status} />
            </div>

            <InfoRow label="Ticket ID"  value={`#${String(ticket._id)}`}          mono />
            <InfoRow label="Subject"    value={ticket.subject} />
            <InfoRow label="Customer"   value={ticket.customerName} />
            <InfoRow label="Mobile"     value={ticket.customerMobile || '—'} />
            <InfoRow label="Created"    value={fmtDate(ticket.createdAt)} />
            <InfoRow label="Updated"    value={fmtDate(ticket.updatedAt)} />
            <InfoRow label="Category"   value={ticket.category || 'General'} />
            <InfoRow label="Priority"   value={
              ticket.priority
                ? ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)
                : 'Normal'
            } />
          </div>

          {/* Status Update Card */}
          <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
            <h3 className="text-sm font-open-sauce-bold text-[#26472B] mb-3">Update Status</h3>
            <div className="grid grid-cols-2 gap-2">
              {['open', 'in_progress', 'resolved', 'closed'].map(s => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  disabled={ticket.status === s || updatingStatus}
                  className={`px-3 py-2 rounded-lg text-sm font-open-sauce-semibold transition-all ${
                    ticket.status === s
                      ? 'bg-[#45A735] text-white cursor-default'
                      : 'bg-[#F5F7F5] text-[#636363] hover:bg-[#F2F9F1] hover:text-[#26472B] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
                  }`}
                >
                  {s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>

            {/* Escalate */}
            {ticket.status !== 'escalated' && ticket.status !== 'closed' && ticket.status !== 'resolved' && (
              <div className="mt-3 pt-3 border-t border-[#EEF5EC]">
                {!showEscalate ? (
                  <button
                    onClick={() => setShowEscalate(true)}
                    className="w-full px-3 py-2 rounded-lg text-sm font-open-sauce-semibold border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors cursor-pointer"
                  >
                    ⬆ Escalate Ticket
                  </button>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={escalationNotes}
                      onChange={(e) => setEscalationNotes(e.target.value)}
                      placeholder="Optional escalation notes…"
                      rows={2}
                      className="w-full border border-[#E5F1E2] rounded-lg px-3 py-2 text-sm font-open-sauce focus:ring-2 focus:ring-orange-300/40 focus:border-orange-400 focus:outline-none resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={escalate}
                        disabled={escalating}
                        className="flex-1 px-3 py-2 rounded-lg text-sm font-open-sauce-semibold bg-orange-600 text-white hover:bg-orange-700 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {escalating ? 'Escalating…' : 'Confirm Escalate'}
                      </button>
                      <button
                        onClick={() => { setShowEscalate(false); setEscalationNotes(''); }}
                        disabled={escalating}
                        className="px-3 py-2 rounded-lg text-sm font-open-sauce-semibold bg-[#F5F7F5] text-[#636363] hover:bg-[#EEF5EC] transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Original Message Card */}
          {ticket.description && (
            <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
              <h3 className="text-sm font-open-sauce-bold text-[#26472B] mb-2">Original Message</h3>
              <p className="text-sm text-[#484848] font-open-sauce whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN — Chat Panel ──────────────────────────────────────── */}
        <div
          className="lg:col-span-3 bg-white rounded-2xl border border-[#E5F1E2] flex flex-col"
          style={{ height: '680px' }}
        >
          {/* Chat header */}
          <div className="px-5 py-4 border-b border-[#E5F1E2] flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="text-sm font-open-sauce-bold text-[#26472B]">Message Thread</h3>
              <p className="text-[11px] text-[#909090] font-open-sauce">
                {messages.length} message{messages.length !== 1 ? 's' : ''}
              </p>
            </div>
            <StatusBadge status={ticket.status} />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-sm text-[#909090] font-open-sauce">
                No messages yet.
              </div>
            )}

            {messages.map(m => {
              const isAdmin = m.senderRole === 'admin';
              return (
                <div
                  key={String(m._id)}
                  className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} gap-2`}
                >
                  {/* Customer avatar */}
                  {!isAdmin && (
                    <div className="w-7 h-7 rounded-full bg-[#F2F9F1] flex items-center justify-center text-[#45A735] text-xs font-open-sauce-bold flex-shrink-0 mt-0.5">
                      {(ticket.customerName || '?').slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div className={`max-w-[75%] flex flex-col gap-0.5 ${isAdmin ? 'items-end' : 'items-start'}`}>
                    <div className={`text-[10px] font-open-sauce-semibold uppercase tracking-wider ${isAdmin ? 'text-[#45A735] text-right' : 'text-[#909090]'}`}>
                      {isAdmin ? 'Admin Support' : (ticket.customerName || 'Customer')}
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm font-open-sauce leading-relaxed break-words ${
                      isAdmin
                        ? 'bg-[#45A735] text-white rounded-tr-sm'
                        : 'bg-[#F5F7F5] text-[#484848] rounded-tl-sm'
                    }`}>
                      {m.msg}
                    </div>
                    <div className={`text-[10px] text-[#909090] font-open-sauce ${isAdmin ? 'text-right' : ''}`}>
                      {m.createdAt
                        ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ''}
                    </div>
                  </div>

                  {/* Admin avatar */}
                  {isAdmin && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#45A735] to-[#26472B] flex items-center justify-center text-white text-xs font-open-sauce-bold flex-shrink-0 mt-0.5">
                      A
                    </div>
                  )}
                </div>
              );
            })}

            <div ref={chatBottomRef} />
          </div>

          {/* Reply form */}
          <form onSubmit={sendReply} className="border-t border-[#E5F1E2] p-4 flex-shrink-0">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={replyRef}
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendReply(e);
                    }
                  }}
                  placeholder="Type your reply… (Enter to send, Shift+Enter for new line)"
                  rows={2}
                  disabled={sending}
                  className="w-full border border-[#E5F1E2] rounded-xl px-4 py-3 text-sm font-open-sauce text-[#242424] resize-none focus:ring-2 focus:ring-[#45A735]/30 focus:border-[#45A735] focus:outline-none placeholder:text-[#909090] disabled:bg-[#F5F7F5] transition-colors"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={sending || !reply.trim()}
                className="self-end h-10 px-5"
              >
                {sending ? '…' : 'Send'}
              </Button>
            </div>
            <p className="text-[11px] text-[#909090] mt-1.5 font-open-sauce">
              Replying as Admin Support · Customer will be notified
            </p>
          </form>
        </div>

      </div>
    </div>
  );
}

// ─── InfoRow sub-component ────────────────────────────────────────────────────

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex justify-between border-b border-[#F2F9F1] py-2.5 last:border-0 gap-3">
      <span className="text-xs text-[#909090] font-open-sauce-semibold uppercase tracking-wider flex-shrink-0 pt-px">
        {label}
      </span>
      <span className={`text-sm text-[#242424] text-right break-all ${mono ? 'font-mono text-xs' : 'font-open-sauce'}`}>
        {value ?? '—'}
      </span>
    </div>
  );
}
