/* Public read-only classroom page (opened from a QR link) */
"use strict";

async function showPublicRoom(room) {
  $("publicScreen").classList.remove("hidden");
  try {
    const r = await api("publicRoom", { room });
    $("publicTitle").textContent = "CLASSROOM " + r.room;
    $("publicSubtitle").textContent = "Current inventory as of " + r.generated;
    $("publicItems").innerHTML = r.items.map(i => `<tr><td>${escapeHTML(i.name)}</td><td>${escapeHTML(i.description || "")}</td><td>${escapeHTML(i.newProperty || i.oldProperty || "—")}</td><td>${escapeHTML(i.location || "—")}</td><td>${escapeHTML(i.condition || "—")}</td><td>${Number(i.qtyPhysical) || 0}</td></tr>`).join("")
      || '<tr><td colspan="6" class="empty">No inventory records.</td></tr>';
  } catch (e) {
    $("publicTitle").textContent = "Classroom not found";
    $("publicSubtitle").textContent = e.message || "Unable to load inventory.";
  }
}
