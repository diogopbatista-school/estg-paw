const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  nif: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["client", "manager", "admin"],
    default: "client",
  },
  phone: {
    type: String,
    required: true,
  },
  order_records: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order", // Referência ao modelo OrderRecord
    },
  ],
  restaurants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant", // Referência ao modelo Restaurant
    },
  ],
  created_at: { type: Date, default: Date.now },
});

UserSchema.pre("save", function (next) {
  // Se o usuário for um manager
  if (this.role === "manager") {
    this.restaurants = this.restaurants || []; // Inicialize como um array vazio se não estiver definido
    this.order_records = undefined; // Remova o campo order_records
  }

  // Se o usuário for um client
  if (this.role === "client") {
    this.restaurants = undefined; // Remova o campo restaurants
    this.order_records = this.order_records || []; // Inicialize como um array vazio se não estiver definido
  }

  // Se o usuário for um admin
  if (this.role === "admin") {
    this.restaurants = undefined; // Remova o campo restaurants
    this.order_records = undefined; // Remova o campo order_records
  }

  next();
});

module.exports = mongoose.model("User", UserSchema);
