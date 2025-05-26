const express = require("express");
const router = express.Router();
const dishController = require("../controllers/dishController");
const upload = require("../uploads/uploadConfig");

// Renderizar o formulário de criação de prato
router.get("/register/:menuId", dishController.renderCreateDishForm);

// Criar um novo prato
router.post("/submitRegister/:menuId", upload.single("image"), dishController.postCreateDish);

// Renderizar o formulário de edição de prato

router.get("/edit/:dishId", dishController.renderEditDishForm);

// Atualizar um prato
router.post("/submitEdit/:dishId", upload.single("image"), dishController.updateDish);

// Remover um prato
router.post("/delete/:dishId", dishController.removeDish);

module.exports = router;
