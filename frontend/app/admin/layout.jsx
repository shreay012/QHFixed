'use client';
import StaffShell from '@/components/staff/StaffShell';

const links = [
  // ── OPERATIONS ──────────────────────────────────────────────────────────
  { type: 'section', label: 'Operations' },
  {
    href: '/admin',
    label: 'Dashboard',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: '/admin/bookings',
    label: 'Bookings',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <path d="M9 5a2 2 0 002 2h2a2 2 0 002-2" />
        <path d="M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx={9} cy={7} r={4} />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    href: '/admin/pms',
    label: 'Project Managers',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx={9} cy={7} r={4} />
        <polyline points="16 11 18 13 22 9" />
      </svg>
    ),
  },
  {
    href: '/admin/resources',
    label: 'Resources',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    href: '/admin/services',
    label: 'Services',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x={4} y={4} width={6} height={6} rx={1} />
        <rect x={14} y={4} width={6} height={6} rx={1} />
        <rect x={4} y={14} width={6} height={6} rx={1} />
        <rect x={14} y={14} width={6} height={6} rx={1} />
      </svg>
    ),
  },
  {
    href: '/admin/tickets',
    label: 'Support Tickets',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    href: '/admin/ops/sla',
    label: 'SLA Dashboard',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx={12} cy={12} r={10} />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },

  // ── FINANCE ─────────────────────────────────────────────────────────────
  { type: 'section', label: 'Finance' },
  {
    href: '/admin/pricing',
    label: 'Geo Pricing',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx={12} cy={12} r={10} />
        <line x1={2} y1={12} x2={22} y2={12} />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
  },
  {
    href: '/admin/promos',
    label: 'Promo Codes',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
        <line x1={7} y1={7} x2={7.01} y2={7} />
      </svg>
    ),
  },
  {
    href: '/admin/payments',
    label: 'Payments',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x={2} y={5} width={20} height={14} rx={2} />
        <line x1={2} y1={10} x2={22} y2={10} />
        <line x1={6} y1={15} x2={10} y2={15} />
      </svg>
    ),
  },
  {
    href: '/admin/ops/refunds',
    label: 'Refunds',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
      </svg>
    ),
  },
  {
    href: '/admin/ops/payouts',
    label: 'Payouts',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x={1} y={4} width={22} height={16} rx={2} />
        <line x1={1} y1={10} x2={23} y2={10} />
      </svg>
    ),
  },

  // ── CONTENT ─────────────────────────────────────────────────────────────
  { type: 'section', label: 'Content' },
  {
    href: '/admin/blog',
    label: 'Blog Posts',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    href: '/admin/blog/categories',
    label: 'Blog Categories',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    href: '/admin/cms',
    label: 'CMS Keys',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1={16} y1={13} x2={8} y2={13} />
        <line x1={16} y1={17} x2={8} y2={17} />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    href: '/admin/cms/pages',
    label: 'Pages',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x={3} y={3} width={18} height={18} rx={2} />
        <line x1={3} y1={9} x2={21} y2={9} />
        <line x1={9} y1={21} x2={9} y2={9} />
      </svg>
    ),
  },
  {
    href: '/admin/cms/banners',
    label: 'Banners',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x={3} y={3} width={18} height={18} rx={2} />
        <circle cx={8.5} cy={8.5} r={1.5} />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    href: '/admin/cms/templates',
    label: 'Notif Templates',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
  },
  {
    href: '/admin/legal',
    label: 'Legal Docs',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    href: '/admin/translations',
    label: 'Translations',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <line x1={2} y1={12} x2={22} y2={12} />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
  },

  // ── SEO ─────────────────────────────────────────────────────────────────
  { type: 'section', label: 'SEO' },
  {
    href: '/seo-admin',
    label: 'SEO Dashboard',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx={11} cy={11} r={8} /><path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    href: '/seo-admin/pages',
    label: 'Page SEO',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    href: '/seo-admin/redirects',
    label: 'Redirects',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 014-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 01-4 4H3" />
      </svg>
    ),
  },

  // ── PLATFORM ────────────────────────────────────────────────────────────
  { type: 'section', label: 'Platform' },
  {
    href: '/admin/countries',
    label: 'Countries',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 3-1 3-1V3s-1 1-4 1-5-2-8-2-3 1-3 1z" />
        <line x1={4} y1={22} x2={4} y2={15} />
      </svg>
    ),
  },
  {
    href: '/admin/currencies',
    label: 'Currencies',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <line x1={12} y1={1} x2={12} y2={23} />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
  {
    href: '/admin/flags',
    label: 'Feature Flags',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x={1} y={5} width={22} height={14} rx={7} />
        <circle cx={16} cy={12} r={3} />
      </svg>
    ),
  },
  {
    href: '/admin/scheduling',
    label: 'Scheduling Config',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x={3} y={4} width={18} height={18} rx={2} />
        <line x1={16} y1={2} x2={16} y2={6} />
        <line x1={8} y1={2} x2={8} y2={6} />
        <line x1={3} y1={10} x2={21} y2={10} />
      </svg>
    ),
  },

  // ── ANALYTICS & TRUST ───────────────────────────────────────────────────
  { type: 'section', label: 'Analytics & Trust' },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <line x1={18} y1={20} x2={18} y2={10} />
        <line x1={12} y1={20} x2={12} y2={4} />
        <line x1={6} y1={20} x2={6} y2={14} />
      </svg>
    ),
  },
  {
    href: '/admin/ops/reviews',
    label: 'Reviews',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    href: '/admin/ops/audit',
    label: 'Audit Log',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <line x1={8} y1={6} x2={21} y2={6} />
        <line x1={8} y1={12} x2={21} y2={12} />
        <line x1={8} y1={18} x2={21} y2={18} />
        <line x1={3} y1={6} x2={3.01} y2={6} />
        <line x1={3} y1={12} x2={3.01} y2={12} />
        <line x1={3} y1={18} x2={3.01} y2={18} />
      </svg>
    ),
  },
  {
    href: '/admin/ops/fraud',
    label: 'Fraud Monitor',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1={12} y1={9} x2={12} y2={13} />
        <line x1={12} y1={17} x2={12.01} y2={17} />
      </svg>
    ),
  },
];

export default function AdminLayout({ children }) {
  return <StaffShell role="admin" links={links}>{children}</StaffShell>;
}
