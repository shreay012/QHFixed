'use client';

// ─────────────────────────────────────────────────────────────────────────────
// QuickHire Admin UI Component Library
// Design System: #45A735 primary green / #26472B dark green / #F2F9F1 light bg
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';

// ─── 1. PageHeader ────────────────────────────────────────────────────────────
//
// Standard page header used at the top of every admin/PM/resource screen.
// Optional breadcrumbs, help tooltip, and secondary actions panel make this
// the single anchor point for "where am I + what can I do here".
//
// Props:
//   title          — h1 string (required)
//   subtitle       — short descriptor under the title
//   breadcrumbs    — array of { label, href } rendered above the title
//   action         — primary CTA (pass <Button>)
//   secondaryActions — array of <Button> rendered next to the primary
//   helpText       — string shown in a "?" tooltip next to the title
//   backHref       — show a back arrow that navigates here
export function PageHeader({
  title,
  subtitle,
  action,
  secondaryActions,
  breadcrumbs,
  helpText,
  backHref,
}) {
  return (
    <div className="border-b border-[#E5F1E2] bg-white px-4 sm:px-8 py-5">
      {Array.isArray(breadcrumbs) && breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} className="mb-2" />
      )}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {backHref && (
            <a
              href={backHref}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#636363] hover:bg-[#F2F9F1] hover:text-[#26472B] transition-all duration-200 flex-shrink-0 mt-0.5"
              aria-label="Go back"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-[28px] font-open-sauce-bold text-[#26472B] leading-tight truncate">
                {title}
              </h1>
              {helpText && <HelpTip text={helpText} />}
            </div>
            {subtitle && (
              <p className="text-sm text-[#636363] mt-1 font-open-sauce">{subtitle}</p>
            )}
          </div>
        </div>
        {(action || secondaryActions) && (
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            {Array.isArray(secondaryActions) && secondaryActions}
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 1b. Breadcrumbs ──────────────────────────────────────────────────────────
//
// Compact, typography-driven breadcrumb trail. Renders nothing if items is
// empty so it's safe to drop on every page header.
export function Breadcrumbs({ items = [], className = '' }) {
  if (!items.length) return null;
  return (
    <nav aria-label="Breadcrumb" className={`text-xs font-open-sauce text-[#909090] ${className}`}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${item.label}-${idx}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <a
                  href={item.href}
                  className="hover:text-[#26472B] transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <span className={isLast ? 'text-[#26472B] font-open-sauce-semibold' : ''}>
                  {item.label}
                </span>
              )}
              {!isLast && (
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" className="text-[#D6EBCF]">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── 1c. HelpTip ──────────────────────────────────────────────────────────────
//
// Inline "?" icon that reveals a short tooltip on hover/focus. Use anywhere
// you'd otherwise have to ship a docs link — works great next to form labels
// and table column headers to onboard non-technical admins inline.
export function HelpTip({ text, className = '' }) {
  if (!text) return null;
  return (
    <span className={`group relative inline-flex items-center ${className}`}>
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#F2F9F1] text-[#45A735] text-[10px] font-open-sauce-bold cursor-help ring-1 ring-[#D6EBCF] hover:bg-[#45A735] hover:text-white transition-colors"
        aria-label="Help"
        tabIndex={0}
      >
        ?
      </span>
      <span
        role="tooltip"
        className="invisible group-hover:visible group-focus-within:visible absolute left-1/2 -translate-x-1/2 top-full mt-2 z-30 w-56 px-3 py-2 rounded-lg bg-[#26472B] text-white text-[11px] leading-snug font-open-sauce shadow-lg pointer-events-none"
      >
        {text}
      </span>
    </span>
  );
}

// ─── 2. StatCard ──────────────────────────────────────────────────────────────
//
// KPI tile with optional trend pill (↑ +12% vs. last week). Supports an
// onClick handler so dashboard tiles can deep-link into the underlying
// list view filtered to the same metric — drives the "click revenue → see
// every paid booking" pattern that lets non-technical admins explore data
// without typing filter URLs.
export function StatCard({
  label,
  value,
  hint,
  color = 'green',
  trend,
  trendLabel,
  icon,
  onClick,
  href,
}) {
  const variants = {
    slate:  'from-white to-[#F5F7F5] text-[#484848] ring-[#E5E7EB]',
    green:  'from-[#F2F9F1] to-white text-[#26472B] ring-[#D6EBCF]',
    indigo: 'from-[#F2F9F1] to-white text-[#26472B] ring-[#D6EBCF]',
    emerald:'from-[#F2F9F1] to-white text-[#26472B] ring-[#D6EBCF]',
    orange: 'from-[#FFF6EC] to-white text-[#7A4A0F] ring-[#FBE0BE]',
    red:    'from-[#FEF2F2] to-white text-[#7F1D1D] ring-[#FCA5A5]',
    blue:   'from-[#EFF6FF] to-white text-[#1E40AF] ring-blue-200',
    purple: 'from-[#F5F3FF] to-white text-[#5B21B6] ring-purple-200',
    amber:  'from-[#FFFBEB] to-white text-[#92400E] ring-amber-200',
  };
  const accentDot = {
    slate:  'bg-[#909090]',
    green:  'bg-[#45A735]',
    indigo: 'bg-[#45A735]',
    emerald:'bg-[#45A735]',
    orange: 'bg-[#F59E0B]',
    red:    'bg-[#EF4444]',
    blue:   'bg-[#3B82F6]',
    purple: 'bg-[#8B5CF6]',
    amber:  'bg-[#F59E0B]',
  };

  const v = variants[color] || variants.green;
  const dot = accentDot[color] || accentDot.green;

  const interactive = !!(onClick || href);
  const Wrapper = href ? 'a' : 'div';
  const wrapperProps = href
    ? { href }
    : interactive ? { onClick, role: 'button', tabIndex: 0 } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`relative rounded-2xl bg-gradient-to-br ${v} p-5 ring-1 shadow-[0_2px_8px_rgba(38,71,43,0.04)] transition-all duration-200 ${
        interactive
          ? 'cursor-pointer hover:shadow-[0_8px_24px_rgba(69,167,53,0.18)] hover:-translate-y-0.5'
          : 'hover:shadow-[0_8px_20px_rgba(69,167,53,0.10)]'
      } block`}
    >
      <div className="flex items-start justify-between">
        <div className="text-[11px] uppercase tracking-wider text-[#636363] font-open-sauce-semibold">
          {label}
        </div>
        {icon ? (
          <div className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-base flex-shrink-0">
            {typeof icon === 'string' ? icon : icon}
          </div>
        ) : (
          <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${dot}`} />
        )}
      </div>
      <div className="mt-3 text-3xl font-open-sauce-bold text-[#26472B] leading-tight tabular-nums">
        {value}
      </div>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {trend !== undefined && trend !== null && trend !== '' && <MetricDelta value={trend} label={trendLabel} />}
        {hint && <span className="text-xs text-[#636363] font-open-sauce">{hint}</span>}
      </div>
    </Wrapper>
  );
}

// ─── 2b. MetricDelta ──────────────────────────────────────────────────────────
//
// Coloured delta pill for a KPI card. Accepts:
//   - a number (e.g. 12 → "+12%")
//   - a pre-formatted string (e.g. "+₹4.2k", "−2", "+12% MoM")
// Auto-detects sign for colour. Pass `label` for "vs last week" footnote.
export function MetricDelta({ value, label }) {
  if (value === undefined || value === null || value === '') return null;
  let display = String(value);
  let positive = false;
  let negative = false;
  if (typeof value === 'number') {
    positive = value > 0;
    negative = value < 0;
    display = `${value > 0 ? '+' : ''}${value}%`;
  } else {
    const trimmed = display.trim();
    positive = trimmed.startsWith('+');
    negative = trimmed.startsWith('-') || trimmed.startsWith('−');
  }
  const cls = positive
    ? 'bg-[#F2F9F1] text-[#26472B] ring-[#D6EBCF]'
    : negative
    ? 'bg-red-50 text-red-700 ring-red-200'
    : 'bg-[#F5F7F5] text-[#484848] ring-[#E5E7EB]';
  const arrow = positive ? '↑' : negative ? '↓' : '•';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-open-sauce-semibold ring-1 ${cls}`}>
      <span className="leading-none">{arrow}</span>
      <span>{display}</span>
      {label && <span className="text-[10px] font-open-sauce text-current opacity-70">{label}</span>}
    </span>
  );
}

// ─── 3. StatusBadge ───────────────────────────────────────────────────────────
export function StatusBadge({ status, size = 'sm' }) {
  const map = {
    pending:         'bg-amber-50 text-amber-700 ring-amber-200',
    confirmed:       'bg-[#F2F9F1] text-[#26472B] ring-[#D6EBCF]',
    assigned_to_pm:  'bg-violet-50 text-violet-700 ring-violet-200',
    in_progress:     'bg-[#F2F9F1] text-[#26472B] ring-[#45A735]/40',
    completed:       'bg-[#F5F7F5] text-[#484848] ring-[#E5E7EB]',
    cancelled:       'bg-red-50 text-red-700 ring-red-200',
    open:            'bg-blue-50 text-blue-700 ring-blue-200',
    active:          'bg-[#F2F9F1] text-[#26472B] ring-[#45A735]/40',
    suspended:       'bg-red-50 text-red-700 ring-red-200',
    escalated:       'bg-orange-50 text-orange-700 ring-orange-200',
    computed:        'bg-blue-50 text-blue-700 ring-blue-200',
    processed:       'bg-[#F2F9F1] text-[#26472B] ring-[#D6EBCF]',
    approved:        'bg-[#F2F9F1] text-[#26472B] ring-[#D6EBCF]',
    rejected:        'bg-red-50 text-red-700 ring-red-200',
    removed:         'bg-red-50 text-red-700 ring-red-200',
    flagged:         'bg-orange-50 text-orange-700 ring-orange-200',
    pending_approval:'bg-amber-50 text-amber-700 ring-amber-200',
  };

  const pulsing = status === 'in_progress' || status === 'active';
  const sizeClass = size === 'lg'
    ? 'px-3 py-1.5 text-xs gap-2'
    : 'px-2.5 py-1 text-[11px] gap-1.5';

  const label = status ? status.replace(/_/g, ' ') : '—';

  return (
    <span
      className={`inline-flex items-center rounded-full font-open-sauce-semibold ring-1 ${sizeClass} ${map[status] || 'bg-[#F5F7F5] text-[#484848] ring-[#E5E7EB]'}`}
    >
      <span className="relative flex-shrink-0 w-1.5 h-1.5">
        {pulsing && (
          <span className="absolute inset-0 rounded-full bg-current opacity-40 animate-ping" />
        )}
        <span className="relative block w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      </span>
      {label}
    </span>
  );
}

// ─── 4. ErrorBox ──────────────────────────────────────────────────────────────
export function ErrorBox({ error }) {
  if (!error) return null;
  const msg =
    typeof error === 'string'
      ? error
      : error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Request failed';
  return (
    <div className="rounded-lg border border-red-200 bg-[#FFF5F5] px-4 py-3 text-sm text-red-700 font-open-sauce flex items-start gap-2">
      <svg className="flex-shrink-0 mt-0.5" width={14} height={14} viewBox="0 0 24 24" fill="none">
        <circle cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={1.8} />
        <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      </svg>
      <span>{msg}</span>
    </div>
  );
}

// ─── 5. Spinner ───────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const dims = {
    sm: 'w-3 h-3 border-[1.5px]',
    md: 'w-4 h-4 border-2',
    lg: 'w-6 h-6 border-2',
  };
  const d = dims[size] || dims.md;

  if (size === 'md' || size === 'lg') {
    // Standalone centered spinner for page-level loading
    return (
      <div className="flex items-center justify-center py-12 gap-2.5 text-[#636363] text-sm font-open-sauce">
        <div className={`rounded-full border-[#45A735] border-t-transparent animate-spin ${d}`} />
        Loading…
      </div>
    );
  }

  // Inline sm spinner (no padding, no text — used inside buttons etc.)
  return (
    <div className={`rounded-full border-[#45A735] border-t-transparent animate-spin flex-shrink-0 ${d}`} />
  );
}

// ─── 6. EmptyState ────────────────────────────────────────────────────────────
// EmptyState
//
// Improved empty state with explicit headline + body + CTA + optional help
// link. Use this everywhere a list could be empty so non-technical users
// always know exactly what to do next instead of staring at "No records".
//
// Backward compat: passing `message` alone still works (renders as headline).
export function EmptyState({
  message,
  title,
  description,
  action,
  helpHref,
  helpLabel = 'Learn more',
  icon,
}) {
  const headline = title || message || 'Nothing here yet';
  return (
    <div className="rounded-2xl border border-dashed border-[#D6EBCF] bg-white py-14 px-6 text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#F2F9F1] flex items-center justify-center ring-4 ring-[#F7FBF6]">
        {icon ? (
          <svg width={26} height={26} viewBox="0 0 24 24" fill="none">
            <path d={icon} stroke="#45A735" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width={26} height={26} viewBox="0 0 24 24" fill="none">
            <path d="M9 12h6M12 9v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#45A735" strokeWidth={1.6} strokeLinecap="round" />
          </svg>
        )}
      </div>
      <div className="text-base font-open-sauce-semibold text-[#26472B] mb-1">{headline}</div>
      {description && (
        <div className="text-sm text-[#636363] font-open-sauce max-w-md mx-auto mb-4">{description}</div>
      )}
      {(action || helpHref) && (
        <div className="flex items-center justify-center gap-3 mt-3">
          {action}
          {helpHref && (
            <a
              href={helpHref}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-open-sauce-semibold text-[#45A735] hover:text-[#26472B] inline-flex items-center gap-1"
            >
              {helpLabel}
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none">
                <path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 7. Table ─────────────────────────────────────────────────────────────────
export function Table({ columns, rows, keyField = '_id', empty = 'No records', loading = false }) {
  if (loading) {
    return (
      <div className="overflow-x-auto bg-white border border-[#E5F1E2] rounded-2xl shadow-[0_1px_3px_rgba(38,71,43,0.04)]">
        <table className="min-w-full text-sm font-open-sauce">
          <thead className="bg-[#F2F9F1] text-[#26472B]">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="text-left font-open-sauce-semibold text-[12px] uppercase tracking-wider px-4 py-3 whitespace-nowrap"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF5EC]">
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                {columns.map((c, j) => (
                  <td key={c.key} className="px-4 py-3.5">
                    <div
                      className={`h-4 rounded-md bg-[#F2F9F1] animate-pulse ${
                        j === 0 ? 'w-32' : j === columns.length - 1 ? 'w-16' : 'w-24'
                      }`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!rows || rows.length === 0) return <EmptyState message={empty} />;

  return (
    <div className="overflow-x-auto bg-white border border-[#E5F1E2] rounded-2xl shadow-[0_1px_3px_rgba(38,71,43,0.04)]">
      <table className="min-w-full text-sm font-open-sauce">
        <thead className="bg-[#F2F9F1] text-[#26472B]">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className="text-left font-open-sauce-semibold text-[12px] uppercase tracking-wider px-4 py-3 whitespace-nowrap"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EEF5EC]">
          {rows.map((r) => (
            <tr key={r[keyField]} className="hover:bg-[#F7FBF6] transition-colors">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3.5 align-top text-[#484848]">
                  {c.render ? c.render(r) : r[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── 8. Button ────────────────────────────────────────────────────────────────
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  ...props
}) {
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  };
  const variants = {
    primary: 'bg-[#45A735] text-white hover:bg-[#26472B] shadow-[0_4px_14px_rgba(120,235,84,0.35)]',
    outline: 'border border-[#45A735] text-[#45A735] bg-transparent hover:bg-[#45A735] hover:text-white',
    subtle:  'bg-[#F2F9F1] text-[#26472B] hover:bg-[#E5F1E2]',
    danger:  'bg-red-600 text-white hover:bg-red-700',
    ghost:   'text-[#26472B] hover:bg-[#F2F9F1]',
    warning: 'bg-[#F59E0B] text-white hover:bg-[#D97706]',
    success: 'bg-[#26472B] text-white hover:bg-[#1a3320]',
  };

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-open-sauce-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${sizes[size] || sizes.md} ${variants[variant] || variants.primary} ${className}`}
    >
      {loading ? (
        <>
          <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0 opacity-70" />
          Loading…
        </>
      ) : (
        children
      )}
    </button>
  );
}

// ─── 9. Modal ─────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, subtitle, children, size = 'md', footer }) {
  if (!open) return null;

  const maxW = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl border border-[#E5F1E2] w-full ${maxW[size] || maxW.md} flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[#E5F1E2] flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {title && (
              <h2 className="text-lg font-open-sauce-bold text-[#26472B] leading-snug">{title}</h2>
            )}
            {subtitle && (
              <p className="text-sm text-[#636363] mt-0.5 font-open-sauce">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#909090] hover:bg-[#F2F9F1] hover:text-[#26472B] transition-all duration-200 text-lg leading-none font-open-sauce"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-[#E5F1E2] flex justify-end gap-2 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 10. Input ────────────────────────────────────────────────────────────────
export function Input({ label, error, hint, prefix, suffix, className = '', ...props }) {
  const hasError = Boolean(error);
  const borderClass = hasError
    ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
    : 'border-[#D6EBCF] focus:ring-[#45A735]/30 focus:border-[#45A735]';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-open-sauce-semibold text-[#636363] uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#909090] text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          {...props}
          className={`w-full border rounded-lg px-3 py-2.5 text-sm font-open-sauce text-[#242424] bg-white focus:ring-2 focus:outline-none placeholder:text-[#909090] disabled:bg-[#F5F7F5] disabled:text-[#909090] transition-colors duration-150 ${borderClass} ${prefix ? 'pl-9' : ''} ${suffix ? 'pr-9' : ''} ${className}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#909090] text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-600 mt-1 font-open-sauce">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-[#636363] mt-1 font-open-sauce">{hint}</p>
      )}
    </div>
  );
}

// ─── 11. Select ───────────────────────────────────────────────────────────────
export function Select({ label, error, children, className = '', ...props }) {
  const hasError = Boolean(error);
  const borderClass = hasError
    ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
    : 'border-[#D6EBCF] focus:ring-[#45A735]/30 focus:border-[#45A735]';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-open-sauce-semibold text-[#636363] uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          {...props}
          className={`w-full appearance-none border rounded-lg px-3 py-2.5 pr-9 text-sm font-open-sauce text-[#242424] bg-white focus:ring-2 focus:outline-none cursor-pointer disabled:bg-[#F5F7F5] disabled:text-[#909090] transition-colors duration-150 ${borderClass} ${className}`}
        >
          {children}
        </select>
        {/* Custom chevron arrow */}
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#636363]">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      {error && (
        <p className="text-xs text-red-600 mt-1 font-open-sauce">{error}</p>
      )}
    </div>
  );
}

// ─── 12. Textarea ─────────────────────────────────────────────────────────────
export function Textarea({ label, error, hint, rows = 3, className = '', ...props }) {
  const hasError = Boolean(error);
  const borderClass = hasError
    ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
    : 'border-[#D6EBCF] focus:ring-[#45A735]/30 focus:border-[#45A735]';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-open-sauce-semibold text-[#636363] uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        {...props}
        className={`w-full border rounded-lg px-3 py-2.5 text-sm font-open-sauce text-[#242424] bg-white focus:ring-2 focus:outline-none placeholder:text-[#909090] disabled:bg-[#F5F7F5] disabled:text-[#909090] resize-none transition-colors duration-150 ${borderClass} ${className}`}
      />
      {error && (
        <p className="text-xs text-red-600 mt-1 font-open-sauce">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-[#636363] mt-1 font-open-sauce">{hint}</p>
      )}
    </div>
  );
}

// ─── 13. Toggle ───────────────────────────────────────────────────────────────
export function Toggle({ checked = false, onChange, label, disabled = false }) {
  const handleClick = () => {
    if (!disabled && onChange) onChange(!checked);
  };

  return (
    <div
      className={`inline-flex items-center gap-2.5 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={handleClick}
    >
      {/* Track */}
      <div
        className={`relative w-10 h-6 rounded-full transition-all duration-200 ${
          checked ? 'bg-[#45A735]' : 'bg-[#D9D9D9]'
        }`}
      >
        {/* Thumb */}
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </div>
      {label && (
        <span className="text-sm font-open-sauce text-[#484848] select-none">{label}</span>
      )}
    </div>
  );
}

// ─── 14. Tabs ─────────────────────────────────────────────────────────────────
export function Tabs({ tabs = [], active, onChange }) {
  return (
    <div className="flex gap-1 bg-[#F5F7F5] rounded-xl p-1">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange && onChange(tab.key)}
            className={`flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
              isActive
                ? 'bg-white text-[#26472B] font-open-sauce-semibold shadow-[0_1px_3px_rgba(38,71,43,0.08)]'
                : 'text-[#636363] font-open-sauce-medium hover:text-[#26472B] hover:bg-white/60'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`inline-flex items-center ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-open-sauce-semibold ${
                  isActive
                    ? 'bg-[#45A735] text-white'
                    : 'bg-[#E5E7EB] text-[#636363]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── 15. Pagination ───────────────────────────────────────────────────────────
export function Pagination({ page = 1, total = 0, pageSize = 10, onChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Build page number list: current ± 2, capped to [1, totalPages]
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('…-start');
  }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages) {
    if (end < totalPages - 1) pages.push('…-end');
    pages.push(totalPages);
  }

  const btnBase =
    'px-2.5 py-1.5 rounded-lg text-sm font-open-sauce-medium transition-all duration-150 select-none';

  return (
    <div className="flex items-center justify-between text-sm">
      {/* Info */}
      <span className="text-[#636363] font-open-sauce">
        Showing {from}–{to} of {total} results
      </span>

      {/* Buttons */}
      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => page > 1 && onChange && onChange(page - 1)}
          disabled={page === 1}
          className={`${btnBase} text-[#636363] hover:bg-[#F2F9F1] disabled:opacity-40 disabled:cursor-not-allowed`}
          aria-label="Previous page"
        >
          ←
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          typeof p === 'string' ? (
            <span key={p} className="px-1 text-[#909090] select-none">…</span>
          ) : (
            <button
              key={p}
              onClick={() => p !== page && onChange && onChange(p)}
              className={`${btnBase} ${
                p === page
                  ? 'bg-[#45A735] text-white'
                  : 'text-[#636363] hover:bg-[#F2F9F1]'
              }`}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => page < totalPages && onChange && onChange(page + 1)}
          disabled={page === totalPages}
          className={`${btnBase} text-[#636363] hover:bg-[#F2F9F1] disabled:opacity-40 disabled:cursor-not-allowed`}
          aria-label="Next page"
        >
          →
        </button>
      </div>
    </div>
  );
}

// ─── 16. SearchInput ──────────────────────────────────────────────────────────
export function SearchInput({ value = '', onChange, placeholder = 'Search…' }) {
  return (
    <div className="relative">
      {/* Magnifier icon */}
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#909090] pointer-events-none">
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none">
          <circle cx={11} cy={11} r={7} stroke="currentColor" strokeWidth={2} />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        </svg>
      </span>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-[#D6EBCF] rounded-lg pl-9 pr-8 py-2.5 text-sm font-open-sauce text-[#242424] bg-white focus:ring-2 focus:ring-[#45A735]/30 focus:border-[#45A735] focus:outline-none placeholder:text-[#909090] transition-colors duration-150"
      />

      {/* Clear button */}
      {value && (
        <button
          onClick={() => onChange && onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-[#909090] hover:text-[#484848] rounded transition-colors"
          aria-label="Clear search"
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── 17. SectionCard ──────────────────────────────────────────────────────────
export function SectionCard({
  title,
  subtitle,
  description,
  children,
  action,
  helpText,
  className = '',
  bodyClassName = '',
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-[#E5F1E2] shadow-[0_1px_3px_rgba(38,71,43,0.04)] ${className}`}
    >
      {(title || subtitle || description) && (
        <div className="px-5 pt-4 pb-3 border-b border-[#E5F1E2] flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <div className="flex items-center gap-2">
                <div className="text-sm font-open-sauce-bold text-[#26472B] leading-snug">{title}</div>
                {helpText && <HelpTip text={helpText} />}
              </div>
            )}
            {subtitle && (
              <div className="text-xs text-[#636363] mt-0.5 font-open-sauce">{subtitle}</div>
            )}
            {description && (
              <div className="text-xs text-[#909090] mt-1 font-open-sauce leading-relaxed max-w-2xl">{description}</div>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={`px-5 py-4 ${bodyClassName}`}>{children}</div>
    </div>
  );
}

// ─── Card (lightweight container) ─────────────────────────────────────────────
//
// Use for content blocks that don't fit the SectionCard "header + body"
// pattern — e.g. dashboard widgets, signup callouts, anything with a
// custom layout where we just want the surface chrome.
export function Card({ children, className = '', interactive = false, onClick, href }) {
  const cls = `bg-white rounded-2xl border border-[#E5F1E2] shadow-[0_1px_3px_rgba(38,71,43,0.04)] ${
    interactive
      ? 'cursor-pointer hover:shadow-[0_8px_20px_rgba(69,167,53,0.10)] transition-shadow duration-200'
      : ''
  } ${className}`;
  if (href) return <a href={href} className={cls}>{children}</a>;
  if (onClick) return <button type="button" onClick={onClick} className={`${cls} text-left w-full`}>{children}</button>;
  return <div className={cls}>{children}</div>;
}

// ─── FormSection ──────────────────────────────────────────────────────────────
//
// Visual grouping for form fields with a clear header + description and
// optional help icon. Replaces the "naked stack of inputs" pattern that
// makes long forms feel intimidating to non-technical admins.
export function FormSection({ title, description, helpText, children, action, className = '' }) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-8 py-6 border-b border-[#E5F1E2] last:border-b-0 ${className}`}>
      <div className="lg:col-span-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-open-sauce-bold text-[#26472B]">{title}</h3>
          {helpText && <HelpTip text={helpText} />}
        </div>
        {description && (
          <p className="mt-1 text-xs text-[#636363] font-open-sauce leading-relaxed max-w-xs">{description}</p>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
      <div className="lg:col-span-2 space-y-4">{children}</div>
    </div>
  );
}

// ─── StickyActionBar ──────────────────────────────────────────────────────────
//
// Pinned-to-bottom save/cancel bar used inside large forms. Shows status
// text on the left ("Saving…" / "All changes saved" / "Unsaved changes")
// and the action group on the right. Use inside a scrollable container
// so the bar floats above the form footer as the user scrolls.
//
// `position` accepts:
//   'sticky'  — sticky bottom of nearest scroll container (default)
//   'fixed'   — viewport-bottom fixed (use for full-screen edit modes)
export function StickyActionBar({ status, statusKind = 'idle', children, position = 'sticky' }) {
  const statusColours = {
    idle:    'text-[#909090]',
    saving:  'text-[#45A735]',
    saved:   'text-[#26472B]',
    error:   'text-red-700',
    dirty:   'text-amber-700',
  };
  const cls = position === 'fixed'
    ? 'fixed inset-x-0 bottom-0 z-30'
    : 'sticky bottom-0 z-20';
  return (
    <div className={`${cls} bg-white border-t border-[#E5F1E2] shadow-[0_-2px_12px_rgba(38,71,43,0.06)]`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className={`text-xs font-open-sauce-semibold flex items-center gap-2 ${statusColours[statusKind] || statusColours.idle}`}>
          {statusKind === 'saving' && (
            <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          )}
          {statusKind === 'saved' && (
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" className="text-[#45A735]">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {statusKind === 'dirty' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
          {status}
        </div>
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </div>
  );
}

// ─── BulkBar ──────────────────────────────────────────────────────────────────
//
// Floating action bar for tables in multi-select mode — shows
// "N selected" + bulk-action buttons. Hidden when count === 0.
export function BulkBar({ count, onClear, children }) {
  if (!count) return null;
  return (
    <div className="sticky top-2 z-10 mx-auto inline-flex items-center gap-3 bg-[#26472B] text-white rounded-full px-4 py-2 shadow-lg">
      <span className="text-xs font-open-sauce-semibold">{count} selected</span>
      <span className="w-px h-4 bg-white/20" />
      <div className="flex items-center gap-1">{children}</div>
      <button
        type="button"
        onClick={onClear}
        className="ml-1 text-[10px] font-open-sauce text-white/70 hover:text-white"
      >
        Clear
      </button>
    </div>
  );
}

// ─── 18. InfoRow ──────────────────────────────────────────────────────────────
export function InfoRow({ label, value, mono = false, copy = false }) {
  const handleCopy = () => {
    if (value != null && navigator?.clipboard) {
      navigator.clipboard.writeText(String(value));
    }
  };

  return (
    <div className="flex items-start justify-between py-2.5 border-b border-[#F2F9F1] last:border-0">
      <span className="text-xs text-[#909090] font-open-sauce-semibold uppercase tracking-wider w-32 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <div className="flex items-start gap-1.5 flex-1 justify-end min-w-0">
        <span
          className={`text-sm text-[#242424] text-right break-all ${
            mono ? 'font-mono text-xs' : 'font-open-sauce'
          }`}
        >
          {value ?? '—'}
        </span>
        {copy && value != null && (
          <button
            onClick={handleCopy}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[#909090] hover:text-[#45A735] transition-colors mt-0.5"
            title="Copy to clipboard"
            aria-label="Copy"
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none">
              <rect x={9} y={9} width={13} height={13} rx={2} stroke="currentColor" strokeWidth={1.8} />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── 19. Avatar ───────────────────────────────────────────────────────────────
export function Avatar({ name = '', size = 'md', src }) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  // Derive initials: first letter of each word, up to 2
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const sizeClass = sizes[size] || sizes.md;

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-[#45A735] to-[#26472B] text-white font-open-sauce-bold flex items-center justify-center flex-shrink-0 select-none`}
      aria-label={name || 'User'}
    >
      {initials || '?'}
    </div>
  );
}
