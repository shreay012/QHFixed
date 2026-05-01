"use client";

import { useSelector } from "react-redux";
import { useCallback, useMemo } from "react";
import { selectCurrency } from "@/lib/redux/slices/regionSlice/regionSlice";
import { formatAmount, convertFromINR } from "@/lib/i18n/currency";

/**
 * Returns a price formatter bound to the active currency.
 *
 *   const { format, convert, currency } = usePrice();
 *   format(55)         // "د.إ55" when currency=AED — assumes already in target
 *   convert(1250)      // legacy: convert from INR to active currency
 *
 * USE_PRICE_FX_FIX_V1: `format` previously used `formatPrice` which ran an
 * INR→target FX conversion inside. The backend now returns geo_pricing
 * amounts already in the target currency (AED, EUR, USD, AUD), so the
 * extra conversion was double-converting (AED 55 → ~AED 2.4). Switched to
 * `formatAmount` which formats the value as-is. INR users were unaffected
 * because INR→INR is a no-op. Legacy `convert` is kept on the returned
 * object for any straggler that genuinely needs INR-base conversion.
 */
export function usePrice() {
  const currency = useSelector(selectCurrency);

  const format = useCallback(
    (amount, opts) => formatAmount(amount, currency, opts),
    [currency],
  );
  const convert = useCallback(
    (amountInr) => convertFromINR(amountInr, currency),
    [currency],
  );

  return useMemo(
    () => ({ currency, format, convert }),
    [currency, format, convert],
  );
}
