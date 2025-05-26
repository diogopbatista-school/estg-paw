document.addEventListener("DOMContentLoaded", function () {
  // Sidebar toggle functionality
  const sidebar = document.getElementById("sidebar");
  const content = document.getElementById("content");
  const sidebarCollapse = document.getElementById("sidebarCollapse");

  function toggleSidebar() {
    sidebar.classList.toggle("active");
    content.classList.toggle("active");
  }

  if (sidebarCollapse) {
    sidebarCollapse.addEventListener("click", toggleSidebar);
  }

  // Smooth scrolling for sidebar links
  document.querySelectorAll('.sidebar a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("href");
      const target = document.querySelector(targetId);
      if (target) {
        window.scrollTo({ top: target.offsetTop - 60, behavior: "smooth" });
        if (window.innerWidth <= 768 && sidebar.classList.contains("active")) {
          toggleSidebar();
        }
      }
    });
  });

  // Initialize form submission with current query parameters
  function initFormWithCurrentParams() {
    // Get current URL parameters
    const urlParams = new URLSearchParams(window.location.search);

    // Set year filter values if they exist in URL
    if (document.getElementById("yearFilter")) {
      const yearSelect = document.getElementById("yearFilter");
      if (urlParams.has("year")) {
        yearSelect.value = urlParams.get("year");
      }
    }

    // Set month filter values if they exist in URL
    if (document.getElementById("monthFilter")) {
      const monthSelect = document.getElementById("monthFilter");
      if (urlParams.has("month")) {
        monthSelect.value = urlParams.get("month");
      }
    }

    // Set date filter values if they exist in URL
    if (document.getElementById("dateFilter")) {
      const dateInput = document.getElementById("dateFilter");
      if (urlParams.has("date")) {
        dateInput.value = urlParams.get("date");
      }
    }

    // Set specific date filter values if they exist in URL
    if (document.getElementById("specificDateFilter")) {
      const specificDateInput = document.getElementById("specificDateFilter");
      if (urlParams.has("specificDate")) {
        specificDateInput.value = urlParams.get("specificDate");
      }
    }
  }

  // Call the function to initialize forms
  initFormWithCurrentParams();

  // Handle filter form submissions
  const filterForms = document.querySelectorAll(".filter-form");
  filterForms.forEach((form) => {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Get current URL parameters and preserve relevant ones
      const urlParams = new URLSearchParams(window.location.search);
      const formData = new FormData(this);
      const formParams = new URLSearchParams(formData);

      // Preserve the restaurant ID parameter
      if (urlParams.has("id")) {
        formParams.set("id", urlParams.get("id"));
      }

      // Build the new URL with the form parameters
      const newUrl = window.location.pathname + "?" + formParams.toString();
      window.location.href = newUrl;
    });
  });

  // Initialize Yearly Chart
  if (document.getElementById("yearlyChart")) {
    const yearlyCtx = document.getElementById("yearlyChart").getContext("2d");
    const yearlyChart = new Chart(yearlyCtx, {
      type: "bar",
      data: {
        labels: yearlyData.labels || [],
        datasets: [
          {
            label: "Pedidos",
            data: yearlyData.orders || [],
            backgroundColor: "rgba(38, 166, 154, 0.6)",
            stack: "stack1",
            borderRadius: 6,
          },
          {
            label: "Faturação (€)",
            data: yearlyData.revenue || [],
            backgroundColor: "rgba(0, 121, 107, 0.6)",
            stack: "stack1",
            borderRadius: 6,
          },
          {
            label: "Tempo Médio (min)",
            data: yearlyData.avgTime || [],
            type: "line",
            yAxisID: "yTempo",
            borderColor: "rgba(255, 193, 7, 0.9)",
            backgroundColor: "rgba(255, 193, 7, 0.3)",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        interaction: {
          mode: "index",
          intersect: false,
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Pedidos / Faturação (€)",
            },
          },
          yTempo: {
            beginAtZero: true,
            position: "right",
            title: {
              display: true,
              text: "Tempo Médio (min)",
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
        plugins: {
          legend: {
            position: "top",
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed.y !== null) {
                  if (label.includes("Faturação")) {
                    label += new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(context.parsed.y);
                  } else {
                    label += context.parsed.y;
                  }
                }
                return label;
              },
            },
          },
        },
      },
    });
  }

  // Initialize Monthly Chart
  if (document.getElementById("restaurantChart")) {
    const ctx = document.getElementById("restaurantChart").getContext("2d");
    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: statsByMonth.labels || [],
        datasets: [
          {
            label: "Pedidos",
            data: statsByMonth.orders || [],
            backgroundColor: "rgba(38, 166, 154, 0.6)",
            stack: "stack1",
            borderRadius: 6,
          },
          {
            label: "Faturação (€)",
            data: statsByMonth.revenue || [],
            backgroundColor: "rgba(0, 121, 107, 0.6)",
            stack: "stack1",
            borderRadius: 6,
          },
          {
            label: "Tempo Médio (min)",
            data: statsByMonth.avgTime || [],
            type: "line",
            yAxisID: "yTempo",
            borderColor: "rgba(255, 193, 7, 0.9)",
            backgroundColor: "rgba(255, 193, 7, 0.3)",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        interaction: {
          mode: "index",
          intersect: false,
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Pedidos / Faturação (€)",
            },
          },
          yTempo: {
            beginAtZero: true,
            position: "right",
            title: {
              display: true,
              text: "Tempo Médio (min)",
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
        plugins: {
          legend: {
            position: "top",
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed.y !== null) {
                  if (label.includes("Faturação")) {
                    label += new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(context.parsed.y);
                  } else {
                    label += context.parsed.y;
                  }
                }
                return label;
              },
            },
          },
        },
      },
    });
  }

  // Initialize Daily Chart
  if (document.getElementById("dailyChart")) {
    const dailyCtx = document.getElementById("dailyChart").getContext("2d");
    const dailyChart = new Chart(dailyCtx, {
      type: "bar",
      data: {
        labels: statsByDay.labels || [],
        datasets: [
          {
            label: "Pedidos",
            data: statsByDay.orders || [],
            backgroundColor: "rgba(38, 166, 154, 0.6)",
            borderRadius: 6,
          },
          {
            label: "Faturação (€)",
            data: statsByDay.revenue || [],
            backgroundColor: "rgba(0, 121, 107, 0.6)",
            borderRadius: 6,
          },
          {
            label: "Tempo Médio (min)",
            data: statsByDay.avgTime || [],
            type: "line",
            yAxisID: "yTempo",
            borderColor: "rgba(255, 193, 7, 0.9)",
            backgroundColor: "rgba(255, 193, 7, 0.3)",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Pedidos / Faturação (€)",
            },
          },
          yTempo: {
            beginAtZero: true,
            position: "right",
            title: {
              display: true,
              text: "Tempo Médio (min)",
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
        plugins: {
          legend: {
            position: "top",
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed.y !== null) {
                  if (label.includes("Faturação")) {
                    label += new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(context.parsed.y);
                  } else {
                    label += context.parsed.y;
                  }
                }
                return label;
              },
            },
          },
        },
      },
    });
  }

  // Initialize Specific Day Chart
  if (document.getElementById("specificDayChart")) {
    const specificDayCtx = document.getElementById("specificDayChart").getContext("2d");

    // Only show the chart if there's data
    if (statsBySpecificDay && statsBySpecificDay.labels && statsBySpecificDay.labels.length > 0) {
      const specificDayChart = new Chart(specificDayCtx, {
        type: "bar",
        data: {
          labels: statsBySpecificDay.labels || [],
          datasets: [
            {
              label: "Pedidos",
              data: statsBySpecificDay.orders || [],
              backgroundColor: "rgba(38, 166, 154, 0.6)",
              borderRadius: 6,
            },
            {
              label: "Faturação (€)",
              data: statsBySpecificDay.revenue || [],
              backgroundColor: "rgba(0, 121, 107, 0.6)",
              borderRadius: 6,
            },
            {
              label: "Tempo Médio (min)",
              data: statsBySpecificDay.avgTime || [],
              type: "line",
              yAxisID: "yTempo",
              borderColor: "rgba(255, 193, 7, 0.9)",
              backgroundColor: "rgba(255, 193, 7, 0.3)",
              fill: true,
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: "Pedidos / Faturação (€)",
              },
            },
            yTempo: {
              beginAtZero: true,
              position: "right",
              title: {
                display: true,
                text: "Tempo Médio (min)",
              },
              grid: {
                drawOnChartArea: false,
              },
            },
          },
          plugins: {
            legend: {
              position: "top",
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  let label = context.dataset.label || "";
                  if (label) {
                    label += ": ";
                  }
                  if (context.parsed.y !== null) {
                    if (label.includes("Faturação")) {
                      label += new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(context.parsed.y);
                    } else {
                      label += context.parsed.y;
                    }
                  }
                  return label;
                },
              },
            },
          },
        },
      });
    } else {
      // If no data is available, show a message
      const container = document.getElementById("specificDayChart").parentNode;
      const message = document.createElement("p");
      message.className = "text-muted text-center mt-4";
      message.innerHTML = "<i class='fas fa-info-circle me-2'></i>Selecione uma data para ver as estatísticas por hora.";

      // Only add message if it doesn't exist yet
      if (!document.querySelector("#specificDayChart + .text-muted")) {
        container.insertBefore(message, document.getElementById("specificDayChart").nextSibling);
      }
    }
  }

  // Responsive behavior
  window.addEventListener("resize", function () {
    if (window.innerWidth <= 768) {
      sidebar.classList.add("active");
      content.classList.remove("active");
    } else {
      sidebar.classList.remove("active");
      content.classList.add("active");
    }
  });

  // Initialize responsive state
  if (window.innerWidth <= 768) {
    sidebar.classList.add("active");
    content.classList.remove("active");
  }
});
