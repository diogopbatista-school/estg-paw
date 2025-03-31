const mongoose = require("mongoose");

const MenuSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Restaurant",
  },
  category: {
    type: String,
    required: true,
  },
  dishes: [
    {
      dish: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Dish", // Referência ao modelo de pratos
        required: true,
      },
    },
  ],
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Menu", MenuSchema);
