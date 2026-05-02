'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import staffApi from '@/lib/axios/staffApi';
import { showError, showSuccess } from '@/lib/utils/toast';
import {
  PageHeader,
  Table,
  StatusBadge,
  Spinner,
  ErrorBox,
  Button,
  Pagination,
} from '@/components/staff/ui';

const PAGE_SIZE = 20;

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

function splitChips(str) {
  return (str || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─── Empty form ───────────────────────────────────────────────────────────────
const EMPTY_FORM = { name: '', mobile: '', email: '', specialization: '' };

// ─── Avatar cell ─────────────────────────────────────────────────────────────
function AvatarNameCell({ item }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#45A735] to-[#26472B] text-white text-xs font-open-sauce-bold flex items-center justify-center flex-shrink-0 select-none">
        {getInitials(item.name)}
      </div>
      <div className="min-w-0">
        <div className="font-open-sauce-semibold text-[#26472B] truncate">
          {item.name || '—'}
        </div>
        <div className="text-xs text-[#909090] font-open-sauce truncate">
          {item.email || ''}
        </div>
      </div>
    </div>
  );
}

// ─── Chip list ────────────────────────────────────────────────────────────────
function ChipList({ values }) {
  if (!values || values.length === 0) return <span className="text-[#909090]">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {values.slice(0, 3).map((v) => (
        <span
          key={v}
          className="inline-block bg-[#F2F9F1] text-[#26472B] text-[11px] font-open-sauce-medium px-2 py-0.5 rounded-full"
        >
          {v}
        </span>
      ))}
      {values.length > 3 && (
        <span className="inline-block bg-[#F5F7F5] text-[#909090] text-[11px] font-open-sauce-medium px-2 py-0.5 rounded-full">
          +{values.length - 3}
        </span>
      )}
    </div>
  );
}

// ─── Remove action (inline 2-step) ───────────────────────────────────────────
function RemoveAction({ item, removeConfirm, setRemoveConfirm, onRemove, busy }) {
  const isConfirming = removeConfirm === item._id;

  if (isConfirming) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-[#EF4444] font-open-sauce-semibold whitespace-nowrap">
          Remove {item.name || item.mobile}?
        </span>
        <Button
          size="sm"
          variant="danger"
          onClick={() => onRemove(item)}
          loading={busy[item._id] === 'remove'}
          disabled={busy[item._id] === 'remove'}
        >
          Yes, remove
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setRemoveConfirm(null)}
          disabled={busy[item._id] === 'remove'}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" variant="subtle" onClick={() => item._onEdit(item)}>
        Edit
      </Button>
      <Button
        size="sm"
        variant="danger"
        onClick={() => setRemoveConfirm(item._id)}
        disabled={busy[item._id] === 'remove'}
      >
        Remove
      </Button>
    </div>
  );
}

