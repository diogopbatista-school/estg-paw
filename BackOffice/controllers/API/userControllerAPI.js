const User = require("../../models/User");
const userController = require("../userController");
const validationsController = require("../validationsController");

const userControllerAPI = {};

userControllerAPI.getUserByEmail = async (req, res) => {
  const { email } = req.params.email;

  try {
    const user = await userController.getUser({ email: email });

    res.status(200).json({ user });
  } catch (error) {
    const message = error.message || "Error retrieving user";
    res.status(500).json({ message });
  }
};

userControllerAPI.getUserInfo = async (req, res) => {
  const { id } = req.params.id;

  try {
    const user = await userController.getUser({ _id: id });

    res.status(200).json({ user });
  } catch (error) {
    const message = error.message || "Error retrieving user";
    res.status(500).json({ message });
  }
};

userControllerAPI.editUser = async (req, res) => {
  // Debug: logar o que chega do frontend
  console.log("req.body:", req.body);
  console.log("req.file:", req.file);
  try {
    const user = await userController.updateUserProfile({
      req,
      userId: req.user._id, // Corrigido: usa o ID do usuário autenticado
      body: req.body,
      file: req.file,
      loggedUser: req.user,
      isApi: true,
    });
    res.status(200).json({ user });
  } catch (error) {
    console.error("Erro ao editar perfil:", error);
    res.status(400).json({ message: error.message });
  }
};

userControllerAPI.findUserByEmail = async (req, res) => {


  try {
    const email = req.params.email;
    console.log("Buscando email:", email);

    const user = await User.findOne({ email }, "email role name");

    if (!user) {
      console.log("Usuário não encontrado");
      return res.status(404).json(null);
    }

    const response = {
      email: user.email,
      role: user.role,
      name: user.name,
    };

    console.log("Resposta:", response);
    return res.status(200).json(response);
  } catch (err) {
    console.error("Erro na busca:", err);
    return res.status(500).json({ error: err.message });
  }
};

userControllerAPI.getVouchers = async (req, res) => {
  try {
    const userId = req.user._id; // ID do usuário autenticado
    console.log("Buscando vouchers para o usuário:", userId);

    const user = await User.findById(userId).populate("vouchers");

    if (!user) {
      console.log("Usuário não encontrado");
      return res.status(404).json({ message: "Usuário não encontrado" });
    }    const vouchers = user.vouchers
      .filter(voucher => voucher.isActive && new Date(voucher.expirationDate) > new Date())
      .map((voucher) => ({
        id: voucher._id,
        code: voucher.code,
        discount: voucher.discount,
        expirationDate: voucher.expirationDate,
        isActive: voucher.isActive,
        createdAt: voucher.createdAt,
        updatedAt: voucher.updatedAt,
      }));

    console.log("Vouchers encontrados:", vouchers);
    return res.status(200).json(vouchers);
  } catch (err) {
    console.error("Erro ao buscar vouchers:", err);
    return res.status(500).json({ error: err.message });  }
}

userControllerAPI.validateVoucherCode = async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user._id;

    console.log("Validando código de voucher:", code, "para usuário:", userId);

    const Voucher = require("../../models/Voucher");
    
    // Busca voucher pelo código
    const voucher = await Voucher.findOne({ 
      code: code.toUpperCase(),
      isActive: true,
      expirationDate: { $gt: new Date() }
    });

    if (!voucher) {
      return res.status(404).json({ message: "Voucher não encontrado ou expirado" });
    }

    // Verifica se o voucher está disponível para o usuário
    // Pode ser usado se: não tem assignedTo (voucher público) ou está assignado ao usuário
    if (voucher.assignedTo && voucher.assignedTo.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Este voucher não está disponível para você" });
    }

    const voucherData = {
      id: voucher._id,
      code: voucher.code,
      discount: voucher.discount,
      expirationDate: voucher.expirationDate,
      isActive: voucher.isActive,
      createdAt: voucher.createdAt,
      updatedAt: voucher.updatedAt,
    };

    return res.status(200).json(voucherData);
  } catch (err) {
    console.error("Erro ao validar código de voucher:", err);
    return res.status(500).json({ error: err.message });
  }
};

userControllerAPI.applyVoucher = async (req, res) => {
  try {
    const { voucherId, orderAmount } = req.body;
    const userId = req.user._id;

    console.log("Aplicando voucher:", voucherId, "valor pedido:", orderAmount, "usuário:", userId);

    const Voucher = require("../../models/Voucher");
    
    const voucher = await Voucher.findById(voucherId);

    if (!voucher || !voucher.isActive || new Date(voucher.expirationDate) <= new Date()) {
      return res.status(400).json({ message: "Voucher inválido ou expirado" });
    }

    // Verifica se o voucher está disponível para o usuário
    if (voucher.assignedTo && voucher.assignedTo.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Este voucher não está disponível para você" });
    }

    // Helper function to round to 2 decimal places to avoid floating point precision issues
    const roundToTwoDecimals = (value) => Math.round(value * 100) / 100;

    // Calcula o desconto
    const discountApplied = roundToTwoDecimals(Math.min(voucher.discount, orderAmount));
    const remainingVoucherValue = roundToTwoDecimals(voucher.discount - discountApplied);

    // Se o voucher foi totalmente usado, desativa
    if (remainingVoucherValue <= 0) {
      voucher.isActive = false;
      await voucher.save();
    } else {
      // Se foi parcialmente usado, atualiza o valor
      voucher.discount = remainingVoucherValue;
      await voucher.save();
    }

    return res.status(200).json({
      discountApplied,
      remainingVoucherValue,
      message: remainingVoucherValue > 0 
        ? `Voucher parcialmente usado. Valor restante: ${remainingVoucherValue.toFixed(2)}€`
        : "Voucher totalmente utilizado"
    });
  } catch (err) {
    console.error("Erro ao aplicar voucher:", err);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = userControllerAPI;
