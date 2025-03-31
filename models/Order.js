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
  items: [
    {
      dish: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Dish",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      size: {
        type: String,
        enum: ["small", "medium", "large"],
        required: true,
      },
    },
  ],
  totalPrice: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "preparing", "delivered", "finished", "canceled"],
    default: "pending",
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Order", OrderSchema);