// ─── Create / Edit Modal ─────────────────────────────────────────────────────
function PmModal({ open, editPm, form, setForm, onClose, onSave, busy }) {
  if (!open) return null;

  const chips = splitChips(form.specialization);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-[#E5F1E2] w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-open-sauce-bold text-[#26472B]">
              {editPm ? 'Edit PM' : 'New Project Manager'}
            </h3>
            <p className="text-sm text-[#636363] font-open-sauce">
              {editPm ? 'Update PM details' : 'Onboard a new project manager'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#F2F9F1] flex items-center justify-center text-[#636363] text-lg leading-none transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <label className="block text-xs font-open-sauce-semibold text-[#636363] uppercase tracking-wider">
              Name <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full name"
              className="w-full border border-[#E5F1E2] rounded-lg px-3 py-2.5 text-sm font-open-sauce text-[#242424] bg-white focus:ring-2 focus:ring-[#45A735]/30 focus:border-[#45A735] focus:outline-none placeholder:text-[#909090]"
            />
          </div>

          {/* Mobile */}
          <div className="space-y-1">
            <label className="block text-xs font-open-sauce-semibold text-[#636363] uppercase tracking-wider">
              Mobile <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="tel"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              placeholder="10-digit mobile number"
              maxLength={10}
              className="w-full border border-[#E5F1E2] rounded-lg px-3 py-2.5 text-sm font-open-sauce text-[#242424] bg-white focus:ring-2 focus:ring-[#45A735]/30 focus:border-[#45A735] focus:outline-none placeholder:text-[#909090]"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="block text-xs font-open-sauce-semibold text-[#636363] uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@example.com"
              className="w-full border border-[#E5F1E2] rounded-lg px-3 py-2.5 text-sm font-open-sauce text-[#242424] bg-white focus:ring-2 focus:ring-[#45A735]/30 focus:border-[#45A735] focus:outline-none placeholder:text-[#909090]"
            />
          </div>

          {/* Specialization */}
          <div className="space-y-1">
            <label className="block text-xs font-open-sauce-semibold text-[#636363] uppercase tracking-wider">
              Specialization
            </label>
            <input
              type="text"
              value={form.specialization}
              onChange={(e) => setForm({ ...form, specialization: e.target.value })}
              placeholder='e.g. "React, Node.js, Python"'
              className="w-full border border-[#E5F1E2] rounded-lg px-3 py-2.5 text-sm font-open-sauce text-[#242424] bg-white focus:ring-2 focus:ring-[#45A735]/30 focus:border-[#45A735] focus:outline-none placeholder:text-[#909090]"
            />
            <p className="text-[11px] text-[#909090] font-open-sauce">Comma-separated, e.g. "React, Node.js, Python"</p>
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {chips.map((c) => (
                  <span
                    key={c}
                    className="inline-block bg-[#F2F9F1] text-[#26472B] text-[11px] font-open-sauce-medium px-2 py-0.5 rounded-full"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-[#E5F1E2]">
          <Button variant="subtle" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onSave}
            loading={busy}
            disabled={!form.name || !form.mobile || busy}
          >
            {editPm ? 'Save Changes' : 'Create PM'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminPmsPage() {
  const [items, setItems]             = useState(null);
  const [meta, setMeta]               = useState({ total: 0, totalPages: 1 });
  const [error, setError]             = useState(null);
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editPm, setEditPm]           = useState(null); // null = create, object = edit
  const [form, setForm]               = useState(EMPTY_FORM);
  const [busy, setBusy]               = useState({});
  const [saveBusy, setSaveBusy]       = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(null);

  // ── fetch (server-side search + pagination) ────────────────────────────────
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(PAGE_SIZE));
    if (search.trim()) params.set('q', search.trim());
    return params.toString();
  }, [page, search]);

  const load = useCallback(() => {
    staffApi
      .get(`/admin/pms?${queryString}`)
      .then((r) => {
        setItems(r.data?.data || []);
        setMeta(r.data?.meta || { total: 0, totalPages: 1 });
        setError(null);
      })
      .catch((err) => setError(err?.response?.data?.error?.message || 'Failed to load PMs'));
  }, [queryString]);

  useEffect(() => {
    load();
  }, [load]);

  // Search resets page back to 1 so the user always sees the top of the
  // newly-narrowed result set.
  const updateSearch = (v) => { setSearch(v); setPage(1); };

  // ── modal helpers ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditPm(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (pm) => {
    setEditPm(pm);
    setForm({
      name:           pm.name           || '',
      mobile:         pm.mobile         || '',
      email:          pm.email          || '',
      specialization: (pm.specialization || []).join(', '),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saveBusy) return;
    setModalOpen(false);
    setEditPm(null);
    setForm(EMPTY_FORM);
  };

  // ── save ───────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!form.name || !form.mobile) return;
    setSaveBusy(true);
    const body = {
      name:           form.name.trim(),
      mobile:         form.mobile.trim(),
      email:          form.email.trim(),
      specialization: splitChips(form.specialization),
    };
    try {
      if (editPm?._id) {
        await staffApi.put(`/admin/pms/${editPm._id}`, body);
        showSuccess('PM updated successfully.');
      } else {
        await staffApi.post('/admin/pms', body);
        showSuccess('Project Manager created successfully.');
      }
      setModalOpen(false);
      setEditPm(null);
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      showError(e?.response?.data?.error?.message || 'Failed to save.');
    } finally {
      setSaveBusy(false);
    }
  };

  // ── remove ─────────────────────────────────────────────────────────────────
  const remove = async (pm) => {
    setBusy((b) => ({ ...b, [pm._id]: 'remove' }));
    try {
      await staffApi.delete(`/admin/pms/${pm._id}`);
      showSuccess(`${pm.name || pm.mobile} removed.`);
      setRemoveConfirm(null);
      load();
    } catch (e) {
      showError(e?.response?.data?.error?.message || 'Failed to remove.');
    } finally {
      setBusy((b) => ({ ...b, [pm._id]: null }));
    }
  };

  // ── derived stats — derived from the CURRENT page only since the server
  // is now paginated. The "Total PMs" stat reflects the global count from
  // the response meta, while "Active" and "Specializations" describe the
  // visible page (acceptable trade-off; full-fleet stats would need a
  // separate /admin/pms/stats endpoint we don't have yet).
  const allItems   = items || [];
  const activeCount = allItems.filter((pm) => (pm.meta?.status || 'active') === 'active').length;
  const specSet    = new Set(
    allItems.flatMap((pm) => pm.specialization || []).filter(Boolean)
  );

  // Server-side search means items already match the query — no client
  // filter step. Just attach the edit callback for the row.
  const tableRows = allItems.map((pm) => ({ ...pm, _onEdit: openEdit }));

  // ── columns ────────────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (r) => <AvatarNameCell item={r} />,
    },
    {
      key: 'mobile',
      label: 'Mobile',
      render: (r) => (
        <span className="text-sm text-[#484848] font-open-sauce">{r.mobile || '—'}</span>
      ),
    },
    {
      key: 'specialization',
      label: 'Specialization',
      render: (r) => <ChipList values={r.specialization || []} />,
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
        <RemoveAction
          item={r}
          removeConfirm={removeConfirm}
          setRemoveConfirm={setRemoveConfirm}
          onRemove={remove}
          busy={busy}
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7F5]">
      {/* Header */}
      <PageHeader
        title="Project Managers"
        subtitle="Onboard and manage project managers"
        action={
          <Button variant="primary" onClick={openCreate}>
            + Add PM
          </Button>
        }
      />

      <div className="p-4 sm:p-8 space-y-4">
        <ErrorBox error={error} />

        {/* Quick stats */}
        {items !== null && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total PMs',          value: meta.total ?? allItems.length },
              { label: 'Active (this page)', value: activeCount     },
              { label: 'Specializations',    value: specSet.size    },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-white border border-[#E5F1E2] rounded-xl p-4"
              >
                <div className="text-[11px] uppercase tracking-wider text-[#909090] font-open-sauce-semibold">
                  {label}
                </div>
                <div className="text-2xl font-open-sauce-bold text-[#26472B] mt-1">
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}

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
            onChange={(e) => updateSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-[#E5F1E2] rounded-xl text-sm font-open-sauce bg-white focus:ring-2 focus:ring-[#45A735]/30 focus:border-[#45A735] focus:outline-none placeholder:text-[#909090]"
          />
          {search && (
            <button
              onClick={() => updateSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#909090] hover:text-[#484848] transition-colors"
              aria-label="Clear search"
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Table */}
        {items === null && !error && <Spinner />}
        {items !== null && (
          <>
            <Table
              columns={columns}
              rows={tableRows}
              keyField="_id"
              empty={search ? 'No PMs match this search.' : "No project managers yet. Click '+ Add PM' to onboard one."}
            />
            <Pagination page={page} total={meta.total || 0} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </div>

      {/* Create / Edit Modal */}
      <PmModal
        open={modalOpen}
        editPm={editPm}
        form={form}
        setForm={setForm}
        onClose={closeModal}
        onSave={save}
        busy={saveBusy}
      />
    </div>
  );
}
