// Real-time order management for restaurant dashboard
let socket;
let orderUpdateSound;

function initializeRealTimeOrders(restaurantId) {
  console.log("🍽️ Initializing real-time order system for restaurant:", restaurantId);

  // Initialize Socket.IO connection
  socket = io();

  // Initialize notification sound
  initializeNotificationSound();

  // Join restaurant room for real-time updates
  socket.emit("join-restaurant", restaurantId);

  // Set up Socket.IO event listeners
  setupSocketListeners();

  // Load initial orders
  loadOrders();

  // Setup form interceptors for live status updates
  setupFormInterceptors();
}

function initializeNotificationSound() {
  try {
    orderUpdateSound = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmYeAzKG0fPTgjMGHm+58+GWRwsSUsLl7q1bGAg+ltryxnkpBSl+zPLaizsIGGS57OWYTgwNVKXh8bdkHgU2jdT00YU2Bx5qtvXgmEcLEE/A5O6wXBoGO5PY8s96LAQmecnw25E+CRZiturqpVITC0ml4PK8aB4GM4nU8tGAOAcfaqz14JdGCw9Lv+Xsq1waBjmM2fLNeTEEJHfH8N+PQAoUXrPq66hWEwlEnOHwwGkgAzSH0/PNeSsFJHfH8N2QQAoUXrTp66hVFApGnt/yvmcdAzOG0fPNeSsFJHfH8N+PQAoUXrPq66hWEwlEnOHwwGkgAzSH0/PNeSsFJHfH8N2QQAoUXrTp66hVFApGnt/yvmcdAzOG0fPNeSsFJHfH8N+PQAoUXrPq66hWEwlEnOHwwGkgAzSH0/PN");
    orderUpdateSound.volume = 0.3;
  } catch (error) {
    console.warn("🔇 Could not initialize notification sound:", error);
  }
}

function setupSocketListeners() {
  // Listen for new orders
  socket.on("new-order", (orderData) => {
    console.log("📋 New order received:", orderData);
    console.log("📋 Order number:", orderData.order_number);
    showNotification("Novo Pedido!", `Pedido #${orderData.order_number} recebido`, "info");
    playNotificationSound();
    addOrderToList(orderData, "pending");
  });

  // Listen for order status updates
  socket.on("order-status-updated", (orderData) => {
    console.log("🔄 Order status updated:", orderData);
    console.log("🔄 Order number:", orderData.order_number);
    console.log("🔄 Order status:", orderData.status);

    if (!orderData.order_number) {
      console.error("❌ Order number is undefined in order data:", orderData);
    }

    const statusText = getStatusText(orderData.status);
    const notificationMessage = `Pedido #${orderData.order_number || "N/A"} ${statusText}`;

    showNotification("Status Atualizado!", notificationMessage, "success");
    updateOrderInList(orderData);
  });

  // Listen for order cancellations
  socket.on("order-cancelled", (orderData) => {
    console.log("❌ Order cancelled:", orderData);
    console.log("❌ Order number:", orderData.order_number);
    showNotification("Pedido Cancelado!", `Pedido #${orderData.order_number} foi cancelado`, "warning");
    removeOrderFromList(orderData._id);
  });
}

function playNotificationSound() {
  if (orderUpdateSound) {
    try {
      orderUpdateSound.currentTime = 0;
      orderUpdateSound.play().catch((e) => console.warn("🔇 Could not play notification sound:", e));
    } catch (error) {
      console.warn("🔇 Error playing notification sound:", error);
    }
  }
}

function showNotification(title, message, type = "info") {
  // Create a toast notification
  const toastContainer = document.getElementById("toast-container") || createToastContainer();

  const toastElement = document.createElement("div");
  toastElement.className = `toast align-items-center text-bg-${type} border-0`;
  toastElement.setAttribute("role", "alert");
  toastElement.setAttribute("aria-live", "assertive");
  toastElement.setAttribute("aria-atomic", "true");

  toastElement.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <strong>${title}</strong><br>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

  toastContainer.appendChild(toastElement);

  const toast = new bootstrap.Toast(toastElement, {
    autohide: true,
    delay: 5000,
  });

  toast.show();

  // Remove element after it's hidden
  toastElement.addEventListener("hidden.bs.toast", () => {
    toastElement.remove();
  });
}

