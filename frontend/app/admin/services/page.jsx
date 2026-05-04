'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import staffApi from '@/lib/axios/staffApi';
import { showError, showSuccess } from '@/lib/utils/toast';
import {
  PageHeader, Spinner, ErrorBox, Button, Table,
  SearchInput, Select, Pagination, SectionCard, EmptyState, BulkBar,
} from '@/components/staff/ui';

const PAGE_SIZE = 20;
const ACTIVE_OPTIONS = [
  { value: '',      label: 'All' },
  { value: 'true',  label: 'Active only' },
  { value: 'false', label: 'Inactive only' },
];

export default function AdminServicesPage() {
  const t      = useTranslations('admin.services');
  const router = useRouter();

  const [items, setItems]           = useState(null);
  const [meta, setMeta]             = useState({ total: 0, totalPages: 1 });
  const [error, setError]           = useState(null);
  const [confirmDelete, setConfirm] = useState(null); // service _id
  const [q, setQ]                   = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage]             = useState(1);
  const [bulkImporting, setBulkImporting] = useState(false);

  const downloadSampleCsv = () => {
    const header = 'slug,name_en,name_hi,name_ar,name_de,tagline,category,description_en,technologies,hourly_rate_inr,image_url,icon_url,sort_order,active';
    const row1   = 'ai-engineer,AI Engineer,एआई इंजीनियर,مهندس الذكاء الاصطناعي,KI-Ingenieur,Build AI-powered products fast,AI Engineers,Hire pre-vetted AI engineers for your product team.,TensorFlow|PyTorch|LangChain|Python,2500,https://cdn.example.com/ai.jpg,https://cdn.example.com/ai-icon.svg,1,true';
    const row2   = 'frontend-developer,Frontend Developer,,,, Build stunning UIs,Frontend Development,Expert React & Next.js developers ready to ship.,React|Next.js|TypeScript|Tailwind,2000,,,2,true';
    const row3   = 'devops-engineer,DevOps Engineer,,,,Cloud & CI/CD experts,DevOps,Scale your infrastructure with certified DevOps engineers.,AWS|Docker|Kubernetes|Terraform,2200,,,3,true';
    const csv    = [header, row1, row2, row3].join('\n');
    const blob   = new Blob([csv], { type: 'text/csv' });
    const a      = document.createElement('a');
    a.href       = URL.createObjectURL(blob);
    a.download   = 'quickhire-services-sample.csv';
    a.click();
  };

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(PAGE_SIZE));
    if (q.trim()) params.set('q', q.trim());
    if (activeFilter) params.set('active', activeFilter);
    return params.toString();
  }, [page, q, activeFilter]);

  const load = useCallback(() => {
    staffApi.get(`/admin/services?${queryString}`)
      .then((r) => {
        setItems(r.data?.data || []);
        setMeta(r.data?.meta || { total: 0, totalPages: 1 });
        setError(null);
      })
      .catch((e) => setError(e?.response?.data?.error?.message || 'Failed to load services'));
  }, [queryString]);

  useEffect(() => { load(); }, [load]);

  const updateQ      = (v) => { setQ(v); setPage(1); };
  const updateActive = (e) => { setActiveFilter(e.target.value); setPage(1); };

  // Bulk selection — fires PUT /admin/services/:id with { active }
  // for every ticked row in parallel and refreshes the list.
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const toggleSelect = (id) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const clearSelection = () => setSelectedIds(new Set());
  const isAllVisibleSelected = (items || []).length > 0 && (items || []).every((i) => selectedIds.has(i._id));
  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllVisibleSelected) (items || []).forEach((i) => next.delete(i._id));
      else (items || []).forEach((i) => next.add(i._id));
      return next;
    });
  };
  const bulkSetActive = async (active) => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => staffApi.put(`/admin/services/${id}`, { active })),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      const ok = results.length - failed;
      if (ok > 0) showSuccess(`${ok} service${ok === 1 ? '' : 's'} ${active ? 'activated' : 'deactivated'}.`);
      if (failed > 0) showError(`${failed} service${failed === 1 ? '' : 's'} failed — try again.`);
      clearSelection();
      load();
    } finally {
      setBulkBusy(false);
    }
  };

  const handleDelete = async (s) => {
    try {
      await staffApi.delete(`/admin/services/${s._id}`);
      const displayName = typeof s.name === 'object' ? (s.name?.en || Object.values(s.name)[0] || '') : (s.name || '');
      showSuccess(`"${displayName}" deleted.`);
      setConfirm(null);
      load();
    } catch (e) {
      showError(e?.response?.data?.error?.message || 'Failed to delete');
    }
  };

  const cols = [
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
      render: (s) => (
        <input
          type="checkbox"
          checked={selectedIds.has(s._id)}
          onChange={(e) => { e.stopPropagation(); toggleSelect(s._id); }}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-[#D6EBCF] text-[#45A735] focus:ring-[#45A735] cursor-pointer"
          aria-label={`Select service ${s._id}`}
        />
      ),
    },
    {
      key: 'name',
      label: 'Name',
      render: (s) => (
        <div>
          <p className="font-open-sauce-semibold text-[#26472B]">
            {typeof s.name === 'object' ? s.name.en : s.name}
          </p>
          {s.slug ? (
            <a href={`/service-details/${s.slug}`} target="_blank" rel="noopener"
               className="text-xs text-[#45A735] font-mono hover:underline mt-0.5 inline-block">
              /service-details/{s.slug}
            </a>
          ) : (
            <span className="text-xs text-[#e53e3e] mt-0.5 inline-block">No slug — edit to set URL</span>
          )}
        </div>
      ),
    },
    {
      key: 'hourlyRate',
      label: 'Base Rate',
      render: (s) => (
        <span className="font-open-sauce-semibold text-[#26472B]">
          ₹{(s.hourlyRate || s.pricing?.hourly || 0).toLocaleString('en-IN')}/h
        </span>
      ),
    },
    {
      key: 'technologies',
      label: 'Tech Stack',
      render: (s) => {
        const techs = (s.technologies || []).map((t) => {
          if (typeof t === 'object' && t !== null) return t.en || Object.values(t)[0] || '';
          return typeof t === 'string' ? t : '';
        }).filter(Boolean);
        if (!techs.length) return <span className="text-[#909090]">—</span>;
        return (
          <span className="text-sm">
            {techs.slice(0, 3).join(', ')}
            {techs.length > 3 && (
              <span className="text-[#909090] text-xs ml-1">+{techs.length - 3} more</span>
            )}
          </span>
        );
      },
    },
    {
      key: 'sortOrder',
      label: 'Priority',
      render: (s) => (
        <span className="text-sm text-[#636363] font-mono">
          {s.sortOrder != null && s.sortOrder !== 999 ? `#${s.sortOrder}` : '—'}
        </span>
      ),
    },
    {
      key: 'faqs',
      label: 'FAQs',
      render: (s) => {
        const count = (s.faqs || []).length;
        return <span className="text-[#909090] text-sm">{count} FAQ{count !== 1 ? 's' : ''}</span>;
      },
    },
    {
      key: 'active',
      label: 'Status',
      render: (s) => (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
          s.active !== false ? 'bg-[#E5F1E2] text-[#26472B]' : 'bg-[#F5F5F5] text-[#909090]'
        }`}>
          {s.active !== false ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (s) => {
        const isConfirm = confirmDelete === s._id;
        return (
          <div className="flex items-center gap-2 justify-end">
            {isConfirm ? (
              <>
                <span className="text-xs text-[#636363]">Delete?</span>
                <Button size="sm" variant="danger" onClick={() => handleDelete(s)}>Yes, delete</Button>
                <Button size="sm" variant="subtle" onClick={() => setConfirm(null)}>Cancel</Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="subtle"
                  onClick={() => router.push(`/admin/services/${s._id}/edit`)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setConfirm(s._id)}
                >
                  Delete
                </Button>
              </>
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
        helpText="Services power the entire booking catalogue. Edit copy / pricing / FAQs without a deploy."
        action={
          <div className="flex items-center gap-2">
            <label className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#45A735] text-[#26472B] text-sm font-medium cursor-pointer hover:bg-[#F2F9F1] transition-colors ${bulkImporting ? 'opacity-60 cursor-wait' : ''}`}>
              {bulkImporting ? '⏳ Importing…' : '📥 Bulk Import CSV'}
              <input type="file" accept=".csv" className="hidden" disabled={bulkImporting}
                onChange={async (e) => {
                  const f = e.target.files?.[0]; e.target.value = '';
                  if (!f) return;
                  setBulkImporting(true);
                  try {
                    const fd = new FormData(); fd.append('file', f);
                    const r = await staffApi.post('/admin/services/bulk-import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                    const d = r.data?.data;
                    showSuccess(`Done! Created: ${d.created}, Updated: ${d.updated}${d.errors?.length ? `, Errors: ${d.errors.length}` : ''}`);
                    if (d.errors?.length) console.warn('Bulk import errors:', d.errors);
                    load();
                  } catch (ex) {
                    showError(ex?.response?.data?.error?.message || 'Bulk import failed');
                  } finally { setBulkImporting(false); }
                }}
              />
            </label>
            <button onClick={downloadSampleCsv} className="px-3 py-2 rounded-lg border border-[#D0E8CB] text-[#555] text-sm hover:bg-[#F2F9F1] transition-colors">
              📄 Sample CSV
            </button>
            <Button variant="primary" onClick={() => router.push('/admin/services/new')}>
              + New Service
            </Button>
          </div>
        }
      />
      <div className="p-4 sm:p-8 space-y-4">
        <SectionCard
          title="Filters"
          description="Narrow by name, slug, or active state."
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SearchInput
              value={q}
              onChange={updateQ}
              placeholder="Search by name or slug"
            />
            <Select label="Active" value={activeFilter} onChange={updateActive}>
              {ACTIVE_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>{o.label}</option>
              ))}
            </Select>
            <div className="flex items-end text-xs text-[#909090]">
              {meta.total != null && `${meta.total} service${meta.total === 1 ? '' : 's'}`}
            </div>
          </div>
        </SectionCard>
        <ErrorBox error={error} />

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex justify-center">
            <BulkBar count={selectedIds.size} onClear={clearSelection}>
              <button
                type="button"
                onClick={() => bulkSetActive(true)}
                disabled={bulkBusy}
                className="px-3 py-1 rounded-full text-[11px] font-open-sauce-semibold bg-[#45A735] hover:bg-[#78EB54] hover:text-[#0F3B0F] transition-colors disabled:opacity-50"
              >
                {bulkBusy ? 'Working…' : 'Activate'}
              </button>
              <button
                type="button"
                onClick={() => bulkSetActive(false)}
                disabled={bulkBusy}
                className="px-3 py-1 rounded-full text-[11px] font-open-sauce-semibold bg-amber-500 hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                Deactivate
              </button>
            </BulkBar>
          </div>
        )}

        {items === null && !error && <Spinner />}
        {items !== null && items.length === 0 && (
          <EmptyState
            title={q || activeFilter ? 'No services match these filters' : 'No services yet'}
            description={
              q || activeFilter
                ? 'Try clearing the search or active filter.'
                : 'Create your first service to start accepting bookings.'
            }
            action={
              q || activeFilter ? (
                <Button variant="subtle" size="md" onClick={() => { updateQ(''); setActiveFilter(''); }}>
                  Clear filters
                </Button>
              ) : (
                <Button variant="primary" size="md" onClick={() => router.push('/admin/services/new')}>
                  + Create service
                </Button>
              )
            }
          />
        )}
        {items !== null && items.length > 0 && (
          <>
            <Table columns={cols} rows={items} keyField="_id" />
            <Pagination page={page} total={meta.total || 0} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
