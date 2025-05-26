var express = require("express");
var router = express.Router();
const asyncHandler = require("express-async-handler");
const upload = require("../uploads/uploadConfig");
const userController = require("../controllers/userController");

const isUser = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect("/user/login");
  }
};

const isAuthorized = (req, res, next) => {
  if (req.isAuthenticated() || req.user.role === "admin" || req.user.role === "superAdmin") {
    return next();
  }
  return res.status(403).redirect("/user/login");
};

router.get("/login", asyncHandler(userController.renderLogin));

router.post("/submitLogin", asyncHandler(userController.postLogin));

router.get("/logout", isUser, asyncHandler(userController.logout));

router.get("/register", asyncHandler(userController.renderRegister));

router.post("/submitRegister", upload.single("profileImage"), asyncHandler(userController.postRegister));

router.get("/dashboard", isUser, asyncHandler(userController.renderDashboard));

router.get("/edit/:userId", isUser, asyncHandler(userController.renderEditForm));

router.post("/submitEdit/:userId", upload.single("profileImage"), isUser, asyncHandler(userController.postEditForm));

router.get("/delete/:userId", isAuthorized, asyncHandler(userController.renderDeleteProfile));

router.post("/submitDelete/:userId", isAuthorized, asyncHandler(userController.postDeleteProfile));

router.get("/search", isAuthorized, userController.searchUsers);

module.exports = router;