function createToastContainer() {
  const container = document.createElement("div");
  container.id = "toast-container";
  container.className = "toast-container position-fixed top-0 end-0 p-3";
  container.style.zIndex = "1055";
  document.body.appendChild(container);
  return container;
}

function loadOrders() {
  const restaurantId = document.querySelector("[data-restaurant-id]")?.dataset.restaurantId || window.location.pathname.split("/").pop();

  console.log("📋 Loading orders for restaurant:", restaurantId);

  fetch(`/api/orders/restaurant/${restaurantId}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        console.log("📋 Orders loaded:", data.orders);
        populateOrderLists(data.orders);
      } else {
        console.error("❌ Failed to load orders:", data.message);
        showNotification("Erro", "Falha ao carregar pedidos", "danger");
      }
    })
    .catch((error) => {
      console.error("❌ Error loading orders:", error);
      showNotification("Erro", "Erro ao carregar pedidos", "danger");
    });
}

function populateOrderLists(orders) {
  // Clear all order lists
  clearOrderLists();

  // Group orders by status and populate lists
  orders.forEach((order) => {
    addOrderToList(order, order.status);
  });
}

function clearOrderLists() {
  document.querySelector(".order-list-pending").innerHTML = "";
  document.querySelector(".order-list-preparing").innerHTML = "";
  document.querySelector(".order-list-delivered").innerHTML = "";
}

function addOrderToList(order, status) {
  const listSelector = `.order-list-${status}`;
  const orderList = document.querySelector(listSelector);

  if (!orderList) {
    console.warn(`❌ Order list not found for status: ${status}`);
    return;
  }

  const orderElement = createOrderElement(order);
  orderList.appendChild(orderElement);

  // Add animation
  orderElement.style.opacity = "0";
  orderElement.style.transform = "translateY(-10px)";
  setTimeout(() => {
    orderElement.style.transition = "all 0.3s ease";
    orderElement.style.opacity = "1";
    orderElement.style.transform = "translateY(0)";
  }, 100);
}

function createOrderElement(order) {
  const li = document.createElement("li");
  li.className = "order-item";
  li.dataset.orderId = order._id;

  const actions = getActionsForStatus(order);

  li.innerHTML = `
        <div class="order-header">
            <strong>Pedido Nº ${order.order_number}</strong>
            <span class="order-price">€${order.totalPrice.toFixed(2)}</span>
        </div>
        <div class="order-actions">
            <button 
                type="button" 
                class="btn btn-sm btn-info me-1" 
                onclick="showOrderDetails('${order._id}')">
                <i class="fas fa-eye me-1"></i> Visualizar Detalhes
            </button>
            ${actions}
        </div>
    `;

  return li;
}

function getActionsForStatus(order) {
  switch (order.status) {
    case "pending":
      return `
                <button 
                    type="button" 
                    class="btn btn-sm btn-success me-1" 
                    onclick="updateOrderStatus('${order._id}', 'preparing')">
                    <i class="fas fa-check me-1"></i> Aceitar
                </button>
                <button 
                    type="button" 
                    class="btn btn-sm btn-danger" 
                    onclick="cancelOrder('${order._id}')">
                    <i class="fas fa-times me-1"></i> Cancelar
                </button>
            `;
    case "preparing":
      return `
                <button 
                    type="button" 
                    class="btn btn-sm btn-primary" 
                    onclick="updateOrderStatus('${order._id}', 'delivered')">
                    <i class="fas fa-check-double me-1"></i> Finalizar
                </button>
            `;
    case "delivered":
      return `
                <button 
                    type="button" 
                    class="btn btn-sm btn-primary" 
                    onclick="updateOrderStatus('${order._id}', 'finished')">
                    <i class="fas fa-flag-checkered me-1"></i> Finalizar Pedido
                </button>
            `;
    default:
      return "";
  }
}

function updateOrderInList(order) {
  console.log("🔄 Updating order in list:", order);

  if (!order || !order._id) {
    console.error("❌ Cannot update order: missing order ID");
    return;
  }

  // Remove order from current position
  removeOrderFromList(order._id);

  // Add order to new position based on status if order is still active
  if (order.status && order.status !== "finished" && order.status !== "cancelled") {
    console.log(`🔄 Moving order ${order._id} to ${order.status} column`);
    addOrderToList(order, order.status);
  } else {
    console.log(`🔄 Order ${order._id} completed/cancelled, removed from lists`);
  }
}

function removeOrderFromList(orderId) {
  const orderElement = document.querySelector(`[data-order-id="${orderId}"]`);
  if (orderElement) {
    orderElement.style.transition = "all 0.3s ease";
    orderElement.style.opacity = "0";
    orderElement.style.transform = "translateX(-100%)";
    setTimeout(() => {
      orderElement.remove();
    }, 300);
  }
}

function updateOrderStatus(orderId, newStatus) {
  console.log(`🔄 Updating order ${orderId} to status: ${newStatus}`);

  fetch(`/api/orders/${orderId}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: newStatus }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        console.log("✅ Order status updated successfully");
        // The socket listener will handle the UI update
      } else {
        console.error("❌ Failed to update order status:", data.message);
        showNotification("Erro", "Falha ao atualizar status do pedido", "danger");
      }
    })
    .catch((error) => {
      console.error("❌ Error updating order status:", error);
      showNotification("Erro", "Erro ao atualizar status do pedido", "danger");
    });
}

