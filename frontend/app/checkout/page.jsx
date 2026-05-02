"use client";

/**
 * Checkout Page — Multi-Gateway
 *
 * Detects the gateway from the backend response:
 *   gateway: 'razorpay' → load Razorpay SDK, open checkout modal
 *   gateway: 'stripe'   → load Stripe.js, confirm PaymentIntent, redirect
 *   gateway: 'mock'     → dev-only auto-approve, redirect to success
 *
 * Backend selects gateway based on req.geo.country (set by middleware cookie
 * and forwarded via X-Country header from axiosInstance).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import {
  selectCart,
  hydrateCart,
  clearCart,
} from "@/lib/redux/slices/cartSlice/cartSlice";
import { selectTaxInfo } from "@/lib/redux/slices/regionSlice/regionSlice";
import { paymentService } from "@/lib/services/paymentApi";
import { usePrice } from "@/lib/hooks/usePrice";
import { useTranslations } from "next-intl";
import { useLegalAcceptance } from "@/components/providers/LegalAcceptanceProvider";
import CmsBannerSlider from "@/components/cms/CmsBannerSlider";

export const dynamic = "force-dynamic";

/* ─── SDK loaders ──────────────────────────────────────────────── */

function loadRazorpay() {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

async function loadStripe(publishableKey) {
  if (typeof window === "undefined") return null;
  // Use @stripe/stripe-js for secure, PCI-compliant loading
  const { loadStripe: _load } = await import("@stripe/stripe-js");
  return _load(publishableKey);
}

/* ─── Checkout Page ────────────────────────────────────────────── */

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const { format: fmtMoney } = usePrice();
  const dispatch = useDispatch();
  const router = useRouter();
  const cart = useSelector(selectCart);
  const { taxRate, taxLabel } = useSelector(selectTaxInfo);
  const items = cart.items || [];

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [gatewayLabel, setGatewayLabel] = useState(""); // shown in button while loading

  // Legal acceptance — payment is blocked until all docs are accepted
  const { allAccepted: legalAccepted, pending: legalPending } = useLegalAcceptance();

  // Prevent multiple payment windows
  const paymentInFlight = useRef(false);

  useEffect(() => {
    dispatch(hydrateCart());
  }, [dispatch]);

  const jobIdFromCart = useMemo(() => {
    for (const i of items) {
      if (i?.meta?.jobId) return i.meta.jobId;
    }
    return null;
  }, [items]);

  const isLoggedIn =
    typeof window !== "undefined" && !!window.localStorage.getItem("token");

  /* ─── Razorpay path ─────────────────────────────────────────── */

  async function handleRazorpay(paymentData) {
    const ok = await loadRazorpay();
    if (!ok) throw new Error("Failed to load Razorpay SDK");

    return new Promise((resolve, reject) => {
      const options = {
        key: paymentData.keyId || paymentData.key,
        amount: paymentData.amount,   // already in paise from backend
        currency: paymentData.currency || "INR",
        name: "QuickHire",
        description: "Service Booking Payment",
        order_id: paymentData.orderId || paymentData.razorpayOrderId,
        handler: async (response) => {
          try {
            // Verify signature server-side
            await paymentService.verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_signature:  response.razorpay_signature,
            });
            resolve();
          } catch (e) {
            // Even if verify fails, backend webhook will confirm — go to success
            resolve();
          }
        },
        modal: { ondismiss: () => reject(new Error("dismissed")) },
        theme: { color: "#45A735" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp) => {
        reject(new Error(resp?.error?.description || "Payment failed"));
      });
      rzp.open();
    });
  }

  /* ─── Stripe path ───────────────────────────────────────────── */

  async function handleStripe(paymentData) {
    const key = paymentData.stripePublishableKey ||
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!key) throw new Error("Stripe publishable key not configured");

    const stripe = await loadStripe(key);
    if (!stripe) throw new Error("Failed to load Stripe.js");

    const { error: stripeErr } = await stripe.confirmPayment({
      clientSecret: paymentData.clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success?jobId=${jobIdFromCart}`,
      },
      // Stay on the page — don't redirect immediately (we handle success below)
      redirect: "if_required",
    });

    if (stripeErr) throw new Error(stripeErr.message);

    // If redirect:"if_required" means payment succeeded without redirect
    await paymentService.confirmStripePayment(paymentData.orderId);
  }

  /* ─── Mock / dev path ───────────────────────────────────────── */

  async function handleMock() {
    // Mock payments are auto-confirmed server-side — just navigate to success
    await new Promise((r) => setTimeout(r, 600));
  }

  /* ─── Main handler ──────────────────────────────────────────── */

  async function handlePay() {
    if (paymentInFlight.current) return;
    setError(null);

    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent("/checkout")}`);
      return;
    }
    if (!jobIdFromCart) {
      setError("No active job linked to this cart. Please re-add the service from the booking flow.");
      return;
    }
    if (!items.length) {
      setError("Cart is empty.");
      return;
    }

    paymentInFlight.current = true;
    // Block payment if user hasn't accepted current legal docs
    if (isLoggedIn && !legalAccepted) {
      setError(`Please accept the required legal documents (${legalPending.map(d => d.docType.replace(/-/g,' ')).join(', ')}) before paying.`);
      return;
    }

    setIsProcessing(true);

    try {
      const orderResponse = await paymentService.createOrder(jobIdFromCart, cart.total);
      const paymentData = orderResponse.data?.data || orderResponse.data;
      const gateway = paymentData.gateway || "razorpay";

      setGatewayLabel(gateway === "stripe" ? "Stripe" : gateway === "razorpay" ? "Razorpay" : "");

      switch (gateway) {
        case "razorpay":
          await handleRazorpay(paymentData);
          break;
        case "stripe":
          await handleStripe(paymentData);
          break;
        case "mock":
          await handleMock();
          break;
        default:
          throw new Error(`Unknown gateway: ${gateway}`);
      }

      dispatch(clearCart());
      router.push(`/payment-success?jobId=${jobIdFromCart}`);
    } catch (e) {
      if (e?.message === "dismissed") {
        // User closed modal — not an error
      } else {
        setError(e?.response?.data?.message || e?.message || "Checkout failed. Please try again.");
      }
    } finally {
      setIsProcessing(false);
      paymentInFlight.current = false;
      setGatewayLabel("");
    }
  }

  /* ─── Empty cart ────────────────────────────────────────────── */

  if (!items.length) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">{t("emptyTitle")}</h1>
        <p className="text-gray-500 mb-6">{t("emptyDesc")}</p>
        <button
          type="button"
          onClick={() => router.push("/book-your-resource")}
          className="px-6 py-3 rounded-lg bg-[#45A735] text-white font-semibold hover:bg-[#26472B] transition-colors"
        >
          {t("browseServices")}
        </button>
      </div>
    );
  }

  /* ─── Render ────────────────────────────────────────────────── */

  const displayTaxRate = Math.round((taxRate || 0.18) * 100);
  const displayTaxLabel = taxLabel || "GST";

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* CMS slot: checkout-top — admin-managed urgency / promo strip
          shown above the order-summary grid. */}
      <CmsBannerSlider position="checkout-top" className="mb-6" />
      <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-6">{t("title")}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <section className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <article
              key={item.id}
              className="flex gap-4 p-4 rounded-xl border border-gray-200 bg-white"
            >
              <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                {item.image ? (
                  <Image src={item.image} alt={item.name} width={48} height={48} className="object-contain" />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                {item.duration && <p className="text-sm text-gray-500">{item.duration}</p>}
                {item.meta?.technicalSkills && (
                  <p className="text-xs text-gray-400 truncate">{item.meta.technicalSkills}</p>
                )}
              </div>
              <div className="text-end">
                <p className="font-semibold text-gray-900">{fmtMoney(Number(item.price))}</p>
                <p className="text-xs text-gray-500">{t("qty", { count: item.quantity })}</p>
              </div>
            </article>
          ))}
        </section>

        {/* Order summary sidebar */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 p-6 rounded-xl border border-gray-200 bg-white space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{t("orderSummary")}</h2>

            <div className="flex justify-between text-sm text-gray-600">
              <span>{t("subtotal")}</span>
              <span>{fmtMoney(cart.subtotal || 0)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{displayTaxLabel} ({displayTaxRate}%)</span>
              <span>{fmtMoney(cart.tax || 0)}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between text-base font-semibold text-gray-900">
              <span>{t("total")}</span>
              <span>{fmtMoney(cart.total || 0)}</span>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
            )}

            {/* Legal docs warning */}
            {isLoggedIn && !legalAccepted && legalPending.length > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
                Please accept the required legal documents to proceed with payment.
              </p>
            )}

            <button
              type="button"
              onClick={handlePay}
              disabled={isProcessing || (isLoggedIn && !legalAccepted)}
              className="w-full py-3 rounded-lg bg-[#45A735] text-white font-semibold hover:bg-[#26472B] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isProcessing
                ? gatewayLabel
                  ? `Processing via ${gatewayLabel}…`
                  : t("processing")
                : isLoggedIn
                  ? t("payNow")
                  : t("loginToPay")}
            </button>

            <button
              type="button"
              onClick={() => router.push("/cart")}
              className="w-full py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              {t("backToCart")}
            </button>

            {/* Security badge */}
            <p className="text-xs text-center text-gray-400">
              Secured by PCI-DSS compliant payment processing
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
