'use client';

import { useEffect, useState, useCallback } from 'react';
import staffApi from '@/lib/axios/staffApi';
import { showError, showSuccess } from '@/lib/utils/toast';
import {
  PageHeader,
  Table,
  StatusBadge,
  Spinner,
  ErrorBox,
  Button,
  EmptyState,
  BulkBar,
} from '@/components/staff/ui';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

const ROLE_TABS = [
  { label: 'All',              value: ''         },
  { label: 'Customers',        value: 'user'     },
  { label: 'Project Managers', value: 'pm'       },
  { label: 'Resources',        value: 'resource' },
  { label: 'Admins',           value: 'admin'    },
];

const ROLE_BADGE = {
  user:     { bg: 'bg-[#F2F9F1]',  text: 'text-[#26472B]',  label: 'Customer'        },
  pm:       { bg: 'bg-blue-50',    text: 'text-blue-700',    label: 'Project Manager' },
  resource: { bg: 'bg-purple-50',  text: 'text-purple-700',  label: 'Resource'        },
  admin:    { bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'Admin'           },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const cfg = ROLE_BADGE[role] || { bg: 'bg-[#F5F7F5]', text: 'text-[#484848]', label: role };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-open-sauce-semibold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}
    >
      {cfg.label}
    </span>
  );
}

function UserCell({ user }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#45A735] to-[#26472B] text-white text-xs font-open-sauce-bold flex items-center justify-center flex-shrink-0 select-none">
        {getInitials(user.name)}
      </div>
      <div className="min-w-0">
        <div className="font-open-sauce-semibold text-[#26472B] truncate">
          {user.name || '—'}
        </div>
        <div className="text-xs text-[#909090] font-open-sauce">
          {user.mobile || ''}
        </div>
      </div>
    </div>
  );
}

