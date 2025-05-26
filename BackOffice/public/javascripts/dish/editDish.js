function addPriceField() {
  const container = document.getElementById("price-container");
  const newField = document.createElement("div");
  newField.classList.add("mb-3", "price-row");
  newField.innerHTML = `
    <div class="row">
      <div class="col-md-5">
        <label class="form-label">Dose</label>
        <div class="input-group">
          <span class="input-group-text"><i class="fas fa-balance-scale"></i></span>
          <input type="text" class="form-control" name="doses[]" placeholder="Ex.: Pequena, Média, Grande" required />
        </div>
      </div>
      <div class="col-md-5">
        <label class="form-label">Preço</label>
        <div class="input-group">
          <span class="input-group-text"><i class="fas fa-euro-sign"></i></span>
          <input type="number" step="0.01" class="form-control" name="prices[]" placeholder="Digite o preço" required />
        </div>
      </div>
      <div class="col-md-2 d-flex align-items-end">
        <button type="button" class="btn btn-danger btn-sm" onclick="removePriceField(this)">
          <i class="fas fa-trash me-1"></i>Remover
        </button>
      </div>
    </div>
  `;
  container.appendChild(newField);
}

function removePriceField(button) {
  const priceRow = button.closest(".price-row");
  priceRow.remove();
}

function showNewCategoryField() {
  const selectField = document.getElementById("category");
  const categoryContainer = document.getElementById("category-select-container");
  const newCategoryContainer = document.getElementById("new-category-container");

  // Oculta o dropdown e mostra o campo para nova categoria
  categoryContainer.style.display = "none";
  selectField.required = false;
  newCategoryContainer.style.display = "block";
  document.getElementById("newCategory").required = true;
}

function hideNewCategoryField() {
  const selectField = document.getElementById("category");
  const categoryContainer = document.getElementById("category-select-container");
  const newCategoryContainer = document.getElementById("new-category-container");

  // Mostra o dropdown e oculta o campo para nova categoria
  categoryContainer.style.display = "block";
  selectField.required = true;
  newCategoryContainer.style.display = "none";
  document.getElementById("newCategory").required = false;
  document.getElementById("newCategory").value = "";
}

// Função para alternar entre visualização e edição das informações nutricionais
function toggleNutritionEdit() {
  const editForm = document.getElementById("nutrition-edit-form");
  const infoDisplay = document.getElementById("nutrition-info-display");
  const button = document.getElementById("edit-nutrition-btn");

  if (editForm.style.display === "none") {
    // Mostrar formulário de edição
    editForm.style.display = "block";
    infoDisplay.style.display = "none";
    button.innerHTML = '<i class="fas fa-eye me-1"></i> Visualizar Informações';
    button.classList.remove("btn-outline-primary");
    button.classList.add("btn-outline-info");
  } else {
    // Mostrar informações
    editForm.style.display = "none";
    infoDisplay.style.display = "block";
    button.innerHTML = '<i class="fas fa-edit me-1"></i> Editar Valores Nutricionais';
    button.classList.remove("btn-outline-info");
    button.classList.add("btn-outline-primary");
  }
}
