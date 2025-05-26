const express = require("express");
const router = express.Router();
const restaurantController = require("../controllers/restaurantController");
const upload = require("../uploads/uploadConfig");

const isAuthorized = (req, res, next) => {
  if ((req.isAuthenticated() && req.user.role === "manager") || req.user.role === "admin" || req.user.role === "superAdmin") {
    return next();
  }
  return res.status(403).redirect("/user/login");
};

router.get("/register", isAuthorized, restaurantController.renderCreateRestaurantForm);

router.post("/submitRegister", isAuthorized, upload.single("image"), restaurantController.postRegister);

router.get("/dashboard/:id", isAuthorized, restaurantController.renderDashboard);

router.get("/:id/orderHistory", isAuthorized, restaurantController.renderOrderHistory);

router.post("/delete/:id", isAuthorized, restaurantController.deleteRestaurantHandler);

router.get("/edit/:id", isAuthorized, restaurantController.renderEditRestaurantForm);

router.get("/:id/charts", isAuthorized, restaurantController.renderCharts);

router.post("/submitEdit/:id", isAuthorized, upload.single("image"), restaurantController.postEditRestaurant);

router.post("/:restaurantId/reviews/:reviewId/respond", isAuthorized, restaurantController.respondToOrder);

module.exports = router;
