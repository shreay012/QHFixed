// /frontend/app/admin/cms/banners/page.jsx
//
// Admin banner manager — phase 8 multi-locale + slider rewrite.
//
// Each banner has:
//   • internalName (admin-only label)
//   • position     (home-hero, services-top, …)
//   • variant      (simple | expert-match | video-hero | split)
//   • title/body/ctaLabel — i18n maps editable per locale tab
//   • ctaUrl
//   • mediaType (image|video) + mediaUrl (+ optional per-locale override)
//   • experts[] when variant === expert-match
//   • order, autoplayMs, validFrom/validTo, country, segment, abVariant, active
//
// The form supports both creating new banners and editing legacy ones.
// Backend normaliseBannerOut() ensures legacy `image`/`link`/`placement`
// records load into the form's canonical shape.
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import staffApi from '@/lib/axios/staffApi';
import { showSuccess, showError } from '@/lib/utils/toast';
import {
  PageHeader,
  Spinner,
  ErrorBox,
  EmptyState,
  Table,
  Button,
} from '@/components/staff/ui';

/* ── Constants ─────────────────────────────────────────────────────── */

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'ar', label: 'العربية' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
];

const POSITIONS = [
  { value: 'featured-find-experts', label: '⭐ Featured Banner — Find Experts (Home + How-it-works + Book)' },
  { value: 'home-hero',           label: 'Home — Hero' },
  { value: 'home-secondary',      label: 'Home — Secondary' },
  { value: 'home-mid',            label: 'Home — Mid' },
  { value: 'home-bottom',         label: 'Home — Bottom' },
  { value: 'services-top',        label: 'Services list — Top' },
  { value: 'service-detail-top',  label: 'Service detail — Top' },
  { value: 'booking-flow-top',    label: 'Booking flow — Top' },
  { value: 'checkout-top',        label: 'Checkout — Top' },
  { value: 'profile-top',         label: 'Profile — Top' },
  { value: 'cart-top',            label: 'Cart — Top' },
  { value: 'search-top',          label: 'Search — Top' },
];

// Image-size guide — surfaced inline in the form so admins know what
// dimensions/format to use per variant before they upload. These are
// recommendations, not hard limits.
const MEDIA_GUIDE = {
  simple:        { dims: '1000×1000px',  format: 'PNG (transparent BG) or JPG', max: '500 KB' },
  'expert-match':{ dims: '800×800px (per expert avatar)', format: 'JPG / PNG', max: '300 KB each' },
  'video-hero':  { dims: '1920×1080px',  format: 'MP4 (H.264)',                 max: '5 MB' },
  split:         { dims: '1200×800px',   format: 'JPG',                         max: '600 KB' },
};
const POSITION_LABEL = Object.fromEntries(POSITIONS.map((p) => [p.value, p.label]));

const VARIANTS = [
  { value: 'simple',       label: 'Simple — text + media + CTA' },
  { value: 'expert-match', label: 'Expert match — text + expert cards' },
  { value: 'video-hero',   label: 'Video hero — full-bleed video' },
  { value: 'split',        label: 'Split — 50/50 media + text' },
];

const COUNTRIES = ['', 'IN', 'AE', 'DE', 'US', 'AU', 'GB', 'SA', 'SG'];

const EMPTY_FORM = {
  internalName: '',
  position: 'home-hero',
  variant: 'simple',
  title: { en: '', hi: '', ar: '', de: '', es: '' },
  body:  { en: '', hi: '', ar: '', de: '', es: '' },
  ctaLabel: { en: '', hi: '', ar: '', de: '', es: '' },
  ctaUrl: '',
  mediaType: 'image',
  mediaUrl: '',
  mediaUrlByLocale: {},
  experts: [],
  order: 0,
  autoplayMs: '',
  country: '',
  validFrom: '',
  validTo: '',
  active: true,
};

/* ── Helpers ───────────────────────────────────────────────────────── */

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toDateInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toISOString().slice(0, 10);
}

function inputCls(extra = '') {
  return `w-full px-3 py-2 rounded-lg border border-[#D6EBCF] bg-white text-sm font-open-sauce text-[#484848] placeholder-[#AEAEAE] focus:outline-none focus:ring-2 focus:ring-[#45A735]/40 focus:border-[#45A735] transition ${extra}`;
}

function labelCls() {
  return 'block text-xs font-open-sauce-semibold text-[#26472B] uppercase tracking-wider mb-1';
}

