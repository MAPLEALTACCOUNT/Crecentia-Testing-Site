/* Constants and page metadata */
"use strict";

const API = "api.php";
const IDLE_MS = 30 * 60 * 1000;

const pageInfo = {
  dashboard: ["Dashboard", "Classroom inventory overview"],
  inventory: ["Inventory Management", "Manage and monitor school assets"],
  rooms: ["Classrooms & QR Codes", "Generate classroom-specific QR labels"],
  scanner: ["QR Scanner", "Scan and view classroom inventory"],
  alerts: ["Inventory Alerts", "Monitor items requiring attention"],
  transfers: ["Item Transfer History", "Track classroom item movements"],
  inspections: ["Inspection Schedule", "Monitor scheduled inspections"],
  history: ["Activity History", "Complete system activity records"],
  backup: ["Backup & Restore", "Protect your inventory records"],
  settings: ["System Settings", "Account and system information"]
};