function cancelOrder(orderId) {
  if (confirm("Tem certeza que deseja cancelar este pedido?")) {
    console.log(`❌ Cancelling order ${orderId}`);

    fetch(`/api/orders/${orderId}/cancel`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          console.log("✅ Order cancelled successfully");
          // The socket listener will handle the UI update
        } else {
          console.error("❌ Failed to cancel order:", data.message);
          showNotification("Erro", "Falha ao cancelar pedido", "danger");
        }
      })
      .catch((error) => {
        console.error("❌ Error cancelling order:", error);
        showNotification("Erro", "Erro ao cancelar pedido", "danger");
      });
  }
}

function showOrderDetails(orderId) {
  console.log(`👀 Showing details for order: ${orderId}`);

  fetch(`/api/orders/${orderId}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        populateOrderModal(data.order);
        const modal = new bootstrap.Modal(document.getElementById("orderModal"));
        modal.show();
      } else {
        console.error("❌ Failed to load order details:", data.message);
        showNotification("Erro", "Falha ao carregar detalhes do pedido", "danger");
      }
    })
    .catch((error) => {
      console.error("❌ Error loading order details:", error);
      showNotification("Erro", "Erro ao carregar detalhes do pedido", "danger");
    });
}

function populateOrderModal(order) {
  const modalBody = document.getElementById("orderModalBody");
  const modalTitle = document.getElementById("orderModalLabel");

  modalTitle.textContent = `Detalhes do Pedido #${order.order_number}`;

  // Calculate subtotal and voucher info
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const voucherDiscount = order.voucherDiscount || 0;
  const hasVoucher = order.appliedVoucher && voucherDiscount > 0;

  modalBody.innerHTML = `
        <div class="row mb-3">
            <div class="col-md-6">
                <h6><i class="fas fa-info-circle me-2"></i>Informações Gerais</h6>
                <p><strong>Número:</strong> ${order.order_number}</p>
                <p><strong>Status:</strong> <span class="badge bg-${getStatusColor(order.status)}">${getStatusText(order.status)}</span></p>
                <p><strong>Total Final:</strong> €${order.totalPrice.toFixed(2)}</p>
                <p><strong>Data:</strong> ${new Date(order.createdAt).toLocaleString("pt-PT")}</p>
            </div>
            <div class="col-md-6">
                <h6><i class="fas fa-user me-2"></i>Cliente</h6>
                <p><strong>Nome:</strong> ${order.customer?.name || "N/A"}</p>
                <p><strong>Email:</strong> ${order.customer?.email || "N/A"}</p>
                <p><strong>Telefone:</strong> ${order.customer?.phone || "N/A"}</p>
                <p><strong>Tipo de Pedido:</strong> ${getOrderTypeText(order.type)}</p>
                ${
                  order.type === "homeDelivery" && order.deliveryAddress
                    ? `<p><strong><i class="fas fa-map-marker-alt me-1"></i>Morada de Entrega:</strong><br>
                     <span class="text-muted">${order.deliveryAddress}</span>
                     <br>
                     <a href="https://www.google.com/maps?q=${encodeURIComponent(order.deliveryAddress)}" target="_blank" class="btn btn-sm btn-outline-primary mt-1">
                       <i class="fas fa-map-marked-alt me-1"></i>Ver no Google Maps
                     </a>
                     </p>`
                    : ""
                }
            </div>
        </div>
        
        <h6><i class="fas fa-utensils me-2"></i>Itens do Pedido</h6>
        <div class="table-responsive">
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Prato</th>
                        <th>Quantidade</th>
                        <th>Preço Unit.</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items
                      .map(
                        (item) => `
                        <tr>
                            <td>${item.dish?.name || "Prato não encontrado"}</td>
                            <td>${item.quantity}</td>
                            <td>€${item.price.toFixed(2)}</td>
                            <td>€${(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        </div>
        
        ${
          hasVoucher
            ? `
            <div class="row mb-3">
                <div class="col-12">
                    <div class="alert alert-success">
                        <h6><i class="fas fa-ticket-alt me-2"></i>Informações do Voucher Aplicado</h6>                        <div class="row">
                            <div class="col-md-6">
                                <p class="mb-1"><strong>Código do Voucher:</strong> ${order.appliedVoucher.code}</p>
                            </div>
                            <div class="col-md-6">
                                <p class="mb-1"><strong>Subtotal (sem desconto):</strong> €${subtotal.toFixed(2)}</p>
                                <p class="mb-1"><strong>Desconto Aplicado:</strong> <span class="text-success">-€${voucherDiscount.toFixed(2)}</span></p>
                            </div>
                        </div>
                        <div class="mt-2 p-2 bg-light rounded">
                            <small class="text-muted">
                                <i class="fas fa-info-circle me-1"></i>
                                <strong>Importante:</strong> Este pedido utilizou um voucher de desconto. 
                                O restaurante pode solicitar reembolso de €${voucherDiscount.toFixed(2)} ao proprietário da plataforma.
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `
            : ""
        }
        
        <div class="row mb-3">
            <div class="col-12">
                <h6><i class="fas fa-calculator me-2"></i>Resumo Financeiro</h6>
                <table class="table table-sm table-bordered">
                    <tbody>
                        <tr>
                            <td><strong>Subtotal dos Itens:</strong></td>
                            <td class="text-end">€${subtotal.toFixed(2)}</td>
                        </tr>
                        ${
                          hasVoucher
                            ? `
                            <tr class="table-success">
                                <td><strong>Desconto Voucher:</strong></td>
                                <td class="text-end text-success">-€${voucherDiscount.toFixed(2)}</td>
                            </tr>
                        `
                            : ""
                        }
                        <tr class="table-primary">
                            <td><strong>Total Final:</strong></td>
                            <td class="text-end"><strong>€${order.totalPrice.toFixed(2)}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        
        ${
          order.notes
            ? `
            <h6><i class="fas fa-comment me-2"></i>Observações</h6>
            <p class="text-muted">${order.notes}</p>
        `
            : ""
        }
    `;
}

function setupFormInterceptors() {
  // This function sets up interceptors for form submissions to handle them via AJAX
  // instead of page reloads, but since we're now using button onclick handlers,
  // this is primarily for backwards compatibility
  console.log("🔧 Form interceptors setup completed");
}

function getStatusText(status) {
  const statusMap = {
    pending: "Pendente",
    preparing: "Em Preparação",
    delivered: "Pronto para Entrega",
    finished: "Finalizado",
    cancelled: "Cancelado",
  };
  return statusMap[status] || status;
}

function getStatusColor(status) {
  const colorMap = {
    pending: "info",
    preparing: "warning",
    delivered: "success",
    finished: "secondary",
    cancelled: "danger",
  };
  return colorMap[status] || "secondary";
}

function getOrderTypeText(type) {
  const typeMap = {
    homeDelivery: "Entrega ao Domicílio",
    takeAway: "Takeaway",
    eatIn: "Comer no Local",
  };
  return typeMap[type] || type;
}

// Export functions for global access
window.initializeRealTimeOrders = initializeRealTimeOrders;
window.updateOrderStatus = updateOrderStatus;
window.cancelOrder = cancelOrder;
window.showOrderDetails = showOrderDetails;
