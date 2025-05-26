const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      sparse: true, // Permite que alguns vouchers não tenham código
    },
    discount: {
      type: Number,
      required: true,
    },
    expirationDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Opcional para vouchers antigos
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Opcional para vouchers antigos
    },
  },  { timestamps: true }
);

// Função para gerar código único de voucher
voucherSchema.statics.generateUniqueCode = async function() {
  let code;
  let exists = true;
  
  while (exists) {
    // Gera código de 8 caracteres alfanuméricos
    code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const existingVoucher = await this.findOne({ code });
    exists = !!existingVoucher;
  }
  
  return code;
};

// Pre-save middleware para gerar código se não existir
voucherSchema.pre('save', async function(next) {
  if (this.isNew && !this.code) {
    this.code = await this.constructor.generateUniqueCode();
  }
  next();
});

module.exports = mongoose.model("Voucher", voucherSchema);
