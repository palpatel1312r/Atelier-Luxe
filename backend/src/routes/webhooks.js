import { Router } from 'express';
import { handleStripeWebhook } from '../services/payment.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();

/** Mounted at /api/webhooks/stripe with express.raw */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const signature = req.headers['stripe-signature'];
    const result = await handleStripeWebhook(req.body, signature);
    logger.info('Webhook processed', result);
    res.json(result);
  })
);

export default router;
