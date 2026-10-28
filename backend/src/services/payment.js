import config from "../config/index.js";
import { logger } from "../utils/logger.js";

/**
 * Create a card payment intent.
 * Mock mode when STRIPE_SECRET_KEY is empty.
 */
export async function createPaymentIntent({
  amount,
  currency = "usd",
  metadata = {},
}) {
  if (!amount || amount <= 0) {
    const err = new Error("Invalid amount");
    err.status = 400;
    throw err;
  }

  if (config.stripe.secretKey) {
    logger.info("Stripe key present — wire Stripe SDK for live charges");
    return {
      mode: "stripe",
      client_secret: null,
      message: "Install stripe package and call Stripe.paymentIntents.create",
    };
  }

  const paymentId = `mock_pi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    mode: "mock",
    payment_id: paymentId,
    amount,
    currency,
    status: "requires_confirmation",
    metadata,
    message: "Mock payment — confirm with POST /api/payments/confirm",
  };
}

export async function confirmPayment(paymentId) {
  if (!paymentId) {
    const err = new Error("payment_id required");
    err.status = 400;
    throw err;
  }
  return {
    mode: config.stripe.secretKey ? "stripe" : "mock",
    payment_id: paymentId,
    status: "succeeded",
    message: config.stripe.secretKey
      ? "Verify with Stripe API"
      : "Payment successful (mock)",
  };
}

/* ============================================================
   UPI (mock mode)
   ============================================================ */

const UPI_VPA_REGEX = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;

export async function createUpiIntent({ amount, vpa, metadata = {} }) {
  if (!amount || amount <= 0) {
    const err = new Error("Invalid amount");
    err.status = 400;
    throw err;
  }
  if (!vpa || !UPI_VPA_REGEX.test(String(vpa).trim())) {
    const err = new Error("Invalid UPI ID. Example: yourname@okhdfcbank");
    err.status = 400;
    throw err;
  }

  if (config.razorpay?.keyId) {
    logger.info("Razorpay key present — wire Razorpay SDK for live UPI");
    return {
      mode: "razorpay",
      message: "Install razorpay and call razorpay.orders.create here",
    };
  }

  const paymentId = `upi_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    mode: "mock",
    payment_id: paymentId,
    vpa: String(vpa).trim(),
    amount_usd: amount,
    amount_inr: Math.round(amount * (config.upi?.usdToInr || 83)),
    currency: "INR",
    status: "requires_confirmation",
    metadata,
    message: "Mock UPI payment — confirm with POST /api/payments/upi/confirm",
  };
}

export async function confirmUpiPayment(paymentId) {
  if (!paymentId) {
    const err = new Error("payment_id required");
    err.status = 400;
    throw err;
  }
  return {
    mode: config.razorpay?.keyId ? "razorpay" : "mock",
    payment_id: paymentId,
    status: "succeeded",
    message: config.razorpay?.keyId
      ? "Verify with Razorpay API"
      : "UPI payment successful (mock)",
  };
}

/** Handle Stripe webhook events (signature verification placeholder) */
export async function handleStripeWebhook(rawBody, signature) {
  if (!config.stripe.webhookSecret) {
    logger.warn("Webhook received but STRIPE_WEBHOOK_SECRET is not set");
    return { received: true, mode: "unverified" };
  }
  logger.info("Stripe webhook event received", {
    signature: signature?.slice?.(0, 20),
  });
  return { received: true, mode: "stripe" };
}
