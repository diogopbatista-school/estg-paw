const mongoose = require("mongoose");

const DishSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  menuId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Menu",
    required: true,
  },
  prices: [
    {
      dose: { type: String, required: true },
      price: { type: Number, required: true },
    },
  ],
  category: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  // Campos de informação nutricional
  nutritionalInfo: {
    calories: { type: Number },
    carbs: { type: Number },
    protein: { type: Number },
    fat: { type: Number },
    fiber: { type: Number },
    sugar: { type: Number },
  },
  nutriScore: {
    type: String,
    enum: ["A", "B", "C", "D", "E"],
  },
  allergens: [
    {
      type: String,
    },
  ],
  // Campos para armazenar informações da API de alimentos
  externalFoodApiId: {
    type: String,
  },
  externalFoodType: {
    type: String,
    enum: ["product", "recipe", "ingredient", "fallback", "manual"],
    default: "product",
  },
});

module.exports = mongoose.model("Dish", DishSchema);
