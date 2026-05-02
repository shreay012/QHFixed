'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import staffApi from '@/lib/axios/staffApi';
import { showError, showSuccess } from '@/lib/utils/toast';
import {
  PageHeader, Spinner, ErrorBox, Button, Table,
  SearchInput, Select, Pagination, SectionCard,
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
      key: 'name',
      label: 'Name',
      render: (s) => (
        <div>
          <p className="font-open-sauce-semibold text-[#26472B]">
            {typeof s.name === 'object' ? s.name.en : s.name}
          </p>
          {typeof s.description === 'string' && s.description && (
            <p className="text-xs text-[#909090] truncate max-w-xs mt-0.5">{s.description}</p>
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
        action={
          <Button variant="primary" onClick={() => router.push('/admin/services/new')}>
            + New Service
          </Button>
        }
      />
      <div className="p-4 sm:p-8 space-y-4">
        <SectionCard title="Filters">
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
        {items === null && !error && <Spinner />}
        {items !== null && (
          <>
            <Table columns={cols} rows={items} keyField="_id" empty={t('noResults')} />
            <Pagination page={page} total={meta.total || 0} pageSize={PAGE_SIZE} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
