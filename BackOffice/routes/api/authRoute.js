var express = require("express");
var router = express.Router();
var authController = require("../../controllers/API/authControllerAPI");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Certifique-se de que o diretório existe
const uploadDir = path.join(__dirname, "../../uploads/profileImages");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do Multer para upload de ficheiros
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage }).single("profileImage");

router.post("/login", authController.login);
router.post("/register", upload, authController.register);

module.exports = router;
