'use client';
import { useEffect, useState } from 'react';
import staffApi from '@/lib/axios/staffApi';
import { showError, showSuccess } from '@/lib/utils/toast';

const EMPTY_FORM = { from: '', to: '', type: '301', active: true };

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)}
      className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${value ? 'bg-[#45A735]' : 'bg-[#E5F1E2]'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
    </div>
  );
}

export default function SeoRedirects() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId]   = useState(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch]   = useState('');

  const load = () => {
    setLoading(true);
    staffApi.get('/admin/seo/redirects')
      .then((r) => setRows(r.data?.data || []))
      .catch(() => showError('Failed to load redirects'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew  = () => { setEditId('new'); setForm(EMPTY_FORM); };
  const openEdit = (r) => { setEditId(r._id); setForm({ from: r.from, to: r.to, type: String(r.type), active: r.active }); };
  const close    = () => { setEditId(null); setForm(EMPTY_FORM); };

  const save = async () => {
    if (!form.from.trim() || !form.to.trim()) { showError('From and To are required'); return; }
    setSaving(true);
    try {
      if (editId === 'new') {
        await staffApi.post('/admin/seo/redirects', form);
      } else {
        await staffApi.put(`/admin/seo/redirects/${editId}`, form);
      }
      showSuccess('Redirect saved');
      close();
      load();
    } catch { showError('Save failed'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this redirect?')) return;
    setDeleting(id);
    try {
      await staffApi.delete(`/admin/seo/redirects/${id}`);
      showSuccess('Redirect deleted');
      load();
    } catch { showError('Delete failed'); }
    finally { setDeleting(null); }
  };

  const toggleActive = async (r) => {
    try {
      await staffApi.put(`/admin/seo/redirects/${r._id}`, { ...r, active: !r.active });
      setRows((prev) => prev.map((x) => x._id === r._id ? { ...x, active: !x.active } : x));
    } catch { showError('Update failed'); }
  };

  const displayed = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.from.toLowerCase().includes(q) || r.to.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 sm:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#26472B]">Redirects</h1>
          <p className="text-sm text-[#636363] mt-0.5">Manage 301/302 URL redirects without a code deploy.</p>
        </div>
        <button onClick={openNew}
          className="px-4 py-2 rounded-xl bg-[#45A735] text-white text-sm font-semibold hover:bg-[#3a8f2c] transition-colors">
          + Add Redirect
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#909090]" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx={11} cy={11} r={8} /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search from/to URL…"
          className="w-full pl-8 pr-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735] bg-white" />
      </div>

      {/* Modal */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#26472B]">{editId === 'new' ? 'New Redirect' : 'Edit Redirect'}</h2>
              <button onClick={close} className="text-[#909090] hover:text-[#26472B] text-lg leading-none">×</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[#636363] block mb-1">From (old URL path)</label>
                <input value={form.from} onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
                  placeholder="/old-page"
                  className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735]" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#636363] block mb-1">To (destination URL)</label>
                <input value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
                  placeholder="/new-page or https://example.com"
                  className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735]" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-medium text-[#636363] block mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735] bg-white">
                    <option value="301">301 Permanent</option>
                    <option value="302">302 Temporary</option>
                  </select>
                </div>
                <div className="flex items-end gap-2 pb-2">
                  <Toggle value={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} />
                  <span className="text-sm text-[#636363]">{form.active ? 'Active' : 'Paused'}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={close} className="flex-1 py-2 rounded-xl border border-[#E5F1E2] text-sm text-[#636363] hover:border-[#45A735] transition-colors">
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 py-2 rounded-xl bg-[#45A735] text-white text-sm font-semibold hover:bg-[#3a8f2c] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E5F1E2] overflow-hidden">
        {loading ? (
          <div className="px-6 py-10 flex items-center justify-center gap-3 text-[#636363] text-sm">
            <div className="w-5 h-5 rounded-full border-2 border-[#45A735] border-t-transparent animate-spin" />
            Loading…
          </div>
        ) : displayed.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-[#909090] text-sm">No redirects yet.</p>
            <button onClick={openNew} className="mt-3 text-sm text-[#45A735] hover:underline font-medium">+ Add your first redirect</button>
          </div>
        ) : (
          <>
            {/* Table head */}
            <div className="hidden sm:grid grid-cols-[2fr_2fr_80px_80px_120px] gap-3 px-5 py-2 border-b border-[#E5F1E2] bg-[#FAFEF9]">
              {['From', 'To', 'Type', 'Status', 'Actions'].map((h) => (
                <span key={h} className="text-[10px] font-semibold text-[#909090] uppercase tracking-wider">{h}</span>
              ))}
            </div>

            <div className="divide-y divide-[#F5F7F5]">
              {displayed.map((r) => (
                <div key={r._id}
                  className={`grid grid-cols-1 sm:grid-cols-[2fr_2fr_80px_80px_120px] gap-2 sm:gap-3 px-5 py-3 hover:bg-[#F7FBF6] transition-colors ${!r.active ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="text-xs font-mono text-[#26472B] truncate">{r.from}</code>
                  </div>
                  <div className="flex items-center min-w-0">
                    <code className="text-xs font-mono text-[#636363] truncate">{r.to}</code>
                  </div>
                  <div className="flex items-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      String(r.type) === '301' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                    }`}>{r.type}</span>
                  </div>
                  <div className="flex items-center">
                    <Toggle value={r.active} onChange={() => toggleActive(r)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(r)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-[#E5F1E2] text-[#26472B] hover:border-[#45A735] transition-colors">
                      Edit
                    </button>
                    <button onClick={() => del(r._id)} disabled={deleting === r._id}
                      className="text-xs px-2.5 py-1 rounded-lg border border-red-100 text-red-400 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50">
                      {deleting === r._id ? '…' : 'Del'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-[#909090] text-center">{displayed.length} redirect{displayed.length !== 1 ? 's' : ''} — changes apply on next page request</p>
    </div>
  );
}
