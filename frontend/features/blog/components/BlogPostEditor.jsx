'use client';

/**
 * BlogPostEditor — shared between /admin/blog/new and /admin/blog/[id]/edit
 *
 * Layout:
 *  Left (main):  Locale tabs → Title, Excerpt, Body (TipTap), SEO per locale
 *  Right sidebar: Slug, Status, Schedule, Author, Cover images, Categories, Tags, Featured
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import staffApi from '@/lib/axios/staffApi';
import { showSuccess, showError } from '@/lib/utils/toast';
import { PageHeader, Spinner, Button } from '@/components/staff/ui';

const TipTapEditor = dynamic(() => import('./TipTapEditor'), { ssr: false, loading: () => <div className="h-64 bg-[#F8FCF7] rounded-xl animate-pulse" /> });

const LOCALES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिंदी',   flag: '🇮🇳' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français',flag: '🇫🇷' },
];

const COUNTRIES = [
  { code: 'IN', label: '🇮🇳 India' },
  { code: 'AE', label: '🇦🇪 UAE' },
  { code: 'DE', label: '🇩🇪 Germany' },
  { code: 'AU', label: '🇦🇺 Australia' },
  { code: 'US', label: '🇺🇸 United States' },
  { code: 'GB', label: '🇬🇧 United Kingdom' },
  { code: 'SA', label: '🇸🇦 Saudi Arabia' },
  { code: 'SG', label: '🇸🇬 Singapore' },
];

const EMPTY_FORM = {
  slug:        '',
  status:      'draft',
  scheduledAt: '',
  featured:    false,
  title:   { en: '', hi: '', ar: '', de: '', es: '', fr: '' },
  excerpt: { en: '', hi: '', ar: '', de: '', es: '', fr: '' },
  body:    { en: '', hi: '', ar: '', de: '', es: '', fr: '' },
  seo: {
    en: { metaTitle: '', metaDescription: '', keywords: [], ogTitle: '', ogDescription: '', ogImage: '', canonicalUrl: '' },
    hi: { metaTitle: '', metaDescription: '', keywords: [], ogTitle: '', ogDescription: '', ogImage: '', canonicalUrl: '' },
    ar: { metaTitle: '', metaDescription: '', keywords: [], ogTitle: '', ogDescription: '', ogImage: '', canonicalUrl: '' },
    de: { metaTitle: '', metaDescription: '', keywords: [], ogTitle: '', ogDescription: '', ogImage: '', canonicalUrl: '' },
    es: { metaTitle: '', metaDescription: '', keywords: [], ogTitle: '', ogDescription: '', ogImage: '', canonicalUrl: '' },
    fr: { metaTitle: '', metaDescription: '', keywords: [], ogTitle: '', ogDescription: '', ogImage: '', canonicalUrl: '' },
  },
  coverImage:          '',
  coverImageByCountry: {},
  categories:  [],
  tags:        [],
  authorName:  'QuickHire Team',
  authorAvatar: '',
  authorBio:   { en: '', hi: '', ar: '', de: '', es: '', fr: '' },
};

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 120);
}

export default function BlogPostEditor({ postId = null }) {
  const router = useRouter();
  const [form, setForm]     = useState(EMPTY_FORM);
  const [allCats, setAllCats] = useState([]);
  const [locale, setLocale] = useState('en');
  const [seoTab, setSeoTab] = useState(false); // toggle SEO section
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!postId);
  const [uploadingImg, setUploadingImg] = useState(null); // country code or 'global'
  const fileRef = useRef(null);
  const uploadTarget = useRef(null); // 'global' | country code

  // Load existing post
  useEffect(() => {
    staffApi.get('/blog/admin/categories').then(r => setAllCats(r.data.data)).catch(() => {});
    if (!postId) return;
    staffApi.get(`/blog/admin/posts/${postId}`)
      .then(r => {
        const post = r.data.data;
        setForm({
          ...EMPTY_FORM,
          ...post,
          coverImageByCountry: post.coverImageByCountry || {},
          categories: (post.categories || []).map(String),
          tags: post.tags || [],
          seo: { ...EMPTY_FORM.seo, ...(post.seo || {}) },
        });
      })
      .catch(() => showError('Failed to load post'))
      .finally(() => setLoading(false));
  }, [postId]);

  // ── Field helpers ─────────────────────────────────────────────────────
  function setI18n(field, lang, val) {
    setForm(f => ({ ...f, [field]: { ...f[field], [lang]: val } }));
  }
  function setSeoField(lang, field, val) {
    setForm(f => ({ ...f, seo: { ...f.seo, [lang]: { ...(f.seo?.[lang] || {}), [field]: val } } }));
  }
  function setKeywords(lang, raw) {
    setSeoField(lang, 'keywords', raw.split(',').map(s => s.trim()).filter(Boolean));
  }
  function toggleCat(id) {
    setForm(f => ({
      ...f,
      categories: f.categories.includes(id) ? f.categories.filter(c => c !== id) : [...f.categories, id],
    }));
  }
  function addTag(tag) {
    const t = tag.trim().toLowerCase();
    if (!t || form.tags.includes(t)) return;
    setForm(f => ({ ...f, tags: [...f.tags, t] }));
  }
  function removeTag(tag) { setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) })); }

  // ── Image upload ──────────────────────────────────────────────────────
  async function handleImageFile(file, target) {
    if (!file) return;
    setUploadingImg(target);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const res = await staffApi.post('/blog/admin/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = res.data.url;
      if (target === 'global') {
        setForm(f => ({ ...f, coverImage: url }));
      } else {
        setForm(f => ({ ...f, coverImageByCountry: { ...f.coverImageByCountry, [target]: url } }));
      }
    } catch { showError('Image upload failed'); }
    finally { setUploadingImg(null); }
  }

  // ── Save ──────────────────────────────────────────────────────────────
  async function save(publishNow = false) {
    if (!form.title?.en?.trim()) return showError('English Title is required (EN tab)');
    setSaving(true);

    const payload = {
      ...form,
      status:      publishNow ? 'published' : form.status,
      // Empty string fails Zod datetime — send null instead
      scheduledAt: form.scheduledAt || null,
    };
    if (!payload.slug) payload.slug = slugify(form.title.en || '');

    try {
      if (postId) {
        await staffApi.put(`/blog/admin/posts/${postId}`, payload);
        showSuccess('Post saved');
      } else {
        const res = await staffApi.post('/blog/admin/posts', payload);
        showSuccess(publishNow ? 'Post published!' : 'Post saved as draft');
        router.push(`/admin/blog/${res.data.data._id}/edit`);
      }
    } catch (e) {
      const err = e?.response?.data;
      // Show Zod field errors if present
      const fieldErrors = err?.details?.errors?.fieldErrors;
      if (fieldErrors) {
        const msgs = Object.entries(fieldErrors).map(([f, v]) => `${f}: ${v[0]}`).join(', ');
        showError(msgs || err?.message || 'Validation failed');
      } else {
        showError(err?.message || 'Save failed — check all required fields');
      }
    } finally { setSaving(false); }
  }

  if (loading) return <div className="flex justify-center py-40"><Spinner /></div>;

  const seoData = form.seo?.[locale] || {};
  const keywordStr = (seoData.keywords || []).join(', ');

  return (
    <div className="min-h-screen bg-[#F8FCF7]">
      <PageHeader
        title={postId ? 'Edit Post' : 'New Blog Post'}
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Blog', href: '/admin/blog' }, { label: postId ? 'Edit' : 'New' }]}
        backHref="/admin/blog"
        action={
          <div className="flex gap-2">
            <button onClick={() => save(false)} disabled={saving}
                    className="px-4 py-2 rounded-xl border border-[#D0E8CB] text-sm font-medium text-[#444] hover:bg-[#F2F9F1] disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button onClick={() => save(true)} disabled={saving}
                    className="px-5 py-2 rounded-xl bg-[#45A735] text-white text-sm font-medium hover:bg-[#3a9028] disabled:opacity-50">
              {form.status === 'published' ? 'Update' : 'Publish'}
            </button>
          </div>
        }
      />

      {/* Hidden file input for cover image uploads */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
             onChange={e => { handleImageFile(e.target.files[0], uploadTarget.current); e.target.value = ''; }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col xl:flex-row gap-6">
        {/* ── Main column ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Locale tabs */}
          <div className="bg-white rounded-xl border border-[#E5F1E2] overflow-hidden">
            <div className="flex border-b border-[#E5F1E2] bg-[#F8FCF7]">
              {LOCALES.map(l => (
                <button key={l.code} onClick={() => setLocale(l.code)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${locale === l.code ? 'border-[#45A735] text-[#45A735] bg-white' : 'border-transparent text-[#666] hover:text-[#333]'}`}>
                  <span>{l.flag}</span>{l.label}
                  {l.code !== 'en' && !form.title?.[l.code] && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ccc] ml-0.5" title="Not translated" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-5">
              {/* Required fields notice */}
              <p className="text-xs text-[#888]"><span className="text-[#e53e3e] font-bold">*</span> = required field</p>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-[#26472B] mb-2">
                  Title {locale === 'en'
                    ? <span className="text-[#e53e3e] font-bold">*</span>
                    : <span className="text-[#aaa] text-xs font-normal">(optional)</span>}
                </label>
                <input
                  value={form.title?.[locale] || ''}
                  onChange={e => {
                    setI18n('title', locale, e.target.value);
                    if (locale === 'en' && !postId && !form.slug) {
                      setForm(f => ({ ...f, slug: slugify(e.target.value) }));
                    }
                  }}
                  placeholder={locale === 'en' ? 'Enter post title (required)' : `Post title in ${LOCALES.find(l => l.code === locale)?.label} (optional)`}
                  className={`w-full border rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:border-[#45A735] ${locale === 'en' && !form.title?.en ? 'border-[#e53e3e] bg-[#fff8f8]' : 'border-[#D0E8CB]'}`}
                />
                {locale === 'en' && !form.title?.en && (
                  <p className="text-xs text-[#e53e3e] mt-1">Title (English) is required to save</p>
                )}
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-sm font-semibold text-[#26472B] mb-2">
                  Excerpt / Summary <span className="text-[#aaa] text-xs font-normal">(shown in blog cards)</span>
                </label>
                <textarea
                  value={form.excerpt?.[locale] || ''}
                  onChange={e => setI18n('excerpt', locale, e.target.value)}
                  rows={3}
                  placeholder="Brief summary shown in blog listing cards and meta description…"
                  className="w-full border border-[#D0E8CB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#45A735] resize-none"
                />
                <div className="text-right text-xs text-[#aaa] mt-0.5">{(form.excerpt?.[locale] || '').length} / 300</div>
              </div>

              {/* Body editor */}
              <div>
                <label className="block text-sm font-semibold text-[#26472B] mb-2">
                  Body Content <span className="text-[#aaa] text-xs font-normal">(full article)</span>
                </label>
                <TipTapEditor
                  key={locale} // remount on locale change
                  value={form.body?.[locale] || ''}
                  onChange={val => setI18n('body', locale, val)}
                  placeholder={`Write the full article in ${LOCALES.find(l => l.code === locale)?.label}…`}
                  minHeight={400}
                />
              </div>
            </div>
          </div>

          {/* SEO Section */}
          <div className="bg-white rounded-xl border border-[#E5F1E2] overflow-hidden">
            <button onClick={() => setSeoTab(!seoTab)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-[#26472B]">SEO Settings</span>
                <span className="text-xs text-[#888] bg-[#F2F9F1] px-2 py-0.5 rounded-full">
                  {LOCALES.find(l => l.code === locale)?.label}
                </span>
              </div>
              <span className="text-[#aaa] text-lg">{seoTab ? '▲' : '▼'}</span>
            </button>

            {seoTab && (
              <div className="px-6 pb-6 space-y-4 border-t border-[#F2F9F1]">
                {/* Locale tabs inside SEO */}
                <div className="flex flex-wrap gap-1 pt-4">
                  {LOCALES.map(l => (
                    <button key={l.code} onClick={() => setLocale(l.code)}
                            className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${locale === l.code ? 'bg-[#45A735] text-white' : 'bg-[#F2F9F1] text-[#555] hover:bg-[#E5F1E2]'}`}>
                      {l.flag} {l.label}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#444] mb-1">
                    Meta Title <span className="text-[#aaa]">({(seoData.metaTitle || '').length}/70)</span>
                  </label>
                  <input value={seoData.metaTitle || ''} onChange={e => setSeoField(locale, 'metaTitle', e.target.value)}
                         maxLength={70} placeholder="SEO page title…"
                         className="w-full border border-[#D0E8CB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#45A735]" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#444] mb-1">
                    Meta Description <span className="text-[#aaa]">({(seoData.metaDescription || '').length}/160)</span>
                  </label>
                  <textarea value={seoData.metaDescription || ''} onChange={e => setSeoField(locale, 'metaDescription', e.target.value)}
                            maxLength={160} rows={2} placeholder="SEO description…"
                            className="w-full border border-[#D0E8CB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#45A735] resize-none" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#444] mb-1">Keywords <span className="text-[#aaa]">(comma separated)</span></label>
                  <input value={keywordStr} onChange={e => setKeywords(locale, e.target.value)}
                         placeholder="hire developer, IT staffing, tech talent…"
                         className="w-full border border-[#D0E8CB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#45A735]" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#444] mb-1">OG Title</label>
                    <input value={seoData.ogTitle || ''} onChange={e => setSeoField(locale, 'ogTitle', e.target.value)}
                           placeholder="Social share title"
                           className="w-full border border-[#D0E8CB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#45A735]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#444] mb-1">OG Image URL</label>
                    <input value={seoData.ogImage || ''} onChange={e => setSeoField(locale, 'ogImage', e.target.value)}
                           placeholder="https://…"
                           className="w-full border border-[#D0E8CB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#45A735]" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#444] mb-1">OG Description</label>
                  <textarea value={seoData.ogDescription || ''} onChange={e => setSeoField(locale, 'ogDescription', e.target.value)}
                            rows={2} placeholder="Open Graph description for social sharing"
                            className="w-full border border-[#D0E8CB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#45A735] resize-none" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#444] mb-1">Canonical URL</label>
                  <input value={seoData.canonicalUrl || ''} onChange={e => setSeoField(locale, 'canonicalUrl', e.target.value)}
                         placeholder="https://quickhire.global/blog/…"
                         className="w-full border border-[#D0E8CB] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#45A735]" />
                </div>

                {/* SEO Preview */}
                {(seoData.metaTitle || form.title?.en) && (
                  <div className="border border-[#D0E8CB] rounded-xl p-4 bg-[#F8FCF7]">
                    <p className="text-xs text-[#888] font-medium mb-2 uppercase tracking-wide">Google Preview</p>
                    <div className="text-[#1a0dab] text-base font-medium truncate">
                      {seoData.metaTitle || form.title?.en}
                    </div>
                    <div className="text-[#006621] text-xs mt-0.5">
                      quickhire.global/blog/{form.slug || 'your-post-slug'}
                    </div>
                    <div className="text-[#545454] text-xs mt-1 line-clamp-2">
                      {seoData.metaDescription || form.excerpt?.en || 'No description set'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right sidebar ──────────────────────────────────────────── */}
        <div className="w-full xl:w-80 flex-shrink-0 space-y-4">

          {/* Status & Publish */}
          <div className="bg-white rounded-xl border border-[#45A735] bg-[#F8FCF7] p-5 space-y-4">
            <h3 className="font-semibold text-[#26472B]">Publish <span className="text-xs text-[#888] font-normal">(save first, then publish)</span></h3>
            <div>
              <label className="block text-xs font-medium text-[#444] mb-1">Status <span className="text-[#e53e3e] font-bold">*</span></label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full border border-[#D0E8CB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#45A735] bg-white">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            {form.status === 'scheduled' && (
              <div>
                <label className="block text-xs font-medium text-[#444] mb-1">
                  Scheduled Date & Time <span className="text-[#e53e3e] font-bold">*</span>
                </label>
                <input type="datetime-local" value={form.scheduledAt ? form.scheduledAt.slice(0, 16) : ''}
                       onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                       className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#45A735] ${!form.scheduledAt ? 'border-[#e53e3e]' : 'border-[#D0E8CB]'}`} />
                {!form.scheduledAt && <p className="text-xs text-[#e53e3e] mt-1">Required when status is Scheduled</p>}
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))}
                     className="accent-[#45A735] w-4 h-4" />
              <span className="text-sm text-[#444]">⭐ Feature this post</span>
            </label>
          </div>

          {/* Slug */}
          <div className="bg-white rounded-xl border border-[#E5F1E2] p-5">
            <label className="block text-xs font-semibold text-[#26472B] mb-2">
              URL Slug <span className="text-[#e53e3e] font-bold">*</span>
              <span className="text-[#aaa] font-normal ml-1">(auto-filled from title)</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#aaa] shrink-0">/blog/</span>
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                     placeholder="auto-generated-from-title"
                     className={`flex-1 border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#45A735] ${!form.slug ? 'border-[#e53e3e]' : 'border-[#D0E8CB]'}`} />
            </div>
            {!form.slug && <p className="text-xs text-[#e53e3e] mt-1">Slug is auto-generated — type a title first</p>}
          </div>

          {/* Cover images */}
          <div className="bg-white rounded-xl border border-[#E5F1E2] p-5 space-y-4">
            <h3 className="font-semibold text-[#26472B]">Cover Images</h3>

            {/* Global cover */}
            <div>
              <label className="block text-xs font-medium text-[#444] mb-1">Global (fallback)</label>
              <div className="flex gap-2">
                <input value={form.coverImage} onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))}
                       placeholder="https://…"
                       className="flex-1 border border-[#D0E8CB] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#45A735]" />
                <button onClick={() => { uploadTarget.current = 'global'; fileRef.current?.click(); }}
                        disabled={uploadingImg === 'global'}
                        className="px-2.5 py-2 bg-[#F2F9F1] border border-[#D0E8CB] rounded-lg text-xs hover:bg-[#E5F1E2] disabled:opacity-50">
                  {uploadingImg === 'global' ? '…' : '📤'}
                </button>
              </div>
              {form.coverImage && (
                <img src={form.coverImage} alt="" className="mt-2 w-full h-24 object-cover rounded-lg" />
              )}
            </div>

            {/* Per-country images */}
            <div className="space-y-3">
              <p className="text-xs text-[#888] font-medium">Country-specific overrides</p>
              {COUNTRIES.map(c => (
                <div key={c.code}>
                  <label className="block text-xs font-medium text-[#444] mb-1">{c.label}</label>
                  <div className="flex gap-2">
                    <input
                      value={form.coverImageByCountry?.[c.code] || ''}
                      onChange={e => setForm(f => ({ ...f, coverImageByCountry: { ...f.coverImageByCountry, [c.code]: e.target.value } }))}
                      placeholder="https://… or leave blank to use global"
                      className="flex-1 border border-[#D0E8CB] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#45A735]"
                    />
                    <button onClick={() => { uploadTarget.current = c.code; fileRef.current?.click(); }}
                            disabled={uploadingImg === c.code}
                            className="px-2 py-1 bg-[#F2F9F1] border border-[#D0E8CB] rounded-lg text-xs hover:bg-[#E5F1E2] disabled:opacity-50">
                      {uploadingImg === c.code ? '…' : '📤'}
                    </button>
                  </div>
                  {form.coverImageByCountry?.[c.code] && (
                    <img src={form.coverImageByCountry[c.code]} alt="" className="mt-1 w-full h-16 object-cover rounded-lg" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Categories */}
          {allCats.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5F1E2] p-5">
              <h3 className="font-semibold text-[#26472B] mb-3">Categories</h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {allCats.map(cat => (
                  <label key={cat._id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox"
                           checked={form.categories.includes(String(cat._id))}
                           onChange={() => toggleCat(String(cat._id))}
                           className="accent-[#45A735] w-3.5 h-3.5" />
                    <span className="text-sm text-[#333]">{cat.name?.en || cat.slug}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="bg-white rounded-xl border border-[#E5F1E2] p-5">
            <h3 className="font-semibold text-[#26472B] mb-3">Tags</h3>
            <div className="flex flex-wrap gap-1.5 mb-3 min-h-[28px]">
              {form.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-[#F2F9F1] text-[#45A735] text-xs px-2.5 py-1 rounded-full border border-[#C5E0BF]">
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="hover:opacity-60 text-xs ml-0.5">✕</button>
                </span>
              ))}
            </div>
            <input
              placeholder="Add tag + Enter"
              className="w-full border border-[#D0E8CB] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#45A735]"
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(e.target.value); e.target.value = ''; } }}
            />
          </div>

          {/* Author */}
          <div className="bg-white rounded-xl border border-[#E5F1E2] p-5 space-y-3">
            <h3 className="font-semibold text-[#26472B]">Author</h3>
            <div>
              <label className="block text-xs font-medium text-[#444] mb-1">Name</label>
              <input value={form.authorName} onChange={e => setForm(f => ({ ...f, authorName: e.target.value }))}
                     className="w-full border border-[#D0E8CB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#45A735]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#444] mb-1">Avatar URL</label>
              <input value={form.authorAvatar} onChange={e => setForm(f => ({ ...f, authorAvatar: e.target.value }))}
                     placeholder="https://…"
                     className="w-full border border-[#D0E8CB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#45A735]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#444] mb-1">Bio (English)</label>
              <textarea value={form.authorBio?.en || ''} onChange={e => setI18n('authorBio', 'en', e.target.value)}
                        rows={2} className="w-full border border-[#D0E8CB] rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-[#45A735]" />
            </div>
          </div>

          {/* Bottom save buttons */}
          <div className="flex flex-col gap-2">
            <button onClick={() => save(true)} disabled={saving}
                    className="w-full py-3 rounded-xl bg-[#45A735] text-white font-semibold text-sm hover:bg-[#3a9028] disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : form.status === 'published' ? '✓ Update Post' : '🚀 Publish Now'}
            </button>
            <button onClick={() => save(false)} disabled={saving}
                    className="w-full py-2.5 rounded-xl border border-[#D0E8CB] text-sm text-[#555] hover:bg-[#F2F9F1] disabled:opacity-50">
              Save as {form.status === 'published' ? 'Update' : 'Draft'}
            </button>
            {postId && form.status === 'published' && (
              <a href={`/blog/${form.slug}`} target="_blank" rel="noopener"
                 className="w-full text-center py-2.5 rounded-xl border border-[#D0E8CB] text-xs text-[#45A735] hover:bg-[#F2F9F1]">
                👁 View Live Post →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
