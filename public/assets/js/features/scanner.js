/* QR scanner and scan results */
"use strict";

function stopScanner() {
  if (!scanner) return;
  const s = scanner; scanner = null;
  s.stop().catch(() => {});
}
async function startScanner() {
  if (scanner) return;
  if (!window.Html5Qrcode) { $("reader").innerHTML = '<p class="empty">Scanner library unavailable. Use manual QR content.</p>'; return; }
  $("reader").innerHTML = "";
  const inst = new Html5Qrcode("reader"); scanner = inst;
  try {
    await inst.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 230, height: 230 } },
      text => { processQR(text); stopScanner(); }, () => {});
  } catch (e) {
    if (scanner === inst) scanner = null;
    $("reader").innerHTML = '<p class="empty">Camera unavailable or permission denied. Use manual QR content below.</p>';
  }
}
function processQR(text) {
  const raw = (text || "").trim();
  if (!raw) return toast("Please enter QR content first.");
  let room = null;
  if (raw.startsWith("CDL-ROOM:")) { try { room = decodeURIComponent(raw.slice(9)); } catch (e) {} }   // older labels
  else { try { room = new URL(raw).searchParams.get("room"); } catch (e) {} }                          // link labels
  if (!room) return toast("This QR code is not a CDL classroom label.");
  const reg = data.rooms.find(r => r.toLowerCase() === room.trim().toLowerCase());
  if (!reg) return toast("This classroom is not registered.");
  showScanResult({ type: "ROOM", room: reg, items: data.items.filter(i => i.room === reg) });
}
function showScanResult(obj) {
  const box = $("scanResult");
  if (obj.type === "ROOM") {
    const total = obj.items.reduce((s, i) => s + qty(i), 0);
    box.innerHTML = `<div class="panel">
      <div class="flex-wrap-row"><h2>Classroom ${escapeHTML(obj.room)}</h2><span class="badge">LIVE INVENTORY</span></div>
      <p class="muted small mt-8">Viewed: ${escapeHTML(new Date().toLocaleString())}</p>
      <div class="summary-row"><div><strong>${obj.items.length}</strong><span class="muted small"> inventory records</span></div><div><strong>${total}</strong><span class="muted small"> total physical quantity</span></div></div>
      <input id="scanInventorySearch" type="search" placeholder="Search item, property number, location, or condition..." aria-label="Search scanned classroom inventory">
      <div class="table-wrap"><table><thead><tr><th>Item</th><th>Description</th><th>Property Number</th><th>Location</th><th>Condition</th><th>Physical Count</th></tr></thead><tbody>
      ${obj.items.map(i => `<tr class="scanned-item-row"><td>${escapeHTML(i.name)}</td><td>${escapeHTML(i.description || "—")}</td><td>${escapeHTML(i.newProperty || i.oldProperty || "—")}</td><td>${escapeHTML(i.location || "—")}</td><td>${escapeHTML(i.condition || "—")}</td><td>${qty(i)}</td></tr>`).join("") || '<tr><td colspan="6" class="empty">No inventory items in this classroom.</td></tr>'}
      </tbody></table></div>
      <button class="btn secondary no-print mt-14" data-act="printpage">Print Inventory</button></div>`;
    $("scanInventorySearch").addEventListener("input", e => {
      const s = e.target.value.toLowerCase().trim();
      document.querySelectorAll(".scanned-item-row").forEach(r => r.style.display = r.textContent.toLowerCase().includes(s) ? "" : "none");
    });
  } else if (obj.type === "ITEM") {
    const i = obj.item, row = (l, v) => `<p>${l}: ${escapeHTML(v || "—")}</p>`;
    box.innerHTML = `<div class="panel">
      ${i.image ? `<img src="${escapeHTML(i.image)}" alt="Item image" class="scan-item-image">` : ""}
      <h2>${escapeHTML(i.name)}</h2><p class="muted">${escapeHTML(i.description || "")}</p><div class="mt-15"></div>
      ${row("Old Property No.", i.oldProperty)}${row("New Property No.", i.newProperty)}${row("Unit of Measure", i.unitMeasure)}
      <p>Unit Value: ₱${Number(i.unitValue || 0).toLocaleString()}</p>
      <p>Quantity per Property Card: ${Number(i.qtyPropertyCard ?? i.quantity) || 0}</p><p>Quantity per Physical Count: ${qty(i)}</p>
      ${row("Location / Whereabouts", i.location)}${row("Classroom", i.room)}${row("Condition", i.condition)}${row("Item Remarks", i.itemRemarks)}
      ${row("Name", i.accountableName)}${row("Source", i.source)}${row("Acquisition / Accountability Remarks", i.acquisitionRemarks)}</div>`;
  }
  box.scrollIntoView({ behavior: "smooth", block: "start" });
}
