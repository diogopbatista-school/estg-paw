const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

router.get("/register/:id", orderController.renderRegistOrder);

router.post("/submitRegister/:id", orderController.postRegisterOrder);

router.post("/accept/:id", orderController.acceptOrder);

router.get("/cancel/:id", orderController.renderCancelOrder);

router.post("/submitCancel/:id", orderController.cancelOrder);

router.post("/ready/:id", orderController.readyToDeliver);

router.post("/finish/:id", orderController.finishOrder);

module.exports = router;
