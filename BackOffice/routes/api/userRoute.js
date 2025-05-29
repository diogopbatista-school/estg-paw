const express = require("express");
const router = express.Router();
const userControllerAPI = require("../../controllers/API/userControllerAPI");
const upload = require("../../uploads/uploadConfig");
const { verifyToken } = require("../../middleware/authMiddleware");

// Editar perfil do usuário autenticado
router.put("/edit", verifyToken, upload.single("profileImage"), userControllerAPI.editUser);

// Buscar usuário por email (API para validação de voucher)
router.get("/findByEmail/:email", verifyToken, userControllerAPI.findUserByEmail);

// Buscar vouchers do usuário autenticado
router.get("/vouchers", verifyToken, userControllerAPI.getVouchers);

// Validar código de voucher
router.get("/voucher/validate/:code", verifyToken, userControllerAPI.validateVoucherCode);

// Aplicar voucher
router.post("/voucher/apply", verifyToken, userControllerAPI.applyVoucher);

// Criar voucher após pagamento confirmado
router.post("/create-voucher", verifyToken, userControllerAPI.createVoucher);

module.exports = router;
