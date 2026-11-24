/* Server communication (api.php) */
"use strict";

async function api(action, body) {
  const opt = { credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" } };
  if (body !== undefined) { opt.method = "POST"; opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body); }
  let res, json;
  try { res = await fetch(API + "?action=" + action, opt); } catch (e) { throw new Error("Cannot reach the server."); }
  let raw = ""; try { raw = await res.text(); json = JSON.parse(raw); } catch (e) {
    console.error("API returned non-JSON (HTTP " + res.status + "):", raw.slice(0, 500));
    throw new Error("Unexpected server response (HTTP " + res.status + "). Open api.php?action=session in the browser to see the PHP error.");
  }
  if (!json.ok) {
    if (res.status === 401 && currentUser) { currentUser = null; showLoggedOut("Session expired. Please sign in again."); }
    throw new Error(json.error || "Request failed.");
  }
  return json;
}
// Run an API call, refresh data, show a toast. Returns true on success.
async function run(action, body, okMsg, after) {
  try {
    const r = await api(action, body);
    await reload();
    if (after) after(r);
    if (okMsg) toast(okMsg);
    return true;
  } catch (e) { toast(e.message); return false; }
}
async function reload() {
  const j = await api("load");
  data = j.data; currentUser = j.user;
  refreshAll();
}
