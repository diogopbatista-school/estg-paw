const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
  },  comment: {
    type: String,
  },
  image: {
    type: String, // URL/path da imagem
  },
  response: {
    text: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    created_at: Date
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Review", ReviewSchema);
