'use client';

/**
 * Drop-in replacement for next/link that prefixes the active country segment
 * (e.g. /de/) onto internal hrefs so customer-facing navigation stays inside
 * the user's market without a proxy round-trip. See lib/utils/i18nLink.js
 * for the prefix rules.
 *
 * Usage:
 *   import I18nLink from '@/components/common/I18nLink';
 *   <I18nLink href="/about-us">About</I18nLink>
 *
 * Props are forwarded verbatim to next/link, so existing `prefetch`,
 * `replace`, `scroll`, `className`, etc. continue to work.
 */
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { withCountryPrefix } from '@/lib/utils/i18nLink';

export default function I18nLink({ href, ...rest }) {
  const pathname = usePathname() || '/';
  const finalHref = withCountryPrefix(href, pathname);
  return <NextLink href={finalHref} {...rest} />;
}
