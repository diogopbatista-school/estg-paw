var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const User = require("../models/User");
const validationsController = require("../controllers/validationsController");

// Middleware para verificar autenticação
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect("/users/login");
}

// Dashboard protegido
router.get("/", isAuthenticated, function (req, res) {
  res.render("user-dashboard", { user: req.session.user });
});

// Página de edição de informações do usuário
router.get("/edit", isAuthenticated, function (req, res) {
  res.render("user-edit", { user: req.session.user, error: null });
});

// Processar edição de informações do usuário
router.post("/edit", isAuthenticated, async function (req, res) {
  try {
    const { name, email, password, newPassword, confirmNewPassword, phone } = req.body;

    if (newPassword || confirmNewPassword) {
      if (!password) {
        throw new Error("A senha atual é obrigatória para alterar a senha.");
      }

      const user = await User.findById(req.session.user.id);
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error("A senha atual está incorreta.");
      }

      if (newPassword !== confirmNewPassword) {
        throw new Error("A nova senha e a confirmação não coincidem.");
      }

      const isPasswordValidForSecurity = validationsController.validatePassword(newPassword);
      if (!isPasswordValidForSecurity) {
        throw new Error("A nova senha não atende aos critérios de segurança.");
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.session.user.id,
      {
        name,
        email,
        ...(newPassword && { password: await bcrypt.hash(newPassword, 10) }),
        phone,
      },
      { new: true }
    );

    req.session.user = {
      id: updatedUser._id,
      name: updatedUser.name,
      nif: updatedUser.nif,
      phone: updatedUser.phone,
      email: updatedUser.email,
      role: updatedUser.role,
    };

    res.redirect("/users/dashboard");
  } catch (error) {
    res.status(400).render("user-edit", { user: req.session.user, error: error.message });
  }
});

module.exports = router;
