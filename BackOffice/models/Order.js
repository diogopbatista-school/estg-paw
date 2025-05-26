const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Restaurant",
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  order_number: {
    type: Number,
    required: true,
  },
  items: [
    {
      dish: {
        name: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          default: null,
        },
        category: {
          type: String,
          default: null,
        },
        image: {
          type: String,
          default: null,
        },
      },
      dose: {
        type: String,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
    },
  ],  totalPrice: {
    type: Number,
    required: true,
  },
  voucherDiscount: {
    type: Number,
    default: 0,
  },
  appliedVoucher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Voucher",
    default: null,
  },
  status: {
    type: String,
    enum: ["pending", "preparing", "delivered", "finished", "canceled"],
    default: "pending",
  },
  typeOfcancelation: {
    type: String,
    enum: ["customer", "restaurant", "other"],
    default: null,
  },
  motive: {
    type: String,
    default: null,
  },
  type: {
    enum: ["homeDelivery", "takeAway", "eatIn"],
    type: String,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  accepted_at: {
    type: Date,
    default: null,
  },
  ready_at: {
    type: Date,
    default: null,
  },
  finished_at: {
    type: Date,
    default: null,
  },
  review: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Review",
    default: null,
  },
  logs: [
    {
      status: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      description: {
        type: String,
        required: true,
      },
    },
  ],
});

module.exports = mongoose.model("Order", OrderSchema);
