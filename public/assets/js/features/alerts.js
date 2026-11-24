/* Automatic inventory alerts */
"use strict";

function getAlerts() {
  return data.items.flatMap(i => {
    const a = [];
    if (i.condition === "Needs Repair") a.push({ item: i, message: "Requires repair", red: true });
    if (i.condition === "Missing") a.push({ item: i, message: "Marked as missing", red: true });
    if (i.condition === "Fair") a.push({ item: i, message: "Fair condition – monitor", red: false });
    if (Number(i.minimum) > 0 && qty(i) <= Number(i.minimum)) a.push({ item: i, message: "Quantity at or below minimum level", red: false });
    return a;
  });
}
function renderAlerts() {
  const a = getAlerts(); $("alertCount").textContent = a.length;
  $("alertList").innerHTML = a.map(x => `<div class="alert-item ${x.red ? "red" : ""}"><strong>${escapeHTML(x.item.name)}</strong> — ${escapeHTML(x.message)}<p class="muted small">${escapeHTML(x.item.room)} · Quantity: ${qty(x.item)}</p></div>`).join("")
    || '<div class="empty">No inventory alerts. Everything looks good!</div>';
}
