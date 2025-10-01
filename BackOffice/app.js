var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var session = require("express-session");
var MongoStore = require("connect-mongo");
var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var bcrypt = require("bcrypt");
var User = require("./models/User"); // Certifique-se de que o modelo está correto

// Swagger dependencies
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/user");
var adminRouter = require("./routes/admin"); // Importa as rotas de admin
var restaurantRoutes = require("./routes/restaurants"); // Importa as rotas de restaurantes
var menuRoutes = require("./routes/menu");
var dishRoutes = require("./routes/dish");
var orderRoutes = require("./routes/order");

// API ROUTES
var apiAuthRouter = require("./routes/api/authRoute");
var apiRestaurantRouter = require("./routes/api/restaurantRoute");
var apiDishRouter = require("./routes/api/dishRoute");
var apiUserRouter = require("./routes/api/userRoute");
var apiOrderRouter = require("./routes/api/orderRoute");
var apiStripeRouter = require("./routes/api/stripeRoute");

var app = express();

// Conexão com o banco de dados MongoDB
mongoose.Promise = global.Promise;
mongoose
  .connect("")
  .then(() => {
    console.log("Connected to the database!");
  })
  .catch((err) => {
    console.log("Cannot connect to the database!", err);
    process.exit();
  });

// Configuração do middleware de sessão
app.use(
  session({
    store: MongoStore.create({ mongoUrl: "" }),
    resave: false,
    saveUninitialized: false,
    secret: "estg-paw", // Substitua por uma chave secreta segura
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 dia
    },
  })
);

// Configuração do Passport.js
passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const user = await User.findOne({ email: email }).exec();
      if (!user) {
        return done(null, false, { message: "Email não encontrado" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, { message: "Senha incorreta" });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

// Serialização e desserialização do usuário
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).exec();
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

app.use(passport.initialize());
app.use(passport.session());

// Configuração do mecanismo de visualização
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Middlewares padrão
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Servir arquivos estáticos da pasta "uploads"
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Configuração CORS para permitir requisições do frontend
app.use((req, res, next) => {
  // Permitir o acesso do frontend Angular
  res.header("Access-Control-Allow-Origin", "http://localhost:4200");
  // Headers permitidos
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

  // Métodos permitidos
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  // Permitir envio de credenciais (cookies, etc)
  res.header("Access-Control-Allow-Credentials", "true");

  // Responder imediatamente às requisições OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});

// Swagger documentation route
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rotas da API (devem vir antes das outras rotas para dar prioridade)
app.use("/api/auth", apiAuthRouter);
app.use("/api/restaurants", apiRestaurantRouter);
app.use("/api/dishes", apiDishRouter);
app.use("/api/user", apiUserRouter);
app.use("/api/orders", apiOrderRouter);
app.use("/api/stripe", apiStripeRouter);

// Rotas da interface web
app.use("/user", usersRouter);
app.use("/admin", adminRouter); // Registra as rotas de admin
app.use("/restaurants", restaurantRoutes); // Registra as rotas de restaurantes
app.use("/menus", menuRoutes);
app.use("/dish", dishRoutes);
app.use("/order", orderRoutes);

// Página inicial
app.use("/", indexRouter);

// ultima rota caso não tenha sido encontrada (deve vir por último)
app.use((req, res, next) => {
  // Se for uma requisição de API, retorna JSON
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  // Caso contrário, renderiza a página de erro
  res.status(404).render("error", { message: "Página não encontrada." });
});

// Captura de erros 404 e encaminha para o manipulador de erros
app.use(function (req, res, next) {
  next(createError(404));
});

// Manipulador de erros
app.use(function (err, req, res, next) {
  // Define variáveis locais, fornecendo erro apenas no ambiente de desenvolvimento
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // Se for uma requisição de API, retorna JSON
  if (req.path.startsWith("/api/")) {
    return res.status(err.status || 500).json({
      error: err.message || "Internal Server Error",
      ...(req.app.get("env") === "development" && { stack: err.stack }),
    });
  }

  // Renderiza a página de erro para requisições web
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
