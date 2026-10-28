import { Router } from "express";
import { optionalAuth } from "../middleware/auth.js";
import {
  createPaymentIntent,
  confirmPayment,
  createUpiIntent,
  confirmUpiPayment,
} from "../services/payment.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post(
  "/create-intent",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { amount, currency = "usd" } = req.body || {};
    const result = await createPaymentIntent({
      amount,
      currency,
      metadata: { user_id: req.user?.id },
    });
    res.json(result);
  }),
);

router.post(
  "/confirm",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { payment_id } = req.body || {};
    const result = await confirmPayment(payment_id);
    res.json(result);
  }),
);

router.post(
  "/upi/create",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { amount, vpa } = req.body || {};
    const result = await createUpiIntent({
      amount,
      vpa,
      metadata: { user_id: req.user?.id },
    });
    res.json(result);
  }),
);

router.post(
  "/upi/confirm",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { payment_id } = req.body || {};
    const result = await confirmUpiPayment(payment_id);
    res.json(result);
  }),
);

export default router;
