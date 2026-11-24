/* Sidebar page switching */
"use strict";

function showPage(page) {
  if (!pageInfo[page]) return;
  document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
  $(page).classList.add("active");
  document.querySelectorAll(".sidebar .nav-btn[data-page]").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  $("pageTitle").textContent = pageInfo[page][0]; $("pageSubtitle").textContent = pageInfo[page][1];
  page === "scanner" ? startScanner() : stopScanner();
  ({ dashboard: updateDashboard, inventory: renderInventory, rooms: renderRooms, alerts: renderAlerts,
     transfers: renderTransfers, inspections: renderInspections, history: renderHistory })[page]?.();
}
