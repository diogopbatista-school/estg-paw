// Validação de formulário
(() => {
  "use strict";
  const forms = document.querySelectorAll(".needs-validation");
  Array.from(forms).forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }
        form.classList.add("was-validated");
      },
      false
    );
  });
})();

// Visualização de password
document.querySelectorAll(".toggle-password").forEach((button) => {
  button.addEventListener("click", function () {
    const input = this.previousElementSibling;
    const icon = this.querySelector("i");

    if (input.type === "password") {
      input.type = "text";
      icon.classList.remove("fa-eye");
      icon.classList.add("fa-eye-slash");
    } else {
      input.type = "password";
      icon.classList.remove("fa-eye-slash");
      icon.classList.add("fa-eye");
    }
  });
});

// Validação de passwords
const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");
const matchFeedback = document.getElementById("passwordMatch");

if (password && confirmPassword) {
  function checkPasswordMatch() {
    if (confirmPassword.value === "") {
      matchFeedback.textContent = "";
      matchFeedback.className = "form-text";
    } else if (password.value === confirmPassword.value) {
      matchFeedback.textContent = "As passwords correspondem";
      matchFeedback.className = "form-text text-success";
    } else {
      matchFeedback.textContent = "As passwords não correspondem";
      matchFeedback.className = "form-text text-danger";
    }
  }

  password.addEventListener("input", checkPasswordMatch);
  confirmPassword.addEventListener("input", checkPasswordMatch);
}
