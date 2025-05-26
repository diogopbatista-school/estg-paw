const cart = {};

function addToCart(id, name) {
  const doseSelect = document.getElementById(`dose-${id}`);
  const quantityInput = document.getElementById(`qty-${id}`);
  const dose = doseSelect.value;
  const price = parseFloat(doseSelect.selectedOptions[0].dataset.price);
  const quantity = parseInt(quantityInput.value);

  if (!quantity || quantity <= 0) return alert("Quantidade inválida.");

  const key = `${id}_${dose}`;
  cart[key] = {
    id,
    name,
    dose,
    price,
    quantity,
  };

  renderCart();
}

function removeFromCart(key) {
  delete cart[key];
  renderCart();
}

function renderCart() {
  const cartList = document.getElementById("cartList");
  const cartInput = document.getElementById("cartInput");
  const cartEmpty = document.getElementById("cartEmpty");
  const cartTotal = document.getElementById("cartTotal");
  const totalAmount = document.getElementById("totalAmount");
  cartList.innerHTML = "";

  let cartData = [];
  let total = 0;

  Object.entries(cart).forEach(([key, item]) => {
    cartList.innerHTML += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                ${item.name} (${item.dose}) - x${item.quantity} (€${(item.price * item.quantity).toFixed(2)})
                <button type="button" class="btn btn-sm btn-danger" onclick="removeFromCart('${key}')">
                    <i class="fas fa-trash"></i>
                </button>
            </li>`;
    cartData.push(item);
    total += item.price * item.quantity;
  });

  cartInput.value = JSON.stringify(cartData);
  totalAmount.textContent = `€${total.toFixed(2)}`;

  if (cartData.length === 0) {
    cartEmpty.style.display = "block";
    cartTotal.style.display = "none";
  } else {
    cartEmpty.style.display = "none";
    cartTotal.style.removeProperty("display");
    cartTotal.style.display = "flex";
  }
}

// Filtro de pratos
document.getElementById("dishFilter").addEventListener("input", function () {
  const query = this.value.toLowerCase();
  document.querySelectorAll(".dish-card-wrapper").forEach((card) => {
    const name = card.querySelector("h5").textContent.toLowerCase();
    card.style.display = name.includes(query) ? "block" : "none";
  });
});

// Validação do formulário
document.getElementById("orderForm").addEventListener("submit", function (e) {
  const cartInput = document.getElementById("cartInput");
  const cartData = JSON.parse(cartInput.value || "[]");

  if (cartData.length === 0) {
    e.preventDefault();
    alert("Por favor, adicione itens ao carrinho antes de prosseguir.");
    return;
  }

  // Validar endereço de entrega para pedidos homeDelivery
  const homeDeliveryRadio = document.getElementById("homeDelivery");
  const deliveryAddressField = document.getElementById("deliveryAddress");

  if (homeDeliveryRadio.checked && (!deliveryAddressField.value || deliveryAddressField.value.trim() === "")) {
    e.preventDefault();
    alert("Por favor, forneça o endereço de entrega para pedidos de entrega em casa.");
    deliveryAddressField.focus();
    return;
  }
});

// Lógica para mostrar/esconder campo de endereço de entrega
document.addEventListener("DOMContentLoaded", function () {
  const orderTypeRadios = document.querySelectorAll('input[name="type"]');
  const deliveryAddressSection = document.getElementById("deliveryAddressSection");
  const deliveryAddressField = document.getElementById("deliveryAddress");

  function toggleDeliveryAddress() {
    const homeDeliveryRadio = document.getElementById("homeDelivery");

    if (homeDeliveryRadio.checked) {
      deliveryAddressSection.style.display = "block";
      deliveryAddressField.required = true;
    } else {
      deliveryAddressSection.style.display = "none";
      deliveryAddressField.required = false;
      deliveryAddressField.value = ""; // Limpar o campo quando não for necessário
    }
  }

  // Adicionar event listeners aos radio buttons
  orderTypeRadios.forEach((radio) => {
    radio.addEventListener("change", toggleDeliveryAddress);
  });

  // Verificar estado inicial
  toggleDeliveryAddress();
});
