'use client';

/**
 * Wrap next/navigation's useRouter so push/replace auto-prefix the active
 * country segment. Same purpose as I18nLink but for imperative navigation.
 *
 * Usage:
 *   const router = useI18nRouter();
 *   router.push('/about-us');           // → /de/about-us if user is on /de/...
 *   router.replace(`/service-details/${slug}`);
 *
 * back() / forward() / refresh() / prefetch() pass through unchanged.
 */
import { useRouter, usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { withCountryPrefix } from '@/lib/utils/i18nLink';

export function useI18nRouter() {
  const router = useRouter();
  const pathname = usePathname() || '/';

  return useMemo(
    () => ({
      ...router,
      push: (href, options) => router.push(withCountryPrefix(href, pathname), options),
      replace: (href, options) => router.replace(withCountryPrefix(href, pathname), options),
      prefetch: (href, options) => router.prefetch(withCountryPrefix(href, pathname), options),
    }),
    [router, pathname],
  );
}
