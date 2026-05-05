'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import staffApi from '@/lib/axios/staffApi';
import { showError, showSuccess } from '@/lib/utils/toast';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://qhfixed.vercel.app';
const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ar', label: 'Arabic' },
  { code: 'de', label: 'German' },
];

function CharBar({ value = '', max, warn }) {
  const len = value.length;
  const pct = Math.min((len / max) * 100, 100);
  const color = len > max ? '#ef4444' : len > warn ? '#f59e0b' : '#45A735';
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 bg-[#E5F1E2] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] font-medium" style={{ color }}>{len}/{max}</span>
    </div>
  );
}

function SerpPreview({ title, description, path }) {
  const displayUrl = `${SITE.replace('https://', '')}${path || ''}`;
  const t = title || 'No title set';
  const d = description || 'No description set — Google will pull text from the page.';
  return (
    <div className="border border-[#E5F1E2] rounded-2xl p-5 bg-white">
      <p className="text-xs font-semibold text-[#909090] uppercase tracking-wider mb-3">Google SERP Preview</p>
      <div className="max-w-xl font-sans">
        <p className="text-[13px] text-[#1a0dab] font-medium leading-snug hover:underline cursor-pointer truncate">{t}</p>
        <p className="text-[12px] text-[#006621] mt-0.5 truncate">{displayUrl}</p>
        <p className="text-[12px] text-[#545454] mt-1 leading-relaxed line-clamp-2">{d}</p>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium text-[#26472B]">{label}</label>
        {hint && <span className="text-[10px] text-[#909090]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5F1E2] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E5F1E2] bg-[#FAFEF9]">
        <h2 className="font-semibold text-[#26472B] text-sm">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </div>
  );
}

const empty = () => ({ en: '', hi: '', ar: '', de: '' });

export default function SeoPageEditor() {
  const { key } = useParams();
  const router  = useRouter();

  const [meta, setMeta]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [langTab, setLangTab] = useState('en');
  const [ogTab, setOgTab]     = useState('twitter'); // tab inside social section

  // Form state
  const [form, setForm] = useState({
    metaTitle:       empty(),
    metaDescription: empty(),
    ogTitle:    '',
    ogDesc:     '',
    ogImage:    '',
    twitterTitle: '',
    twitterDesc:  '',
    twitterImage: '',
    twitterCard:  'summary_large_image',
    canonical:    '',
    noindex:      false,
    nofollow:     false,
    focusKeyword: '',
    customSchema: '',
    robotsOverride: '',
  });

  useEffect(() => {
    staffApi.get(`/admin/seo/pages/${encodeURIComponent(key)}`)
      .then((r) => {
        const d = r.data?.data || {};
        setMeta(d);
        setForm({
          metaTitle:       d.metaTitle       || empty(),
          metaDescription: d.metaDescription || empty(),
          ogTitle:         d.ogTitle         || '',
          ogDesc:          d.ogDesc          || '',
          ogImage:         d.ogImage         || '',
          twitterTitle:    d.twitterTitle    || '',
          twitterDesc:     d.twitterDesc     || '',
          twitterImage:    d.twitterImage    || '',
          twitterCard:     d.twitterCard     || 'summary_large_image',
          canonical:       d.canonical       || '',
          noindex:         d.noindex         || false,
          nofollow:        d.nofollow        || false,
          focusKeyword:    d.focusKeyword    || '',
          customSchema:    d.customSchema    ? JSON.stringify(d.customSchema, null, 2) : '',
          robotsOverride:  d.robotsOverride  || '',
        });
      })
      .catch(() => showError('Failed to load page SEO'))
      .finally(() => setLoading(false));
  }, [key]);

  const set = useCallback((field, value) => setForm((f) => ({ ...f, [field]: value })), []);
  const setI18n = useCallback((field, lang, value) =>
    setForm((f) => ({ ...f, [field]: { ...f[field], [lang]: value } })), []);

  const save = async () => {
    setSaving(true);
    try {
      let customSchema = undefined;
      if (form.customSchema.trim()) {
        try { customSchema = JSON.parse(form.customSchema); }
        catch { showError('Custom Schema is not valid JSON'); setSaving(false); return; }
      }
      await staffApi.put(`/admin/seo/pages/${encodeURIComponent(key)}`, { ...form, customSchema });
      showSuccess('SEO saved successfully');
    } catch { showError('Save failed'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="p-8 flex items-center gap-3 text-[#636363]">
      <div className="w-5 h-5 rounded-full border-2 border-[#45A735] border-t-transparent animate-spin" />
      Loading…
    </div>
  );

  const currentTitle = form.metaTitle?.[langTab] || '';
  const currentDesc  = form.metaDescription?.[langTab] || '';

  return (
    <div className="p-6 sm:p-8 space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={() => router.back()} className="text-xs text-[#636363] hover:text-[#45A735] mb-1 flex items-center gap-1">
            ← Back to pages
          </button>
          <h1 className="text-xl font-bold text-[#26472B]">{meta?.label || key}</h1>
          <p className="text-xs text-[#909090] mt-0.5">{meta?.path}</p>
        </div>
        <button
          onClick={save} disabled={saving}
          className="px-5 py-2 rounded-xl bg-[#45A735] text-white text-sm font-semibold hover:bg-[#3a8f2c] transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {saving && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
          {saving ? 'Saving…' : 'Save SEO'}
        </button>
      </div>

      {/* SERP preview — live with EN */}
      <SerpPreview
        title={form.metaTitle?.en}
        description={form.metaDescription?.en}
        path={meta?.path}
      />

      {/* Language tabs */}
      <div className="flex gap-1 border-b border-[#E5F1E2]">
        {LANGS.map((l) => (
          <button key={l.code} onClick={() => setLangTab(l.code)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              langTab === l.code
                ? 'border-[#45A735] text-[#45A735]'
                : 'border-transparent text-[#636363] hover:text-[#26472B]'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Meta title / description for current lang */}
      <Section title={`Meta Tags — ${LANGS.find((l) => l.code === langTab)?.label}`}>
        <Field label="Meta Title" hint="Ideal: 50–60 chars">
          <input
            value={form.metaTitle?.[langTab] || ''}
            onChange={(e) => setI18n('metaTitle', langTab, e.target.value)}
            placeholder="e.g. Hire Top Developers | QuickHire Global"
            className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735]"
          />
          <CharBar value={form.metaTitle?.[langTab]} max={60} warn={55} />
        </Field>

        <Field label="Meta Description" hint="Ideal: 140–160 chars">
          <textarea
            value={form.metaDescription?.[langTab] || ''}
            onChange={(e) => setI18n('metaDescription', langTab, e.target.value)}
            rows={3}
            placeholder="Compelling summary shown in search results…"
            className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735] resize-none"
          />
          <CharBar value={form.metaDescription?.[langTab]} max={160} warn={140} />
        </Field>

        <Field label="Focus Keyword" hint="Primary keyword for this page">
          <input
            value={form.focusKeyword}
            onChange={(e) => set('focusKeyword', e.target.value)}
            placeholder="e.g. hire remote developers"
            className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735]"
          />
        </Field>
      </Section>

      {/* OG / Social */}
      <Section title="Social Sharing (Open Graph & Twitter)">
        <div className="flex gap-2 mb-2">
          {[{ id: 'og', label: 'Open Graph' }, { id: 'twitter', label: 'Twitter / X' }].map((t) => (
            <button key={t.id} onClick={() => setOgTab(t.id)}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                ogTab === t.id
                  ? 'bg-[#45A735] text-white border-[#45A735]'
                  : 'bg-white text-[#636363] border-[#E5F1E2] hover:border-[#45A735]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {ogTab === 'og' ? (
          <>
            <Field label="OG Title" hint="Defaults to meta title if blank">
              <input value={form.ogTitle} onChange={(e) => set('ogTitle', e.target.value)}
                placeholder="Facebook / LinkedIn share title"
                className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735]" />
              <CharBar value={form.ogTitle} max={90} warn={70} />
            </Field>
            <Field label="OG Description">
              <textarea value={form.ogDesc} onChange={(e) => set('ogDesc', e.target.value)}
                rows={2} placeholder="Facebook / LinkedIn share description"
                className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735] resize-none" />
            </Field>
            <Field label="OG Image URL" hint="Recommended: 1200×630px">
              <input value={form.ogImage} onChange={(e) => set('ogImage', e.target.value)}
                placeholder="https://…/og-image.jpg"
                className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735]" />
              {form.ogImage && (
                <img src={form.ogImage} alt="OG preview"
                  className="mt-2 rounded-xl border border-[#E5F1E2] max-h-32 object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }} />
              )}
            </Field>
          </>
        ) : (
          <>
            <Field label="Twitter Card Type">
              <select value={form.twitterCard} onChange={(e) => set('twitterCard', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735] bg-white">
                <option value="summary_large_image">Summary Large Image</option>
                <option value="summary">Summary</option>
              </select>
            </Field>
            <Field label="Twitter Title" hint="Defaults to OG title">
              <input value={form.twitterTitle} onChange={(e) => set('twitterTitle', e.target.value)}
                placeholder="Twitter share title"
                className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735]" />
            </Field>
            <Field label="Twitter Description">
              <textarea value={form.twitterDesc} onChange={(e) => set('twitterDesc', e.target.value)}
                rows={2} placeholder="Twitter share description"
                className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735] resize-none" />
            </Field>
            <Field label="Twitter Image URL" hint="Recommended: 1200×600px">
              <input value={form.twitterImage} onChange={(e) => set('twitterImage', e.target.value)}
                placeholder="https://…/twitter-image.jpg"
                className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735]" />
            </Field>
          </>
        )}
      </Section>

      {/* Technical SEO */}
      <Section title="Technical SEO">
        <Field label="Canonical URL" hint="Leave blank to use page URL">
          <input value={form.canonical} onChange={(e) => set('canonical', e.target.value)}
            placeholder={`${SITE}${meta?.path || ''}`}
            className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735]" />
        </Field>

        <Field label="Robots Override" hint="e.g. noindex, nofollow — leave blank for default">
          <input value={form.robotsOverride} onChange={(e) => set('robotsOverride', e.target.value)}
            placeholder="index, follow"
            className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735]" />
        </Field>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => set('noindex', !form.noindex)}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.noindex ? 'bg-red-400' : 'bg-[#E5F1E2]'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.noindex ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-[#26472B]">noindex <span className="text-[#909090] text-xs">(hide from Google)</span></span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => set('nofollow', !form.nofollow)}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.nofollow ? 'bg-amber-400' : 'bg-[#E5F1E2]'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.nofollow ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-[#26472B]">nofollow <span className="text-[#909090] text-xs">(don't pass link juice)</span></span>
          </label>
        </div>
      </Section>

      {/* Custom JSON-LD Schema */}
      <Section title="Custom JSON-LD Schema">
        <Field label="Schema JSON" hint="Paste valid JSON-LD — validates on save">
          <textarea
            value={form.customSchema}
            onChange={(e) => set('customSchema', e.target.value)}
            rows={8}
            placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "QuickHire Global"\n}`}
            className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735] resize-none font-mono"
            spellCheck={false}
          />
        </Field>
      </Section>

      {/* Save footer */}
      <div className="flex justify-end pt-2 pb-8">
        <button
          onClick={save} disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-[#45A735] text-white text-sm font-semibold hover:bg-[#3a8f2c] transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {saving && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
          {saving ? 'Saving…' : 'Save SEO'}
        </button>
      </div>
    </div>
  );
}
