function toggleCustomReason() {
  const cancelReason = document.getElementById("cancelReason").value;
  const customReasonContainer = document.getElementById("customReasonContainer");

  if (cancelReason === "customer" || cancelReason === "restaurant" || cancelReason === "other") {
    customReasonContainer.style.display = "block";
  } else {
    customReasonContainer.style.display = "none";
  }
}
