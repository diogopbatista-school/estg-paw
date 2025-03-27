const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nif: { type: Number, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  salt: { type: String, required: true },
  role: { type: String, enum: ["client", "manager", "admin"], default: "client" },
  phone: { type: Number },
  restaurants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant", // Referência ao modelo Restaurant
    },
  ],
  created_at: { type: Date, default: Date.now },
});

UserSchema.pre("save", function (next) {
  // Se o usuário for um manager e o campo restaurants não estiver definido, inicialize como um array vazio
  if (this.role === "manager" && !this.restaurants) {
    this.restaurants = [];
  }

  // Se o usuário for um client, remova o campo restaurants
  if (this.role === "client" && this.restaurants) {
    this.restaurants = undefined; // Remove o campo
  }

  next();
});

module.exports = mongoose.model("User", UserSchema);