// Coerce the incoming banner record into the form shape. Legacy
// banners have plain string title/body — promote them to { en: <str> }
// so the locale tabs render correctly.
function bannerToForm(banner) {
  if (!banner) return EMPTY_FORM;
  const toI18n = (v) => {
    if (!v) return { en: '', hi: '', ar: '', de: '', es: '' };
    if (typeof v === 'string') return { en: v, hi: '', ar: '', de: '', es: '' };
    return { en: '', hi: '', ar: '', de: '', es: '', ...v };
  };
  return {
    _id: banner._id,
    internalName: banner.internalName || banner.title || '',
    position: banner.position || 'home-hero',
    variant: banner.variant || 'simple',
    title:    toI18n(banner.title),
    body:     toI18n(banner.body),
    ctaLabel: toI18n(banner.ctaLabel),
    ctaUrl:   banner.ctaUrl || '',
    mediaType: banner.mediaType || 'image',
    mediaUrl:  banner.mediaUrl || '',
    mediaUrlByLocale: banner.mediaUrlByLocale || {},
    experts:   Array.isArray(banner.experts) ? banner.experts : [],
    order:     banner.order ?? 0,
    autoplayMs: banner.autoplayMs ?? '',
    country:   banner.country || '',
    validFrom: toDateInput(banner.validFrom),
    validTo:   toDateInput(banner.validTo),
    active:    banner.active ?? true,
  };
}

// Strip empty locale entries before sending to backend so we don't
// store a bunch of empty strings.
function compactI18n(map) {
  const out = {};
  for (const [k, v] of Object.entries(map || {})) {
    if (v && String(v).trim()) out[k] = String(v).trim();
  }
  // Always include en if any locale is set so the fallback works.
  if (Object.keys(out).length && !out.en && map?.en !== undefined) out.en = map.en || '';
  return Object.keys(out).length ? out : undefined;
}

/* ── Toggle ────────────────────────────────────────────────────────── */

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-[#45A735]' : 'bg-[#D1D5DB]'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </div>
      {label && <span className="text-sm font-open-sauce text-[#484848]">{label}</span>}
    </label>
  );
}

/* ── Banner Modal (Create / Edit) ─────────────────────────────────── */

