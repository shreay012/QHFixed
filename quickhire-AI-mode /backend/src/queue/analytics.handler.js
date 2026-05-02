/**
 * Analytics Queue Handler (BullMQ)
 *
 * Processes async analytics and operations jobs that cannot run inline:
 *
 *   process_refund         — trigger a gateway refund for a cancelled booking
 *   process_gateway_refund — admin-approved refund through the payment gateway
 *   refresh_fx_rates       — refresh foreign exchange rate cache in DB
 *
 * Each handler is idempotent — safe to retry on failure.
 * Refund logic delegates to PaymentGatewayFactory → gateway.createRefund()
 * so gateway-specific code lives in one place only.
 */
import { getDb } from '../config/db.js';
import { logger } from '../config/logger.js';
import { toObjectId } from '../utils/oid.js';
import { PaymentGatewayFactory } from '../modules/payment/gateways/gateway.factory.js';

/* ──────────────────────────────────────────────────────────────────
   process_refund  (customer cancellation path)
   data: { bookingId, amount, reason, refundPct }
────────────────────────────────────────────────────────────────── */

async function handleProcessRefund(data, jobId) {
  const { bookingId, amount, reason } = data;
  const db = getDb();

  // Find the payment record for this booking
  const payment = await db.collection('payments').findOne({
    bookingId: toObjectId(bookingId),
    status: 'paid',
  });

  if (!payment) {
    logger.warn({ jobId, bookingId }, 'analytics:process_refund — no paid payment found, skipping');
    return { skipped: true, reason: 'no paid payment' };
  }

  // Idempotency: check if refund already exists for this booking
  const existingRefund = await db.collection('refunds').findOne({ bookingId: toObjectId(bookingId), status: 'completed' });
  if (existingRefund) {
    logger.info({ jobId, bookingId }, 'analytics:process_refund — already refunded, skipping');
    return { skipped: true, reason: 'already refunded' };
  }

  const now = new Date();
  const refundRecord = {
    bookingId: toObjectId(bookingId),
    paymentId: payment._id,
    gatewayOrderId: payment.orderId,
    amount,
    currency: payment.currency || 'INR',
    country: payment.country || 'IN',
    reason,
    provider: payment.provider,
    status: 'processing',
    createdAt: now,
    updatedAt: now,
  };

  const { insertedId } = await db.collection('refunds').insertOne(refundRecord);

  try {
    let gatewayRefundId = null;

    if (payment.paymentId) {
      // Delegate to the gateway class — keeps SDK-specific code in one place
      const country = payment.country || 'IN';
      const gateway = PaymentGatewayFactory.forCountry(country, payment.currency);
      const result = await gateway.createRefund(payment.paymentId, amount, reason);
      gatewayRefundId = result.gatewayRefundId;
      logger.info({ jobId, bookingId, gatewayRefundId, provider: payment.provider }, 'refund created via gateway');
    } else {
      logger.warn({ jobId, bookingId, provider: payment.provider }, 'no paymentId on payment — marking refund as manual');
    }

    await db.collection('refunds').updateOne(
      { _id: insertedId },
      { $set: { status: 'completed', gatewayRefundId, completedAt: new Date(), updatedAt: new Date() } },
    );

    return { success: true, gatewayRefundId };
  } catch (err) {
    await db.collection('refunds').updateOne(
      { _id: insertedId },
      { $set: { status: 'failed', error: err.message, updatedAt: new Date() } },
    );
    throw err; // BullMQ will retry according to job options
  }
}

/* ──────────────────────────────────────────────────────────────────
   process_gateway_refund  (admin-approved refund path)
   data: { refundId, bookingId, amount, gatewayOrderId }
────────────────────────────────────────────────────────────────── */

