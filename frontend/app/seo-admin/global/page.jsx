'use client';
import { useEffect, useState } from 'react';
import staffApi from '@/lib/axios/staffApi';
import { showError, showSuccess } from '@/lib/utils/toast';

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

function Section({ title, desc, children }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5F1E2] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E5F1E2] bg-[#FAFEF9]">
        <h2 className="font-semibold text-[#26472B] text-sm">{title}</h2>
        {desc && <p className="text-xs text-[#909090] mt-0.5">{desc}</p>}
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </div>
  );
}

const DEFAULTS = {
  titleTemplate:        '%s | QuickHire Global',
  defaultOgImage:       '',
  organizationSchema:   '',
  robotsTxt:            'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /seo-admin/\nDisallow: /staff-login\n\nSitemap: https://qhfixed.vercel.app/sitemap.xml',
  googleVerification:   '',
  bingVerification:     '',
  facebookAppId:        '',
  twitterSite:          '',
  linkedinProfile:      '',
  facebookPage:         '',
};

export default function SeoGlobal() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState(DEFAULTS);

  useEffect(() => {
    staffApi.get('/admin/seo/global')
      .then((r) => {
        const d = r.data?.data || {};
        setForm({ ...DEFAULTS, ...d });
      })
      .catch(() => showError('Failed to load global SEO settings'))
      .finally(() => setLoading(false));
  }, []);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const save = async () => {
    setSaving(true);
    try {
      let organizationSchema = undefined;
      if (form.organizationSchema?.trim()) {
        try { organizationSchema = JSON.parse(form.organizationSchema); }
        catch { showError('Organization Schema is not valid JSON'); setSaving(false); return; }
      }
      await staffApi.put('/admin/seo/global', { ...form, organizationSchema });
      showSuccess('Global settings saved');
    } catch { showError('Save failed'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="p-8 flex items-center gap-3 text-[#636363]">
      <div className="w-5 h-5 rounded-full border-2 border-[#45A735] border-t-transparent animate-spin" />
      Loading…
    </div>
  );

  return (
    <div className="p-6 sm:p-8 space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#26472B]">Global SEO Settings</h1>
          <p className="text-sm text-[#636363] mt-0.5">Site-wide defaults, verification tags, robots.txt, and schema.</p>
        </div>
        <button
          onClick={save} disabled={saving}
          className="px-5 py-2 rounded-xl bg-[#45A735] text-white text-sm font-semibold hover:bg-[#3a8f2c] transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {saving && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      {/* Defaults */}
      <Section title="Site Defaults" desc="Applied when a page has no custom value set.">
        <Field label="Title Template" hint="Use %s for the page title">
          <input value={form.titleTemplate} onChange={(e) => set('titleTemplate', e.target.value)}
            placeholder="%s | QuickHire Global"
            className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735]" />
          <p className="text-[10px] text-[#909090] mt-1">Example: <span className="font-medium">Hire Developers | QuickHire Global</span></p>
        </Field>

        <Field label="Default OG Image URL" hint="Fallback if a page has no OG image. 1200×630px">
          <input value={form.defaultOgImage} onChange={(e) => set('defaultOgImage', e.target.value)}
            placeholder="https://…/default-og.jpg"
            className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735]" />
          {form.defaultOgImage && (
            <img src={form.defaultOgImage} alt="OG preview"
              className="mt-2 rounded-xl border border-[#E5F1E2] max-h-28 object-cover"
              onError={(e) => { e.target.style.display = 'none'; }} />
          )}
        </Field>
      </Section>

      {/* Search Console Verification */}
      <Section title="Search Console Verification" desc="Paste only the content= value from the verification meta tag.">
        <Field label="Google Search Console">
          <input value={form.googleVerification} onChange={(e) => set('googleVerification', e.target.value)}
            placeholder="abc123xyz…"
            className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735]" />
        </Field>
        <Field label="Bing Webmaster">
          <input value={form.bingVerification} onChange={(e) => set('bingVerification', e.target.value)}
            placeholder="abc123xyz…"
            className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735]" />
        </Field>
      </Section>

      {/* Social Profiles */}
      <Section title="Social Profiles" desc="Used in Organization schema and link rel=me tags.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Twitter / X handle">
            <input value={form.twitterSite} onChange={(e) => set('twitterSite', e.target.value)}
              placeholder="@QuickHireGlobal"
              className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735]" />
          </Field>
          <Field label="LinkedIn Page URL">
            <input value={form.linkedinProfile} onChange={(e) => set('linkedinProfile', e.target.value)}
              placeholder="https://linkedin.com/company/quickhire-global"
              className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735]" />
          </Field>
          <Field label="Facebook Page URL">
            <input value={form.facebookPage} onChange={(e) => set('facebookPage', e.target.value)}
              placeholder="https://facebook.com/QuickHireGlobal"
              className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735]" />
          </Field>
          <Field label="Facebook App ID">
            <input value={form.facebookAppId} onChange={(e) => set('facebookAppId', e.target.value)}
              placeholder="123456789"
              className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735]" />
          </Field>
        </div>
      </Section>

      {/* robots.txt */}
      <Section title="robots.txt" desc="Edit the live robots.txt served to crawlers. Changes take effect on next revalidation (up to 1 hour).">
        <textarea
          value={form.robotsTxt} onChange={(e) => set('robotsTxt', e.target.value)}
          rows={10}
          className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735] resize-none font-mono"
          spellCheck={false}
        />
        <p className="text-[10px] text-[#909090]">Live at: <span className="font-medium">/robots.txt</span> (Next.js route handler, cached 1h)</p>
      </Section>

      {/* Organization Schema */}
      <Section title="Organization JSON-LD Schema" desc="Global schema injected on every page. Must be valid JSON.">
        <textarea
          value={form.organizationSchema} onChange={(e) => set('organizationSchema', e.target.value)}
          rows={10}
          placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "QuickHire Global",\n  "url": "https://qhfixed.vercel.app"\n}`}
          className="w-full px-3 py-2 text-sm border border-[#E5F1E2] rounded-xl focus:outline-none focus:border-[#45A735] resize-none font-mono"
          spellCheck={false}
        />
      </Section>

      {/* Save footer */}
      <div className="flex justify-end pt-2 pb-8">
        <button
          onClick={save} disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-[#45A735] text-white text-sm font-semibold hover:bg-[#3a8f2c] transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {saving && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
