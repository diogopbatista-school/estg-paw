var express = require("express");
var router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("user/login", { error: "" }); // Passa a variável 'error' como vazia por padrão
});

module.exports = router;
