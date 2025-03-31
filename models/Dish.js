const mongoose = require("mongoose");

const DishSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  menuId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Menu",
  },
  description: {
    type: String,
    required: true,
  },
  prices: [
    {
      dose: { type: String, required: true }, // Exemplo: "Pequena", "Média", "Grande"
      price: { type: Number, required: true }, // Preço para a dose
    },
  ],
  image: {
    type: String, // URL da imagem
  },
  nutritionFacts: {
    type: String,
  },
});

module.exports = mongoose.model("Dish", DishSchema);
