/* Shared UI plumbing: dropdowns, modals, full refresh */
"use strict";

function populateSelects() {
  const opts = data.rooms.map(r => `<option value="${escapeHTML(r)}">${escapeHTML(r)}</option>`).join("");
  ["itemRoom", "transferRoom", "inspectionRoom"].forEach(id => { const el = $(id), old = el.value; el.innerHTML = opts; if (data.rooms.includes(old)) el.value = old; });
  const fr = $("filterRoom"), oldR = fr.value; fr.innerHTML = '<option value="">All Rooms</option>' + opts; if (data.rooms.includes(oldR)) fr.value = oldR;
  const fc = $("filterCategory"), oldC = fc.value;
  fc.innerHTML = '<option value="">All Categories</option>' + [...new Set(data.items.map(i => i.category))].map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");
  if ([...fc.options].some(o => o.value === oldC)) fc.value = oldC;
  const oldT = $("transferItem").value;
  $("transferItem").innerHTML = data.items.map(i => `<option value="${escapeHTML(i.id)}">${escapeHTML(i.name)} — ${escapeHTML(i.room)} (${qty(i)})</option>`).join("");
  if (data.items.some(i => i.id === oldT)) $("transferItem").value = oldT;
}
function closeModal(id) { $(id).classList.remove("show"); }
function refreshAll() {
  populateSelects(); renderInventory(); renderRooms(); renderAlerts(); renderTransfers(); renderInspections(); renderHistory(); updateDashboard(); applyPermissions();
}
