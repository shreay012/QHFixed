'use client';

/**
 * Quick service form — single-page, flat fields, no tabs.
 *
 * Used as the default editor at /admin/services/new and
 * /admin/services/[id]/edit. Covers the 80% case: name, category,
 * description (English), hourly rate, technologies, image, active.
 *
 * For translations / FAQs / per-country pricing, admins click
 * "Open Advanced Editor →" which loads the original 6-tab form.
 *
 * Backend payload mirrors the multi-tab form's shape — i18n fields are
 * sent as { en: '...' } objects so the same Zod schema validates both.
 * Slug is auto-generated server-side from the English name.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import staffApi from '@/lib/axios/staffApi';
import { showError, showSuccess } from '@/lib/utils/toast';

const SERVICE_CATEGORIES = [
  'AI Engineers',
  'Backend Developers',
  'Frontend Development',
  'UI/UX Designer',
  'IT Support',
  'DevOps',
  'Content Writing',
  'Digital Marketing',
  'Quality Assurance',
  'Mobile App Development',
  'Security Testing',
  'Gen Ai Development',
  'API Development',
  'React.js Development',
  'Website Design',
  'Third Party Integration',
  'CI/CD Pipeline Management',
  'SEO Blog Writing',
  'IT services',
];

// Read either an i18n object or a plain string, return the English value
// so the simple form can show / edit it as a flat input. This is what
// keeps Quick + Advanced editors interoperable: open in Quick, save,
// open in Advanced — the other-locale fields are preserved untouched.
const toEn = (v) => {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v.en || Object.values(v).find(Boolean) || '';
};

// Convert a flat array of strings (or mixed strings/objects) into an
// array of { name } objects so backend TechItemSchema accepts it.
const techToString = (arr) =>
  Array.isArray(arr)
    ? arr
        .map((t) => (typeof t === 'string' ? t : (t?.name || t?.en || '')))
        .filter(Boolean)
        .join(', ')
    : '';

const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-[#D6EBCF] bg-white text-sm font-open-sauce text-[#484848] placeholder-[#AEAEAE] focus:outline-none focus:ring-2 focus:ring-[#45A735]/40 focus:border-[#45A735] transition';
const labelCls = 'block text-xs font-open-sauce-semibold text-[#26472B] uppercase tracking-wider mb-1.5';

export default function QuickServiceForm({ serviceId = null, initialData = null }) {
  const router = useRouter();
  const isEdit = Boolean(serviceId);

  // Hydrate form from initialData (edit) or empty (new). All fields flat
  // strings here even though backend stores i18n maps — we re-wrap on save.
  const [form, setForm] = useState(() => ({
    name:         toEn(initialData?.name) || initialData?.title || '',
    category:     initialData?.category || '',
    description:  toEn(initialData?.description) || '',
    tagline:      toEn(initialData?.tagline) || '',
    hourlyRate:   initialData?.hourlyRate ?? initialData?.pricing?.hourly ?? '',
    technologies: techToString(initialData?.technologies),
    imageUrl:     initialData?.imageUrl || initialData?.image || '',
    iconUrl:      initialData?.iconUrl || '',
    sortOrder:    initialData?.sortOrder ?? 999,
    active:       initialData?.active !== undefined ? initialData.active : true,
  }));

  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [err, setErr] = useState(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleIconUpload = async (file) => {
    if (!file) return;
    if (file.size > 1 * 1024 * 1024) { showError('Icon must be 1 MB or smaller.'); return; }
    const fd = new FormData();
    fd.append('image', file);
    setUploadingIcon(true);
    try {
      const r = await staffApi.post('/cms-x/banners/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = r.data?.data?.url;
      if (!url) throw new Error('Upload returned no URL');
      set('iconUrl', url);
      showSuccess('Icon uploaded.');
    } catch (e) {
      showError(e?.response?.data?.error?.message || 'Icon upload failed.');
    } finally { setUploadingIcon(false); }
  };

  // Image upload — reuses the CMS banner upload endpoint since it accepts
  // any image and writes to the same S3 bucket. Falls back gracefully if
  // S3 isn't configured (admin pastes URL instead).
  const handleUpload = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showError('Image must be 5 MB or smaller.');
      return;
    }
    const fd = new FormData();
    fd.append('image', file);
    setUploading(true);
    try {
      const r = await staffApi.post('/cms-x/banners/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = r.data?.data?.url;
      if (!url) throw new Error('Upload returned no URL');
      set('imageUrl', url);
      showSuccess('Image uploaded.');
    } catch (e) {
      showError(e?.response?.data?.error?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);

    const nameEn = form.name.trim();
    if (!nameEn) return setErr('Service name is required.');

    // Re-wrap flat fields back into i18n objects so backend schema +
    // existing data shape are preserved. Other locales (hi/de/etc.) on
    // an existing record are left untouched by merging on top of
    // initialData when editing.
    const wrapI18n = (currentValue, newEn) => {
      if (!newEn) return undefined;
      const base = (currentValue && typeof currentValue === 'object') ? { ...currentValue } : {};
      return { ...base, en: newEn };
    };

    const techArr = form.technologies
      .split(/[,\n]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((name) => ({ name, required: false }));

    const body = {
      name:         wrapI18n(initialData?.name, nameEn) || { en: nameEn },
      category:     form.category || '',
      description:  form.description.trim() ? wrapI18n(initialData?.description, form.description.trim()) : (initialData?.description || ''),
      tagline:      form.tagline.trim() ? wrapI18n(initialData?.tagline, form.tagline.trim()) : (initialData?.tagline || ''),
      technologies: techArr,
      hourlyRate:   Number(form.hourlyRate) || 0,
      imageUrl:     form.imageUrl.trim() || '',
      iconUrl:      form.iconUrl.trim() || '',
      sortOrder:    Number(form.sortOrder) || 999,
      active:       form.active,
    };

    setBusy(true);
    try {
      if (isEdit) {
        await staffApi.put(`/admin/services/${serviceId}`, body);
        showSuccess('Service updated!');
      } else {
        await staffApi.post('/admin/services', body);
        showSuccess('Service created!');
      }
      router.push('/admin/services');
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.message || 'Failed to save service';
      setErr(msg);
      showError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7F5]">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#E5F1E2]">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push('/admin/services')}
              className="flex items-center gap-1.5 text-sm text-[#636363] hover:text-[#26472B] transition-colors"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to Services
            </button>
            <div>
              <h1 className="text-lg font-open-sauce-bold text-[#26472B]">
                {isEdit ? 'Edit Service' : 'New Service'}
              </h1>
              <p className="text-[11px] text-[#909090]">
                Quick form — name, price, image, technologies. Ready in 30 seconds.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={busy || uploading || !form.name.trim()}
            className="px-5 py-2 rounded-lg bg-[#45A735] hover:bg-[#26472B] text-white text-sm font-open-sauce-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Service'}
          </button>
        </div>
      </div>

      {/* Form body */}
      <form onSubmit={submit} className="max-w-3xl mx-auto px-6 py-8 space-y-5">
        {err && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        {/* Name */}
        <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
          <label className={labelCls}>Service Name (English) <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. AI Engineer, Frontend Developer"
            className={inputCls}
            autoFocus
          />
          <p className="text-[11px] text-[#909090] mt-1.5">
            Slug is auto-generated. For other languages use the Advanced Editor.
          </p>
        </div>

        {/* Tagline + Category */}
        <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Tagline</label>
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => set('tagline', e.target.value)}
              placeholder="One-liner shown on service cards"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className={inputCls}
            >
              <option value="">— Select category —</option>
              {SERVICE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <p className="text-[11px] text-[#909090] mt-1.5">
              Controls the icon shown on the homepage card.
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
          <label className={labelCls}>Description (English)</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="What this service offers, who it's for, what's included…"
            rows={4}
            className={inputCls}
          />
        </div>

        {/* Hourly rate */}
        <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
          <label className={labelCls}>Base Hourly Rate (INR ₹)</label>
          <input
            type="number"
            value={form.hourlyRate}
            onChange={(e) => set('hourlyRate', e.target.value)}
            placeholder="e.g. 1500"
            min={0}
            className={inputCls}
          />
          <p className="text-[11px] text-[#909090] mt-1.5">
            Country-specific overrides (US/UK/UAE…) live in Advanced Editor → Geo Pricing.
          </p>
        </div>

        {/* Technologies */}
        <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
          <label className={labelCls}>Technologies</label>
          <input
            type="text"
            value={form.technologies}
            onChange={(e) => set('technologies', e.target.value)}
            placeholder="React, Node.js, Python, AWS  (comma-separated)"
            className={inputCls}
          />
          <p className="text-[11px] text-[#909090] mt-1.5">
            Each becomes a chip on the service page. Comma-separated, no quotes needed.
          </p>
          {form.technologies && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {form.technologies.split(',').map((t) => t.trim()).filter(Boolean).map((t, i) => (
                <span
                  key={`${t}-${i}`}
                  className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#F2F9F1] text-[#26472B] border border-[#D6EBCF] text-[11px] font-open-sauce-semibold"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Icon (SVG) + Sort Order — side by side */}
        <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Icon */}
          <div>
            <label className={labelCls}>Service Icon <span className="text-[#909090] normal-case font-normal">— SVG/PNG, shown on cards</span></label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={form.iconUrl}
                onChange={(e) => set('iconUrl', e.target.value)}
                placeholder="Paste SVG/PNG URL or upload →"
                className={inputCls}
              />
              <label className={`inline-flex items-center justify-center px-3 py-2.5 rounded-lg border border-[#45A735] text-[#26472B] text-xs font-open-sauce-semibold cursor-pointer hover:bg-[#F2F9F1] whitespace-nowrap ${uploadingIcon ? 'opacity-60 cursor-wait' : ''}`}>
                {uploadingIcon ? '⏳' : '📤'}
                <input type="file" accept="image/svg+xml,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleIconUpload(f); e.target.value = ''; }} disabled={uploadingIcon} className="hidden" />
              </label>
            </div>
            {form.iconUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.iconUrl} alt="icon" className="mt-2 h-12 w-12 object-contain rounded border border-[#E5F1E2] p-1 bg-[#f8fdf7]" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            )}
            <p className="text-[11px] text-[#909090] mt-1.5">Recommended: SVG or 64×64 PNG. Max 1 MB.</p>
          </div>

          {/* Sort Order */}
          <div>
            <label className={labelCls}>Display Priority <span className="text-[#909090] normal-case font-normal">— lower = first</span></label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => set('sortOrder', e.target.value)}
              placeholder="e.g. 1"
              min={1}
              max={9999}
              className={inputCls}
            />
            <p className="text-[11px] text-[#909090] mt-1.5">
              1 = show first. 999 = default / no preference. Controls order on homepage & catalogue.
            </p>
          </div>
        </div>

        {/* Image */}
        <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
          <label className={labelCls}>Service Image</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={form.imageUrl}
              onChange={(e) => set('imageUrl', e.target.value)}
              placeholder="Paste URL or use Upload →"
              className={inputCls}
            />
            <label
              className={`inline-flex items-center justify-center px-3 py-2.5 rounded-lg border border-[#45A735] text-[#26472B] text-xs font-open-sauce-semibold cursor-pointer hover:bg-[#F2F9F1] whitespace-nowrap ${uploading ? 'opacity-60 cursor-wait' : ''}`}
            >
              {uploading ? '⏳ Uploading…' : '📤 Upload'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = '';
                }}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
          {form.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.imageUrl}
              alt="preview"
              className="mt-3 h-24 w-24 object-cover rounded-lg border border-[#E5F1E2]"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          <p className="text-[11px] text-[#909090] mt-1.5">
            Recommended: 800×600px JPG/PNG. Max 5 MB.
          </p>
        </div>

        {/* Active */}
        <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
          <label className="flex items-center justify-between cursor-pointer select-none">
            <div>
              <div className={labelCls + ' mb-0'}>Active</div>
              <p className="text-[11px] text-[#909090] mt-1">
                When off, this service is hidden from users on the platform.
              </p>
            </div>
            <div
              onClick={() => set('active', !form.active)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${form.active ? 'bg-[#45A735]' : 'bg-[#D1D5DB]'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${form.active ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
          </label>
        </div>

        {/* Advanced editor link */}
        <div className="rounded-2xl border-2 border-dashed border-[#D6EBCF] bg-[#F7FBF6] p-5 text-center">
          <p className="text-sm text-[#26472B] font-open-sauce-semibold">
            Need translations, FAQs, or country-specific pricing?
          </p>
          <p className="text-[11px] text-[#636363] mt-1 mb-3">
            Save here first, then open the Advanced Editor for multi-language content, FAQs, geo-pricing, and more.
          </p>
          {isEdit ? (
            <button
              type="button"
              onClick={() => router.push(`/admin/services/${serviceId}/edit?advanced=1`)}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-[#45A735] text-[#26472B] hover:bg-[#F2F9F1] text-sm font-open-sauce-semibold"
            >
              Open Advanced Editor →
            </button>
          ) : (
            <p className="text-[11px] text-[#909090]">
              Save the service first — Advanced Editor link will appear after creation.
            </p>
          )}
        </div>

        {/* Bottom save bar (mobile-friendly) */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push('/admin/services')}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-[#636363] hover:bg-white text-sm font-open-sauce"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || uploading || !form.name.trim()}
            className="px-5 py-2 rounded-lg bg-[#45A735] hover:bg-[#26472B] text-white text-sm font-open-sauce-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Service'}
          </button>
        </div>
      </form>
    </div>
  );
}
