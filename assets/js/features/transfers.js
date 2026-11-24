/* Item transfers between classrooms */
"use strict";

function openTransferModal() {
  if (!data.items.length) return toast("Add inventory before transferring items.");
  populateSelects(); $("transferModal").classList.add("show");
}
async function saveTransfer() {
  const id = $("transferItem").value, room = $("transferRoom").value, q = Number($("transferQty").value);
  const it = data.items.find(i => i.id === id);
  if (!it || !room || room === it.room || !Number.isInteger(q) || q < 1 || q > qty(it)) return toast("Check transfer details and available quantity.");
  await run("transfer", { id, room, qty: q }, "Transfer recorded.", () => closeModal("transferModal"));
}
function renderTransfers() {
  $("transferTable").innerHTML = data.transfers.map(t => `<tr><td>${escapeHTML(t.date)}</td><td>${escapeHTML(t.item)}</td><td>${escapeHTML(t.from)}</td><td>${escapeHTML(t.to)}</td><td>${Number(t.quantity) || 0}</td><td>${escapeHTML(t.by)}</td></tr>`).join("")
    || '<tr><td colspan="6" class="empty">No transfer records yet.</td></tr>';
}