function SuspendAction({ user, suspendConfirm, setSuspendConfirm, onActivate, onSuspend, busy }) {
  const isSuspended = user.meta?.status === 'suspended';
  const isConfirming = suspendConfirm === user._id;

  if (isSuspended) {
    return (
      <Button
        size="sm"
        variant="primary"
        onClick={() => onActivate(user._id)}
        loading={busy[user._id] === 'status'}
        disabled={busy[user._id] === 'status'}
      >
        Activate
      </Button>
    );
  }

  if (isConfirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-[#EF4444] font-open-sauce-semibold whitespace-nowrap">Confirm?</span>
        <Button
          size="sm"
          variant="danger"
          onClick={() => onSuspend(user._id)}
          loading={busy[user._id] === 'status'}
          disabled={busy[user._id] === 'status'}
        >
          Yes
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setSuspendConfirm(null)}
          disabled={busy[user._id] === 'status'}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="danger"
      onClick={() => setSuspendConfirm(user._id)}
      disabled={busy[user._id] === 'status'}
    >
      Suspend
    </Button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [items, setItems]               = useState(null);
  const [error, setError]               = useState(null);
  const [role, setRole]                 = useState('');
  const [page, setPage]                 = useState(1);
  const [meta, setMeta]                 = useState({ total: 0, pageSize: PAGE_SIZE });
  const [search, setSearch]             = useState('');
  const [busy, setBusy]                 = useState({});
  const [suspendConfirm, setSuspendConfirm] = useState(null);

  // Bulk selection — set of _ids the admin has ticked. Bulk suspend /
  // activate fires the existing PATCH /users/:id/status endpoint in
  // parallel and refreshes the list once.
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const toggleSelect = (id) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const clearSelection = () => setSelectedIds(new Set());

  // ── fetch ──────────────────────────────────────────────────────────────────
  const load = useCallback(() => {
    setItems(null);
    setError(null);
    const params = { page, pageSize: PAGE_SIZE, ...(role ? { role } : {}) };
    staffApi
      .get('/admin/users', { params })
      .then((r) => {
        const payload = r.data?.data;
        const arr = Array.isArray(payload) ? payload : (payload?.users ?? []);
        const m   = r.data?.meta ?? { page, pageSize: PAGE_SIZE, total: arr.length };
        setItems(arr);
        setMeta(m);
      })
      .catch(setError);
  }, [role, page]);

  useEffect(() => {
    setPage(1);
  }, [role]);

  useEffect(() => {
    load();
  }, [load]);

  // ── actions ────────────────────────────────────────────────────────────────
  const changeStatus = async (id, status) => {
    setBusy((b) => ({ ...b, [id]: 'status' }));
    try {
      await staffApi.patch(`/admin/users/${id}/status`, { status });
      showSuccess(status === 'suspended' ? 'User suspended.' : 'User activated.');
      setSuspendConfirm(null);
      load();
    } catch (e) {
      showError(e?.response?.data?.error?.message || 'Failed to update status.');
    } finally {
      setBusy((b) => ({ ...b, [id]: null }));
    }
  };

  // ── client-side search ─────────────────────────────────────────────────────
  const filteredItems = (items || []).filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.mobile || '').includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  const isAllVisibleSelected =
    filteredItems.length > 0 && filteredItems.every((u) => selectedIds.has(u._id));
  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllVisibleSelected) filteredItems.forEach((u) => next.delete(u._id));
      else filteredItems.forEach((u) => next.add(u._id));
      return next;
    });
  };

  const bulkSetStatus = async (status) => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => staffApi.patch(`/admin/users/${id}/status`, { status })),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      const ok = results.length - failed;
      if (ok > 0) showSuccess(`${ok} user${ok === 1 ? '' : 's'} ${status === 'active' ? 'activated' : 'suspended'}.`);
      if (failed > 0) showError(`${failed} user${failed === 1 ? '' : 's'} failed — try again.`);
      clearSelection();
      load();
    } finally {
      setBulkBusy(false);
    }
  };

  // ── table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      key: '__select',
      label: (
        <input
          type="checkbox"
          checked={isAllVisibleSelected}
          onChange={toggleAllVisible}
          className="w-4 h-4 rounded border-[#D6EBCF] text-[#45A735] focus:ring-[#45A735] cursor-pointer"
          aria-label="Select all visible"
        />
      ),
      render: (r) => (
        <input
          type="checkbox"
          checked={selectedIds.has(r._id)}
          onChange={(e) => { e.stopPropagation(); toggleSelect(r._id); }}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-[#D6EBCF] text-[#45A735] focus:ring-[#45A735] cursor-pointer"
          aria-label={`Select user ${r.name || r.mobile || r._id}`}
        />
      ),
    },
    {
      key: 'user',
      label: 'User',
      render: (r) => <UserCell user={r} />,
    },
    {
      key: 'email',
      label: 'Email',
      render: (r) => (
        <span className="text-sm text-[#484848] truncate max-w-[200px] block font-open-sauce">
          {r.email || '—'}
        </span>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (r) => <RoleBadge role={r.role} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.meta?.status || 'active'} />,
    },
    {
      key: 'createdAt',
      label: 'Joined',
      render: (r) => (
        <span className="text-sm text-[#636363] font-open-sauce whitespace-nowrap">
          {fmtDate(r.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <SuspendAction
          user={r}
          suspendConfirm={suspendConfirm}
          setSuspendConfirm={setSuspendConfirm}
          onActivate={(id) => changeStatus(id, 'active')}
          onSuspend={(id) => changeStatus(id, 'suspended')}
          busy={busy}
        />
      ),
    },
  ];

  // ── pagination ─────────────────────────────────────────────────────────────
  const total      = meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from       = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to         = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="min-h-screen bg-[#F5F7F5]">
      {/* Header */}
      <PageHeader
        title="Users"
        subtitle="Manage all platform users — customers, PMs, and resources"
        helpText="Use the role tabs to filter. Search matches name, mobile, and email. Suspending a user blocks login but preserves their bookings."
      />

      {/* Role tab pills */}
      <div className="px-4 sm:px-8 pt-4 pb-0 bg-white border-b border-[#E5F1E2]">
        <div className="flex gap-2 flex-wrap pb-3">
          {ROLE_TABS.map((tab) => {
            const isActive = role === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setRole(tab.value)}
                className={
                  isActive
                    ? 'bg-[#45A735] text-white rounded-full px-4 py-1.5 text-sm font-open-sauce-semibold transition-all duration-150'
                    : 'bg-white text-[#636363] border border-[#E5F1E2] rounded-full px-4 py-1.5 text-sm font-open-sauce-medium hover:border-[#45A735] transition-all duration-150'
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="p-4 sm:p-8 space-y-4">
        <ErrorBox error={error} />

        {/* Search bar */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#909090] pointer-events-none"
            width={15}
            height={15}
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx={11} cy={11} r={7} stroke="currentColor" strokeWidth={2} />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, mobile, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-[#E5F1E2] rounded-xl text-sm font-open-sauce bg-white focus:ring-2 focus:ring-[#45A735]/30 focus:border-[#45A735] focus:outline-none placeholder:text-[#909090]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#909090] hover:text-[#484848] transition-colors"
              aria-label="Clear search"
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Bulk action bar — appears when at least one row is ticked */}
        {selectedIds.size > 0 && (
          <div className="flex justify-center">
            <BulkBar count={selectedIds.size} onClear={clearSelection}>
              <button
                type="button"
                onClick={() => bulkSetStatus('active')}
                disabled={bulkBusy}
                className="px-3 py-1 rounded-full text-[11px] font-open-sauce-semibold bg-[#45A735] hover:bg-[#78EB54] hover:text-[#0F3B0F] transition-colors disabled:opacity-50"
              >
                {bulkBusy ? 'Working…' : 'Activate all'}
              </button>
              <button
                type="button"
                onClick={() => bulkSetStatus('suspended')}
                disabled={bulkBusy}
                className="px-3 py-1 rounded-full text-[11px] font-open-sauce-semibold bg-amber-500 hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                Suspend all
              </button>
            </BulkBar>
          </div>
        )}

        {/* Table */}
        {items === null && !error && <Spinner />}
        {items !== null && filteredItems.length === 0 && (
          <EmptyState
            title={search ? 'No users match this search' : `No ${role || 'users'} yet`}
            description={
              search
                ? `Search for "${search}" returned no matches. Note: search runs on the current page only — clear it or paginate to find a specific user.`
                : 'Users register through the customer signup flow. Staff (PMs / resources) are added from their respective admin pages.'
            }
            action={search && (
              <Button variant="subtle" size="md" onClick={() => setSearch('')}>
                Clear search
              </Button>
            )}
          />
        )}
        {items !== null && filteredItems.length > 0 && (
          <Table
            columns={columns}
            rows={filteredItems}
            keyField="_id"
          />
        )}

        {/* Pagination */}
        {items !== null && total > PAGE_SIZE && !search && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#636363] font-open-sauce">
              Showing {from}–{to} of {total} users
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1.5 rounded-lg text-sm font-open-sauce-medium text-[#636363] hover:bg-[#F2F9F1] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                ←
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-[#909090]">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-2.5 py-1.5 rounded-lg text-sm font-open-sauce-medium transition-colors ${
                        p === page
                          ? 'bg-[#45A735] text-white'
                          : 'text-[#636363] hover:bg-[#F2F9F1]'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2.5 py-1.5 rounded-lg text-sm font-open-sauce-medium text-[#636363] hover:bg-[#F2F9F1] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
