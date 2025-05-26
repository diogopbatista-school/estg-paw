const mongoose = require("mongoose");

const RestaurantSchema = new mongoose.Schema({
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  phone: {
    type: Number,
    required: true,
  },
  menus: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Menu",
    },
  ],
  order_records: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order", // Referência ao modelo Order
    },
  ],
  reviews: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
      default: [],
    },
  ],
  average_rating: {
    type: Number,
    default: 0,
  },
  image: {
    type: String,
    default: null,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Restaurant", RestaurantSchema);
