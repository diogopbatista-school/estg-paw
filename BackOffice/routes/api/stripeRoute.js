const express = require("express");
const router = express.Router();
const stripeControllerAPI = require("../../controllers/API/stripeControllerAPI");

/**
 * @route POST /api/stripe/create-checkout-session
 * @desc Create a Stripe checkout session for order payment
 * @access Public
 */
router.post("/create-checkout-session", stripeControllerAPI.createCheckoutSession);

/**
 * @route POST /api/stripe/create-voucher-session
 * @desc Create a Stripe checkout session for voucher purchase
 * @access Public
 */
router.post("/create-voucher-session", stripeControllerAPI.createVoucherSession);

/**
 * @route GET /api/stripe/session/:sessionId
 * @desc Get Stripe session details by session ID
 * @access Public (removido o middleware de autenticação para evitar bloqueio no FrontOffice)
 */
router.get("/session/:sessionId", function(req, res) {
  return stripeControllerAPI.getSessionDetails(req, res);
});

module.exports = router;