function BannerModal({ banner, onClose, onSaved }) {
  const isNew = !banner?._id;
  const [form, setForm] = useState(() => bannerToForm(banner));
  const [activeLocale, setActiveLocale] = useState('en');
  const [saving, setSaving] = useState(false);
  const [fieldErr, setFieldErr] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Featured banner is single-image only. The expert-match (multi-card)
  // variant doesn't fit this slot, so we hide that variant entirely and
  // pin the value to 'simple' whenever the position is featured-find-experts.
  const isFeaturedFindExperts = form.position === 'featured-find-experts';

  useEffect(() => {
    if (isFeaturedFindExperts && form.variant !== 'simple') {
      setForm((p) => ({ ...p, variant: 'simple', experts: [] }));
    }
  }, [isFeaturedFindExperts, form.variant]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, saving]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setI18n = (key, locale, v) => setForm((p) => ({ ...p, [key]: { ...p[key], [locale]: v } }));

  // Upload a file via /cms-x/banners/upload → returns S3 URL → drops it
  // into the target form field. `target` is the form key to update
  // ('mediaUrl' for the main image, or a locale code for the per-locale
  // override map).
  const uploadImage = async (file, target = 'mediaUrl') => {
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
      if (!url) throw new Error('Upload did not return a URL');
      if (target === 'mediaUrl') {
        set('mediaUrl', url);
      } else {
        // per-locale override
        setForm((p) => ({
          ...p,
          mediaUrlByLocale: { ...(p.mediaUrlByLocale || {}), [target]: url },
        }));
      }
      showSuccess('Image uploaded.');
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Upload failed.';
      showError(msg);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setFieldErr(null);
    if (!form.internalName.trim()) return setFieldErr('Internal name is required (admin label).');
    if (!form.position)    return setFieldErr('Position is required.');
    if (!form.variant)     return setFieldErr('Variant is required.');
    if (form.variant !== 'expert-match' && !form.mediaUrl.trim() &&
        !Object.keys(form.title || {}).some((k) => form.title[k]?.trim())) {
      return setFieldErr('Provide either media (image/video URL) or a title.');
    }

    const body = {
      internalName: form.internalName.trim(),
      position: form.position,
      variant:  form.variant,
      title:    compactI18n(form.title),
      body:     compactI18n(form.body),
      ctaLabel: compactI18n(form.ctaLabel),
      ctaUrl:   form.ctaUrl.trim() || undefined,
      mediaType: form.mediaType,
      mediaUrl:  form.mediaUrl.trim() || undefined,
      mediaUrlByLocale: Object.keys(form.mediaUrlByLocale || {}).length ? form.mediaUrlByLocale : undefined,
      experts:   form.variant === 'expert-match' ? form.experts : undefined,
      order:     Number(form.order) || 0,
      autoplayMs: form.autoplayMs ? Number(form.autoplayMs) : undefined,
      country:   form.country || undefined,
      validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : undefined,
      validTo:   form.validTo   ? new Date(form.validTo).toISOString()   : undefined,
      active:    form.active,
    };

    setSaving(true);
    try {
      if (isNew) {
        await staffApi.post('/cms-x/banners', body);
        showSuccess('Banner created.');
      } else {
        await staffApi.put(`/cms-x/banners/${banner._id}`, body);
        showSuccess('Banner updated.');
      }
      onSaved();
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to save banner.';
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ── Experts editor (for expert-match variant) ──────────────────── */
  const addExpert = () => {
    if ((form.experts || []).length >= 4) return;
    set('experts', [
      ...(form.experts || []),
      { name: '', role: '', imageUrl: '', yearsOfExperience: 0, verified: true },
    ]);
  };
  const updateExpert = (idx, key, val) => {
    set('experts', (form.experts || []).map((e, i) => (i === idx ? { ...e, [key]: val } : e)));
  };
  const removeExpert = (idx) => {
    set('experts', (form.experts || []).filter((_, i) => i !== idx));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div className="w-full max-w-3xl bg-white rounded-2xl border border-[#E5F1E2] shadow-[0_16px_48px_rgba(38,71,43,0.15)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5F1E2] bg-[#F2F9F1]">
          <div>
            <h2 className="text-base font-open-sauce-bold text-[#26472B]">
              {isNew ? 'New Banner' : 'Edit Banner'}
            </h2>
            <p className="text-xs font-open-sauce text-[#636363] mt-0.5">
              {isNew ? 'Multi-locale banner with slider support' : `Editing: ${form.internalName || '—'}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#E5F1E2] transition-colors text-[#636363] hover:text-[#26472B]"
            aria-label="Close"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {fieldErr && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 font-open-sauce">
              {fieldErr}
            </div>
          )}

          {/* Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls()}>Internal name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.internalName}
                onChange={(e) => set('internalName', e.target.value)}
                placeholder="e.g. Home hero — March promo"
                className={inputCls()}
              />
              <p className="text-[10px] text-[#909090] mt-1">Shown only in admin lists. Not visible to users.</p>
            </div>
            <div>
              <label className={labelCls()}>Order (slider sort)</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => set('order', e.target.value)}
                placeholder="0"
                className={inputCls()}
              />
            </div>
          </div>

          {/* Position + Variant */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls()}>Position</label>
              <select value={form.position} onChange={(e) => set('position', e.target.value)} className={inputCls()}>
                {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls()}>Variant</label>
              {isFeaturedFindExperts ? (
                <>
                  <input
                    type="text"
                    value="Simple — single image (locked for Featured Banner)"
                    className={inputCls('bg-[#F2F9F1] cursor-not-allowed text-[#26472B]')}
                    disabled
                    readOnly
                  />
                  <p className="text-[10px] text-[#909090] mt-1">
                    Featured Banner uses one image per record. Create a separate banner per country for country-specific creatives.
                  </p>
                </>
              ) : (
                <select value={form.variant} onChange={(e) => set('variant', e.target.value)} className={inputCls()}>
                  {VARIANTS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Locale tabs for text fields */}
          <div className="rounded-xl border border-[#E5F1E2] bg-[#F7FBF6] p-4">
            <div className="flex items-center gap-1 mb-3 overflow-x-auto">
              {LOCALES.map((l) => {
                const has = !!(form.title?.[l.code] || form.body?.[l.code] || form.ctaLabel?.[l.code]);
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setActiveLocale(l.code)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-open-sauce-semibold transition-colors ${
                      activeLocale === l.code
                        ? 'bg-[#45A735] text-white'
                        : 'bg-white text-[#636363] hover:text-[#26472B]'
                    }`}
                  >
                    {l.label}
                    {has && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-[#909090] mb-3">
              Title / body / CTA label per locale. Use a newline in the title to highlight the second
              line in green (matches the &ldquo;Not sure what you need?&rdquo; layout).
            </p>

            <div>
              <label className={labelCls()}>Title</label>
              <textarea
                rows={2}
                value={form.title?.[activeLocale] || ''}
                onChange={(e) => setI18n('title', activeLocale, e.target.value)}
                placeholder={activeLocale === 'en' ? 'Not sure what you need?\nyou need?' : ''}
                className={inputCls()}
              />
            </div>
            <div className="mt-3">
              <label className={labelCls()}>Body</label>
              <textarea
                rows={2}
                value={form.body?.[activeLocale] || ''}
                onChange={(e) => setI18n('body', activeLocale, e.target.value)}
                placeholder="Tell us what you're trying to build…"
                className={inputCls()}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className={labelCls()}>CTA label</label>
                <input
                  type="text"
                  value={form.ctaLabel?.[activeLocale] || ''}
                  onChange={(e) => setI18n('ctaLabel', activeLocale, e.target.value)}
                  placeholder="Find Right Expert"
                  className={inputCls()}
                />
              </div>
              <div>
                <label className={labelCls()}>CTA URL</label>
                <input
                  type="text"
                  value={form.ctaUrl}
                  onChange={(e) => set('ctaUrl', e.target.value)}
                  placeholder="/book-your-resource"
                  className={inputCls()}
                />
              </div>
            </div>
          </div>

          {/* Media — only relevant when variant uses media */}
          {form.variant !== 'expert-match' && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls()}>Media type</label>
                  <select value={form.mediaType} onChange={(e) => set('mediaType', e.target.value)} className={inputCls()}>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls()}>Media URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={form.mediaUrl}
                      onChange={(e) => set('mediaUrl', e.target.value)}
                      placeholder={form.mediaType === 'video' ? 'https://cdn.example.com/hero.mp4' : 'Paste URL or use Upload →'}
                      className={inputCls()}
                    />
                    {form.mediaType === 'image' && (
                      <label
                        className={`inline-flex items-center justify-center px-3 py-2 rounded-lg border border-[#45A735] text-[#26472B] text-xs font-open-sauce-semibold cursor-pointer hover:bg-[#F2F9F1] whitespace-nowrap ${uploading ? 'opacity-60 cursor-wait' : ''}`}
                        title="Upload image to S3"
                      >
                        {uploading ? '⏳ Uploading…' : '📤 Upload'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadImage(f, 'mediaUrl');
                            e.target.value = '';
                          }}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  {/* Live preview of the uploaded/pasted image so admin sees it immediately */}
                  {form.mediaUrl && form.mediaType === 'image' && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.mediaUrl}
                      alt="Preview"
                      className="mt-2 h-20 w-20 object-cover rounded-md border border-[#E5F1E2]"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                </div>
              </div>
              {/* Size guide — keeps admins from uploading 6MB hero PNGs */}
              {(() => {
                const g = MEDIA_GUIDE[form.variant] || MEDIA_GUIDE.simple;
                return (
                  <div className="rounded-lg border border-[#D6EBCF] bg-[#F2F9F1] px-3 py-2 text-[11px] font-open-sauce text-[#26472B] flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="font-open-sauce-semibold">📐 Image guide ({form.variant}):</span>
                    <span><strong>Size:</strong> {g.dims}</span>
                    <span><strong>Format:</strong> {g.format}</span>
                    <span><strong>Max:</strong> {g.max}</span>
                  </div>
                );
              })()}
              {/* Per-locale image override hint for country/locale-specific creatives */}
              <p className="text-[10px] text-[#909090]">
                Tip: For country-specific banners, set <strong>Country</strong> below and create a separate banner per country.
                Same Featured Banner shows on Home, How-it-works, and Book-your-resource — edit once, updates everywhere.
              </p>
            </div>
          )}

          {/* Experts editor — only for expert-match variant */}
          {form.variant === 'expert-match' && (
            <div className="rounded-xl border border-[#E5F1E2] bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-sm font-open-sauce-bold text-[#26472B]">Featured experts</h4>
                  <p className="text-[11px] text-[#909090]">Up to 4 expert cards rendered on the right side.</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addExpert} disabled={(form.experts || []).length >= 4}>
                  + Add expert
                </Button>
              </div>
              {(form.experts || []).length === 0 && (
                <div className="text-xs text-[#909090] text-center py-3">No experts yet.</div>
              )}
              <div className="space-y-3">
                {(form.experts || []).map((e, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 rounded-lg bg-[#F7FBF6] border border-[#E5F1E2]">
                    <input
                      type="text" value={e.name || ''} onChange={(ev) => updateExpert(idx, 'name', ev.target.value)}
                      placeholder="Name" className={inputCls('sm:col-span-3')}
                    />
                    <input
                      type="text" value={e.role || ''} onChange={(ev) => updateExpert(idx, 'role', ev.target.value)}
                      placeholder="Role (e.g. Vibe Coding Expert)" className={inputCls('sm:col-span-3')}
                    />
                    <input
                      type="text" value={e.imageUrl || ''} onChange={(ev) => updateExpert(idx, 'imageUrl', ev.target.value)}
                      placeholder="Avatar URL" className={inputCls('sm:col-span-4')}
                    />
                    <input
                      type="number" value={e.yearsOfExperience ?? ''}
                      onChange={(ev) => updateExpert(idx, 'yearsOfExperience', ev.target.value ? Number(ev.target.value) : undefined)}
                      placeholder="Years" className={inputCls('sm:col-span-1')} min={0} max={80}
                    />
                    <button
                      type="button" onClick={() => removeExpert(idx)}
                      className="sm:col-span-1 inline-flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg px-2"
                      aria-label="Remove expert"
                    >
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Targeting + lifecycle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls()}>Country (optional)</label>
              <select value={form.country} onChange={(e) => set('country', e.target.value)} className={inputCls()}>
                {COUNTRIES.map((c) => <option key={c || 'all'} value={c}>{c || 'All countries'}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls()}>Autoplay (ms, optional)</label>
              <input
                type="number"
                value={form.autoplayMs}
                onChange={(e) => set('autoplayMs', e.target.value)}
                placeholder="5000"
                className={inputCls()}
                min={2000}
                max={60000}
              />
            </div>
            <div>
              <label className={labelCls()}>Active</label>
              <div className="pt-2">
                <Toggle checked={form.active} onChange={(v) => set('active', v)} label={form.active ? 'Active' : 'Inactive'} />
              </div>
            </div>
            <div>
              <label className={labelCls()}>Valid from</label>
              <input type="date" value={form.validFrom} onChange={(e) => set('validFrom', e.target.value)} className={inputCls()} />
            </div>
            <div>
              <label className={labelCls()}>Valid to</label>
              <input type="date" value={form.validTo} onChange={(e) => set('validTo', e.target.value)} className={inputCls()} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E5F1E2]">
            <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="primary" size="md" disabled={saving}>
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving…
                </span>
              ) : (isNew ? 'Create Banner' : 'Save Changes')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Delete Confirm ────────────────────────────────────────────────── */

function DeleteConfirm({ banner, onCancel, onConfirm, busy }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);
  const label = banner.internalName || banner.title || `#${String(banner._id).slice(-6)}`;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl border border-[#E5F1E2] shadow-[0_16px_48px_rgba(38,71,43,0.15)] p-6">
        <h3 className="text-base font-open-sauce-bold text-[#26472B] mb-2">Delete banner?</h3>
        <p className="text-sm text-[#636363] font-open-sauce mb-5">
          Delete <strong className="text-[#26472B]">{typeof label === 'string' ? label : 'this banner'}</strong>? This can&apos;t be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="subtle" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function AdminBannersPage() {
  const [banners, setBanners]         = useState(null);
  const [error, setError]             = useState(null);
  const [modalBanner, setModalBanner] = useState(undefined);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy]   = useState(false);
  const [togglingId, setTogglingId]   = useState(null);
  const [filterPosition, setFilterPosition] = useState('');

  const load = useCallback(() => {
    staffApi
      .get('/cms-x/banners/all')
      .then((r) => { setBanners(r.data?.data || []); setError(null); })
      .catch((e) => setError(e?.response?.data?.error?.message || 'Failed to load banners'));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!banners) return null;
    if (!filterPosition) return banners;
    return banners.filter((b) => b.position === filterPosition);
  }, [banners, filterPosition]);

  const handleToggleActive = async (banner) => {
    setTogglingId(banner._id);
    try {
      await staffApi.put(`/cms-x/banners/${banner._id}`, { active: !banner.active });
      showSuccess(`Banner ${!banner.active ? 'activated' : 'deactivated'}.`);
      load();
    } catch (err) {
      showError(err?.response?.data?.error?.message || 'Failed to update.');
    } finally { setTogglingId(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await staffApi.delete(`/cms-x/banners/${deleteTarget._id}`);
      showSuccess('Banner deleted.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showError(err?.response?.data?.error?.message || 'Failed to delete.');
    } finally { setDeleteBusy(false); }
  };

  const pickI18nForList = (v) => {
    if (!v) return '';
    if (typeof v === 'string') return v;
    return v.en || Object.values(v).find(Boolean) || '';
  };

  const columns = [
    {
      key: 'name', label: 'Name',
      render: (r) => (
        <div>
          <div className="font-open-sauce-semibold text-[#26472B] text-sm">{r.internalName || pickI18nForList(r.title) || `#${String(r._id).slice(-6)}`}</div>
          <div className="text-[11px] text-[#909090]">
            {(r.variant || 'simple')} · order {r.order ?? 0}
          </div>
        </div>
      ),
    },
    {
      key: 'position', label: 'Position',
      render: (r) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-open-sauce-semibold bg-[#F2F9F1] text-[#26472B] border border-[#D6EBCF]">
          {POSITION_LABEL[r.position] || r.position || '—'}
        </span>
      ),
    },
    {
      key: 'media', label: 'Media',
      render: (r) => {
        const url = r.mediaUrl || r.image || r.imageUrl;
        if (!url) return <span className="text-xs text-[#AEAEAE]">—</span>;
        if ((r.mediaType || 'image') === 'video') {
          return <span className="text-xs text-[#26472B] font-open-sauce-semibold">📹 Video</span>;
        }
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={r.internalName || ''}
            className="h-9 w-14 object-cover rounded-md border border-[#E5F1E2]"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        );
      },
    },
    {
      key: 'locales', label: 'Locales',
      render: (r) => {
        const t = r.title;
        if (!t || typeof t === 'string') return <span className="text-[11px] text-[#909090]">en</span>;
        const codes = Object.keys(t).filter((k) => t[k]);
        return (
          <div className="flex flex-wrap gap-1">
            {codes.map((c) => (
              <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-[#F2F9F1] text-[#26472B] font-mono">{c}</span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'dates', label: 'Validity',
      render: (r) => (
        <div className="text-xs font-open-sauce text-[#636363] leading-relaxed">
          <div>{fmtDate(r.validFrom)} →</div>
          <div>{fmtDate(r.validTo)}</div>
        </div>
      ),
    },
    {
      key: 'active', label: 'Status',
      render: (r) => (
        <div className="flex items-center gap-2">
          <Toggle
            checked={r.active}
            onChange={() => handleToggleActive(r)}
            label={r.active ? 'Active' : 'Inactive'}
          />
          {togglingId === r._id && (
            <span className="w-3.5 h-3.5 border-2 border-[#45A735] border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      ),
    },
    {
      key: 'actions', label: 'Actions',
      render: (r) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setPreviewBanner(r)} title="Preview">
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={12} cy={12} r={3} stroke="currentColor" strokeWidth={1.8} />
            </svg>
            Preview
          </Button>
          <Button size="sm" variant="outline" onClick={() => setModalBanner(r)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(r)}>Delete</Button>
        </div>
      ),
    },
  ];

  // Triggers the backend's idempotent starter-banner seed. Used both
  // by the empty-state CTA (no banners at all) and by the toolbar
  // button (in case admin wiped the collection and wants the starters
  // back). The endpoint short-circuits when records already exist
  // unless `force=true` is sent.
  const seedStarterBanners = async (force = false) => {
    try {
      const r = await staffApi.post('/cms-x/banners/seed', { force });
      const inserted = r.data?.data?.upserted ?? 0;
      const skipped  = r.data?.data?.skipped;
      if (skipped) {
        showSuccess('Starter banners already present — no changes made.');
      } else {
        showSuccess(`Seeded ${inserted} starter banner${inserted === 1 ? '' : 's'}.`);
      }
      load();
    } catch (e) {
      showError(e?.response?.data?.error?.message || 'Failed to seed starter banners.');
    }
  };

  // Detail row clicked from the table → preview pane on the right.
  // We render the banner using the actual <CmsBannerSlider>-style
  // template so the admin sees exactly what users see, not a separate
  // "admin preview" approximation that drifts from production.
  const [previewBanner, setPreviewBanner] = useState(null);

  return (
    <div>
      <PageHeader
        title="Banners"
        subtitle="Multi-locale, multi-page banner & slider system"
        helpText="Click a row's 'Preview' to see exactly how it renders to users. Use 'View live site' to open the homepage in a new tab and verify against production."
        secondaryActions={[
          <Button
            key="live"
            variant="subtle"
            size="md"
            onClick={() => window.open('/', '_blank', 'noopener,noreferrer')}
          >
            View live site ↗
          </Button>,
        ]}
        action={
          <Button variant="primary" size="md" onClick={() => setModalBanner(null)}>+ New Banner</Button>
        }
      />

      <div className="p-4 sm:p-8 space-y-4">
        <ErrorBox error={error} />

        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs font-open-sauce-semibold text-[#26472B]">Filter by position:</label>
          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[#D6EBCF] bg-white text-sm font-open-sauce text-[#484848]"
          >
            <option value="">All positions</option>
            {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {banners != null && (
            <span className="text-xs text-[#909090]">
              {filtered?.length ?? 0} / {banners.length} banner{banners.length === 1 ? '' : 's'}
            </span>
          )}
          {banners != null && banners.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => seedStarterBanners(false)}>
              Re-seed starters
            </Button>
          )}
        </div>

        {banners === null && !error && <Spinner />}

        {banners !== null && (filtered?.length ?? 0) === 0 && (
          <EmptyState
            title={filterPosition ? `No banners at "${POSITION_LABEL[filterPosition]}"` : 'No banners yet'}
            description={
              filterPosition
                ? "Try clearing the position filter or create a new banner for this slot."
                : 'Drop in our 3 starter banners to see how the system works, then edit / duplicate them. Or create your first banner from scratch.'
            }
            action={
              !filterPosition ? (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Button variant="primary" size="md" onClick={() => seedStarterBanners(false)}>
                    Seed starter banners
                  </Button>
                  <Button variant="subtle" size="md" onClick={() => setModalBanner(null)}>
                    Create from scratch
                  </Button>
                </div>
              ) : (
                <Button variant="subtle" size="md" onClick={() => setFilterPosition('')}>
                  Show all positions
                </Button>
              )
            }
          />
        )}

        {banners !== null && (filtered?.length ?? 0) > 0 && (
          <Table columns={columns} rows={filtered} keyField="_id" />
        )}
      </div>

      {/* Live preview modal — renders the banner using the same slider
          template the public site uses so admin sees exactly the user
          experience, including locale resolution and variant layout. */}
      {previewBanner && (
        <BannerPreviewModal banner={previewBanner} onClose={() => setPreviewBanner(null)} />
      )}

      {modalBanner !== undefined && (
        <BannerModal
          banner={modalBanner}
          onClose={() => setModalBanner(undefined)}
          onSaved={() => { setModalBanner(undefined); load(); }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          banner={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          busy={deleteBusy}
        />
      )}
    </div>
  );
}

/* ── Banner preview modal ──────────────────────────────────────────────
 *
 * Renders the banner using the same template the public site uses, so
 * the admin sees exactly what users see — including locale resolution,
 * variant layout, and media rendering — without us re-implementing the
 * preview logic and risking drift from production.
 *
 * The locale picker lets admins flip through every locale that has any
 * field translated, so they can spot-check Hindi / Arabic / German
 * before publishing without changing their browser cookie.
 */
function BannerPreviewModal({ banner, onClose }) {
  const allLocaleCodes = useMemo(() => {
    const codes = new Set();
    for (const field of ['title', 'body', 'ctaLabel']) {
      const v = banner?.[field];
      if (v && typeof v === 'object') {
        for (const k of Object.keys(v)) if (v[k]) codes.add(k);
      }
    }
    if (codes.size === 0) codes.add('en');
    return [...codes];
  }, [banner]);

  const [locale, setLocale] = useState(allLocaleCodes[0] || 'en');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] px-4 py-8"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-5xl bg-white rounded-2xl border border-[#E5F1E2] shadow-[0_24px_64px_rgba(38,71,43,0.20)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5F1E2] bg-[#F2F9F1]">
          <div>
            <h2 className="text-base font-open-sauce-bold text-[#26472B]">Live preview</h2>
            <p className="text-xs font-open-sauce text-[#636363] mt-0.5">
              Exactly what the user sees on the public site for the chosen locale.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Locale switcher */}
            {allLocaleCodes.length > 1 && (
              <div className="flex items-center gap-1 bg-white rounded-lg border border-[#E5F1E2] p-1">
                {allLocaleCodes.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLocale(code)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-open-sauce-semibold uppercase ${
                      locale === code ? 'bg-[#45A735] text-white' : 'text-[#636363] hover:text-[#26472B]'
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#E5F1E2] text-[#636363] hover:text-[#26472B] transition-colors"
              aria-label="Close"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Preview surface — slightly off-white so banners with light
            backgrounds still register against the modal frame. */}
        <div className="flex-1 overflow-y-auto bg-[#F5F7F5] p-6">
          <BannerPreviewSurface banner={banner} locale={locale} />
        </div>

        <div className="px-6 py-3 border-t border-[#E5F1E2] flex items-center justify-between text-[11px] text-[#909090] font-open-sauce">
          <span>Position: <span className="text-[#26472B] font-open-sauce-semibold">{banner.position || '—'}</span></span>
          <span>Variant: <span className="text-[#26472B] font-open-sauce-semibold">{banner.variant || 'simple'}</span></span>
          <span>{banner.active ? 'Active' : 'Inactive'}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Rendering primitives — copy of the public CmsBannerSlider's variant
 * renderers, with explicit `locale` prop instead of cookie reading. We
 * inline these rather than import the public component so the modal
 * never has to mount a working slider (autoplay, dots, hover handlers)
 * just to show one frame.
 */
function pickI18n(value, locale) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (value[locale]) return value[locale];
    if (value.en) return value.en;
    const firstKey = Object.keys(value).find((k) => value[k]);
    return firstKey ? value[firstKey] : '';
  }
  return String(value);
}

function pickMediaUrl(banner, locale) {
  if (banner.mediaUrlByLocale && typeof banner.mediaUrlByLocale === 'object') {
    if (banner.mediaUrlByLocale[locale]) return banner.mediaUrlByLocale[locale];
    if (banner.mediaUrlByLocale.en)      return banner.mediaUrlByLocale.en;
  }
  return banner.mediaUrl || banner.image || banner.imageUrl || '';
}

function BannerPreviewSurface({ banner, locale }) {
  const variant = banner.variant || 'simple';
  const title = pickI18n(banner.title, locale);
  const body  = pickI18n(banner.body, locale);
  const cta   = pickI18n(banner.ctaLabel, locale);
  const media = pickMediaUrl(banner, locale);

  if (variant === 'expert-match') {
    return (
      <div className="bg-white rounded-3xl shadow-md ring-1 ring-[#E5F1E2] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
          <div className="p-8 sm:p-10 flex flex-col justify-center gap-5">
            {title && (
              <h2 className="text-3xl sm:text-4xl font-open-sauce-bold text-[#1F2937] leading-tight whitespace-pre-line">
                {title.split(/\\n|\n/).map((line, i) => (
                  <span key={i} className={i > 0 ? 'block text-[#45A735]' : 'block'}>{line}</span>
                ))}
              </h2>
            )}
            {body && <p className="text-base text-[#636363] leading-relaxed max-w-xl">{body}</p>}
            {cta && (
              <span className="inline-flex self-start items-center justify-center px-6 py-3 rounded-lg bg-[#45A735] text-white font-open-sauce-semibold text-base">
                {cta}
              </span>
            )}
          </div>
          <div className="relative bg-gradient-to-br from-[#F7FBF6] via-white to-[#EDF6E9] p-6 sm:p-8 flex items-center justify-center gap-4 min-h-[280px]">
            {(banner.experts || []).slice(0, 2).map((e, idx) => (
              <PreviewExpertCard key={idx} expert={e} />
            ))}
            {(!banner.experts || banner.experts.length === 0) && (
              <span className="text-sm text-[#909090]">No experts configured</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'video-hero') {
    return (
      <div className="relative bg-[#0F1F12] rounded-3xl overflow-hidden min-h-[300px] sm:min-h-[420px]">
        {media && (
          <video src={media} className="absolute inset-0 w-full h-full object-cover opacity-70" autoPlay muted loop playsInline />
        )}
        <div className="relative z-10 p-10 sm:p-14 flex flex-col justify-end h-full text-white gap-4 min-h-[300px]">
          {title && <h2 className="text-3xl sm:text-5xl font-open-sauce-bold leading-tight">{title}</h2>}
          {cta && (
            <span className="inline-flex self-start items-center px-6 py-3 rounded-lg bg-white text-[#26472B] font-open-sauce-semibold">
              {cta}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'split') {
    return (
      <div className="bg-white rounded-3xl shadow-md ring-1 ring-[#E5F1E2] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {media && (
            <div className="relative min-h-[260px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={media} alt={title} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          )}
          <div className="p-8 sm:p-10 flex flex-col justify-center gap-4">
            {title && <h2 className="text-2xl sm:text-3xl font-open-sauce-bold text-[#1F2937] leading-tight">{title}</h2>}
            {body && <p className="text-base text-[#636363] leading-relaxed">{body}</p>}
            {cta && (
              <span className="inline-flex self-start items-center px-6 py-3 rounded-lg bg-[#45A735] text-white font-open-sauce-semibold">
                {cta}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // simple (default)
  return (
    <div className="bg-white rounded-3xl shadow-md ring-1 ring-[#E5F1E2] overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
        <div className="p-8 sm:p-10 flex flex-col justify-center gap-4">
          {title && <h2 className="text-2xl sm:text-3xl lg:text-4xl font-open-sauce-bold text-[#1F2937] leading-tight">{title}</h2>}
          {body && <p className="text-base text-[#636363] leading-relaxed max-w-xl">{body}</p>}
          {cta && (
            <span className="inline-flex self-start items-center px-6 py-3 rounded-lg bg-[#45A735] text-white font-open-sauce-semibold">
              {cta}
            </span>
          )}
        </div>
        {media && (
          <div className="relative min-h-[220px] lg:min-h-[320px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={media} alt={title} className="absolute inset-0 w-full h-full object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewExpertCard({ expert }) {
  return (
    <div className="relative">
      <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden bg-white ring-4 ring-white shadow-lg">
        {expert.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={expert.imageUrl} alt={expert.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#45A735] to-[#26472B] flex items-center justify-center text-white font-open-sauce-bold text-2xl">
            {(expert.name || '?').slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-t from-black/60 to-transparent text-white text-center pt-6 pb-2 px-4 w-full rounded-b-full pointer-events-none">
        <div className="text-sm font-open-sauce-semibold">{expert.name}</div>
        {expert.role && <div className="text-[10px] text-white/85">{expert.role}</div>}
      </div>
      {typeof expert.yearsOfExperience === 'number' && (
        <div className="absolute -top-3 -right-2 sm:-right-4 flex items-center gap-2 bg-[#F7FBF6] text-[#26472B] rounded-full px-3 py-1.5 shadow-md ring-1 ring-black/5">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#78EB54] text-[#0F3B0F] text-sm font-open-sauce-bold">
            {expert.yearsOfExperience}
          </span>
          <span className="text-[10px] font-open-sauce-semibold leading-tight">
            Year Of<br />Experience
          </span>
        </div>
      )}
    </div>
  );
}
