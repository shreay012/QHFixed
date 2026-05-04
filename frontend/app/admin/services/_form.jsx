'use client';

/**
 * Shared service form — used by both /admin/services/new and /admin/services/[id]/edit.
 * Renders as a full page (not a modal) with 5 tabs.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import staffApi from '@/lib/axios/staffApi';
import { showError, showSuccess } from '@/lib/utils/toast';
import { Spinner, ErrorBox } from '@/components/staff/ui';

// ─── Constants ────────────────────────────────────────────────────────────────

export const LANGUAGES = [
  { code: 'en',    label: 'English'              },
  { code: 'hi',    label: 'Hindi'                },
  { code: 'de',    label: 'German'               },
  { code: 'es',    label: 'Spanish'              },
  { code: 'fr',    label: 'French'               },
  { code: 'ar',    label: 'Arabic'               },
  { code: 'ja',    label: 'Japanese'             },
  { code: 'zh-CN', label: 'Chinese (Simplified)' },
];

const LANG_CODES = LANGUAGES.map((l) => l.code);

const CURRENCY_SYMBOLS = {
  INR: '₹', USD: '$', AED: 'د.إ', EUR: '€',
  GBP: '£', AUD: 'A$', SGD: 'S$', CAD: 'C$',
};

const COUNTRIES = [
  { code: 'IN', name: 'India',          currency: 'INR' },
  { code: 'AE', name: 'UAE',            currency: 'AED' },
  { code: 'DE', name: 'Germany',        currency: 'EUR' },
  { code: 'US', name: 'United States',  currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'AU', name: 'Australia',      currency: 'AUD' },
  { code: 'SG', name: 'Singapore',      currency: 'SGD' },
  { code: 'CA', name: 'Canada',         currency: 'CAD' },
];

// Must match CATEGORY_ICON keys in lib/utils/serviceIcon.js so the icon resolves correctly
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

const TABS = ['Basic Info', 'Translations', 'Technologies & Scope', 'FAQs', 'Page Content', 'Geo Pricing'];

const emptyLangMap = () => Object.fromEntries(LANG_CODES.map((c) => [c, '']));
const emptyTech    = () => emptyLangMap();
const emptyFeature      = () => ({ icon: '', label: emptyLangMap() });
const emptyProcessStep  = () => ({ title: emptyLangMap(), description: emptyLangMap() });

function toSlug(str) {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

const emptyForm = () => ({
  slug:         '',
  _slugEdited:  false,
  name:         emptyLangMap(),
  description:  emptyLangMap(),
  // Tagline: short one-liner shown on the customer-facing service card grid.
  // Multi-locale, optional. Falls back to first sentence of description.
  tagline:      emptyLangMap(),
  category:     '',
  technologies: [],
  notIncluded:  [],
  faqs:         [],
  hourlyRate:   '',
  imageUrl:     '',
  active:       true,
  // SERVICE_CMS_SECTIONS_V1 — per-service overrides for the static
  // service-details page sections. Empty arrays/maps mean "use platform
  // defaults from messages/{locale}.json".
  features:            [],
  processSteps:        [],
  promises:            [],
  workingHours:        emptyLangMap(),
  transparentTitle:    emptyLangMap(),
  transparentSubtitle: emptyLangMap(),
});

// ─── Shared field helpers ─────────────────────────────────────────────────────

function Label({ children }) {
  return (
    <label className="block text-xs font-open-sauce-semibold text-[#636363] uppercase tracking-wider mb-1.5">
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder, type = 'text', className = '' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full border border-[#E5F1E2] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#45A735] focus:ring-1 focus:ring-[#45A73520] transition-colors ${className}`}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full border border-[#E5F1E2] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#45A735] focus:ring-1 focus:ring-[#45A73520] resize-none transition-colors"
    />
  );
}

function Toggle({ value, onChange, label, hint }) {
  return (
    <div className="flex items-center justify-between bg-[#F7FBF6] border border-[#E5F1E2] rounded-xl px-4 py-3">
      <div>
        <p className="text-sm font-open-sauce-semibold text-[#26472B]">{label}</p>
        {hint && <p className="text-xs text-[#909090] mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ml-4 ${value ? 'bg-[#45A735]' : 'bg-[#D9D9D9]'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function SectionCard({ title, hint, children }) {
  return (
    <div className="bg-white border border-[#E5F1E2] rounded-2xl p-6 space-y-4">
      <div>
        <h4 className="text-sm font-open-sauce-bold text-[#26472B]">{title}</h4>
        {hint && <p className="text-xs text-[#909090] mt-1">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── LocalizedListEditor ──────────────────────────────────────────────────────
// Editor for a list where each entry is an i18n object {en, de, hi, …}.
// Each entry is shown as a row with the English label and a "Translations ▼"
// disclosure that reveals every other locale below it.

function LocalizedItem({ item, index, onChange, onRemove, placeholder }) {
  const [open, setOpen] = useState(!item.en);

  return (
    <div className="border border-[#E5F1E2] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#F7FBF6]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-6 h-6 rounded-full bg-[#45A735] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>
          <span className="text-sm font-open-sauce-semibold text-[#26472B] truncate">
            {item.en || <span className="text-[#909090] italic font-normal">Enter English text…</span>}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button type="button" onClick={() => setOpen((v) => !v)} className="text-xs font-semibold text-[#45A735] hover:underline">
            {open ? 'Collapse ▲' : 'Translations ▼'}
          </button>
          <button type="button" onClick={onRemove} className="text-xs text-red-400 hover:text-red-600">
            Remove
          </button>
        </div>
      </div>
      {open && (
        <div className="px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LANGUAGES.map(({ code, label }) => (
            <div key={code}>
              <label className="block text-[10px] font-bold text-[#636363] uppercase tracking-wider mb-1.5">
                {label}
                {code === 'en' && <span className="text-red-400 ml-1">*</span>}
              </label>
              <input
                value={item[code] || ''}
                onChange={(e) => onChange({ ...item, [code]: e.target.value })}
                placeholder={code === 'en' ? placeholder : `In ${label}…`}
                className={`w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-[#45A735] focus:ring-1 focus:ring-[#45A73520] transition-colors ${
                  code === 'en' && !item.en ? 'border-red-200 bg-red-50/30' : 'border-[#E5F1E2]'
                }`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LocalizedListEditor({ items, onChange, placeholder, addLabel = '+ Add Item' }) {
  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-[#C8E5C2] rounded-2xl text-sm text-[#909090]">
          Nothing added yet.
        </div>
      )}
      {items.map((item, i) => (
        <LocalizedItem
          key={i}
          index={i}
          item={item}
          placeholder={placeholder}
          onChange={(val) => onChange(items.map((t, idx) => (idx === i ? val : t)))}
          onRemove={() => onChange(items.filter((_, idx) => idx !== i))}
        />
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, emptyLangMap()])}
        className="w-full py-3 border-2 border-dashed border-[#45A735] text-[#45A735] text-sm font-bold rounded-2xl hover:bg-[#F7FBF6] transition-colors"
      >
        {addLabel}
      </button>
    </div>
  );
}

// ─── FaqEditor ────────────────────────────────────────────────────────────────
// Each FAQ stores question and answer as i18n maps (emptyLangMap), so admins
// can localise both per language. English is required for each FAQ.

function FaqItem({ faq, index, onChange, onRemove }) {
  const [open, setOpen] = useState(!faq.question?.en);
  const updateField = (field, code, val) =>
    onChange({ ...faq, [field]: { ...faq[field], [code]: val } });

  return (
    <div className="border border-[#E5F1E2] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#F7FBF6]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-6 h-6 rounded-full bg-[#45A735] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>
          <span className="text-sm font-open-sauce-semibold text-[#26472B] truncate">
            {faq.question?.en || <span className="text-[#909090] italic font-normal">Enter English question…</span>}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button type="button" onClick={() => setOpen((v) => !v)} className="text-xs font-semibold text-[#45A735] hover:underline">
            {open ? 'Collapse ▲' : 'Translations ▼'}
          </button>
          <button type="button" onClick={onRemove} className="text-xs text-red-400 hover:text-red-600">
            Remove
          </button>
        </div>
      </div>
      {open && (
        <div className="px-5 py-5 space-y-5">
          {LANGUAGES.map(({ code, label }) => (
            <div key={code} className="border-l-2 border-[#E5F1E2] pl-4 space-y-2">
              <p className="text-[10px] font-bold text-[#636363] uppercase tracking-wider">
                {label}
                {code === 'en' && <span className="text-red-400 ml-1">*</span>}
              </p>
              <div>
                <Label>Question ({code})</Label>
                <Input
                  value={faq.question?.[code] || ''}
                  onChange={(v) => updateField('question', code, v)}
                  placeholder={code === 'en' ? 'e.g. How quickly can I start?' : `Question in ${label}…`}
                  className={code === 'en' && !faq.question?.en ? 'border-red-200' : ''}
                />
              </div>
              <div>
                <Label>Answer ({code})</Label>
                <Textarea
                  value={faq.answer?.[code] || ''}
                  onChange={(v) => updateField('answer', code, v)}
                  placeholder={code === 'en' ? 'Write a clear, helpful answer…' : `Answer in ${label}…`}
                  rows={3}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FaqEditor({ faqs, onChange }) {
  return (
    <div className="space-y-3">
      {faqs.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-[#C8E5C2] rounded-2xl text-sm text-[#909090]">
          No FAQs added yet — the platform&apos;s default localized FAQs will be shown.
        </div>
      )}
      {faqs.map((faq, i) => (
        <FaqItem
          key={i}
          index={i}
          faq={faq}
          onChange={(val) => onChange(faqs.map((f, idx) => (idx === i ? val : f)))}
          onRemove={() => onChange(faqs.filter((_, idx) => idx !== i))}
        />
      ))}
      <button
        type="button"
        onClick={() => onChange([...faqs, { question: emptyLangMap(), answer: emptyLangMap() }])}
        className="w-full py-3 border-2 border-dashed border-[#45A735] text-[#45A735] text-sm font-bold rounded-2xl hover:bg-[#F7FBF6] transition-colors"
      >
        + Add FAQ
      </button>
    </div>
  );
}

// ─── TechEditor ───────────────────────────────────────────────────────────────

function TechItem({ tech, index, onChange, onRemove }) {
  const [open, setOpen] = useState(!tech.en); // auto-open new blank items

  return (
    <div className="border border-[#E5F1E2] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#F7FBF6]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-6 h-6 rounded-full bg-[#45A735] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>
          <span className="text-sm font-open-sauce-semibold text-[#26472B] truncate">
            {tech.en || <span className="text-[#909090] italic font-normal">Enter English name…</span>}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs font-semibold text-[#45A735] hover:underline"
          >
            {open ? 'Collapse ▲' : 'Translations ▼'}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-400 hover:text-red-600"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Language fields */}
      {open && (
        <div className="px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LANGUAGES.map(({ code, label }) => (
            <div key={code}>
              <label className="block text-[10px] font-bold text-[#636363] uppercase tracking-wider mb-1.5">
                {label}
                {code === 'en' && <span className="text-red-400 ml-1">*</span>}
              </label>
              <input
                value={tech[code] || ''}
                onChange={(e) => onChange({ ...tech, [code]: e.target.value })}
                placeholder={code === 'en' ? 'e.g. AI Engineer' : `Name in ${label}…`}
                className={`w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-[#45A735] focus:ring-1 focus:ring-[#45A73520] transition-colors ${
                  code === 'en' && !tech.en ? 'border-red-200 bg-red-50/30' : 'border-[#E5F1E2]'
                }`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TechEditor({ technologies, onChange }) {
  return (
    <div className="space-y-3">
      {technologies.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-[#C8E5C2] rounded-2xl text-sm text-[#909090]">
          No technologies added yet.
        </div>
      )}

      {technologies.map((tech, i) => (
        <TechItem
          key={i}
          index={i}
          tech={tech}
          onChange={(val) => onChange(technologies.map((t, idx) => (idx === i ? val : t)))}
          onRemove={() => onChange(technologies.filter((_, idx) => idx !== i))}
        />
      ))}

      <button
        type="button"
        onClick={() => onChange([...technologies, emptyTech()])}
        className="w-full py-3 border-2 border-dashed border-[#45A735] text-[#45A735] text-sm font-bold rounded-2xl hover:bg-[#F7FBF6] transition-colors"
      >
        + Add Technology
      </button>
    </div>
  );
}

// ─── I18nTextField ────────────────────────────────────────────────────────────
// Compact editor for a single i18n string (e.g. workingHours). Shows the
// English input inline and reveals the other locales behind a disclosure.

function I18nTextField({ label, hint, value, onChange, placeholder, multiline = false }) {
  const [open, setOpen] = useState(false);
  const update = (code, val) => onChange({ ...value, [code]: val });
  const Tag = multiline ? Textarea : Input;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[10px] font-bold text-[#45A735] hover:underline uppercase tracking-wider"
        >
          {open ? 'Hide translations ▲' : 'Translations ▼'}
        </button>
      </div>
      <Tag
        value={value?.en || ''}
        onChange={(v) => update('en', v)}
        placeholder={placeholder}
        rows={multiline ? 2 : undefined}
      />
      {hint && <p className="text-xs text-[#909090]">{hint}</p>}
      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E5F1E2]">
          {LANGUAGES.filter((l) => l.code !== 'en').map(({ code, label: langLabel }) => (
            <div key={code}>
              <label className="block text-[10px] font-bold text-[#636363] uppercase tracking-wider mb-1.5">
                {langLabel}
              </label>
              {multiline ? (
                <Textarea
                  value={value?.[code] || ''}
                  onChange={(v) => update(code, v)}
                  placeholder={`In ${langLabel}…`}
                  rows={2}
                />
              ) : (
                <Input
                  value={value?.[code] || ''}
                  onChange={(v) => update(code, v)}
                  placeholder={`In ${langLabel}…`}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── FeatureEditor ────────────────────────────────────────────────────────────
// Each feature = { icon: 'url-or-emoji', label: i18n }. Icons are optional;
// when empty the customer-facing component falls back to its default SVG.

function FeatureItem({ feature, index, onChange, onRemove }) {
  const [open, setOpen] = useState(!feature.label?.en);
  const updateLabel = (code, val) => onChange({ ...feature, label: { ...feature.label, [code]: val } });

  return (
    <div className="border border-[#E5F1E2] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#F7FBF6]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-6 h-6 rounded-full bg-[#45A735] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>
          <span className="text-sm font-open-sauce-semibold text-[#26472B] truncate">
            {feature.label?.en || <span className="text-[#909090] italic font-normal">Enter English label…</span>}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button type="button" onClick={() => setOpen((v) => !v)} className="text-xs font-semibold text-[#45A735] hover:underline">
            {open ? 'Collapse ▲' : 'Edit ▼'}
          </button>
          <button type="button" onClick={onRemove} className="text-xs text-red-400 hover:text-red-600">Remove</button>
        </div>
      </div>
      {open && (
        <div className="px-5 py-5 space-y-4">
          <div>
            <Label>Icon URL or Emoji <span className="text-[#909090] normal-case font-normal">— optional</span></Label>
            <Input
              value={feature.icon || ''}
              onChange={(v) => onChange({ ...feature, icon: v })}
              placeholder="https://cdn.example.com/icon.svg or 🚀"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LANGUAGES.map(({ code, label: langLabel }) => (
              <div key={code}>
                <label className="block text-[10px] font-bold text-[#636363] uppercase tracking-wider mb-1.5">
                  {langLabel}
                  {code === 'en' && <span className="text-red-400 ml-1">*</span>}
                </label>
                <Input
                  value={feature.label?.[code] || ''}
                  onChange={(v) => updateLabel(code, v)}
                  placeholder={code === 'en' ? 'e.g. 400+ Verified professionals' : `In ${langLabel}…`}
                  className={code === 'en' && !feature.label?.en ? 'border-red-200' : ''}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureEditor({ features, onChange }) {
  return (
    <div className="space-y-3">
      {features.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-[#C8E5C2] rounded-2xl text-sm text-[#909090]">
          No features added — the platform&apos;s default 4 chips will be shown.
        </div>
      )}
      {features.map((feature, i) => (
        <FeatureItem
          key={i}
          index={i}
          feature={feature}
          onChange={(val) => onChange(features.map((f, idx) => (idx === i ? val : f)))}
          onRemove={() => onChange(features.filter((_, idx) => idx !== i))}
        />
      ))}
      <button
        type="button"
        onClick={() => onChange([...features, emptyFeature()])}
        className="w-full py-3 border-2 border-dashed border-[#45A735] text-[#45A735] text-sm font-bold rounded-2xl hover:bg-[#F7FBF6] transition-colors"
      >
        + Add Feature Chip
      </button>
    </div>
  );
}

// ─── ProcessStepEditor ────────────────────────────────────────────────────────
// Each step = { title: i18n, description: i18n }. The step number is rendered
// automatically in display order.

function ProcessStepItem({ step, index, onChange, onRemove }) {
  const [open, setOpen] = useState(!step.title?.en);
  const updateField = (field, code, val) =>
    onChange({ ...step, [field]: { ...step[field], [code]: val } });

  return (
    <div className="border border-[#E5F1E2] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#F7FBF6]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-6 h-6 rounded-full bg-[#45A735] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>
          <span className="text-sm font-open-sauce-semibold text-[#26472B] truncate">
            {step.title?.en || <span className="text-[#909090] italic font-normal">Enter step title…</span>}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button type="button" onClick={() => setOpen((v) => !v)} className="text-xs font-semibold text-[#45A735] hover:underline">
            {open ? 'Collapse ▲' : 'Edit ▼'}
          </button>
          <button type="button" onClick={onRemove} className="text-xs text-red-400 hover:text-red-600">Remove</button>
        </div>
      </div>
      {open && (
        <div className="px-5 py-5 space-y-5">
          {LANGUAGES.map(({ code, label: langLabel }) => (
            <div key={code} className="border-l-2 border-[#E5F1E2] pl-4 space-y-2">
              <p className="text-[10px] font-bold text-[#636363] uppercase tracking-wider">
                {langLabel}
                {code === 'en' && <span className="text-red-400 ml-1">*</span>}
              </p>
              <div>
                <Label>Title ({code})</Label>
                <Input
                  value={step.title?.[code] || ''}
                  onChange={(v) => updateField('title', code, v)}
                  placeholder={code === 'en' ? 'e.g. Booking' : `Title in ${langLabel}…`}
                  className={code === 'en' && !step.title?.en ? 'border-red-200' : ''}
                />
              </div>
              <div>
                <Label>Description ({code})</Label>
                <Textarea
                  value={step.description?.[code] || ''}
                  onChange={(v) => updateField('description', code, v)}
                  placeholder={code === 'en' ? 'What happens in this step.' : `Description in ${langLabel}…`}
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProcessStepEditor({ steps, onChange }) {
  return (
    <div className="space-y-3">
      {steps.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-[#C8E5C2] rounded-2xl text-sm text-[#909090]">
          No process steps added — the platform&apos;s default 5-step flow will be shown.
        </div>
      )}
      {steps.map((step, i) => (
        <ProcessStepItem
          key={i}
          index={i}
          step={step}
          onChange={(val) => onChange(steps.map((s, idx) => (idx === i ? val : s)))}
          onRemove={() => onChange(steps.filter((_, idx) => idx !== i))}
        />
      ))}
      <button
        type="button"
        onClick={() => onChange([...steps, emptyProcessStep()])}
        className="w-full py-3 border-2 border-dashed border-[#45A735] text-[#45A735] text-sm font-bold rounded-2xl hover:bg-[#F7FBF6] transition-colors"
      >
        + Add Process Step
      </button>
    </div>
  );
}

// ─── GeoPricingSection ────────────────────────────────────────────────────────

function GeoPricingSection({ serviceId, pendingOverrides, setPendingOverrides }) {
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  // Backend field name is "basePrice" — not "price"
  const [newRow, setNewRow] = useState({ country: 'IN', basePrice: '', currency: 'INR' });
  const [saving, setSaving] = useState(false);

  const loadOverrides = useCallback(async () => {
    if (!serviceId) return;
    setLoading(true);
    try {
      // Use server-side serviceId filter — avoids loading the entire geo_pricing collection
      const r = await staffApi.get('/geo-pricing/admin', { params: { serviceId } });
      setOverrides(r.data?.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [serviceId]);

  useEffect(() => { loadOverrides(); }, [loadOverrides]);

  const handleAdd = async () => {
    if (!newRow.basePrice || Number(newRow.basePrice) <= 0) {
      showError('Enter a valid price greater than 0');
      return;
    }
    if (serviceId) {
      // Service already exists — save immediately
      setSaving(true);
      try {
        await staffApi.post('/geo-pricing/admin', {
          serviceId,
          country:   newRow.country,
          basePrice: Number(newRow.basePrice),  // backend expects "basePrice"
          currency:  newRow.currency,
        });
        showSuccess('Price override added');
        setNewRow({ country: 'IN', basePrice: '', currency: 'INR' });
        await loadOverrides();
      } catch (e) { showError(e?.response?.data?.error?.message || 'Failed to add override'); }
      finally { setSaving(false); }
    } else {
      // New service — queue pending; will be flushed after service creation
      setPendingOverrides((prev) => [
        ...prev,
        { _tempId: Date.now(), country: newRow.country, basePrice: Number(newRow.basePrice), currency: newRow.currency },
      ]);
      setNewRow({ country: 'IN', basePrice: '', currency: 'INR' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await staffApi.delete(`/geo-pricing/admin/${id}`);
      showSuccess('Override removed');
      await loadOverrides();
    } catch (e) { showError(e?.response?.data?.error?.message || 'Failed to remove override'); }
    finally { setConfirmDelete(null); }
  };

  const sym = (currency) => CURRENCY_SYMBOLS[currency] || currency;
  const rows = serviceId ? overrides : pendingOverrides;

  return (
    <div className="space-y-5">
      <p className="text-xs text-[#636363]">
        {serviceId
          ? 'Set country-specific prices. The base hourly rate applies where no override is set.'
          : 'These overrides will be saved automatically after the service is created.'}
      </p>

      {loading && <Spinner />}

      {rows.length > 0 && (
        <div className="border border-[#E5F1E2] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F7FBF6]">
              <tr>
                {['Country', 'Price / hr', 'Currency', ''].map((h, i) => (
                  <th key={i} className={`px-5 py-3 text-xs font-bold text-[#636363] uppercase tracking-wider ${i < 3 ? 'text-left' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F7EE]">
              {rows.map((o) => {
                const id = o._id || o._tempId;
                const isConfirm = confirmDelete === id;
                return (
                  <tr key={id} className="hover:bg-[#F7FBF6] transition-colors">
                    <td className="px-5 py-3 font-semibold text-[#26472B]">{o.country}</td>
                    {/* Display "basePrice" — the actual field name stored in the DB */}
                    <td className="px-5 py-3">{sym(o.currency)}{Number(o.basePrice).toLocaleString()}</td>
                    <td className="px-5 py-3 text-[#636363]">{o.currency}</td>
                    <td className="px-5 py-3 text-right">
                      {isConfirm ? (
                        <span className="flex items-center justify-end gap-2">
                          <span className="text-xs text-[#636363]">Remove?</span>
                          <button
                            onClick={() => serviceId
                              ? handleDelete(o._id)
                              : (setPendingOverrides((p) => p.filter((x) => x._tempId !== o._tempId)), setConfirmDelete(null))
                            }
                            className="text-xs px-2.5 py-1 bg-red-500 text-white rounded-lg"
                          >
                            Yes
                          </button>
                          <button onClick={() => setConfirmDelete(null)}
                            className="text-xs px-2.5 py-1 border border-[#E5F1E2] rounded-lg">No</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmDelete(id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length === 0 && !loading && (
        <p className="text-sm text-[#909090] italic text-center py-4">No country overrides yet.</p>
      )}

      {/* Add row */}
      <div className="border border-[#E5F1E2] rounded-2xl p-5 bg-[#F7FBF6] space-y-4">
        <p className="text-xs font-bold text-[#45A735] uppercase tracking-widest">Add Country Override</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Country</Label>
            <select
              value={newRow.country}
              onChange={(e) => {
                const c = COUNTRIES.find((x) => x.code === e.target.value);
                setNewRow({ country: e.target.value, basePrice: newRow.basePrice, currency: c?.currency || 'USD' });
              }}
              className="w-full border border-[#E5F1E2] rounded-xl px-3 py-2.5 text-sm bg-white outline-none focus:border-[#45A735]"
            >
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
            </select>
          </div>
          <div>
            <Label>Base Price / hr</Label>
            <input
              type="number" min="0.01" step="0.01"
              value={newRow.basePrice}
              onChange={(e) => setNewRow({ ...newRow, basePrice: e.target.value })}
              placeholder="e.g. 150"
              className="w-full border border-[#E5F1E2] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#45A735]"
            />
          </div>
          <div>
            <Label>Currency</Label>
            <select
              value={newRow.currency}
              onChange={(e) => setNewRow({ ...newRow, currency: e.target.value })}
              className="w-full border border-[#E5F1E2] rounded-xl px-3 py-2.5 text-sm bg-white outline-none focus:border-[#45A735]"
            >
              {Object.entries(CURRENCY_SYMBOLS).map(([c, s]) => <option key={c} value={c}>{c} {s}</option>)}
            </select>
          </div>
        </div>
        <button
          type="button" onClick={handleAdd} disabled={saving}
          className="px-5 py-2.5 bg-[#45A735] text-white text-sm font-bold rounded-xl hover:bg-[#3d9230] disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : '+ Add Override'}
        </button>
      </div>
    </div>
  );
}

// ─── Main ServiceFormPage ─────────────────────────────────────────────────────

export default function ServiceFormPage({ serviceId = null, initialData = null }) {
  const router = useRouter();
  const isEdit = Boolean(serviceId);

  const [form, setForm]             = useState(emptyForm());
  const [pendingGeo, setPendingGeo] = useState([]);
  const [tab, setTab]               = useState(0);
  const [busy, setBusy]             = useState(false);

  // Initialise form from initialData (edit) or keep empty (new).
  // staffApi no longer runs flattenI18nDeep, so initialData.name can be
  // either a plain string (legacy) or a full i18n object {en, hi, ...}.
  useEffect(() => {
    if (!initialData) return;

    // Hydrate name map — use the full i18n object if available, else seed English
    const rawName = initialData.name;
    const nameMap = (rawName && typeof rawName === 'object' && !Array.isArray(rawName))
      ? { ...emptyLangMap(), ...rawName }
      : { ...emptyLangMap(), en: typeof rawName === 'string' ? rawName : '' };

    // Hydrate description map
    const rawDesc = initialData.description;
    const descMap = (rawDesc && typeof rawDesc === 'object' && !Array.isArray(rawDesc))
      ? { ...emptyLangMap(), ...rawDesc }
      : { ...emptyLangMap(), en: typeof rawDesc === 'string' ? rawDesc : '' };

    // Hydrate tagline map (same shape as name/description)
    const rawTagline = initialData.tagline;
    const taglineMap = (rawTagline && typeof rawTagline === 'object' && !Array.isArray(rawTagline))
      ? { ...emptyLangMap(), ...rawTagline }
      : { ...emptyLangMap(), en: typeof rawTagline === 'string' ? rawTagline : '' };

    // Hydrate technologies — each tech may be a string or an i18n-keyed object
    // (stored as { name, en, hi, ... }).  We keep all language fields.
    const techs = (initialData.technologies || []).map((t) => {
      if (typeof t === 'string') return { ...emptyTech(), en: t };
      if (typeof t === 'object' && t !== null) {
        // Merge all known language keys; fall back to t.name for the English field
        const base = { ...emptyTech() };
        for (const code of LANG_CODES) { if (t[code]) base[code] = t[code]; }
        if (!base.en && t.name) base.en = t.name;
        return base;
      }
      return null;
    }).filter((t) => t?.en);

    // notIncluded — entries can be plain strings (legacy), {name:string}
    // (older shape), or full i18n objects ({en, de, …}). Normalise to a
    // language map so admins can edit each locale.
    const notInc = (initialData.notIncluded || [])
      .map((t) => {
        if (typeof t === 'string') return { ...emptyLangMap(), en: t };
        if (typeof t === 'object' && t !== null) {
          const base = { ...emptyLangMap() };
          for (const code of LANG_CODES) { if (t[code]) base[code] = t[code]; }
          if (!base.en && t.name) base.en = t.name;
          return base;
        }
        return null;
      })
      .filter((t) => t?.en);

    // FAQs — questions/answers can be strings (legacy) or i18n objects.
    // Normalise both to a language map so admins can edit each locale.
    const faqs = (initialData.faqs || []).map((f) => ({
      question: (typeof f.question === 'object' && f.question !== null)
        ? { ...emptyLangMap(), ...f.question }
        : { ...emptyLangMap(), en: typeof f.question === 'string' ? f.question : '' },
      answer: (typeof f.answer === 'object' && f.answer !== null)
        ? { ...emptyLangMap(), ...f.answer }
        : { ...emptyLangMap(), en: typeof f.answer === 'string' ? f.answer : '' },
    }));

    // ── CMS section hydrators ─────────────────────────────────────────────
    // Each helper accepts whatever the backend currently has (string, sparse
    // i18n object, or missing) and returns a full lang-map ready for editing.
    const langMapFrom = (raw) => {
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        return { ...emptyLangMap(), ...raw };
      }
      return { ...emptyLangMap(), en: typeof raw === 'string' ? raw : '' };
    };

    const features = (initialData.features || []).map((f) => ({
      icon:  typeof f?.icon === 'string' ? f.icon : '',
      label: langMapFrom(f?.label),
    }));

    const processSteps = (initialData.processSteps || []).map((s) => ({
      title:       langMapFrom(s?.title),
      description: langMapFrom(s?.description),
    }));

    const promises = (initialData.promises || []).map((p) => langMapFrom(p));

    setForm({
      slug:         initialData.slug || '',
      _slugEdited:  !!(initialData.slug),
      name:         nameMap,
      description:  descMap,
      tagline:      taglineMap,
      category:     initialData.category || '',
      technologies: techs,
      notIncluded:  notInc,
      faqs,
      hourlyRate:   String(initialData.hourlyRate ?? initialData.pricing?.hourly ?? ''),
      imageUrl:     initialData.imageUrl || initialData.image || '',
      active:       initialData.active !== false,
      features,
      processSteps,
      promises,
      workingHours:        langMapFrom(initialData.workingHours),
      transparentTitle:    langMapFrom(initialData.transparentTitle),
      transparentSubtitle: langMapFrom(initialData.transparentSubtitle),
    });
  }, [initialData]);

  const setLang = (field, lang, val) =>
    setForm((f) => ({ ...f, [field]: { ...f[field], [lang]: val } }));

  const save = async () => {
    if (!form.name.en.trim()) { showError('English name is required'); setTab(0); return; }
    const resolvedSlug = form.slug.trim() || toSlug(form.name.en);
    if (resolvedSlug.length < 2) { showError('Slug must be at least 2 characters'); setTab(0); return; }
    setForm(f => ({ ...f, slug: resolvedSlug }));
    setBusy(true);
    try {
      // Build i18n name object — only include locales that have a value
      const nameI18n = Object.fromEntries(
        LANG_CODES.map((c) => [c, form.name[c]?.trim() || '']).filter(([, v]) => v)
      );

      // Build i18n description object the same way
      const descI18n = Object.fromEntries(
        LANG_CODES.map((c) => [c, form.description[c]?.trim() || '']).filter(([, v]) => v)
      );

      // Build i18n tagline object the same way
      const taglineI18n = Object.fromEntries(
        LANG_CODES.map((c) => [c, form.tagline[c]?.trim() || '']).filter(([, v]) => v)
      );

      // Technologies — store as rich objects: { name (English), en, hi, ... }
      // The customer-facing flattenI18nDeep interceptor will localise to a
      // string for the active locale at read time.
      const techObjects = form.technologies
        .filter((t) => t.en?.trim())
        .map((t) => {
          const obj = { name: t.en.trim() };
          for (const c of LANG_CODES) { if (t[c]?.trim()) obj[c] = t[c].trim(); }
          return obj;
        });

      // notIncluded — drop empty entries and ship each as a sparse i18n
      // object (only locales that have a value). Backend stores the same
      // shape so flattenI18nDeep can localise to the active locale at read.
      const notIncludedI18n = form.notIncluded
        .filter((t) => t?.en?.trim())
        .map((t) => Object.fromEntries(
          LANG_CODES.map((c) => [c, t[c]?.trim() || '']).filter(([, v]) => v),
        ));

      // FAQs — keep both question and answer as multi-locale maps. English
      // is required; other locales are optional and fall back via flattenI18nDeep.
      const faqsI18n = form.faqs
        .filter((f) => f.question?.en?.trim() && f.answer?.en?.trim())
        .map((f) => ({
          question: Object.fromEntries(
            LANG_CODES.map((c) => [c, f.question[c]?.trim() || '']).filter(([, v]) => v),
          ),
          answer: Object.fromEntries(
            LANG_CODES.map((c) => [c, f.answer[c]?.trim() || '']).filter(([, v]) => v),
          ),
        }));

      // ── CMS section serializers ────────────────────────────────────────
      // Strip empty locale entries from a lang-map and only ship the field
      // when at least one locale has content. The customer-facing
      // flattenI18nDeep then localises to the active language at read time.
      const sparseI18n = (m) => Object.fromEntries(
        LANG_CODES.map((c) => [c, m?.[c]?.trim() || '']).filter(([, v]) => v),
      );
      const i18nOrEmpty = (m) => {
        const o = sparseI18n(m);
        return Object.keys(o).length > 0 ? o : '';
      };

      const featuresI18n = form.features
        .filter((f) => f.label?.en?.trim())
        .map((f) => ({ icon: (f.icon || '').trim(), label: sparseI18n(f.label) }));

      const processStepsI18n = form.processSteps
        .filter((s) => s.title?.en?.trim() && s.description?.en?.trim())
        .map((s) => ({ title: sparseI18n(s.title), description: sparseI18n(s.description) }));

      const promisesI18n = form.promises
        .filter((p) => p?.en?.trim())
        .map((p) => sparseI18n(p));

      const body = {
        slug:         resolvedSlug,
        name:         nameI18n,
        category:     form.category || '',
        description:  descI18n,
        // Always ship as an object so the backend zod union always matches the
        // object branch (an empty string used to fail because the union's
        // string branch required min(1); both ends now accept empty too).
        tagline:      taglineI18n,
        technologies: techObjects,
        notIncluded:  notIncludedI18n,
        faqs:         faqsI18n,
        hourlyRate:   Number(form.hourlyRate) || 0,
        imageUrl:     form.imageUrl || '',
        active:       form.active,
        // CMS sections — empty arrays/strings tell the backend to treat
        // this service as "use platform defaults".
        features:            featuresI18n,
        processSteps:        processStepsI18n,
        promises:            promisesI18n,
        workingHours:        i18nOrEmpty(form.workingHours),
        transparentTitle:    i18nOrEmpty(form.transparentTitle),
        transparentSubtitle: i18nOrEmpty(form.transparentSubtitle),
      };

      let savedId = serviceId;
      if (isEdit) {
        await staffApi.put(`/admin/services/${serviceId}`, body);
        showSuccess('Service updated!');
      } else {
        const r = await staffApi.post('/admin/services', body);
        savedId = r.data?.data?._id || r.data?._id;
        showSuccess('Service created!');
      }

      // Flush pending geo overrides (added before the service existed)
      if (!isEdit && savedId && pendingGeo.length > 0) {
        await Promise.allSettled(
          pendingGeo.map((o) =>
            staffApi.post('/geo-pricing/admin', {
              serviceId: savedId,
              country:   o.country,
              basePrice: o.basePrice,   // backend field is "basePrice" not "price"
              currency:  o.currency,
            })
          )
        );
      }

      router.push('/admin/services');
    } catch (e) {
      showError(e?.response?.data?.error?.message || 'Failed to save service');
    } finally {
      setBusy(false);
    }
  };

  const tabHasError = (i) => i === 0 && !form.name.en.trim();

  return (
    <div className="min-h-screen bg-[#F5F7F5]">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#E5F1E2]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/services')}
              className="flex items-center gap-1.5 text-sm text-[#636363] hover:text-[#26472B] transition-colors"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Services
            </button>
            <span className="text-[#D9D9D9]">/</span>
            <h1 className="text-sm font-open-sauce-bold text-[#26472B]">
              {isEdit ? (form.name.en || 'Edit Service') : 'New Service'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/admin/services')}
              className="px-4 py-2 text-sm font-semibold text-[#636363] border border-[#E5F1E2] rounded-xl hover:bg-[#F7FBF6] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy || !form.name.en.trim()}
              className="px-5 py-2 text-sm font-bold text-white bg-[#45A735] rounded-xl hover:bg-[#3d9230] disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {busy && (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="12" />
                </svg>
              )}
              {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Service'}
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-4xl mx-auto px-6 flex gap-1 pb-0 overflow-x-auto">
          {TABS.map((label, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              className={`flex-shrink-0 px-4 py-2.5 text-sm font-open-sauce-semibold border-b-2 transition-all whitespace-nowrap ${
                tab === i
                  ? 'border-[#45A735] text-[#26472B]'
                  : 'border-transparent text-[#636363] hover:text-[#26472B]'
              } ${tabHasError(i) ? 'text-red-500' : ''}`}
            >
              {label}
              {tabHasError(i) && <span className="ml-1 text-red-400">●</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Tab 0 — Basic Info */}
        {tab === 0 && (
          <>
            <SectionCard title="Service Identity" hint="Core details shown at the top of the service page.">
              <div>
                <Label>Service Name (English) <span className="text-red-500 normal-case font-normal">— required</span></Label>
                <Input
                  value={form.name.en}
                  onChange={(v) => setForm(f => ({
                    ...f,
                    name:        { ...f.name, en: v },
                    slug:        f._slugEdited ? f.slug : toSlug(v),
                  }))}
                  placeholder="e.g. AI Engineer"
                />
                <p className="text-xs text-[#909090] mt-1">Translations for other languages are in the Translations tab.</p>
              </div>

              {/* ── Slug / URL ── */}
              <div>
                <Label>URL Slug <span className="text-red-500 normal-case font-normal">— required</span></Label>
                <div className="flex items-center border border-[#E5F1E2] rounded-xl overflow-hidden focus-within:border-[#45A735] focus-within:ring-1 focus-within:ring-[#45A73520] transition-colors">
                  <span className="px-3 py-2.5 text-xs text-[#888] bg-[#F8FCF7] border-r border-[#E5F1E2] whitespace-nowrap select-none">
                    /service-details/
                  </span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => {
                      const raw = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
                      setForm(f => ({ ...f, slug: raw, _slugEdited: true }));
                    }}
                    placeholder="ai-engineer"
                    className="flex-1 px-3 py-2.5 text-sm outline-none bg-white font-mono"
                  />
                </div>
                <p className="text-xs text-[#909090] mt-1">
                  Auto-filled from the name. Edit to customise. Used as the public URL —&nbsp;
                  <span className="font-medium text-[#45A735]">must be unique</span>.
                </p>
                {form.slug && (
                  <p className="text-xs text-[#45A735] mt-1 font-mono">
                    Preview: /service-details/{form.slug}
                  </p>
                )}
              </div>

              <div>
                <Label>Category <span className="text-[#909090] normal-case font-normal">— controls the icon shown on the customer card</span></Label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-[#E5F1E2] rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-[#45A735] focus:ring-1 focus:ring-[#45A73520] transition-colors"
                >
                  <option value="">— Select a category —</option>
                  {SERVICE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <p className="text-xs text-[#909090] mt-1">
                  Determines which icon appears on the homepage service card.
                  If left blank the icon defaults to a keyword match on the service name.
                </p>
              </div>

              <div>
                <Label>Image URL <span className="text-[#909090] normal-case font-normal">— optional banner/hero image</span></Label>
                <Input
                  value={form.imageUrl}
                  onChange={(v) => setForm({ ...form, imageUrl: v })}
                  placeholder="https://cdn.example.com/service-image.png"
                />
              </div>
            </SectionCard>

            <SectionCard title="Pricing" hint="Set the base hourly rate in INR. Country-specific overrides are in the Geo Pricing tab.">
              <div>
                <Label>Base Hourly Rate (INR ₹)</Label>
                <Input
                  type="number"
                  value={form.hourlyRate}
                  onChange={(v) => setForm({ ...form, hourlyRate: v })}
                  placeholder="e.g. 2500"
                />
              </div>
            </SectionCard>

            <SectionCard title="Visibility">
              <Toggle
                value={form.active}
                onChange={(v) => setForm({ ...form, active: v })}
                label="Active"
                hint="When off, this service is hidden from users on the platform."
              />
            </SectionCard>
          </>
        )}

        {/* Tab 1 — Translations */}
        {tab === 1 && (
          <>
            <p className="text-sm text-[#636363]">
              Enter the service <strong>name</strong>, <strong>tagline</strong> and <strong>description</strong> in each language.
              English is required — all others are optional and fall back to English if empty.
            </p>
            {LANGUAGES.map(({ code, label }) => (
              <SectionCard
                key={code}
                title={
                  <span className="flex items-center gap-2">
                    {label}
                    <span className="text-xs font-mono text-[#909090]">{code}</span>
                    {code === 'en' && <span className="text-xs text-red-400 font-normal">Required</span>}
                  </span>
                }
              >
                <div>
                  <Label>Name in {label}</Label>
                  <Input
                    value={form.name[code] || ''}
                    onChange={(v) => setLang('name', code, v)}
                    placeholder={code === 'en' ? 'e.g. AI Engineer' : `Service name in ${label}…`}
                    className={code === 'en' && !form.name.en ? 'border-red-200' : ''}
                  />
                </div>
                <div>
                  <Label>Tagline in {label}</Label>
                  <Input
                    value={form.tagline[code] || ''}
                    onChange={(v) => setLang('tagline', code, v)}
                    placeholder={code === 'en'
                      ? 'e.g. Need smarter AI? We build & optimise.'
                      : `Short one-liner shown on service cards (in ${label})`}
                  />
                </div>
                <div>
                  <Label>Description in {label}</Label>
                  <Textarea
                    value={form.description[code] || ''}
                    onChange={(v) => setLang('description', code, v)}
                    placeholder={`Brief description of this service in ${label}…`}
                    rows={3}
                  />
                </div>
              </SectionCard>
            ))}
          </>
        )}

        {/* Tab 2 — Technologies & Scope */}
        {tab === 2 && (
          <>
            <SectionCard
              title="Technologies / Engineer Types"
              hint={`Each technology can be named in all 8 languages. These appear as chips in the "Curated Engineers For You" section on the service page. English name is required.`}
            >
              <TechEditor
                technologies={form.technologies}
                onChange={(val) => setForm({ ...form, technologies: val })}
              />
            </SectionCard>

            <SectionCard
              title="What's Not Included"
              hint={`These appear in the red "What's Not Included" box on the service page. Each entry can be translated into every supported language — English is required.`}
            >
              <LocalizedListEditor
                items={form.notIncluded}
                onChange={(val) => setForm({ ...form, notIncluded: val })}
                placeholder="e.g. Software licenses or paid third-party tools"
                addLabel="+ Add Item"
              />
            </SectionCard>
          </>
        )}

        {/* Tab 3 — FAQs */}
        {tab === 3 && (
          <SectionCard
            title="Frequently Asked Questions"
            hint="These appear in the FAQ accordion at the bottom of the service page. Leave empty to show the platform&apos;s default static FAQs."
          >
            <FaqEditor
              faqs={form.faqs}
              onChange={(val) => setForm({ ...form, faqs: val })}
            />
          </SectionCard>
        )}

        {/* Tab 4 — Page Content (per-service overrides for the
            customer-facing /service-details page) */}
        {tab === 4 && (
          <>
            <SectionCard
              title="Hero Feature Chips"
              hint='The 4 chips next to the hero ("400+ Verified professionals", "Enterprise-grade security", …). Leave empty to use the platform defaults from messages files.'
            >
              <FeatureEditor
                features={form.features}
                onChange={(val) => setForm({ ...form, features: val })}
              />
            </SectionCard>

            <SectionCard
              title="How It Works — Process Steps"
              hint='The numbered cards under "See How QuickHire Can help you". Leave empty to show the default 5 platform steps.'
            >
              <ProcessStepEditor
                steps={form.processSteps}
                onChange={(val) => setForm({ ...form, processSteps: val })}
              />
            </SectionCard>

            <SectionCard
              title='"What You Get" Promises'
              hint='The green-bordered "What You Get" box on the service page. Leave empty to show the 4 default promises.'
            >
              <LocalizedListEditor
                items={form.promises}
                onChange={(val) => setForm({ ...form, promises: val })}
                placeholder="e.g. Verified professionals assigned to your task"
                addLabel="+ Add Promise"
              />
            </SectionCard>

            <SectionCard title="Transparent Execution Section" hint="Title + subtitle above the working-hours badge.">
              <I18nTextField
                label="Title"
                value={form.transparentTitle}
                onChange={(val) => setForm({ ...form, transparentTitle: val })}
                placeholder="e.g. Transparent Execution"
              />
              <I18nTextField
                label="Subtitle"
                value={form.transparentSubtitle}
                onChange={(val) => setForm({ ...form, transparentSubtitle: val })}
                placeholder="e.g. Transparency built into every stage of execution."
                multiline
              />
              <I18nTextField
                label="Working Hours Badge"
                value={form.workingHours}
                onChange={(val) => setForm({ ...form, workingHours: val })}
                placeholder="e.g. Monday–Friday • 9 AM – 6 PM IST"
                hint="Leave empty to show the platform default."
              />
            </SectionCard>
          </>
        )}

        {/* Tab 5 — Geo Pricing */}
        {tab === 5 && (
          <SectionCard
            title="Country-Specific Pricing"
            hint="Override the base INR hourly rate for specific countries and currencies."
          >
            <GeoPricingSection
              serviceId={serviceId}
              pendingOverrides={pendingGeo}
              setPendingOverrides={setPendingGeo}
            />
          </SectionCard>
        )}

        {/* Bottom action bar */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E5F1E2]">
          <div className="flex gap-1">
            {TABS.map((_, i) => (
              <button
                key={i}
                onClick={() => setTab(i)}
                className={`w-2 h-2 rounded-full transition-colors ${tab === i ? 'bg-[#45A735]' : 'bg-[#D9D9D9] hover:bg-[#B0CEB0]'}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {tab > 0 && (
              <button
                onClick={() => setTab((t) => t - 1)}
                className="px-4 py-2 text-sm font-semibold text-[#636363] border border-[#E5F1E2] rounded-xl hover:bg-[#F7FBF6]"
              >
                ← Previous
              </button>
            )}
            {tab < TABS.length - 1 ? (
              <button
                onClick={() => setTab((t) => t + 1)}
                className="px-4 py-2 text-sm font-bold text-white bg-[#45A735] rounded-xl hover:bg-[#3d9230]"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={save}
                disabled={busy || !form.name.en.trim()}
                className="px-5 py-2 text-sm font-bold text-white bg-[#45A735] rounded-xl hover:bg-[#3d9230] disabled:opacity-50"
              >
                {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Service'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
