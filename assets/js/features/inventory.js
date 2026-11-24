/* Inventory records: list, filter, add / edit / delete, item photos */
"use strict";

function previewItemImage(e) {
  const f = e.target.files?.[0]; if (!f) return;
  if (!f.type.startsWith("image/")) { e.target.value = ""; return toast("Please select a valid image file."); }
  if (f.size > 10 * 1024 * 1024) { e.target.value = ""; return toast("Image must be 10 MB or smaller."); }
  const r = new FileReader();
  r.onload = () => { $("itemImagePreview").src = r.result; $("itemImagePreviewWrap").classList.remove("hidden"); };
  r.readAsDataURL(f);
}
function clearItemImage() {
  $("itemImage").value = ""; $("itemImagePreview").removeAttribute("src"); $("itemImagePreviewWrap").classList.add("hidden");
}
function compressItemImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const r = new FileReader();
    r.onerror = () => reject(new Error("Unable to read image."));
    r.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image file."));
      img.onload = () => {
        const s = Math.min(1, 1000 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.78));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}
function openItemModal(id = null) {
  if (!isAdmin()) return toast("Administrator permission required.");
  $("itemModalTitle").textContent = id ? "Edit Inventory Record" : "Add Inventory Record";
  $("editItemId").value = id || "";
  populateSelects();
  const it = data.items.find(i => i.id === id);
  const f = {
    itemName: it?.name || "", itemDescription: it?.description || "", oldProperty: it?.oldProperty || "",
    newProperty: it?.newProperty || "", unitMeasure: it?.unitMeasure || "", unitValue: it?.unitValue ?? "",
    qtyPropertyCard: it?.qtyPropertyCard ?? it?.quantity ?? 1, itemQuantity: it ? qty(it) : 1,
    itemLocation: it?.location || "", itemCondition: it?.condition || "Good", itemRemarks: it?.itemRemarks || "",
    accountableName: it?.accountableName || "", itemSource: it?.source || "", acquisitionRemarks: it?.acquisitionRemarks || "",
    itemRoom: it?.room || data.rooms[0] || "", itemCategory: it?.category || "Furniture", itemMinimum: it?.minimum ?? 0
  };
  Object.entries(f).forEach(([k, v]) => $(k).value = v);
  clearItemImage();
  if (it?.image) { $("itemImagePreview").src = it.image; $("itemImagePreviewWrap").classList.remove("hidden"); }
  $("itemModal").classList.add("show");
}
async function saveItem() {
  const id = $("editItemId").value, old = data.items.find(i => i.id === id);
  const physical = Number($("itemQuantity").value), card = Number($("qtyPropertyCard").value);
  if (!$("itemName").value.trim() || !$("itemRoom").value) return toast("Article/Item and classroom are required.");
  if (!Number.isInteger(physical) || physical < 0 || !Number.isInteger(card) || card < 0)
    return toast("Both quantity fields must be whole numbers equal to or greater than zero.");
  let image = old?.image || "";
  try { const file = $("itemImage").files[0]; if (file) image = await compressItemImage(file); else if (!$("itemImagePreview").getAttribute("src")) image = ""; }
  catch (e) { return toast(e.message); }
  const item = {
    id, name: $("itemName").value.trim(), description: $("itemDescription").value, oldProperty: $("oldProperty").value,
    newProperty: $("newProperty").value, unitMeasure: $("unitMeasure").value, unitValue: Number($("unitValue").value || 0),
    qtyPropertyCard: card, qtyPhysical: physical, location: $("itemLocation").value, condition: $("itemCondition").value,
    itemRemarks: $("itemRemarks").value, accountableName: $("accountableName").value, source: $("itemSource").value,
    acquisitionRemarks: $("acquisitionRemarks").value, room: $("itemRoom").value, category: $("itemCategory").value,
    minimum: Number($("itemMinimum").value || 0), image
  };
  $("saveItemBtn").disabled = true;
  await run("saveItem", { item }, "Inventory saved successfully.", () => closeModal("itemModal"));
  $("saveItemBtn").disabled = false;
}
function deleteItem(id) {
  const it = data.items.find(i => i.id === id);
  if (it && confirm("Delete " + it.name + "? This cannot be undone.")) run("deleteItem", { id }, "Item deleted.");
}
function conditionBadge(c) {
  const k = c === "Good" || c === "Completed" ? "good" : c === "Fair" || c === "Scheduled" ? "warning" : "bad";
  return `<span class="status ${k}">${escapeHTML(c)}</span>`;
}
function renderInventory() {
  populateSelects();
  const q = $("searchInventory").value.toLowerCase(), room = $("filterRoom").value,
        cond = $("filterCondition").value, cat = $("filterCategory").value;
  const rows = data.items.filter(i =>
    [i.name, i.oldProperty, i.newProperty, i.room, i.description, i.location, i.accountableName, i.source, i.itemRemarks]
      .join(" ").toLowerCase().includes(q) && (!room || i.room === room) && (!cond || i.condition === cond) && (!cat || i.category === cat));
  $("inventoryTable").innerHTML = rows.map(i => `
    <tr>
      <td>${i.image ? `<img class="item-thumb" src="${escapeHTML(i.image)}" alt="Item image"> ` : ""}<strong>${escapeHTML(i.name)}</strong><br><span class="muted small">${escapeHTML(i.description || "")}</span></td>
      <td>${escapeHTML(i.newProperty || i.oldProperty || "—")}</td>
      <td>${escapeHTML(i.room || "—")}</td>
      <td>${conditionBadge(i.condition || "Unknown")}</td>
      <td>${qty(i)} ${escapeHTML(i.unitMeasure || "")}</td>
      <td><div class="actions">
        <button class="btn secondary smallbtn" data-act="view" data-id="${escapeHTML(i.id)}">View Details</button>
        ${isAdmin() ? `<button class="btn secondary smallbtn" data-act="edit" data-id="${escapeHTML(i.id)}">Edit</button>
        <button class="btn danger smallbtn" data-act="del" data-id="${escapeHTML(i.id)}">Delete</button>` : ""}
      </div></td>
    </tr>`).join("");
  $("inventoryEmpty").classList.toggle("hidden", rows.length > 0);
}
