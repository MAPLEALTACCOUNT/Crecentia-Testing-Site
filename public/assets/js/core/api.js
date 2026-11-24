/* Server communication — Supabase backend.
   Same api(action, body) interface the rest of the app already uses; only the inside changed. */
"use strict";

const sb = (SUPABASE_URL.includes("YOUR-PROJECT") || SUPABASE_ANON_KEY.includes("YOUR-ANON")) ? null
  : window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;
const emailFor = u => String(u || "").trim().toLowerCase() + "@" + AUTH_EMAIL_DOMAIN;

function fail(message, status) { const e = new Error(message); e.status = status; return e; }
function friendly(err, status) {
  const m = String(err?.message || "Request failed.");
  if (/failed to fetch|networkerror|load failed/i.test(m) || status === 0) return "Cannot reach the server.";
  if (/jwt|not authenticated/i.test(m)) return "Session expired. Please sign in again.";
  return m;
}
async function rpc(fn, args) {
  const { data, error, status } = await sb.rpc(fn, args);
  if (error) throw fail(friendly(error, status), status === 401 || /jwt expired/i.test(error.message || "") ? 401 : status);
  return data;
}
async function requireSession() {
  const { data } = await sb.auth.getSession();
  if (!data.session) throw fail("Session expired. Please sign in again.", 401);
  return data.session;
}
async function fetchProfile(session) {
  const { data, error, status } = await sb.from("profiles").select("username,name,role").eq("id", session.user.id).maybeSingle();
  if (error) throw fail(friendly(error, status), status === 401 ? 401 : status);
  if (!data) throw fail("Your account has no profile yet. Contact an administrator.", 401);
  return { id: session.user.id, username: data.username, name: data.name, role: data.role };
}

const handlers = {
  async session() {
    const { data } = await sb.auth.getSession();
    return { ok: true, user: data.session ? await fetchProfile(data.session) : null };
  },
  async register({ name, username, password }) {
    const nm = String(name || "").trim(), un = String(username || "").trim().toLowerCase();
    if (!nm) throw fail("Enter your full name.");
    if (!USERNAME_RE.test(un)) throw fail("Username must be 3–30 characters: letters, numbers, dot, dash or underscore.");
    if (String(password || "").length < 6) throw fail("Password must be at least 6 characters.");
    const { data, error } = await sb.auth.signUp({ email: emailFor(un), password, options: { data: { name: nm, username: un } } });
    if (error) {
      if (/already|registered|database error/i.test(error.message)) throw fail("That username is already taken.");
      throw fail(friendly(error));
    }
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw fail("That username is already taken.");
    if (!data.session) throw fail("Account created, but Supabase still requires email confirmation. Turn OFF “Confirm email” (Authentication > Providers > Email), then ask an admin to delete this account and register again.");
    await sb.auth.signOut();          // back to the login form, like before
    return { ok: true };
  },
  async login({ username, password }) {
    const { error } = await sb.auth.signInWithPassword({ email: emailFor(username), password });
    if (error) throw fail(/invalid login|credentials/i.test(error.message) ? "Invalid username or password." : friendly(error));
    return { ok: true };
  },
  async logout() { await sb.auth.signOut(); return { ok: true }; },
  async load() {
    const session = await requireSession();
    const [user, data] = await Promise.all([fetchProfile(session), rpc("load_all")]);
    data.rooms.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" }));
    return { ok: true, user, data };
  },
  async changePassword({ old, next }) {
    const session = await requireSession();
    if (!old) throw fail("Enter your current password.");
    if (String(next || "").length < 6) throw fail("New password must be at least 6 characters.");
    const { error: e1 } = await sb.auth.signInWithPassword({ email: session.user.email, password: old });
    if (e1) throw fail("Current password is incorrect.");
    const { error: e2 } = await sb.auth.updateUser({ password: next });
    if (e2) throw fail(friendly(e2));
    await sb.rpc("log_password_change");
    return { ok: true };
  },
  async addRoom({ name }) { await requireSession(); await rpc("add_room", { p_name: name }); return { ok: true }; },
  async deleteRoom({ name }) { await requireSession(); await rpc("delete_room", { p_name: name }); return { ok: true }; },
  async saveItem({ item }) { await requireSession(); return { ok: true, ...(await rpc("save_item", { p_item: item })) }; },
  async deleteItem({ id }) { await requireSession(); await rpc("delete_item", { p_id: id }); return { ok: true }; },
  async transfer({ id, room, qty }) { await requireSession(); await rpc("transfer_item", { p_id: id, p_room: room, p_qty: qty }); return { ok: true }; },
  async saveInspection({ room, date, inspector, purpose }) {
    await requireSession(); await rpc("save_inspection", { p_room: room, p_date: date, p_inspector: inspector, p_purpose: purpose || "" }); return { ok: true };
  },
  async completeInspection({ id }) { await requireSession(); await rpc("complete_inspection", { p_id: id }); return { ok: true }; },
  async backup() { await requireSession(); return { ok: true, backup: await rpc("backup_data") }; },
  async restore({ backup }) { await requireSession(); await rpc("restore_data", { p_backup: backup }); return { ok: true }; },
  async publicRoom({ room }) { return { ok: true, ...(await rpc("public_room", { p_room: room })) }; }
};

async function api(action, body) {
  if (!sb) throw new Error("Supabase is not configured yet. Open assets/js/core/config.js and paste your Project URL and anon key.");
  const h = handlers[action];
  if (!h) throw new Error("Unknown action: " + action);
  try { return await h(body || {}); }
  catch (e) {
    if (e.status === 401 && currentUser) { currentUser = null; showLoggedOut("Session expired. Please sign in again."); }
    throw e instanceof Error ? e : new Error(String(e));
  }
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
