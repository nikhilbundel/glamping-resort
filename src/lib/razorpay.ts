import 'server-only';
import crypto from 'node:crypto';

/**
 * Razorpay (https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/).
 * Keys come from .env:  RAZORPAY_KEY_ID · RAZORPAY_KEY_SECRET · RAZORPAY_WEBHOOK_SECRET
 * Use rzp_test_… keys while testing, rzp_live_… when the site is live.
 */
const API = process.env.RAZORPAY_API_BASE || 'https://api.razorpay.com';

export function razorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  return { keyId, configured: !!(keyId && secret), mode: keyId.startsWith('rzp_live_') ? ('live' as const) : ('test' as const), webhook: !!process.env.RAZORPAY_WEBHOOK_SECRET };
}

function auth() {
  return `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`;
}

export type RazorpayOrder = { id: string; amount: number; currency: string; receipt: string; status: string };

/** Create an order. `amountRupees` is converted to paise (Razorpay works in the smallest unit). */
export async function createOrder(amountRupees: number, receipt: string, notes: Record<string, string>): Promise<RazorpayOrder> {
  const res = await fetch(`${API}/v1/orders`, {
    method: 'POST',
    headers: { Authorization: auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: Math.round(amountRupees * 100), currency: 'INR', receipt, notes }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.description || `Razorpay error ${res.status}`);
  return body as RazorpayOrder;
}

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** Signature returned to the browser after payment: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '').update(`${orderId}|${paymentId}`).digest('hex');
  return !!signature && safeEqual(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}
