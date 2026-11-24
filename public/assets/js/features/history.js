/* Activity history page and export */
"use strict";

function renderHistory() {
  $("historyTable").innerHTML = data.history.map(h => `<tr><td>${escapeHTML(h.date)}</td><td>${escapeHTML(h.user)}</td><td>${escapeHTML(h.action)}</td><td>${escapeHTML(h.details)}</td></tr>`).join("")
    || '<tr><td colspan="4" class="empty">No activity recorded.</td></tr>';
}

function exportHistory() {
  const csv = [["Date", "User", "Activity", "Details"], ...data.history.map(h => [h.date, h.user, h.action, h.details])].map(r => r.map(csvCell).join(",")).join("\r\n");
  downloadFile("CDL_Activity_History.csv", "\uFEFF" + csv, "text/csv;charset=utf-8");
}