async function handleProcessGatewayRefund(data, jobId) {
  const { refundId, bookingId, amount, gatewayOrderId } = data;
  const db = getDb();

  const refund = await db.collection('refunds').findOne({ _id: toObjectId(refundId) });
  if (!refund) {
    logger.warn({ jobId, refundId }, 'analytics:process_gateway_refund — refund record not found');
    return { skipped: true };
  }
  if (refund.status === 'completed') {
    return { skipped: true, reason: 'already completed' };
  }

  const payment = await db.collection('payments').findOne({ orderId: gatewayOrderId });
  if (!payment) {
    logger.warn({ jobId, gatewayOrderId }, 'analytics:process_gateway_refund — payment not found');
    return { skipped: true };
  }

  try {
    let gatewayRefundId = null;

    if (payment.paymentId) {
      // Delegate to the gateway abstraction — no duplicated SDK calls here
      const country = payment.country || 'IN';
      const gateway = PaymentGatewayFactory.forCountry(country, payment.currency);
      const result = await gateway.createRefund(
        payment.paymentId,
        amount,
        `admin_approved:${refundId}`,
      );
      gatewayRefundId = result.gatewayRefundId;
    } else {
      logger.warn({ jobId, refundId, provider: payment.provider }, 'no paymentId on payment — skipping gateway call');
    }

    await db.collection('refunds').updateOne(
      { _id: toObjectId(refundId) },
      { $set: { status: 'completed', gatewayRefundId, completedAt: new Date(), updatedAt: new Date() } },
    );

    logger.info({ jobId, refundId, gatewayRefundId }, 'gateway refund completed');
    return { success: true, gatewayRefundId };
  } catch (err) {
    await db.collection('refunds').updateOne(
      { _id: toObjectId(refundId) },
      { $set: { status: 'failed', error: err.message, updatedAt: new Date() } },
    );
    throw err;
  }
}

/* ──────────────────────────────────────────────────────────────────
   refresh_fx_rates  — update the FX rates used for display-only conversion
   Rates are stored in the `fx_rates` collection, not used for payment amounts.
────────────────────────────────────────────────────────────────── */

// Static fallback rates (relative to INR, ~Q1 2026 averages). Used when
// the live FX endpoint is unreachable so display-only conversion still
// has *some* answer. Source-of-truth for the rates the frontend used to
// hardcode in lib/i18n/config.js.
const STATIC_RATES = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0095,
  AED: 0.044,
  AUD: 0.018,
  SGD: 0.016,
  CAD: 0.016,
  SAR: 0.045,
};

const FX_TARGETS = ['USD', 'EUR', 'GBP', 'AED', 'AUD', 'SGD', 'CAD', 'SAR'];

/**
 * Pull live rates from frankfurter.app — free, public, no API key, ECB
 * sourced, daily updates. We ask for INR → all targets and store the
 * inverse (target → INR) shape that the rest of the app expects.
 *
 * Returns null on any failure so callers can fall back to STATIC_RATES.
 */
async function fetchLiveRates() {
  if (typeof fetch !== 'function') return null;
  try {
    const url = `https://api.frankfurter.app/latest?from=INR&to=${FX_TARGETS.join(',')}`;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(url, { signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json();
    const r = json?.rates || {};
    // Frankfurter returns "INR=1 USD=0.012 …" — exactly the shape we
    // already store. Sanity-check each rate is a positive number.
    const cleaned = { INR: 1 };
    for (const code of FX_TARGETS) {
      const v = Number(r[code]);
      if (Number.isFinite(v) && v > 0) cleaned[code] = v;
    }
    // If we got fewer than 4 currencies the API probably hiccuped —
    // treat as failure so we fall back rather than half-update the
    // pricing surface.
    if (Object.keys(cleaned).length < 5) return null;
    return cleaned;
  } catch {
    return null;
  }
}

async function handleRefreshFxRates(jobId) {
  const db = getDb();
  const now = new Date();

  const live = await fetchLiveRates();
  const rates = {
    ...(live || STATIC_RATES),
    updatedAt: now,
    source: live ? 'frankfurter' : 'static_fallback',
  };

  await db.collection('fx_rates').replaceOne(
    { _id: 'current' },
    { _id: 'current', ...rates },
    { upsert: true },
  );

  logger.info(
    { jobId, source: rates.source, count: Object.keys(rates).filter((k) => k !== 'updatedAt' && k !== 'source').length },
    'fx rates refreshed',
  );
  return { success: true, updatedAt: now, source: rates.source };
}

/* ──────────────────────────────────────────────────────────────────
   Main dispatch — called by BullMQ worker
────────────────────────────────────────────────────────────────── */

export async function handleAnalyticsJob(job) {
  const { type, ...data } = job.data;
  const jobId = job.id;

  logger.debug({ jobId, type }, 'analytics job started');

  switch (type) {
    case 'process_refund':
      return handleProcessRefund(data, jobId);

    case 'process_gateway_refund':
      return handleProcessGatewayRefund(data, jobId);

    case 'refresh_fx_rates':
      return handleRefreshFxRates(jobId);

    default:
      // Unknown job type — log and don't retry (not worth blocking the queue)
      logger.warn({ jobId, type }, 'analytics: unknown job type, discarding');
      return { skipped: true, reason: `unknown type: ${type}` };
  }
}
