const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "uploads/default";
    if (req.baseUrl.includes("dish")) {
      folder = "uploads/dishes";
    } else if (req.baseUrl.includes("user")) {
      folder = "uploads/profileImages";
    } else if (req.baseUrl.includes("restaurants")) {
      folder = "uploads/restaurants";
    } else if (req.originalUrl.includes("review")) {
      folder = "uploads/reviews";
    }
    // Adicione mais condições conforme necessário para outros endpoints
    cb(null, path.join(__dirname, `../${folder}`));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo inválido. Apenas imagens são permitidas."));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = upload;
