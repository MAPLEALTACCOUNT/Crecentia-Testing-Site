/* Inspection scheduling */
"use strict";

function openInspectionModal() {
  if (!data.rooms.length) return toast("Add a classroom first.");
  populateSelects(); $("inspectionDate").value = new Date().toISOString().slice(0, 10);
  $("inspectionModal").classList.add("show");
}
async function saveInspection() {
  const room = $("inspectionRoom").value, date = $("inspectionDate").value, inspector = $("inspectorName").value.trim();
  if (!room || !date || !inspector) return toast("Complete the required inspection details.");
  await run("saveInspection", { room, date, inspector, purpose: $("inspectionPurpose").value }, "Inspection scheduled.", () => closeModal("inspectionModal"));
}
function renderInspections() {
  $("inspectionTable").innerHTML = data.inspections.map(i => `<tr><td>${escapeHTML(i.date)}</td><td>${escapeHTML(i.room)}</td><td>${escapeHTML(i.inspector)}</td><td>${escapeHTML(i.purpose)}</td><td>${conditionBadge(i.status)}</td>
    <td>${i.status === "Scheduled" && isAdmin() ? `<button class="btn success smallbtn" data-act="complete" data-id="${escapeHTML(i.id)}">Complete</button>` : "—"}</td></tr>`).join("")
    || '<tr><td colspan="6" class="empty">No inspections scheduled.</td></tr>';
}
