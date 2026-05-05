'use client';
import StaffShell from '@/components/staff/StaffShell';

const SEO_ICON = (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx={11} cy={11} r={8} /><path d="M21 21l-4.35-4.35" />
  </svg>
);

const links = [
  { type: 'section', label: 'SEO Overview' },
  {
    href: '/seo-admin',
    label: 'Dashboard',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x={3} y={3} width={7} height={7} rx={1} /><rect x={14} y={3} width={7} height={7} rx={1} />
        <rect x={3} y={14} width={7} height={7} rx={1} /><rect x={14} y={14} width={7} height={7} rx={1} />
      </svg>
    ),
  },

  { type: 'section', label: 'Pages & Content' },
  {
    href: '/seo-admin/pages',
    label: 'Page SEO',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1={16} y1={13} x2={8} y2={13} /><line x1={16} y1={17} x2={8} y2={17} />
      </svg>
    ),
  },

  { type: 'section', label: 'Technical SEO' },
  {
    href: '/seo-admin/global',
    label: 'Global Settings',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx={12} cy={12} r={3} />
        <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
      </svg>
    ),
  },
  {
    href: '/seo-admin/redirects',
    label: 'Redirects (301/302)',
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 014-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 01-4 4H3" />
      </svg>
    ),
  },

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
];

export default function SeoAdminLayout({ children }) {
  return (
    <StaffShell
      role="seo"
      allowedRoles={['seo', 'admin', 'super_admin']}
      homeHref="/seo-admin"
      links={links}
    >
      {children}
    </StaffShell>
  );
}
