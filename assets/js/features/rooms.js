/* Classrooms and QR labels */
"use strict";

function addRoom() {
  const r = prompt("Enter classroom name (example: A14):");
  if (r && r.trim()) run("addRoom", { name: r.trim() }, "Classroom added.");
}
// QR = link to this site's public read-only room page (works with any phone camera).
function roomUrl(room) { return new URL("./?room=" + encodeURIComponent(room), location.href).href; }
function renderRooms() {
  const holder = $("roomCards"), keep = $("roomSearch").value;
  holder.innerHTML = data.rooms.map((room, n) => `
    <div class="qr-card" data-room-name="${escapeHTML(room).toLowerCase()}">
      <h3>CLASSROOM ${escapeHTML(room)}</h3>
      <p class="muted small">${data.items.filter(i => i.room === room).length} inventory records</p>
      <div class="qr-image" id="roomqr${n}"></div>
      <button class="btn full" data-act="printqr" data-room="${escapeHTML(room)}">Print QR Label</button>
      <button class="btn secondary full mt-8" data-act="viewroom" data-room="${escapeHTML(room)}">View Inventory</button>
      ${isAdmin() ? `<button class="btn danger full mt-8" data-act="delroom" data-room="${escapeHTML(room)}">Delete Classroom</button>` : ""}
    </div>`).join("") || '<div class="empty">No classrooms registered.</div>';
  if (!window.QRCode) toast("QR library unavailable. Check your internet connection.");
  else data.rooms.forEach((room, n) => {
    const t = $("roomqr" + n); if (!t) return;
    try { new QRCode(t, { text: roomUrl(room), width: 128, height: 128, correctLevel: QRCode.CorrectLevel.M }); }
    catch (e) { t.textContent = "QR error"; }
  });
  $("roomSearch").value = keep; filterRoomCards();
}
function filterRoomCards() {
  const q = $("roomSearch").value.trim().toLowerCase(), cards = [...$("roomCards").querySelectorAll(".qr-card")];
  let vis = 0;
  cards.forEach(c => { const m = (c.dataset.roomName || "").includes(q); c.style.display = m ? "" : "none"; if (m) vis++; });
  $("roomSearchCount").textContent = q ? `${vis} of ${cards.length} classroom${cards.length === 1 ? "" : "s"} found` : `${cards.length} classroom${cards.length === 1 ? "" : "s"}`;
  let empty = $("roomSearchEmpty");
  if (q && !vis) {
    if (!empty) { empty = document.createElement("div"); empty.id = "roomSearchEmpty"; empty.className = "empty"; $("roomCards").appendChild(empty); }
    empty.textContent = `No classrooms found for “${$("roomSearch").value.trim()}”.`; empty.style.display = "block";
  } else if (empty) empty.style.display = "none";
}
function deleteRoom(room) {
  if (confirm("Delete classroom " + room + "?")) run("deleteRoom", { name: room }, "Classroom deleted.");
}
function printRoomQR(room) {
  if (!window.QRCode) return toast("QR generator library is unavailable.");
  const win = window.open("", "_blank");
  if (!win) return toast("Allow pop-ups to print QR labels.");
  const safe = escapeHTML(room);
  win.document.write(`<!DOCTYPE html><html><head><title>QR Label ${safe}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
<style>body{font-family:Arial;text-align:center;padding:30px;color:#111}.label{border:2px solid #222;padding:20px;width:320px;margin:auto}#qr{display:inline-block;margin:15px}</style></head>
<body><div class="label"><h2>CDL SENIOR HIGH SCHOOL</h2><h1>CLASSROOM ${safe}</h1><div id="qr"></div><p>Scan to view current classroom inventory</p></div>
<script>new QRCode(document.getElementById("qr"),{text:${JSON.stringify(roomUrl(room)).replace(/</g, "\\u003c")},width:210,height:210,correctLevel:QRCode.CorrectLevel.M});setTimeout(()=>window.print(),1000);<\/script></body></html>`);
  win.document.close();
}
function viewItem(id) {
  const item = data.items.find(i => i.id === id); if (!item) return;
  showPage("scanner"); showScanResult({ type: "ITEM", item });
}
function viewRoom(room) { showPage("scanner"); processQR(roomUrl(room)); }
