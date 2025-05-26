const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

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
    enum: ["superAdmin", "manager", "admin", "client"],
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
  reviews: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review", // Referência ao modelo Review
    },
  ],
  vouchers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voucher", // Referência ao modelo Voucher
    },
  ],
  restaurants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant", // Referência ao modelo Restaurant
    },
  ],
  profileImage: {
    type: String,
    default: null,
  },
  // Blocking system for order cancellations
  isBlocked: {
    type: Boolean,
    default: false,
  },
  blockedUntil: {
    type: Date,
    default: null,
  },
  monthlyCancellations: {
    type: Number,
    default: 0,
  },
  lastCancellationMonth: {
    type: String, // Format: "YYYY-MM"
    default: null,
  },
  created_at: { type: Date, default: Date.now },
});

UserSchema.pre("save", async function (next) {
  try {
    if (this.isModified("password")) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    // Handle role-specific fields
    if (this.role === "client") {
      // Client users don't manage restaurants
      this.restaurants = [];
    } else if (this.role === "admin") {
      // Admin users don't have restaurants, orders or reviews
      this.restaurants = [];
      this.order_records = [];
      this.reviews = [];
    } else if (this.role === "manager") {
      // Manager users don't write reviews
      this.reviews = [];
    }

    next();
  } catch (err) {
    next(err);
  }
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
