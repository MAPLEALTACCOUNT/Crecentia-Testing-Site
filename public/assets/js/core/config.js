/* Constants and page metadata */
"use strict";

/* ===== Supabase connection =====
   Supabase Dashboard > Project Settings > API (use the Project URL and the anon / publishable key).
   The anon key is meant to be public: Row Level Security in supabase/schema.sql protects the data. */
const SUPABASE_URL = "https://ocbxutedvhswrpszrnwz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_nEitD3hj3EHVzxa7hcRc_w_3sP3V_EE";
/* Staff sign in with a username; Supabase Auth needs an email, so we use username@this-domain internally.
   Nobody is ever emailed (turn OFF "Confirm email" in Supabase). Change it ONLY before creating accounts. */
const AUTH_EMAIL_DOMAIN = "cdl-inventory.com";
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
