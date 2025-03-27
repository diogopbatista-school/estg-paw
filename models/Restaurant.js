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
      ref: "menu",
    },
  ],
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
