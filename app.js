var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var mongoose = require("mongoose");

var app = express(); // Certifique-se de que esta declaração aparece apenas uma vez

mongoose.Promise = global.Promise;

mongoose
  .connect("mongodb+srv://PAW_TP_2025:pVHvZ26RXVXUDiwk@paw-tp.bf87xik.mongodb.net/?retryWrites=true&w=majority&appName=PAW-TP")
  .then(() => {
    console.log("Connected to the database!");
  })
  .catch((err) => {
    console.log("Cannot connect to the database!", err);
    process.exit();
  });

const session = require("express-session");
const MongoStore = require("connect-mongo");

// Configuração do middleware de sessão
app.use(
  session({
    store: MongoStore.create({ mongoUrl: "mongodb+srv://PAW_TP_2025:pVHvZ26RXVXUDiwk@paw-tp.bf87xik.mongodb.net/?retryWrites=true&w=majority&appName=PAW-TP" }),
    resave: false,
    saveUninitialized: false,
    secret: "estg-paw", // Substitua por uma chave secreta segura
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 dia (opcional: define o tempo de vida do cookie)
    },
  })
);

var indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const dashboardRouter = require("./routes/dashboard");
const restaurantsRouter = require("./routes/restaurant");
const menuRoutes = require("./routes/menu");

// Configuração do mecanismo de visualização
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Definição das rotas
app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/users/dashboard", dashboardRouter);
app.use("/restaurants", restaurantsRouter);
app.use("/", menuRoutes);

// Captura de erros 404 e encaminhamento para o manipulador de erros
app.use(function (req, res, next) {
  next(createError(404));
});

// Manipulador de erros
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
