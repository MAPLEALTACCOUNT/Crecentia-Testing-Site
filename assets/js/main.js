/* Event wiring and start-up (load this file LAST) */
"use strict";

function bind() {
  const on = (id, ev, fn) => $(id).addEventListener(ev, fn);
  on("loginBtn", "click", login); on("registerBtn", "click", register);
  on("showRegister", "click", e => { e.preventDefault(); showRegister(); });
  on("showLogin", "click", e => { e.preventDefault(); showLogin(); });
  on("logoutBtn", "click", logout);
  [["loginUser", login], ["loginPass", login], ["regName", register], ["regUser", register], ["regPass", register]]
    .forEach(([id, fn]) => on(id, "keydown", e => { if (e.key === "Enter") { e.preventDefault(); fn(); } }));
  document.addEventListener("click", e => {
    const p = e.target.closest("[data-page]"); if (p) return showPage(p.dataset.page);
    const c = e.target.closest("[data-close]"); if (c) return closeModal(c.dataset.close);
    const b = e.target.closest("[data-act]"); if (!b) return;
    const { act, id, room } = b.dataset;
    ({ view: () => viewItem(id), edit: () => openItemModal(id), del: () => deleteItem(id), complete: () => run("completeInspection", { id }),
       printpage: () => window.print(), printqr: () => printRoomQR(room), viewroom: () => viewRoom(room), delroom: () => deleteRoom(room) })[act]?.();
  });
  on("addItemBtn", "click", () => openItemModal()); on("saveItemBtn", "click", saveItem);
  on("itemImage", "change", previewItemImage); on("clearImageBtn", "click", clearItemImage);
  ["searchInventory"].forEach(id => on(id, "input", renderInventory));
  ["filterRoom", "filterCondition", "filterCategory"].forEach(id => on(id, "change", renderInventory));
  on("exportCsvBtn", "click", exportCSV); on("printBtn", "click", () => window.print());
  on("addRoomBtn", "click", addRoom); on("roomSearch", "input", filterRoomCards);
  on("readQrBtn", "click", () => processQR($("manualQR").value));
  on("addTransferBtn", "click", openTransferModal); on("saveTransferBtn", "click", saveTransfer);
  on("addInspectionBtn", "click", openInspectionModal); on("saveInspectionBtn", "click", saveInspection);
  on("exportHistoryBtn", "click", exportHistory); on("backupBtn", "click", backupData); on("restoreBtn", "click", restoreData);
  on("changePwBtn", "click", changePassword);
  document.querySelectorAll(".modal-backdrop").forEach(m => m.addEventListener("click", e => { if (e.target === m) m.classList.remove("show"); }));
  ["click", "keydown", "mousemove", "touchstart"].forEach(ev => document.addEventListener(ev, () => { if (currentUser) lastActivity = Date.now(); }, { passive: true }));
  setInterval(() => {
    if (currentUser && Date.now() - lastActivity >= IDLE_MS) { alert("Your session has expired due to inactivity. Please log in again."); logout(); }
  }, 30000);
}

(async function init() {
  bind();
  const room = new URLSearchParams(location.search).get("room");
  if (room) return showPublicRoom(room);
  try {
    const s = await api("session");
    if (s.user) { await reload(); return openApp(); }
  } catch (e) { toast(e.message); }
  $("loginScreen").classList.remove("hidden");
})();
