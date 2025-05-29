const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_51RRfCfGhkRcbdFqGGSIX8LvGDaCTeJWOAEfAAt9uAa1kxRXihEeGbPRvJw5WLLg7r5YnV6R8O1OQPd3GSwjRu7bp002od2nqTp");
const Order = require("../../models/Order");
const Voucher = require("../../models/Voucher");
const User = require("../../models/User");

const stripeControllerAPI = {};

/**
 * Helper function to round to 2 decimal places to avoid floating point precision issues
 * @param {number} value - The value to round
 * @returns {number} - The rounded value
 */
const roundToTwoDecimals = (value) => Math.round(value * 100) / 100;

/**
 * Creates a Stripe checkout session for order payment
 * @param {Object} req - Request object containing order data
 * @param {Object} res - Response object
 */
stripeControllerAPI.createCheckoutSession = async (req, res) => {
  try {
    const { items, restaurantId, orderType, userId, voucherDiscount, appliedVoucher, deliveryAddress } = req.body;

    // Validate required fields
    if (!items || !restaurantId || !orderType || !userId) {
      return res.status(400).json({ 
        error: "Missing required fields: items, restaurantId, orderType, userId" 
      });
    }

    // Calculate total amount considering voucher discount
    const itemsTotal = roundToTwoDecimals(items.reduce((total, item) => total + item.price * item.quantity, 0));
    const voucherDiscountAmount = roundToTwoDecimals(voucherDiscount || 0);
    const finalTotal = roundToTwoDecimals(Math.max(0, itemsTotal - voucherDiscountAmount));

    console.log("Stripe session - Items Total:", itemsTotal, "Voucher discount:", voucherDiscountAmount, "Final:", finalTotal);

    // Validate that final total is greater than 0
    if (finalTotal <= 0) {
      return res.status(400).json({ 
        error: "Invalid order total. Total must be greater than 0." 
      });
    }

    // Create line items based on whether voucher discount is applied
    let lineItems;

    if (voucherDiscountAmount > 0) {
      // Create a single line item with the discounted total
      const itemNames = items.map((item) => `${item.quantity}x ${item.name} (${item.dose})`).join(", ");
      lineItems = [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Pedido com Desconto Voucher`,
              description: `${itemNames} - Desconto aplicado: ${voucherDiscountAmount.toFixed(2)}€`,
            },
            unit_amount: Math.round(finalTotal * 100),
          },
          quantity: 1,
        },
      ];
    } else {
      // No voucher discount, create individual line items
      lineItems = items.map((item) => ({
        price_data: {
          currency: "eur",
          product_data: { name: `${item.name} (${item.dose})` },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      }));
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: "http://localhost:4200/process-payment?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://localhost:4200/orders?canceled=true",
      metadata: {
        restaurantId,
        orderType,
        userId,
        items: JSON.stringify(items),
        voucherDiscount: voucherDiscountAmount.toString(),
        appliedVoucher: appliedVoucher || "",
        finalTotal: finalTotal.toString(),
        deliveryAddress: orderType === "homeDelivery" ? deliveryAddress : "",
      },
    });

    console.log("Session created with discount:", session);
    
    res.status(200).json({ 
      success: true,
      sessionId: session.id 
    });

  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    res.status(500).json({ 
      success: false,
      error: error.message || "Failed to create checkout session"
    });
  }
};

/**
 * Creates a Stripe checkout session for voucher purchase
 * @param {Object} req - Request object containing voucher data
 * @param {Object} res - Response object
 */
stripeControllerAPI.createVoucherSession = async (req, res) => {  try {
    const { userId, amount, recipientEmail } = req.body;
    
    console.log("🎫 RECEBIDO - Criar sessão voucher:");
    console.log("- userId:", userId);
    console.log("- amount:", amount);
    console.log("- recipientEmail:", recipientEmail);

    // Validate required fields
    if (!userId || !amount) {
      return res.status(400).json({ 
        error: "userId e amount são obrigatórios" 
      });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({ 
        error: "O valor do voucher deve ser maior que 0" 
      });
    }

    // Normalize recipient email
    const normalizedRecipientEmail = recipientEmail?.trim() || "";
    console.log("- normalizedRecipientEmail:", normalizedRecipientEmail);

    // Validate recipient if email is provided
    if (normalizedRecipientEmail !== "") {
      console.log("🔍 Validando destinatário:", normalizedRecipientEmail);
      
      const recipient = await User.findOne({ email: normalizedRecipientEmail }, "email role name");
      
      if (!recipient) {
        console.log("❌ Destinatário não encontrado");
        return res.status(400).json({ 
          error: "Email do destinatário não encontrado" 
        });
      }
      
      if (recipient.role !== "client") {
        console.log("❌ Destinatário não é cliente. Role:", recipient.role);
        return res.status(400).json({ 
          error: "O destinatário deve ser um cliente" 
        });
      }
      
      console.log("✅ Destinatário válido:", recipient.name);
    } else {
      console.log("✅ Voucher para o próprio comprador");
    }

    // Create product name based on recipient
    const productName = normalizedRecipientEmail !== "" 
      ? `Voucher de ${amount}€ (presente para ${normalizedRecipientEmail})` 
      : `Voucher de ${amount}€`;

    console.log("🛒 Criando sessão Stripe com produto:", productName);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: productName },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: "http://localhost:4200/process-voucher-payment?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://localhost:4200/vouchers?canceled=true",
      metadata: {
        buyerId: userId,
        voucherAmount: amount,
        recipientEmail: normalizedRecipientEmail,
        type: "voucher",
      },
    });

    console.log("✅ Sessão Stripe criada:", session.id);

    // Não criar o voucher agora - esperar confirmação do pagamento
    // O voucher será criado quando o usuário for redirecionado para a URL de sucesso
    // e o componente process-voucher-payment verificar o status do pagamento

    res.status(200).json({ 
      success: true,
      sessionId: session.id
    });

  } catch (error) {
    console.error("❌ ERRO COMPLETO:", error);
    console.error("❌ STACK TRACE:", error.stack);
    res.status(500).json({ 
      success: false,
      error: error.message || "Failed to create voucher session"
    });
  }
};

/**
 * Helper function to create a voucher
 * @param {string} buyerId - ID of the user purchasing the voucher
 * @param {number} amount - Voucher amount
 * @param {string} recipientEmail - Email of the recipient (empty if for buyer)
 * @returns {Object} - Result object with success status and voucher ID or error
 */
stripeControllerAPI.createVoucher = async (buyerId, amount, recipientEmail) => {
  try {
    console.log("🎫 Criando voucher imediatamente...");

    // Determine who will receive the voucher
    let recipientId = buyerId; // Default to buyer

    if (recipientEmail !== "") {
      // If there's a recipient email, find the user
      const recipient = await User.findOne({ email: recipientEmail });
      if (recipient) {
        recipientId = recipient._id;
        console.log("✅ Voucher será dado para:", recipient.name, "(", recipient.email, ")");
      }
    } else {
      console.log("✅ Voucher será dado para o próprio comprador");
    }

    // Create voucher valid for 1 year
    const expiration = new Date();
    expiration.setFullYear(expiration.getFullYear() + 1);

    console.log("📝 Criando voucher com dados:");
    console.log("- discount:", amount);
    console.log("- expirationDate:", expiration);
    console.log("- createdBy:", buyerId);
    console.log("- assignedTo:", recipientId);

    const voucher = await Voucher.create({
      discount: amount,
      expirationDate: expiration,
      createdBy: buyerId, // Who bought it
      assignedTo: recipientId, // Who will receive it
    });

    console.log("✅ Voucher criado:", voucher._id);

    // Add voucher to recipient user
    console.log("📝 Adicionando voucher ao usuário:", recipientId);
    await User.findByIdAndUpdate(recipientId, {
      $push: { vouchers: voucher._id },
    });

    console.log("✅ Voucher adicionado ao usuário:", recipientId);

    return {
      success: true,
      voucherId: voucher._id
    };

  } catch (error) {
    console.error("❌ Erro ao criar voucher:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Retrieves Stripe session details by session ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
stripeControllerAPI.getSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: "Session ID is required." });
    }

    console.log("Retrieving Stripe session:", sessionId);

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log("Session retrieved:", {
      id: session.id,
      hasMetadata: !!session.metadata,
      metadata: session.metadata
    });

    // You might want to add a security check here to ensure the session's payment_status is 'paid'
    // before allowing order creation based on it, though Stripe's best practice
    // is to rely on webhooks for 'checkout.session.completed' for fulfillment.
    // For example:
    // if (session.payment_status !== 'paid') {
    //   console.warn(`Stripe session ${sessionId} payment status is ${session.payment_status}.`);
    //   return res.status(402).json({ success: false, error: "Payment not yet confirmed or failed." });
    // }

    res.status(200).json({
      success: true,
      metadata: session.metadata,
      customer_email: session.customer_details ? session.customer_details.email : null,
      payment_status: session.payment_status,
      // You can add any other session details the frontend might need
    });

  } catch (error) {
    console.error("Error retrieving Stripe session details:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve session details"
    });
  }
};

module.exports = stripeControllerAPI;
