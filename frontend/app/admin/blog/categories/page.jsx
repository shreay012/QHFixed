'use client';

import { useEffect, useState } from 'react';
import staffApi from '@/lib/axios/staffApi';
import { showSuccess, showError } from '@/lib/utils/toast';
import { PageHeader, Button, Spinner } from '@/components/staff/ui';

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'ar', label: 'العربية' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
];

const EMPTY = {
  slug: '', name: { en: '', hi: '', ar: '', de: '', es: '' },
  description: { en: '', hi: '', ar: '', de: '', es: '' },
  coverImage: '', order: 0, active: true,
};

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 80);
}

export default function BlogCategoriesPage() {
  const [cats, setCats]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState(null); // null = list, {} = edit/new
  const [locale, setLocale]   = useState('en');
  const [saving, setSaving]   = useState(false);
  const [editId, setEditId]   = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await staffApi.get('/blog/admin/categories');
      setCats(res.data.data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditId(null); setForm({ ...EMPTY }); setLocale('en'); }
  function openEdit(cat) { setEditId(cat._id); setForm({ ...EMPTY, ...cat }); setLocale('en'); }
  function close() { setForm(null); setEditId(null); }

  function setI18n(field, lang, val) {
    setForm(f => ({ ...f, [field]: { ...f[field], [lang]: val } }));
  }

  async function save() {
    if (!form.slug) return showError('Slug is required');
    if (!form.name?.en) return showError('English name is required');
    setSaving(true);
    try {
      if (editId) {
        await staffApi.put(`/blog/admin/categories/${editId}`, form);
        showSuccess('Category updated');
      } else {
        await staffApi.post('/blog/admin/categories', form);
        showSuccess('Category created');
      }
      await load(); close();
    } catch (e) {
      showError(e?.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  }

  async function del(id) {
    if (!window.confirm('Delete this category?')) return;
    try {
      await staffApi.delete(`/blog/admin/categories/${id}`);
      showSuccess('Deleted');
      await load();
    } catch { showError('Delete failed'); }
  }

  // ── Form view ─────────────────────────────────────────────────────────
  if (form !== null) {
    return (
      <div className="min-h-screen bg-[#F8FCF7]">
        <PageHeader
          title={editId ? 'Edit Category' : 'New Category'}
          backHref="/admin/blog/categories"
          breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Blog', href: '/admin/blog' }, { label: 'Categories', href: '/admin/blog/categories' }, { label: editId ? 'Edit' : 'New' }]}
        />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Slug + order */}
          <div className="bg-white rounded-xl border border-[#E5F1E2] p-6 space-y-4">
            <h3 className="font-semibold text-[#26472B]">Settings</h3>
            <div>
              <label className="block text-sm font-medium text-[#444] mb-1">Slug *</label>
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                     placeholder="e.g. tech-insights"
                     className="w-full border border-[#D0E8CB] rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#45A735]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#444] mb-1">Order</label>
                <input type="number" value={form.order} onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))}
                       className="w-full border border-[#D0E8CB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#45A735]" />
              </div>
              <div className="flex items-end pb-0.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                         className="accent-[#45A735] w-4 h-4" />
                  <span className="text-sm font-medium text-[#444]">Active</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#444] mb-1">Cover Image URL</label>
              <input value={form.coverImage} onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))}
                     placeholder="https://…"
                     className="w-full border border-[#D0E8CB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#45A735]" />
            </div>
          </div>

          {/* Multi-locale name + description */}
          <div className="bg-white rounded-xl border border-[#E5F1E2] p-6">
            <h3 className="font-semibold text-[#26472B] mb-4">Content</h3>
            {/* Locale tabs */}
            <div className="flex gap-1 border-b border-[#E5F1E2] mb-5">
              {LOCALES.map(l => (
                <button key={l.code} onClick={() => setLocale(l.code)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${locale === l.code ? 'bg-[#45A735] text-white' : 'text-[#666] hover:text-[#333]'}`}>
                  {l.label}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#444] mb-1">
                  Name {locale === 'en' ? '*' : <span className="text-[#aaa] text-xs">(optional)</span>}
                </label>
                <input value={form.name?.[locale] || ''} onChange={e => setI18n('name', locale, e.target.value)}
                       onBlur={e => { if (locale === 'en' && !form.slug) setForm(f => ({ ...f, slug: slugify(e.target.value) })); }}
                       placeholder={`Category name in ${LOCALES.find(l => l.code === locale)?.label}`}
                       className="w-full border border-[#D0E8CB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#45A735]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#444] mb-1">Description</label>
                <textarea value={form.description?.[locale] || ''} onChange={e => setI18n('description', locale, e.target.value)}
                          rows={3} placeholder="Short description…"
                          className="w-full border border-[#D0E8CB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#45A735] resize-none" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button onClick={close} className="px-5 py-2.5 rounded-xl border border-[#D0E8CB] text-sm text-[#555] hover:bg-[#F2F9F1]">Cancel</button>
            <button onClick={save} disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-[#45A735] text-white text-sm font-medium hover:bg-[#3a9028] disabled:opacity-60 transition-colors">
              {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8FCF7]">
      <PageHeader
        title="Blog Categories"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Blog', href: '/admin/blog' }, { label: 'Categories' }]}
        backHref="/admin/blog"
        action={<Button onClick={openNew} variant="primary">+ New Category</Button>}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : cats.length === 0 ? (
          <div className="text-center py-20 text-[#888]">
            <div className="text-5xl mb-4">📂</div>
            <p className="font-medium text-[#444]">No categories yet</p>
            <button onClick={openNew} className="mt-3 text-[#45A735] hover:underline text-sm">Create your first category →</button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E5F1E2] overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-[#F8FCF7] border-b border-[#E5F1E2]">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-[#444]">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#444]">Slug</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#444]">Order</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#444]">Status</th>
                  <th className="text-right px-5 py-3 font-semibold text-[#444]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F9F1]">
                {cats.map(cat => (
                  <tr key={cat._id} className="hover:bg-[#FAFEF9]">
                    <td className="px-5 py-4 font-medium text-[#1a2e1a]">{cat.name?.en || '—'}</td>
                    <td className="px-4 py-4 text-[#888] font-mono text-xs">{cat.slug}</td>
                    <td className="px-4 py-4 text-[#888]">{cat.order}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${cat.active ? 'bg-[#d4f0cd] text-[#1a6b0f]' : 'bg-[#f0f0f0] text-[#555]'}`}>
                        {cat.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openEdit(cat)} className="text-xs text-[#45A735] hover:underline">Edit</button>
                        <button onClick={() => del(cat._id)} className="text-xs text-[#e53e3e] hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
