/* Inventory CSV export, database backup and restore */
"use strict";

function exportCSV() {
  const head = ["Article / Item", "Description", "Old Property No. Assigned", "New Property No. Assigned", "Unit of Measure", "Unit Value", "Quantity per Property Card", "Quantity per Physical Count", "Location / Whereabouts", "Condition", "Item Remarks", "Name", "Source", "Acquisition / Accountability Remarks", "Classroom", "Category"];
  const rows = data.items.map(i => [i.name, i.description, i.oldProperty, i.newProperty, i.unitMeasure, i.unitValue, i.qtyPropertyCard ?? i.quantity, qty(i), i.location, i.condition, i.itemRemarks, i.accountableName, i.source, i.acquisitionRemarks, i.room, i.category]);
  downloadFile("CDL_Inventory.csv", "\uFEFF" + [head, ...rows].map(r => r.map(csvCell).join(",")).join("\r\n"), "text/csv;charset=utf-8");
  toast("Inventory exported. Open the CSV file using Excel.");
}
async function backupData() {
  try {
    const j = await api("backup");
    downloadFile("CDL_Inventory_Backup_" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify(j.backup, null, 2), "application/json");
    toast("Backup downloaded."); await reload();
  } catch (e) { toast(e.message); }
}
function restoreData() {
  const file = $("restoreFile").files[0];
  if (!file) return toast("Select a backup file first.");
  const r = new FileReader();
  r.onerror = () => toast("Unable to read the backup file.");
  r.onload = async () => {
    let backup; try { backup = JSON.parse(r.result); } catch (e) { return toast("Invalid or incompatible backup file."); }
    if (!confirm("This will REPLACE all current inventory records on the server. Continue?")) return;
    if (await run("restore", { backup }, "Backup restored successfully.")) $("restoreFile").value = "";
  };
  r.readAsText(file);
}
