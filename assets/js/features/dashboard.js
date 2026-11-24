/* Dashboard statistics and charts */
"use strict";

function sumBy(fn) { return data.items.filter(fn).reduce((s, i) => s + qty(i), 0); }
function updateDashboard() {
  $("statTotal").textContent = sumBy(() => true);
  $("statGood").textContent = sumBy(i => i.condition === "Good");
  $("statRepair").textContent = sumBy(i => i.condition === "Needs Repair");
  $("statRooms").textContent = data.rooms.length;
  $("alertCount").textContent = getAlerts().length;
  const conds = ["Good", "Fair", "Needs Repair", "Missing"], cats = [...new Set(data.items.map(i => i.category))];
  drawChart("conditionChart", "doughnut", conds, conds.map(c => sumBy(i => i.condition === c)));
  drawChart("categoryChart", "bar", cats, cats.map(c => sumBy(i => i.category === c)));
  $("recentActivities").innerHTML = data.history.slice(0, 5).map(h => `<div class="activity-row"><strong>${escapeHTML(h.action)}</strong><p class="muted small">${escapeHTML(h.details)} · ${escapeHTML(h.date)}</p></div>`).join("") || '<div class="empty">No recent activities.</div>';
}
function drawChart(id, type, labels, values) {
  if (!window.Chart || !$(id)) return;
  charts[id]?.destroy();
  charts[id] = new Chart($(id), {
    type, data: { labels, datasets: [{ data: values, backgroundColor: ["#2585e8", "#24c78a", "#f4bd55", "#f06473", "#9168d9", "#43b5bd"], borderWidth: 0, borderRadius: 5 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: type !== "bar", labels: { color: "#b5c9df", font: { size: 11 } } } },
      scales: type === "bar" ? { x: { ticks: { color: "#91a8c2" }, grid: { color: "#203a56" } }, y: { ticks: { color: "#91a8c2" }, grid: { color: "#203a56" }, beginAtZero: true } } : {} }
  });
}
