const User = require("../../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs").promises;

const validationsController = require("../../controllers/validationsController");
const userController = require("../../controllers/userController");

// Verificar se temos um arquivo de configuração JWT ou usar um fallback
let jwtSecret;
try {
  const config = require("../../jwt_secret/config");
  jwtSecret = config.secret;
} catch (error) {
  console.warn("JWT config file not found, using fallback secret");
  jwtSecret = "estg-paw-secret-key";
}

var authController = {};

/**
 * Helper function to save user profile image
 * @param {Object} req - Express request object
 * @param {Object} user - User to update image for
 */
async function saveProfileImage(req, user) {
  if (!req.file || !req.file.path) {
    return null;
  }

  try {
    // Usar o ID do usuário e a extensão do arquivo para o nome da imagem
    const extension = path.extname(req.file.originalname).toLowerCase();
    const newFileName = `${user._id}${extension}`;
    const newFilePath = path.join("uploads", "profileImages", newFileName);

    // Criar o diretório de destino se não existir
    const uploadDir = path.dirname(path.join(__dirname, "../../", newFilePath));
    await fs.mkdir(uploadDir, { recursive: true });

    // Mover o arquivo para o destino final
    await fs.rename(req.file.path, path.join(__dirname, "../../", newFilePath));

    // Retornar o caminho relativo para ser salvo no banco de dados (formato padrão com barras)
    return `/${newFilePath.replace(/\\/g, "/")}`;
  } catch (err) {
    console.error("Erro ao salvar a imagem de perfil:", err);
    return null;
  }
}

/**
 * Login de usuário
 */
authController.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email e senha são obrigatórios" });
    }

    // Buscar usuário
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Email ou senha inválidos" });
    } // Verificar senha
    console.log("Password submitted:", password);
    console.log("User password hash:", user.password);
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match result:", isMatch);

    if (!isMatch) {
      return res.status(401).json({ message: "Email ou senha inválidos" });
    } // Gerar token JWT
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, jwtSecret, { expiresIn: "24h" });

    // Responder com sucesso - usar profileImage como está na base de dados
    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        nif: user.nif,
        profileImage: user.profileImage, // Mantém o caminho como está no banco de dados
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Erro no servidor" });
  }
};

/**
 * Registro de usuário
 */
authController.register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, nif, phone } = req.body;

    // Validações básicas
    if (!name || !email || !password || !confirmPassword || !nif || !phone) {
      return res.status(400).json({
        message: "Todos os campos são obrigatórios",
      });
    }

    try {
      // Verificar se as senhas coincidem
      validationsController.validatePasswordsMatch(password, confirmPassword);

      // Check for existing email
      const existingEmail = await userController.getUser({ email: email });
      if (existingEmail) {
        return res.status(400).json({ message: "Email já está em uso" });
      }

      // Check for existing NIF
      const existingNIF = await userController.getUser({ nif: nif });
      if (existingNIF) {
        return res.status(400).json({ message: "NIF já está em uso" });
      }

      const newUser = {
        name: validationsController.validateString(req.body.name),
        email: validationsController.validateEmail(req.body.email),
        nif: validationsController.validateNIF(req.body.nif),
        password: validationsController.validatePassword(req.body.password),
        phone: validationsController.validateNumber(req.body.phone),
        role: "client",
        created_at: new Date(),
      };

      // Salvar usuário no banco de dados
      const savedUser = await userController.createUser(newUser); // Processar imagem de perfil se houver
      if (req.file) {
        const profileImage = await saveProfileImage(req, savedUser);
        if (profileImage) {
          savedUser.profileImage = profileImage;
          await savedUser.save();
        }
      } // Gerar token JWT
      const token = jwt.sign({ id: savedUser._id, email: savedUser.email, role: savedUser.role }, jwtSecret, { expiresIn: "24h" });

      // Responder com sucesso
      res.status(201).json({
        token,
        user: {
          id: savedUser._id,
          name: savedUser.name,
          email: savedUser.email,
          role: savedUser.role,
          phone: savedUser.phone,
          nif: savedUser.nif,
          profileImage: savedUser.profileImage, // Mantém o caminho como está no banco de dados
        },
      });
    } catch (error) {
      console.error("Register validation error:", error);
      return res.status(400).json({ message: error.message || "Erro de validação" });
    }
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Erro no servidor" });
  }
};

// Exportar o controlador
module.exports = authController;
